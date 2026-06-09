import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { nanoid } from 'nanoid';
import log from 'electron-log/main.js';
import { modrinthSource } from './sources/modrinth.js';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { extensionsRepo } from '../../database/repositories/extensionsRepo.js';
import { downloadFile } from '../../services/downloads/downloader.js';
import { broadcast } from '../../ipc/broadcast.js';
import { IPC } from '../../../shared/ipc/channels.js';
import { supportsMods, supportsPlugins } from '../../../shared/types/loader.js';
import type {
  CatalogSource,
  CatalogVersion,
  InstalledExtension,
} from '../../../shared/types/plugin.js';

/**
 * Installs a plugin or mod into the appropriate server folder.
 *
 *   plugins/      → for Paper/Spigot/Bukkit-family loaders (and hybrids)
 *   mods/         → for Fabric/Forge/NeoForge/Quilt
 *
 * Required dependencies are installed transitively. Incompatible dependencies
 * abort the install with a clear error so users see the conflict before launch.
 */
export const catalogInstaller = {
  async install(args: {
    serverId: string;
    source: CatalogSource;
    projectId: string;
    versionId: string;
    kind: 'plugin' | 'mod';
  }): Promise<InstalledExtension> {
    const server = serversRepo.get(args.serverId);
    if (!server) throw new Error('Server not found');

    if (args.kind === 'plugin' && !supportsPlugins(server.loader)) {
      throw new Error(`${server.loader} does not support plugins`);
    }
    if (args.kind === 'mod' && !supportsMods(server.loader)) {
      throw new Error(`${server.loader} does not support mods`);
    }

    const installed = await installRecursive(
      server.directory,
      server.id,
      args.kind,
      args.source,
      args.projectId,
      args.versionId,
    );
    const root = installed[0];
    if (!root) throw new Error('Install returned no entries');
    return root;
  },

  async uninstall(args: { serverId: string; installedId: string }): Promise<void> {
    const ext = extensionsRepo.get(args.installedId);
    if (!ext) return;
    const server = serversRepo.get(args.serverId);
    if (!server) return;
    const subdir = ext.kind === 'plugin' ? 'plugins' : 'mods';
    const file = path.join(server.directory, subdir, ext.filename);
    await fsp.rm(file, { force: true });
    extensionsRepo.remove(args.installedId);
  },

  async update(args: { serverId: string; installedId: string }): Promise<InstalledExtension> {
    const ext = extensionsRepo.get(args.installedId);
    if (!ext) throw new Error('Extension not found');
    const server = serversRepo.get(args.serverId);
    if (!server) throw new Error('Server not found');
    const versions = await modrinthSource.versions(ext.projectId, {
      loader: server.loader,
      gameVersion: server.minecraftVersion,
    });
    const latest = versions[0];
    if (!latest) throw new Error('No compatible version found for update');
    if (latest.versionId === ext.versionId) return ext;
    await this.uninstall({ serverId: args.serverId, installedId: args.installedId });
    return this.install({
      serverId: args.serverId,
      source: ext.source,
      projectId: ext.projectId,
      versionId: latest.versionId,
      kind: ext.kind,
    });
  },

  async checkUpdates(serverId: string): Promise<InstalledExtension[]> {
    const server = serversRepo.get(serverId);
    if (!server) return [];
    const installed = extensionsRepo.listForServer(serverId);
    const updatable: InstalledExtension[] = [];
    for (const ext of installed) {
      if (ext.source !== 'modrinth') continue;
      try {
        const versions = await modrinthSource.versions(ext.projectId, {
          loader: server.loader,
          gameVersion: server.minecraftVersion,
        });
        const latest = versions[0];
        if (latest && latest.versionId !== ext.versionId) updatable.push(ext);
      } catch (e) {
        log.warn('Update check failed', { ext: ext.name, err: e });
      }
    }
    return updatable;
  },
};

async function installRecursive(
  serverDir: string,
  serverId: string,
  kind: 'plugin' | 'mod',
  source: CatalogSource,
  projectId: string,
  versionId: string,
  seen = new Set<string>(),
): Promise<InstalledExtension[]> {
  const key = `${source}:${projectId}:${versionId}`;
  if (seen.has(key)) return [];
  seen.add(key);

  const version: CatalogVersion =
    source === 'modrinth' ? await modrinthSource.version(versionId) : (() => {
      throw new Error(`Install from ${source} not yet implemented`);
    })();

  // Reject incompatibles up front.
  const incompatible = version.dependencies.find((d) => d.type === 'incompatible');
  if (incompatible) {
    throw new Error(
      `Version is marked incompatible with another installed extension (${incompatible.projectId ?? 'unknown'})`,
    );
  }

  // Pick the primary file.
  const file = version.files.find((f) => f.primary) ?? version.files[0];
  if (!file) throw new Error('No file in catalog version');

  const subdir = kind === 'plugin' ? 'plugins' : 'mods';
  const target = path.join(serverDir, subdir, file.filename);
  await fsp.mkdir(path.dirname(target), { recursive: true });

  broadcast(IPC.catalog.onInstallProgress, {
    serverId,
    projectId,
    progress: 0,
    message: `Descargando ${file.filename}`,
  });

  await downloadFile({
    url: file.url,
    destination: target,
    expectedHash: file.sha512
      ? { algo: 'sha512', value: file.sha512 }
      : file.sha1
        ? { algo: 'sha1', value: file.sha1 }
        : undefined,
    onProgress: (transferred, total) => {
      broadcast(IPC.catalog.onInstallProgress, {
        serverId,
        projectId,
        progress: total ? transferred / total : 0,
        message: `Descargando ${file.filename}`,
      });
    },
  });

  const record: InstalledExtension = {
    id: `ext_${nanoid(10)}`,
    serverId,
    kind,
    source,
    projectId,
    versionId,
    name: file.filename.replace(/\.jar$/i, ''),
    version: version.versionNumber,
    filename: file.filename,
    enabled: true,
    installedAt: new Date().toISOString(),
  };
  extensionsRepo.upsert(record);

  const results: InstalledExtension[] = [record];

  // Install required dependencies.
  for (const dep of version.dependencies) {
    if (dep.type !== 'required') continue;
    if (!dep.projectId) continue;
    try {
      const depVersions = await modrinthSource.versions(dep.projectId);
      const depVersion = dep.versionId
        ? depVersions.find((v) => v.versionId === dep.versionId)
        : depVersions[0];
      if (!depVersion) continue;
      const deps = await installRecursive(
        serverDir,
        serverId,
        kind,
        'modrinth',
        dep.projectId,
        depVersion.versionId,
        seen,
      );
      results.push(...deps);
    } catch (e) {
      log.warn('Failed to install required dependency', { projectId: dep.projectId, err: e });
    }
  }

  broadcast(IPC.catalog.onInstallProgress, {
    serverId,
    projectId,
    progress: 1,
    message: `Instalado`,
  });

  return results;
}
