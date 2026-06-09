import type Database from 'better-sqlite3';

/**
 * Schema migrations. Each migration is idempotent and applied in version order.
 * The `_meta` table tracks the highest applied version so the app can ship
 * additional migrations safely.
 */
interface Migration {
  version: number;
  description: string;
  up: (db: Database.Database) => void;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'initial schema',
    up: (db) => {
      db.exec(`
        CREATE TABLE servers (
          id              TEXT PRIMARY KEY,
          name            TEXT NOT NULL,
          loader          TEXT NOT NULL,
          minecraft_version TEXT NOT NULL,
          loader_version  TEXT,
          content_mode    TEXT NOT NULL DEFAULT 'none',
          auth_mode       TEXT NOT NULL DEFAULT 'premium',
          port            INTEGER NOT NULL,
          ram_min_mb      INTEGER NOT NULL,
          ram_max_mb      INTEGER NOT NULL,
          world_name      TEXT NOT NULL DEFAULT 'world',
          directory       TEXT NOT NULL,
          java_path       TEXT,
          java_major      INTEGER NOT NULL DEFAULT 21,
          status          TEXT NOT NULL DEFAULT 'stopped',
          rcon_port       INTEGER,
          rcon_password   TEXT,
          auto_start      INTEGER NOT NULL DEFAULT 0,
          auto_backup     INTEGER NOT NULL DEFAULT 0,
          motd            TEXT NOT NULL DEFAULT 'A Minecraft Server',
          max_players     INTEGER NOT NULL DEFAULT 20,
          difficulty      TEXT NOT NULL DEFAULT 'normal',
          gamemode        TEXT NOT NULL DEFAULT 'survival',
          created_at      TEXT NOT NULL,
          updated_at      TEXT NOT NULL,
          last_started_at TEXT,
          eula_accepted_at TEXT
        );

        CREATE TABLE installed_extensions (
          id            TEXT PRIMARY KEY,
          server_id     TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
          kind          TEXT NOT NULL,
          source        TEXT NOT NULL,
          project_id    TEXT NOT NULL,
          version_id    TEXT NOT NULL,
          name          TEXT NOT NULL,
          version       TEXT NOT NULL,
          filename      TEXT NOT NULL,
          enabled       INTEGER NOT NULL DEFAULT 1,
          installed_at  TEXT NOT NULL,
          UNIQUE(server_id, source, project_id)
        );
        CREATE INDEX idx_ext_server ON installed_extensions(server_id);

        CREATE TABLE backups (
          id          TEXT PRIMARY KEY,
          server_id   TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
          trigger     TEXT NOT NULL,
          path        TEXT NOT NULL,
          size_bytes  INTEGER NOT NULL,
          sha256      TEXT NOT NULL,
          created_at  TEXT NOT NULL,
          note        TEXT
        );
        CREATE INDEX idx_backup_server ON backups(server_id);

        CREATE TABLE backup_schedules (
          server_id   TEXT PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
          enabled     INTEGER NOT NULL,
          cron        TEXT NOT NULL,
          retention   INTEGER NOT NULL DEFAULT 7
        );

        CREATE TABLE events (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id   TEXT REFERENCES servers(id) ON DELETE CASCADE,
          ts          TEXT NOT NULL,
          kind        TEXT NOT NULL,
          message     TEXT NOT NULL,
          metadata    TEXT
        );
        CREATE INDEX idx_event_server_ts ON events(server_id, ts);

        CREATE TABLE players (
          id              INTEGER PRIMARY KEY AUTOINCREMENT,
          server_id       TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
          uuid            TEXT NOT NULL,
          username        TEXT NOT NULL,
          first_seen      TEXT NOT NULL,
          last_seen       TEXT NOT NULL,
          playtime_seconds INTEGER NOT NULL DEFAULT 0,
          banned          INTEGER NOT NULL DEFAULT 0,
          op_level        INTEGER NOT NULL DEFAULT 0,
          UNIQUE(server_id, uuid)
        );

        CREATE TABLE java_runtimes (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          major       INTEGER NOT NULL,
          vendor      TEXT NOT NULL,
          path        TEXT NOT NULL UNIQUE,
          installed_at TEXT NOT NULL
        );

        CREATE TABLE downloads (
          id          INTEGER PRIMARY KEY AUTOINCREMENT,
          url         TEXT NOT NULL,
          target_path TEXT NOT NULL,
          sha1        TEXT,
          sha256      TEXT,
          size_bytes  INTEGER,
          finished_at TEXT NOT NULL,
          UNIQUE(target_path)
        );

        CREATE TABLE settings (
          key     TEXT PRIMARY KEY,
          value   TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE catalog_cache (
          source      TEXT NOT NULL,
          cache_key   TEXT NOT NULL,
          payload     TEXT NOT NULL,
          fetched_at  TEXT NOT NULL,
          ttl_seconds INTEGER NOT NULL,
          PRIMARY KEY (source, cache_key)
        );

        CREATE TABLE metrics_history (
          server_id   TEXT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
          ts          INTEGER NOT NULL,
          cpu_percent REAL NOT NULL,
          memory_used_mb INTEGER NOT NULL,
          tps         REAL,
          mspt        REAL,
          players_online INTEGER NOT NULL,
          PRIMARY KEY (server_id, ts)
        );
      `);
    },
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const row = db.prepare(`SELECT value FROM _meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  const current = row ? Number(row.value) : 0;
  for (const m of MIGRATIONS) {
    if (m.version > current) {
      db.transaction(() => {
        m.up(db);
        db.prepare(
          `INSERT INTO _meta (key, value) VALUES ('schema_version', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        ).run(String(m.version));
      })();
    }
  }
}
