import fs from 'node:fs';
import path from 'node:path';
import log from 'electron-log/main.js';
import pidusage from 'pidusage';
import { ServerProcess } from './processManager.js';
import type { RconClient } from './rcon.js';
import { broadcast } from '../../ipc/broadcast.js';
import { IPC } from '../../../shared/ipc/channels.js';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { eventsRepo } from '../../database/repositories/eventsRepo.js';
import { getDb } from '../../database/db.js';
import { javaManager } from '../../services/java/javaManager.js';
import { recommendedJavaMajor } from '../../services/mojang/manifest.js';
import type { ServerMetricsSnapshot, ServerRecord, ServerStatus } from '../../../shared/types/server.js';

/**
 * Central registry of running servers.
 *
 * Keeps `ServerProcess` instances alive and wires them up to:
 *   • the renderer (status, logs, metrics broadcasts),
 *   • the SQLite events log,
 *   • a single shared metrics sampler running on a 2s tick.
 */
class RuntimeRegistry {
  private processes = new Map<string, ServerProcess>();
  private rcon = new Map<string, RconClient>();
  private metricsTimer: NodeJS.Timeout | null = null;

  async start(rec: ServerRecord): Promise<void> {
    if (this.processes.has(rec.id)) {
      throw new Error('Server already running');
    }
    const record = await this.resolveJava(rec);
    const proc = new ServerProcess(record);
    this.processes.set(record.id, proc);
    this.wireUp(proc);
    await proc.start();
    this.ensureMetricsTimer();
    eventsRepo.insert({
      serverId: record.id,
      ts: new Date().toISOString(),
      kind: 'server.started',
      message: `Started ${record.name}`,
    });
  }

  /**
   * Validates the stored Java path before launch. The JRE cache can be wiped
   * (or the record can point at a runtime from another machine), so if the
   * binary is gone we re-acquire a matching JRE and persist the new path.
   */
  private async resolveJava(rec: ServerRecord): Promise<ServerRecord> {
    const stale =
      !rec.javaPath || (path.isAbsolute(rec.javaPath) && !fs.existsSync(rec.javaPath));
    if (!stale) return rec;
    log.warn('Stored Java path is missing; re-resolving runtime', {
      id: rec.id,
      javaPath: rec.javaPath,
    });
    const major = rec.javaMajor ?? recommendedJavaMajor(rec.minecraftVersion);
    const jre = await javaManager.ensure(major);
    serversRepo.patch(rec.id, { javaPath: jre.path });
    return { ...rec, javaPath: jre.path };
  }

  async stop(serverId: string, opts?: { force?: boolean }): Promise<void> {
    const proc = this.processes.get(serverId);
    if (!proc) return;
    await proc.stop(opts);
  }

  async restart(serverId: string): Promise<void> {
    const proc = this.processes.get(serverId);
    if (!proc) {
      const rec = serversRepo.get(serverId);
      if (rec) await this.start(rec);
      return;
    }
    await new Promise<void>((resolve) => {
      proc.once('exit', () => resolve());
      void proc.stop();
    });
    const rec = serversRepo.get(serverId);
    if (rec) await this.start(rec);
  }

  sendCommand(serverId: string, command: string): void {
    const proc = this.processes.get(serverId);
    if (!proc) throw new Error('Server not running');
    proc.sendCommand(command);
  }

  isRunning(serverId: string): boolean {
    return this.processes.has(serverId);
  }

  async shutdownAll(): Promise<void> {
    log.info('Shutting down all server processes', { count: this.processes.size });
    const stops = Array.from(this.processes.values()).map((p) => p.stop());
    await Promise.allSettled(stops);
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  private wireUp(proc: ServerProcess): void {
    proc.on('status', (status: ServerStatus) => {
      serversRepo.updateStatus(proc.record.id, status);
      broadcast(IPC.servers.onStatusChanged, { serverId: proc.record.id, status });
      if (status === 'stopped' || status === 'crashed') {
        this.processes.delete(proc.record.id);
        const r = this.rcon.get(proc.record.id);
        if (r) {
          r.disconnect();
          this.rcon.delete(proc.record.id);
        }
        if (this.processes.size === 0 && this.metricsTimer) {
          clearInterval(this.metricsTimer);
          this.metricsTimer = null;
        }
      }
    });
    proc.on('log', (line) => broadcast(IPC.servers.onLog, line));
    proc.on('join', (player) =>
      eventsRepo.insert({
        serverId: proc.record.id,
        ts: new Date().toISOString(),
        kind: 'player.join',
        message: `${player} joined`,
        metadata: { player },
      }),
    );
    proc.on('leave', (player) =>
      eventsRepo.insert({
        serverId: proc.record.id,
        ts: new Date().toISOString(),
        kind: 'player.leave',
        message: `${player} left`,
        metadata: { player },
      }),
    );
  }

  private ensureMetricsTimer(): void {
    if (this.metricsTimer) return;
    this.metricsTimer = setInterval(() => {
      void this.sampleMetrics();
    }, 2000);
  }

  private async sampleMetrics(): Promise<void> {
    for (const proc of this.processes.values()) {
      const pid = proc.getPid();
      if (!pid) continue;
      try {
        const stats = await pidusage(pid);
        const snap: ServerMetricsSnapshot = {
          serverId: proc.record.id,
          timestamp: Date.now(),
          cpuPercent: Math.round(stats.cpu * 10) / 10,
          memoryUsedMb: Math.round(stats.memory / 1024 / 1024),
          memoryAllocatedMb: proc.record.ramMaxMb,
          tps: null,
          mspt: null,
          playersOnline: proc.getPlayersOnline(),
          playersMax: proc.record.maxPlayers,
          loadedChunks: null,
          entities: null,
        };
        broadcast(IPC.servers.onMetrics, snap);
        getDb()
          .prepare(
            `INSERT INTO metrics_history (server_id, ts, cpu_percent, memory_used_mb, tps, mspt, players_online)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(server_id, ts) DO NOTHING`,
          )
          .run(
            snap.serverId,
            snap.timestamp,
            snap.cpuPercent,
            snap.memoryUsedMb,
            snap.tps,
            snap.mspt,
            snap.playersOnline,
          );
      } catch {
        // pidusage occasionally races a freshly exited child; ignore.
      }
    }
  }
}

export const runtimeRegistry = new RuntimeRegistry();
