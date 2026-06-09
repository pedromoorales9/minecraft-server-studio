import type { Loader } from './loader.js';

export type ServerStatus =
  | 'stopped'
  | 'starting'
  | 'running'
  | 'stopping'
  | 'crashed'
  | 'updating';

export type ServerContentMode = 'none' | 'plugins' | 'mods' | 'plugins+mods';
export type AuthMode = 'premium' | 'offline';

export interface ServerRecord {
  id: string;
  name: string;
  loader: Loader;
  minecraftVersion: string;
  loaderVersion: string | null;
  contentMode: ServerContentMode;
  authMode: AuthMode;
  port: number;
  ramMinMb: number;
  ramMaxMb: number;
  worldName: string;
  directory: string;
  javaPath: string | null;
  javaMajor: number;
  status: ServerStatus;
  rconPort: number | null;
  rconPassword: string | null;
  autoStart: boolean;
  autoBackup: boolean;
  motd: string;
  maxPlayers: number;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
  createdAt: string;
  updatedAt: string;
  lastStartedAt: string | null;
  eulaAcceptedAt: string | null;
}

export interface CreateServerRequest {
  name: string;
  loader: Loader;
  minecraftVersion: string;
  loaderVersion?: string | null;
  contentMode: ServerContentMode;
  authMode: AuthMode;
  port: number;
  ramMinMb: number;
  ramMaxMb: number;
  worldName: string;
  motd?: string;
  maxPlayers?: number;
  eulaAccepted: boolean;
}

export interface ServerProvisioningProgress {
  serverId: string;
  phase:
    | 'init'
    | 'java'
    | 'jar'
    | 'install'
    | 'config'
    | 'plugins'
    | 'mods'
    | 'finalize'
    | 'done'
    | 'error';
  message: string;
  progress: number; // 0..1
  detail?: string;
}

export interface ServerMetricsSnapshot {
  serverId: string;
  timestamp: number;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryAllocatedMb: number;
  tps: number | null;
  mspt: number | null;
  playersOnline: number;
  playersMax: number;
  loadedChunks: number | null;
  entities: number | null;
}
