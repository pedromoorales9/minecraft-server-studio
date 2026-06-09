import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from '../shared/ipc/channels.js';
import type { RendererApi } from '../shared/ipc/contract.js';

/**
 * Bridges typed IPC into the renderer through `window.api`.
 *
 * No Node.js primitives leak. Every call funnels through `ipcRenderer.invoke`
 * or `ipcRenderer.on`, and subscriptions return a disposer that removes the
 * listener — so React effect cleanup is straightforward.
 */
function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_e: Electron.IpcRendererEvent, payload: T) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.off(channel, handler);
}

const api: RendererApi = {
  servers: {
    list: () => ipcRenderer.invoke(IPC.servers.list),
    get: (id) => ipcRenderer.invoke(IPC.servers.get, id),
    create: (req) => ipcRenderer.invoke(IPC.servers.create, req),
    update: (id, patch) => ipcRenderer.invoke(IPC.servers.update, id, patch),
    remove: (id, options) => ipcRenderer.invoke(IPC.servers.remove, id, options),
    start: (id) => ipcRenderer.invoke(IPC.servers.start, id),
    stop: (id, options) => ipcRenderer.invoke(IPC.servers.stop, id, options),
    restart: (id) => ipcRenderer.invoke(IPC.servers.restart, id),
    sendCommand: (id, command) => ipcRenderer.invoke(IPC.servers.sendCommand, id, command),
    importExisting: (directory) => ipcRenderer.invoke(IPC.servers.importExisting, directory),
    onProvisioningProgress: (cb) => subscribe(IPC.servers.onProvisioningProgress, cb),
    onStatusChanged: (cb) => subscribe(IPC.servers.onStatusChanged, cb),
    onLog: (cb) => subscribe(IPC.servers.onLog, cb),
    onMetrics: (cb) => subscribe(IPC.servers.onMetrics, cb),
  },
  versions: {
    listMinecraft: () => ipcRenderer.invoke(IPC.versions.listMinecraft),
    listLoader: (loader, mc) => ipcRenderer.invoke(IPC.versions.listLoader, loader, mc),
  },
  java: {
    list: () => ipcRenderer.invoke(IPC.java.list),
    ensure: (major) => ipcRenderer.invoke(IPC.java.ensure, major),
  },
  catalog: {
    search: (req) => ipcRenderer.invoke(IPC.catalog.search, req),
    versions: (args) => ipcRenderer.invoke(IPC.catalog.versions, args),
    install: (args) => ipcRenderer.invoke(IPC.catalog.install, args),
    uninstall: (args) => ipcRenderer.invoke(IPC.catalog.uninstall, args),
    listInstalled: (serverId) => ipcRenderer.invoke(IPC.catalog.listInstalled, serverId),
    update: (args) => ipcRenderer.invoke(IPC.catalog.update, args),
    checkUpdates: (serverId) => ipcRenderer.invoke(IPC.catalog.checkUpdates, serverId),
    onInstallProgress: (cb) => subscribe(IPC.catalog.onInstallProgress, cb),
  },
  backups: {
    list: (serverId) => ipcRenderer.invoke(IPC.backups.list, serverId),
    create: (args) => ipcRenderer.invoke(IPC.backups.create, args),
    restore: (args) => ipcRenderer.invoke(IPC.backups.restore, args),
    remove: (args) => ipcRenderer.invoke(IPC.backups.remove, args),
    schedule: (cfg) => ipcRenderer.invoke(IPC.backups.schedule, cfg),
    getSchedule: (serverId) => ipcRenderer.invoke(IPC.backups.getSchedule, serverId),
    onProgress: (cb) => subscribe(IPC.backups.onProgress, cb),
  },
  system: {
    info: () => ipcRenderer.invoke(IPC.system.info),
    openPath: (p) => ipcRenderer.invoke(IPC.system.openPath, p),
    pickDirectory: () => ipcRenderer.invoke(IPC.system.pickDirectory),
  },
  settings: {
    get: (key) => ipcRenderer.invoke(IPC.settings.get, key),
    set: (key, value) => ipcRenderer.invoke(IPC.settings.set, key, value),
  },
  worlds: {
    list: (serverId) => ipcRenderer.invoke(IPC.worlds.list, serverId),
    create: (args) => ipcRenderer.invoke(IPC.worlds.create, args),
    import: (args) => ipcRenderer.invoke(IPC.worlds.import, args),
    export: (args) => ipcRenderer.invoke(IPC.worlds.export, args),
    setGamerule: (args) => ipcRenderer.invoke(IPC.worlds.setGamerule, args),
  },
};

contextBridge.exposeInMainWorld('api', api);
