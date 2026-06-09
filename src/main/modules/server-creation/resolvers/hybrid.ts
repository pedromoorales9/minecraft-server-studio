import { http } from '../../../services/downloads/httpClient.js';
import type { Loader } from '../../../../shared/types/loader.js';
import type { LoaderResolver } from '../types.js';

/**
 * Hybrid loaders (Mohist, Arclight, Magma) expose their builds through
 * their own download APIs. We model the three as parameterised resolvers
 * over the same shape: `/api/v2/projects/<loader>/<mc>/builds/<id>/download`.
 */

interface HybridBuild {
  number: number;
  status: string;
  fileSha256?: string;
}

interface HybridBuildsResponse {
  projectName: string;
  projectVersion: string;
  builds: HybridBuild[];
}

function makeHybridResolver(loader: Loader, api: string): LoaderResolver {
  return {
    loader,
    async listLoaderVersions(mcVersion: string) {
      try {
        const res = await http<HybridBuildsResponse>(`${api}/${mcVersion}/builds`);
        return res.body.builds
          .filter((b) => b.status === 'SUCCESS')
          .slice(-25)
          .reverse()
          .map((b) => ({ version: String(b.number), stable: true }));
      } catch {
        return [];
      }
    },
    async resolveArtifact(mcVersion, loaderVersion) {
      const res = await http<HybridBuildsResponse>(`${api}/${mcVersion}/builds`);
      const builds = res.body.builds.filter((b) => b.status === 'SUCCESS');
      const target = loaderVersion
        ? builds.find((b) => String(b.number) === loaderVersion)
        : builds[builds.length - 1];
      if (!target) throw new Error(`No ${loader} build available for ${mcVersion}`);
      return {
        url: `${api}/${mcVersion}/builds/${target.number}/download`,
        filename: `${loader}-${mcVersion}-${target.number}.jar`,
        isInstaller: false,
        loaderVersion: String(target.number),
        sha256: target.fileSha256,
      };
    },
  };
}

export const hybridResolvers: Partial<Record<Loader, LoaderResolver>> = {
  mohist: makeHybridResolver('mohist', 'https://mohistmc.com/api/v2/projects/mohist'),
  arclight: makeHybridResolver(
    'arclight',
    'https://files.hypoglycemia.icu/v1/files/arclight/snapshots/branches',
  ),
  magma: makeHybridResolver('magma', 'https://api.magmafoundation.org/api/v2/Magma'),
};
