import type {
  ServerRecord,
  CreateServerRequest,
  ServerProvisioningProgress,
  ServerMetricsSnapshot,
  ServerStatus,
  CatalogSearchRequest,
  CatalogSearchResult,
  CatalogVersion,
  InstalledExtension,
  BackupRecord,
  BackupScheduleConfig,
  LogLine,
  Loader,
} from '../types/index.js';

/**
 * The renderer-facing API exposed by the preload through contextBridge.
 *
 * Every method is async and returns a serialisable value. Subscriptions
 * return a disposer function to remove the listener.
 */
export interface RendererApi {
  servers: {
    list(): Promise<ServerRecord[]>;
    get(id: string): Promise<ServerRecord | null>;
    create(req: CreateServerRequest): Promise<ServerRecord>;
    update(id: string, patch: Partial<ServerRecord>): Promise<ServerRecord>;
    remove(id: string, options?: { deleteFiles?: boolean }): Promise<void>;
    start(id: string): Promise<void>;
    stop(id: string, options?: { force?: boolean }): Promise<void>;
    restart(id: string): Promise<void>;
    sendCommand(id: string, command: string): Promise<void>;
    importExisting(directory: string): Promise<ServerRecord>;
    onProvisioningProgress(cb: (p: ServerProvisioningProgress) => void): () => void;
    onStatusChanged(cb: (e: { serverId: string; status: ServerStatus }) => void): () => void;
    onLog(cb: (line: LogLine) => void): () => void;
    onMetrics(cb: (snap: ServerMetricsSnapshot) => void): () => void;
  };
  versions: {
    listMinecraft(): Promise<{ id: string; type: string; releaseTime: string }[]>;
    listLoader(loader: Loader, mcVersion: string): Promise<{ version: string; stable: boolean }[]>;
  };
  java: {
    list(): Promise<{ major: number; path: string; vendor: string }[]>;
    ensure(major: number): Promise<{ major: number; path: string }>;
  };
  catalog: {
    search(req: CatalogSearchRequest): Promise<CatalogSearchResult>;
    versions(args: {
      source: string;
      projectId: string;
      loader?: Loader;
      gameVersion?: string;
    }): Promise<CatalogVersion[]>;
    install(args: {
      serverId: string;
      source: string;
      projectId: string;
      versionId: string;
      kind: 'plugin' | 'mod';
    }): Promise<InstalledExtension>;
    uninstall(args: { serverId: string; installedId: string }): Promise<void>;
    listInstalled(serverId: string): Promise<InstalledExtension[]>;
    update(args: { serverId: string; installedId: string }): Promise<InstalledExtension>;
    checkUpdates(serverId: string): Promise<InstalledExtension[]>;
    onInstallProgress(
      cb: (e: { serverId: string; projectId: string; progress: number; message: string }) => void,
    ): () => void;
  };
  backups: {
    list(serverId: string): Promise<BackupRecord[]>;
    create(args: { serverId: string; note?: string }): Promise<BackupRecord>;
    restore(args: { backupId: string }): Promise<void>;
    remove(args: { backupId: string }): Promise<void>;
    schedule(cfg: BackupScheduleConfig): Promise<void>;
    getSchedule(serverId: string): Promise<BackupScheduleConfig | null>;
    onProgress(
      cb: (e: { serverId: string; phase: string; progress: number }) => void,
    ): () => void;
  };
  system: {
    info(): Promise<{
      platform: string;
      arch: string;
      totalRamMb: number;
      cpuModel: string;
      cores: number;
    }>;
    openPath(p: string): Promise<void>;
    pickDirectory(): Promise<string | null>;
  };
  settings: {
    get<T = unknown>(key: string): Promise<T | null>;
    set<T = unknown>(key: string, value: T): Promise<void>;
  };
  worlds: {
    list(serverId: string): Promise<{ name: string; sizeBytes: number }[]>;
    create(args: {
      serverId: string;
      name: string;
      seed?: string;
      gamemode?: string;
    }): Promise<void>;
    import(args: { serverId: string; sourcePath: string }): Promise<void>;
    export(args: { serverId: string; worldName: string; targetPath: string }): Promise<void>;
    setGamerule(args: {
      serverId: string;
      rule: string;
      value: string | number | boolean;
    }): Promise<void>;
  };
}

declare global {
  interface Window {
    api: RendererApi;
  }
}
