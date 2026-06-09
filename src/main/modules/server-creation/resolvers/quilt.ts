import { http } from '../../../services/downloads/httpClient.js';
import type { LoaderResolver } from '../types.js';

const META = 'https://meta.quiltmc.org/v3';

interface LoaderVersion {
  version: string;
}
interface InstallerVersion {
  version: string;
  url: string;
}

export const quiltResolver: LoaderResolver = {
  loader: 'quilt',
  async listLoaderVersions() {
    const res = await http<LoaderVersion[]>(`${META}/versions/loader`);
    return res.body.map((l) => ({ version: l.version, stable: !l.version.includes('beta') }));
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    const installers = await http<InstallerVersion[]>(`${META}/versions/installer`);
    const installer = installers.body[0];
    if (!installer) throw new Error('No Quilt installer published');
    const url = `${META}/versions/loader/${encodeURIComponent(mcVersion)}/${encodeURIComponent(
      loaderVersion ?? 'latest',
    )}/${encodeURIComponent(installer.version)}/server/jar`;
    return {
      url,
      filename: `quilt-server-${mcVersion}.jar`,
      isInstaller: false,
      loaderVersion: loaderVersion ?? null,
    };
  },
};
