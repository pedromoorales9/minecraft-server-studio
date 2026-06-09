/**
 * Single source of truth for every IPC channel name.
 *
 * Convention: `domain:action`. Renderer → main uses `invoke` (request/response).
 * Main → renderer uses `webContents.send` (events, broadcast in the API contract).
 */
export const IPC = {
  // Servers
  servers: {
    list: 'servers:list',
    get: 'servers:get',
    create: 'servers:create',
    update: 'servers:update',
    remove: 'servers:remove',
    start: 'servers:start',
    stop: 'servers:stop',
    restart: 'servers:restart',
    sendCommand: 'servers:sendCommand',
    importExisting: 'servers:importExisting',
    onProvisioningProgress: 'servers:onProvisioningProgress',
    onStatusChanged: 'servers:onStatusChanged',
    onLog: 'servers:onLog',
    onMetrics: 'servers:onMetrics',
  },
  // Versions
  versions: {
    listMinecraft: 'versions:listMinecraft',
    listLoader: 'versions:listLoader',
  },
  // Java
  java: {
    list: 'java:list',
    ensure: 'java:ensure',
  },
  // Plugins/Mods catalog
  catalog: {
    search: 'catalog:search',
    versions: 'catalog:versions',
    install: 'catalog:install',
    uninstall: 'catalog:uninstall',
    listInstalled: 'catalog:listInstalled',
    update: 'catalog:update',
    checkUpdates: 'catalog:checkUpdates',
    onInstallProgress: 'catalog:onInstallProgress',
  },
  // Backups
  backups: {
    list: 'backups:list',
    create: 'backups:create',
    restore: 'backups:restore',
    remove: 'backups:remove',
    schedule: 'backups:schedule',
    getSchedule: 'backups:getSchedule',
    onProgress: 'backups:onProgress',
  },
  // System
  system: {
    info: 'system:info',
    openPath: 'system:openPath',
    pickDirectory: 'system:pickDirectory',
  },
  // Settings
  settings: {
    get: 'settings:get',
    set: 'settings:set',
  },
  // Worlds
  worlds: {
    list: 'worlds:list',
    create: 'worlds:create',
    import: 'worlds:import',
    export: 'worlds:export',
    setGamerule: 'worlds:setGamerule',
  },
} as const;

export type IpcChannel =
  | (typeof IPC.servers)[keyof typeof IPC.servers]
  | (typeof IPC.versions)[keyof typeof IPC.versions]
  | (typeof IPC.java)[keyof typeof IPC.java]
  | (typeof IPC.catalog)[keyof typeof IPC.catalog]
  | (typeof IPC.backups)[keyof typeof IPC.backups]
  | (typeof IPC.system)[keyof typeof IPC.system]
  | (typeof IPC.settings)[keyof typeof IPC.settings]
  | (typeof IPC.worlds)[keyof typeof IPC.worlds];
