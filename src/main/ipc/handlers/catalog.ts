import { IPC } from '../../../shared/ipc/channels.js';
import { catalog } from '../../modules/catalog/aggregator.js';
import { catalogInstaller } from '../../modules/catalog/installer.js';
import { extensionsRepo } from '../../database/repositories/extensionsRepo.js';
import type { CatalogSearchRequest, CatalogSource } from '../../../shared/types/plugin.js';
import type { Loader } from '../../../shared/types/loader.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const catalogHandlers: HandlerGroup = {
  [IPC.catalog.search]: (req) => catalog.search(req as CatalogSearchRequest),
  [IPC.catalog.versions]: (args) =>
    catalog.versions(
      args as { source: CatalogSource; projectId: string; loader?: Loader; gameVersion?: string },
    ),
  [IPC.catalog.install]: (args) =>
    catalogInstaller.install(
      args as {
        serverId: string;
        source: CatalogSource;
        projectId: string;
        versionId: string;
        kind: 'plugin' | 'mod';
      },
    ),
  [IPC.catalog.uninstall]: (args) =>
    catalogInstaller.uninstall(args as { serverId: string; installedId: string }),
  [IPC.catalog.listInstalled]: (serverId) => extensionsRepo.listForServer(serverId as string),
  [IPC.catalog.update]: (args) =>
    catalogInstaller.update(args as { serverId: string; installedId: string }),
  [IPC.catalog.checkUpdates]: (serverId) => catalogInstaller.checkUpdates(serverId as string),
};
