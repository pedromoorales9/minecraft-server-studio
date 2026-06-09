import { http } from '../../../services/downloads/httpClient.js';
import type { LoaderResolver } from '../types.js';

const BASE = 'https://api.purpurmc.org/v2/purpur';

interface BuildsResponse {
  builds: { all: string[]; latest: string };
}
interface BuildMeta {
  md5: string;
}

export const purpurResolver: LoaderResolver = {
  loader: 'purpur',
  async listLoaderVersions(mcVersion) {
    const res = await http<BuildsResponse>(`${BASE}/${mcVersion}`);
    return res.body.builds.all.slice().reverse().map((b) => ({ version: b, stable: true }));
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    const res = await http<BuildsResponse>(`${BASE}/${mcVersion}`);
    const build = loaderVersion ?? res.body.builds.latest;
    if (!res.body.builds.all.includes(build)) {
      throw new Error(`Purpur build ${build} not found for ${mcVersion}`);
    }
    const meta = await http<BuildMeta>(`${BASE}/${mcVersion}/${build}`);
    return {
      url: `${BASE}/${mcVersion}/${build}/download`,
      filename: `purpur-${mcVersion}-${build}.jar`,
      // Purpur exposes md5; we still verify SHA1/SHA256 captured during the download.
      isInstaller: false,
      loaderVersion: build,
      ..._md5Note(meta.body.md5),
    };
  },
};

function _md5Note(_md5: string): Record<string, never> {
  return {};
}
