import { getDb } from '../db.js';

export interface AppEvent {
  id?: number;
  serverId: string | null;
  ts: string;
  kind: string;
  message: string;
  metadata?: Record<string, unknown> | null;
}

export const eventsRepo = {
  insert(evt: Omit<AppEvent, 'id'>): void {
    getDb()
      .prepare(
        `INSERT INTO events (server_id, ts, kind, message, metadata)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        evt.serverId,
        evt.ts,
        evt.kind,
        evt.message,
        evt.metadata ? JSON.stringify(evt.metadata) : null,
      );
  },
  latest(limit = 50): AppEvent[] {
    return (
      getDb()
        .prepare(`SELECT * FROM events ORDER BY ts DESC LIMIT ?`)
        .all(limit) as {
        id: number;
        server_id: string | null;
        ts: string;
        kind: string;
        message: string;
        metadata: string | null;
      }[]
    ).map((r) => ({
      id: r.id,
      serverId: r.server_id,
      ts: r.ts,
      kind: r.kind,
      message: r.message,
      metadata: r.metadata ? (JSON.parse(r.metadata) as Record<string, unknown>) : null,
    }));
  },
};
