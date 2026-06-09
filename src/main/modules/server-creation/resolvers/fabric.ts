import { http } from '../../../services/downloads/httpClient.js';
import type { LoaderResolver } from '../types.js';

interface LoaderVersion {
  version: string;
  stable: boolean;
}
interface InstallerVersion {
  url: string;
  version: string;
  stable: boolean;
}

const META = 'https://meta.fabricmc.net/v2';

export const fabricResolver: LoaderResolver = {
  loader: 'fabric',
  async listLoaderVersions() {
    const res = await http<LoaderVersion[]>(`${META}/versions/loader`);
    return res.body.map((v) => ({ version: v.version, stable: v.stable }));
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    const loaders = await http<LoaderVersion[]>(`${META}/versions/loader`);
    const loader = loaderVersion
      ? loaders.body.find((l) => l.version === loaderVersion)
      : loaders.body.find((l) => l.stable);
    if (!loader) throw new Error(`No Fabric loader version available`);

    const installers = await http<InstallerVersion[]>(`${META}/versions/installer`);
    const installer = installers.body.find((i) => i.stable) ?? installers.body[0];
    if (!installer) throw new Error('No Fabric installer published');

    const url = `${META}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(
      loader.version,
    )}/${encodeURIComponent(installer.version)}/server/jar`;

    return {
      url,
      filename: `fabric-server-${mcVersion}-${loader.version}.jar`,
      isInstaller: false,
      loaderVersion: loader.version,
    };
  },
};
