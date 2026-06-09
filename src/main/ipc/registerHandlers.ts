import { ipcMain } from 'electron';
import log from 'electron-log/main.js';
import { serverHandlers } from './handlers/servers.js';
import { versionHandlers } from './handlers/versions.js';
import { javaHandlers } from './handlers/java.js';
import { catalogHandlers } from './handlers/catalog.js';
import { backupHandlers } from './handlers/backups.js';
import { systemHandlers } from './handlers/system.js';
import { settingsHandlers } from './handlers/settings.js';
import { worldHandlers } from './handlers/worlds.js';

export type IpcHandler = (...args: unknown[]) => unknown | Promise<unknown>;
export type HandlerGroup = Record<string, IpcHandler>;

function register(group: HandlerGroup): void {
  for (const [channel, fn] of Object.entries(group)) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        log.error(`IPC error in ${channel}:`, err);
        throw err instanceof Error ? err : new Error(String(err));
      }
    });
  }
}

export function registerIpcHandlers(): void {
  register(serverHandlers);
  register(versionHandlers);
  register(javaHandlers);
  register(catalogHandlers);
  register(backupHandlers);
  register(systemHandlers);
  register(settingsHandlers);
  register(worldHandlers);
  log.info('IPC handlers registered');
}
