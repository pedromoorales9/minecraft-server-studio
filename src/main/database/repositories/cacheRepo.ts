import { getDb } from '../db.js';

export const catalogCacheRepo = {
  get<T = unknown>(source: string, key: string): T | null {
    const row = getDb()
      .prepare(`SELECT payload, fetched_at, ttl_seconds FROM catalog_cache WHERE source = ? AND cache_key = ?`)
      .get(source, key) as { payload: string; fetched_at: string; ttl_seconds: number } | undefined;
    if (!row) return null;
    const age = (Date.now() - new Date(row.fetched_at).getTime()) / 1000;
    if (age > row.ttl_seconds) return null;
    try {
      return JSON.parse(row.payload) as T;
    } catch {
      return null;
    }
  },
  set<T = unknown>(source: string, key: string, value: T, ttlSeconds: number): void {
    getDb()
      .prepare(
        `INSERT INTO catalog_cache (source, cache_key, payload, fetched_at, ttl_seconds)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(source, cache_key) DO UPDATE SET
           payload = excluded.payload,
           fetched_at = excluded.fetched_at,
           ttl_seconds = excluded.ttl_seconds`,
      )
      .run(source, key, JSON.stringify(value), new Date().toISOString(), ttlSeconds);
  },
};
