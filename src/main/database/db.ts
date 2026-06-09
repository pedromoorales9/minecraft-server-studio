import Database from 'better-sqlite3';
import log from 'electron-log/main.js';
import { appPaths } from '../core/paths.js';
import { runMigrations } from './migrations.js';

let db: Database.Database | null = null;

export async function initDatabase(): Promise<void> {
  const path = appPaths().database;
  db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  runMigrations(db);
  log.info('Database opened at', path);
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialised');
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
