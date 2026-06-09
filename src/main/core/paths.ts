import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

/**
 * Filesystem layout for the app's writable data.
 *
 *   userData/
 *     studio.sqlite          ← SQLite database
 *     servers/<id>/          ← each Minecraft server instance
 *     cache/jars/<loader>/   ← downloaded loader jars
 *     cache/java/<major>/    ← extracted JREs
 *     cache/catalog/         ← cached plugin/mod metadata
 *     backups/<serverId>/    ← compressed archives
 *     logs/                  ← electron-log files
 */
export interface AppPaths {
  userData: string;
  database: string;
  servers: string;
  cache: string;
  jarCache: string;
  javaCache: string;
  catalogCache: string;
  backups: string;
  logs: string;
}

let cached: AppPaths | null = null;

export function appPaths(): AppPaths {
  if (cached) return cached;
  const userData = app.getPath('userData');
  const paths: AppPaths = {
    userData,
    database: path.join(userData, 'studio.sqlite'),
    servers: path.join(userData, 'servers'),
    cache: path.join(userData, 'cache'),
    jarCache: path.join(userData, 'cache', 'jars'),
    javaCache: path.join(userData, 'cache', 'java'),
    catalogCache: path.join(userData, 'cache', 'catalog'),
    backups: path.join(userData, 'backups'),
    logs: path.join(userData, 'logs'),
  };
  for (const p of [
    paths.servers,
    paths.cache,
    paths.jarCache,
    paths.javaCache,
    paths.catalogCache,
    paths.backups,
    paths.logs,
  ]) {
    fs.mkdirSync(p, { recursive: true });
  }
  cached = paths;
  return paths;
}

export function serverDir(serverId: string): string {
  return path.join(appPaths().servers, serverId);
}
