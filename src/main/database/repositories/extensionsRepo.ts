import { getDb } from '../db.js';
import type { InstalledExtension, CatalogSource } from '../../../shared/types/plugin.js';

interface Row {
  id: string;
  server_id: string;
  kind: string;
  source: string;
  project_id: string;
  version_id: string;
  name: string;
  version: string;
  filename: string;
  enabled: number;
  installed_at: string;
}

function toRecord(r: Row): InstalledExtension {
  return {
    id: r.id,
    serverId: r.server_id,
    kind: r.kind as 'plugin' | 'mod',
    source: r.source as CatalogSource,
    projectId: r.project_id,
    versionId: r.version_id,
    name: r.name,
    version: r.version,
    filename: r.filename,
    enabled: !!r.enabled,
    installedAt: r.installed_at,
  };
}

export const extensionsRepo = {
  listForServer(serverId: string): InstalledExtension[] {
    return (
      getDb()
        .prepare(`SELECT * FROM installed_extensions WHERE server_id = ? ORDER BY name`)
        .all(serverId) as Row[]
    ).map(toRecord);
  },
  get(id: string): InstalledExtension | null {
    const row = getDb()
      .prepare(`SELECT * FROM installed_extensions WHERE id = ?`)
      .get(id) as Row | undefined;
    return row ? toRecord(row) : null;
  },
  upsert(ext: InstalledExtension): void {
    getDb()
      .prepare(
        `INSERT INTO installed_extensions (
          id, server_id, kind, source, project_id, version_id, name, version, filename, enabled, installed_at
        ) VALUES (
          @id, @serverId, @kind, @source, @projectId, @versionId, @name, @version, @filename, @enabled, @installedAt
        )
        ON CONFLICT(server_id, source, project_id) DO UPDATE SET
          version_id = excluded.version_id,
          version = excluded.version,
          filename = excluded.filename,
          enabled = excluded.enabled,
          installed_at = excluded.installed_at`,
      )
      .run({ ...ext, enabled: ext.enabled ? 1 : 0 });
  },
  remove(id: string): void {
    getDb().prepare(`DELETE FROM installed_extensions WHERE id = ?`).run(id);
  },
};
