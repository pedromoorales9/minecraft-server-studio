import { IPC } from '../../../shared/ipc/channels.js';
import { getMojangManifest } from '../../services/mojang/manifest.js';
import { listPaperMcVersions } from '../../modules/server-creation/resolvers/paper.js';
import { getResolver } from '../../modules/server-creation/resolvers/index.js';
import type { Loader } from '../../../shared/types/loader.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const versionHandlers: HandlerGroup = {
  [IPC.versions.listMinecraft]: async () => {
    const manifest = await getMojangManifest();
    return manifest.versions.map((v) => ({
      id: v.id,
      type: v.type,
      releaseTime: v.releaseTime,
    }));
  },
  [IPC.versions.listLoader]: async (loader, mc) => {
    // Paper exposes its own list of supported MC versions, separate from Mojang.
    if (loader === 'paper' && mc === '__list_mc__') {
      const list = await listPaperMcVersions();
      return list.map((v) => ({ version: v, stable: true }));
    }
    const resolver = getResolver(loader as Loader);
    return resolver.listLoaderVersions(mc as string);
  },
};
