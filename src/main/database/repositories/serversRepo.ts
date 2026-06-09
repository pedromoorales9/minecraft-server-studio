import { getDb } from '../db.js';
import type { ServerRecord, ServerStatus } from '../../../shared/types/server.js';

interface Row {
  id: string;
  name: string;
  loader: string;
  minecraft_version: string;
  loader_version: string | null;
  content_mode: string;
  auth_mode: string;
  port: number;
  ram_min_mb: number;
  ram_max_mb: number;
  world_name: string;
  directory: string;
  java_path: string | null;
  java_major: number;
  status: string;
  rcon_port: number | null;
  rcon_password: string | null;
  auto_start: number;
  auto_backup: number;
  motd: string;
  max_players: number;
  difficulty: string;
  gamemode: string;
  created_at: string;
  updated_at: string;
  last_started_at: string | null;
  eula_accepted_at: string | null;
}

function toRecord(r: Row): ServerRecord {
  return {
    id: r.id,
    name: r.name,
    loader: r.loader as ServerRecord['loader'],
    minecraftVersion: r.minecraft_version,
    loaderVersion: r.loader_version,
    contentMode: r.content_mode as ServerRecord['contentMode'],
    authMode: r.auth_mode as ServerRecord['authMode'],
    port: r.port,
    ramMinMb: r.ram_min_mb,
    ramMaxMb: r.ram_max_mb,
    worldName: r.world_name,
    directory: r.directory,
    javaPath: r.java_path,
    javaMajor: r.java_major,
    status: r.status as ServerStatus,
    rconPort: r.rcon_port,
    rconPassword: r.rcon_password,
    autoStart: !!r.auto_start,
    autoBackup: !!r.auto_backup,
    motd: r.motd,
    maxPlayers: r.max_players,
    difficulty: r.difficulty as ServerRecord['difficulty'],
    gamemode: r.gamemode as ServerRecord['gamemode'],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    lastStartedAt: r.last_started_at,
    eulaAcceptedAt: r.eula_accepted_at,
  };
}

export const serversRepo = {
  list(): ServerRecord[] {
    return (getDb().prepare(`SELECT * FROM servers ORDER BY created_at DESC`).all() as Row[]).map(
      toRecord,
    );
  },
  get(id: string): ServerRecord | null {
    const row = getDb().prepare(`SELECT * FROM servers WHERE id = ?`).get(id) as Row | undefined;
    return row ? toRecord(row) : null;
  },
  insert(rec: ServerRecord): void {
    getDb()
      .prepare(
        `INSERT INTO servers (
        id, name, loader, minecraft_version, loader_version, content_mode, auth_mode,
        port, ram_min_mb, ram_max_mb, world_name, directory, java_path, java_major,
        status, rcon_port, rcon_password, auto_start, auto_backup, motd, max_players,
        difficulty, gamemode, created_at, updated_at, last_started_at, eula_accepted_at
      ) VALUES (
        @id, @name, @loader, @minecraftVersion, @loaderVersion, @contentMode, @authMode,
        @port, @ramMinMb, @ramMaxMb, @worldName, @directory, @javaPath, @javaMajor,
        @status, @rconPort, @rconPassword, @autoStart, @autoBackup, @motd, @maxPlayers,
        @difficulty, @gamemode, @createdAt, @updatedAt, @lastStartedAt, @eulaAcceptedAt
      )`,
      )
      .run({
        ...rec,
        autoStart: rec.autoStart ? 1 : 0,
        autoBackup: rec.autoBackup ? 1 : 0,
      });
  },
  updateStatus(id: string, status: ServerStatus): void {
    getDb()
      .prepare(`UPDATE servers SET status = ?, updated_at = ? WHERE id = ?`)
      .run(status, new Date().toISOString(), id);
  },
  patch(id: string, patch: Partial<ServerRecord>): void {
    const allowed: (keyof ServerRecord)[] = [
      'name',
      'port',
      'ramMinMb',
      'ramMaxMb',
      'motd',
      'maxPlayers',
      'difficulty',
      'gamemode',
      'autoStart',
      'autoBackup',
      'authMode',
      'javaPath',
      'javaMajor',
      'rconPort',
      'rconPassword',
      'eulaAcceptedAt',
      'lastStartedAt',
    ];
    const colMap: Record<string, string> = {
      ramMinMb: 'ram_min_mb',
      ramMaxMb: 'ram_max_mb',
      maxPlayers: 'max_players',
      autoStart: 'auto_start',
      autoBackup: 'auto_backup',
      authMode: 'auth_mode',
      javaPath: 'java_path',
      javaMajor: 'java_major',
      rconPort: 'rcon_port',
      rconPassword: 'rcon_password',
      eulaAcceptedAt: 'eula_accepted_at',
      lastStartedAt: 'last_started_at',
    };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (patch[key] === undefined) continue;
      const col = colMap[key] ?? key;
      sets.push(`${col} = ?`);
      let v: unknown = patch[key];
      if (typeof v === 'boolean') v = v ? 1 : 0;
      values.push(v);
    }
    if (!sets.length) return;
    sets.push(`updated_at = ?`);
    values.push(new Date().toISOString());
    values.push(id);
    getDb().prepare(`UPDATE servers SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  },
  remove(id: string): void {
    getDb().prepare(`DELETE FROM servers WHERE id = ?`).run(id);
  },
};
