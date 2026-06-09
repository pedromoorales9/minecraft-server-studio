import { getMojangManifest, getMojangVersionMeta } from '../../../services/mojang/manifest.js';
import type { LoaderResolver } from '../types.js';

export const vanillaResolver: LoaderResolver = {
  loader: 'vanilla',
  async listLoaderVersions() {
    return [{ version: 'release', stable: true }];
  },
  async resolveArtifact(mcVersion) {
    await getMojangManifest();
    const meta = await getMojangVersionMeta(mcVersion);
    if (!meta.downloads.server) {
      throw new Error(`Mojang does not publish a server jar for ${mcVersion}`);
    }
    return {
      url: meta.downloads.server.url,
      filename: 'server.jar',
      sha1: meta.downloads.server.sha1,
      isInstaller: false,
      loaderVersion: null,
    };
  },
};
