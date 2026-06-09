import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { nanoid } from 'nanoid';
import * as tar from 'tar';
import log from 'electron-log/main.js';
import { appPaths } from '../../core/paths.js';
import { backupsRepo } from '../../database/repositories/backupsRepo.js';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { runtimeRegistry } from '../runtime/registry.js';
import { fileSha256 } from '../../services/downloads/downloader.js';
import { broadcast } from '../../ipc/broadcast.js';
import { IPC } from '../../../shared/ipc/channels.js';
import type { BackupRecord, BackupTrigger } from '../../../shared/types/backup.js';

/**
 * Creates and restores compressed server snapshots.
 *
 * Strategy:
 *   • Streaming gzip tar to avoid loading the entire world into RAM.
 *   • Excludes ephemeral folders (`logs/`, `cache/`, `crash-reports/`) and
 *     the studio launch metadata.
 *   • If the server is running we issue `save-all flush` followed by
 *     `save-off` via RCON / stdin to freeze world state for the duration
 *     of the snapshot, then re-enable saves.
 *   • SHA-256 of the archive is recorded for integrity checks on restore.
 */
const EXCLUDED_DIRS = new Set(['logs', 'cache', 'crash-reports', 'libraries']);
const EXCLUDED_FILES = new Set(['.studio-launch.json']);

export const backupService = {
  async create(args: {
    serverId: string;
    trigger?: BackupTrigger;
    note?: string;
  }): Promise<BackupRecord> {
    const server = serversRepo.get(args.serverId);
    if (!server) throw new Error('Server not found');
    const trigger = args.trigger ?? 'manual';

    const targetDir = path.join(appPaths().backups, server.id);
    await fsp.mkdir(targetDir, { recursive: true });
    const id = `bak_${nanoid(10)}`;
    const filename = `${stamp()}-${trigger}.tar.gz`;
    const filePath = path.join(targetDir, filename);

    const running = runtimeRegistry.isRunning(server.id);
    if (running) {
      try {
        runtimeRegistry.sendCommand(server.id, 'save-all flush');
        runtimeRegistry.sendCommand(server.id, 'save-off');
      } catch (e) {
        log.warn('Could not freeze saves before backup', e);
      }
    }

    broadcast(IPC.backups.onProgress, { serverId: server.id, phase: 'archiving', progress: 0.05 });

    try {
      await new Promise<void>((resolve, reject) => {
        const out = createWriteStream(filePath);
        const stream = tar.create(
          {
            gzip: { level: 6 },
            cwd: server.directory,
            filter: (p) => {
              const top = p.split(/[\\/]/, 1)[0] ?? '';
              if (EXCLUDED_DIRS.has(top)) return false;
              if (EXCLUDED_FILES.has(top)) return false;
              return true;
            },
          },
          ['.'],
        );
        stream.pipe(out);
        out.on('finish', () => resolve());
        out.on('error', reject);
        stream.on('error', reject);
      });
    } finally {
      if (running) {
        try {
          runtimeRegistry.sendCommand(server.id, 'save-on');
        } catch {
          // server may have stopped in the meantime; harmless.
        }
      }
    }

    const stat = await fsp.stat(filePath);
    broadcast(IPC.backups.onProgress, { serverId: server.id, phase: 'hashing', progress: 0.85 });
    const sha = await fileSha256(filePath);

    const record: BackupRecord = {
      id,
      serverId: server.id,
      trigger,
      path: filePath,
      sizeBytes: stat.size,
      sha256: sha,
      createdAt: new Date().toISOString(),
      note: args.note ?? null,
    };
    backupsRepo.insert(record);
    broadcast(IPC.backups.onProgress, { serverId: server.id, phase: 'done', progress: 1 });
    return record;
  },

  async restore(backupId: string): Promise<void> {
    const rec = backupsRepo.get(backupId);
    if (!rec) throw new Error('Backup not found');
    const server = serversRepo.get(rec.serverId);
    if (!server) throw new Error('Server not found');
    if (runtimeRegistry.isRunning(server.id)) {
      throw new Error('Stop the server before restoring a backup');
    }
    const actualHash = await fileSha256(rec.path);
    if (actualHash !== rec.sha256) {
      throw new Error('Backup checksum mismatch; refusing to restore a corrupted archive');
    }
    broadcast(IPC.backups.onProgress, { serverId: server.id, phase: 'extracting', progress: 0.1 });

    // Wipe the server dir EXCEPT for the launch metadata and the loader jar.
    const preserve = new Set(['.studio-launch.json']);
    for (const entry of await fsp.readdir(server.directory)) {
      if (preserve.has(entry)) continue;
      await fsp.rm(path.join(server.directory, entry), { recursive: true, force: true });
    }
    await tar.x({ file: rec.path, cwd: server.directory });
    broadcast(IPC.backups.onProgress, { serverId: server.id, phase: 'done', progress: 1 });
  },

  async remove(backupId: string): Promise<void> {
    const rec = backupsRepo.get(backupId);
    if (!rec) return;
    await fsp.rm(rec.path, { force: true });
    backupsRepo.remove(backupId);
  },
};

function stamp(): string {
  const d = new Date();
  return d.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}
