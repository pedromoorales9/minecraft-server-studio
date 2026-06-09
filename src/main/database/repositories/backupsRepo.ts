import { getDb } from '../db.js';
import type { BackupRecord, BackupScheduleConfig, BackupTrigger } from '../../../shared/types/backup.js';

interface Row {
  id: string;
  server_id: string;
  trigger: string;
  path: string;
  size_bytes: number;
  sha256: string;
  created_at: string;
  note: string | null;
}

function toRecord(r: Row): BackupRecord {
  return {
    id: r.id,
    serverId: r.server_id,
    trigger: r.trigger as BackupTrigger,
    path: r.path,
    sizeBytes: r.size_bytes,
    sha256: r.sha256,
    createdAt: r.created_at,
    note: r.note,
  };
}

export const backupsRepo = {
  listForServer(serverId: string): BackupRecord[] {
    return (
      getDb()
        .prepare(`SELECT * FROM backups WHERE server_id = ? ORDER BY created_at DESC`)
        .all(serverId) as Row[]
    ).map(toRecord);
  },
  get(id: string): BackupRecord | null {
    const row = getDb().prepare(`SELECT * FROM backups WHERE id = ?`).get(id) as Row | undefined;
    return row ? toRecord(row) : null;
  },
  insert(rec: BackupRecord): void {
    getDb()
      .prepare(
        `INSERT INTO backups (id, server_id, trigger, path, size_bytes, sha256, created_at, note)
         VALUES (@id, @serverId, @trigger, @path, @sizeBytes, @sha256, @createdAt, @note)`,
      )
      .run(rec);
  },
  remove(id: string): void {
    getDb().prepare(`DELETE FROM backups WHERE id = ?`).run(id);
  },
  getSchedule(serverId: string): BackupScheduleConfig | null {
    const row = getDb()
      .prepare(`SELECT * FROM backup_schedules WHERE server_id = ?`)
      .get(serverId) as
      | { server_id: string; enabled: number; cron: string; retention: number }
      | undefined;
    if (!row) return null;
    return {
      serverId: row.server_id,
      enabled: !!row.enabled,
      cron: row.cron,
      retention: row.retention,
    };
  },
  setSchedule(cfg: BackupScheduleConfig): void {
    getDb()
      .prepare(
        `INSERT INTO backup_schedules (server_id, enabled, cron, retention)
         VALUES (@serverId, @enabled, @cron, @retention)
         ON CONFLICT(server_id) DO UPDATE SET
           enabled = excluded.enabled,
           cron = excluded.cron,
           retention = excluded.retention`,
      )
      .run({ ...cfg, enabled: cfg.enabled ? 1 : 0 });
  },
  listAllSchedules(): BackupScheduleConfig[] {
    return (
      getDb().prepare(`SELECT * FROM backup_schedules WHERE enabled = 1`).all() as {
        server_id: string;
        enabled: number;
        cron: string;
        retention: number;
      }[]
    ).map((r) => ({
      serverId: r.server_id,
      enabled: !!r.enabled,
      cron: r.cron,
      retention: r.retention,
    }));
  },
};
