import { http } from '../../../services/downloads/httpClient.js';
import { catalogCacheRepo } from '../../../database/repositories/cacheRepo.js';
import type {
  CatalogEntry,
  CatalogVersion,
  CatalogVersionFile,
  CatalogDependency,
  CatalogSearchRequest,
  CatalogSearchResult,
} from '../../../../shared/types/plugin.js';
import type { Loader } from '../../../../shared/types/loader.js';

const BASE = 'https://api.modrinth.com/v2';

interface MrSearchResponse {
  hits: Array<{
    project_id: string;
    slug: string;
    title: string;
    description: string;
    author: string;
    icon_url: string | null;
    categories: string[];
    versions: string[];
    downloads: number;
    follows: number;
    latest_version: string | null;
    date_modified: string;
    project_type: string;
  }>;
  total_hits: number;
}

interface MrVersion {
  id: string;
  version_number: string;
  changelog: string | null;
  game_versions: string[];
  loaders: string[];
  date_published: string;
  files: Array<{
    url: string;
    filename: string;
    primary: boolean;
    size: number;
    hashes: { sha1?: string; sha512?: string };
  }>;
  dependencies: Array<{
    project_id: string | null;
    version_id: string | null;
    dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded';
  }>;
}

function loaderFacet(req: CatalogSearchRequest): string[] {
  const facets: string[] = [];
  if (req.kind === 'plugin') {
    facets.push('["project_type:plugin"]');
  } else if (req.kind === 'mod') {
    facets.push('["project_type:mod"]');
  }
  if (req.loader) facets.push(`["categories:${req.loader}"]`);
  if (req.gameVersion) facets.push(`["versions:${req.gameVersion}"]`);
  return facets;
}

export const modrinthSource = {
  async search(req: CatalogSearchRequest): Promise<CatalogSearchResult> {
    const cacheKey = `search:${JSON.stringify(req)}`;
    const cached = catalogCacheRepo.get<CatalogSearchResult>('modrinth', cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (req.query) params.set('query', req.query);
    params.set('limit', String(req.limit ?? 24));
    params.set('offset', String(req.offset ?? 0));
    params.set('index', 'relevance');
    const facets = loaderFacet(req);
    if (facets.length) params.set('facets', `[${facets.join(',')}]`);

    const res = await http<MrSearchResponse>(`${BASE}/search?${params.toString()}`);
    const items: CatalogEntry[] = res.body.hits.map((h) => ({
      source: 'modrinth',
      slug: h.slug,
      projectId: h.project_id,
      name: h.title,
      description: h.description,
      author: h.author,
      iconUrl: h.icon_url,
      downloads: h.downloads,
      follows: h.follows,
      rating: null,
      categories: h.categories,
      loaders: h.categories.filter(isLoader) as Loader[],
      gameVersions: h.versions,
      latestVersion: h.latest_version,
      updatedAt: h.date_modified,
      websiteUrl: `https://modrinth.com/${h.project_type}/${h.slug}`,
    }));
    const result: CatalogSearchResult = { total: res.body.total_hits, items };
    catalogCacheRepo.set('modrinth', cacheKey, result, 300);
    return result;
  },

  async versions(projectId: string, opts?: { loader?: Loader; gameVersion?: string }): Promise<CatalogVersion[]> {
    const cacheKey = `versions:${projectId}:${opts?.loader ?? '*'}:${opts?.gameVersion ?? '*'}`;
    const cached = catalogCacheRepo.get<CatalogVersion[]>('modrinth', cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    if (opts?.loader) params.set('loaders', `["${opts.loader}"]`);
    if (opts?.gameVersion) params.set('game_versions', `["${opts.gameVersion}"]`);
    const res = await http<MrVersion[]>(`${BASE}/project/${projectId}/version?${params.toString()}`);
    const versions = res.body.map(toCatalogVersion);
    catalogCacheRepo.set('modrinth', cacheKey, versions, 600);
    return versions;
  },

  async version(versionId: string): Promise<CatalogVersion> {
    const res = await http<MrVersion>(`${BASE}/version/${versionId}`);
    return toCatalogVersion(res.body);
  },
};

function toCatalogVersion(v: MrVersion): CatalogVersion {
  const files: CatalogVersionFile[] = v.files.map((f) => ({
    url: f.url,
    filename: f.filename,
    size: f.size,
    sha1: f.hashes.sha1 ?? null,
    sha512: f.hashes.sha512 ?? null,
    primary: f.primary,
  }));
  const deps: CatalogDependency[] = v.dependencies.map((d) => ({
    source: 'modrinth',
    projectId: d.project_id,
    versionId: d.version_id,
    type: d.dependency_type,
  }));
  return {
    source: 'modrinth',
    versionId: v.id,
    versionNumber: v.version_number,
    changelog: v.changelog,
    loaders: v.loaders.filter(isLoader) as Loader[],
    gameVersions: v.game_versions,
    dependencies: deps,
    files,
    publishedAt: v.date_published,
  };
}

function isLoader(s: string): boolean {
  return [
    'vanilla',
    'paper',
    'purpur',
    'spigot',
    'bukkit',
    'forge',
    'neoforge',
    'fabric',
    'quilt',
    'mohist',
    'arclight',
    'magma',
    'sponge',
  ].includes(s);
}
