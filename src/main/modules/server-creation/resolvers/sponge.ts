import { http } from '../../../services/downloads/httpClient.js';
import type { LoaderResolver } from '../types.js';

const BASE = 'https://dl-api.spongepowered.org/v2/groups/org.spongepowered/artifacts/spongevanilla';

interface VersionsResponse {
  artifacts: Record<string, { versions: string[] }>;
}
interface AssetsResponse {
  assets: { downloadUrl: string; classifier: string | null; extension: string }[];
}

export const spongeResolver: LoaderResolver = {
  loader: 'sponge',
  async listLoaderVersions(mcVersion) {
    try {
      const res = await http<VersionsResponse>(`${BASE}/versions?tags=minecraft:${mcVersion}`);
      const versions = Object.keys(res.body.artifacts).slice(0, 25);
      return versions.map((v) => ({ version: v, stable: !v.includes('SNAPSHOT') }));
    } catch {
      return [];
    }
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    const list = await this.listLoaderVersions(mcVersion);
    const target = loaderVersion ?? list[0]?.version;
    if (!target) throw new Error(`No SpongeVanilla build for ${mcVersion}`);
    const assets = await http<AssetsResponse>(`${BASE}/versions/${target}`);
    const universal =
      assets.body.assets.find((a) => a.classifier === 'universal') ?? assets.body.assets[0];
    if (!universal) throw new Error(`Sponge ${target} has no downloadable asset`);
    return {
      url: universal.downloadUrl,
      filename: `spongevanilla-${target}.jar`,
      isInstaller: false,
      loaderVersion: target,
    };
  },
};
