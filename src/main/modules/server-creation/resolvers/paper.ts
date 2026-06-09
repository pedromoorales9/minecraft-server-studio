import { http } from '../../../services/downloads/httpClient.js';
import type { LoaderResolver } from '../types.js';

interface ProjectVersionsResponse {
  versions: string[];
}
interface BuildsResponse {
  builds: Array<{
    build: number;
    channel: 'default' | 'experimental';
    downloads: { application: { name: string; sha256: string } };
  }>;
}

const BASE = 'https://api.papermc.io/v2/projects/paper';

/**
 * Resolver for PaperMC. We pick the latest stable build for the requested
 * Minecraft version; users can choose an experimental channel later if they
 * want — but the default path stays on `channel === 'default'`.
 */
export const paperResolver: LoaderResolver = {
  loader: 'paper',
  async listLoaderVersions(mcVersion) {
    const res = await http<BuildsResponse>(`${BASE}/versions/${mcVersion}/builds`);
    return res.body.builds
      .slice()
      .reverse()
      .map((b) => ({ version: String(b.build), stable: b.channel === 'default' }));
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    const res = await http<BuildsResponse>(`${BASE}/versions/${mcVersion}/builds`);
    const stable = res.body.builds.filter((b) => b.channel === 'default');
    const pool = stable.length ? stable : res.body.builds;
    const target = loaderVersion
      ? pool.find((b) => String(b.build) === loaderVersion)
      : pool[pool.length - 1];
    if (!target) throw new Error(`No Paper build available for ${mcVersion}`);
    const filename = target.downloads.application.name;
    return {
      url: `${BASE}/versions/${mcVersion}/builds/${target.build}/downloads/${filename}`,
      filename,
      sha256: target.downloads.application.sha256,
      isInstaller: false,
      loaderVersion: String(target.build),
    };
  },
};

export async function listPaperMcVersions(): Promise<string[]> {
  const res = await http<ProjectVersionsResponse>(BASE);
  return res.body.versions;
}
