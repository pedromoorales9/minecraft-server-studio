import { http } from '../../../services/downloads/httpClient.js';
import { catalogCacheRepo } from '../../../database/repositories/cacheRepo.js';
import type {
  CatalogEntry,
  CatalogVersion,
  CatalogSearchRequest,
  CatalogSearchResult,
} from '../../../../shared/types/plugin.js';
import type { Loader } from '../../../../shared/types/loader.js';

const BASE = 'https://hangar.papermc.io/api/v1';

interface HangarSearchResponse {
  result: Array<{
    namespace: { owner: string; slug: string };
    name: string;
    description: string;
    stats: { downloads: number; views: number; stars: number };
    avatarUrl: string;
    category: string;
    lastUpdated: string;
    visibility: string;
  }>;
  pagination: { count: number };
}

export const hangarSource = {
  async search(req: CatalogSearchRequest): Promise<CatalogSearchResult> {
    if (req.kind !== 'plugin') return { total: 0, items: [] };
    const cacheKey = `search:${JSON.stringify(req)}`;
    const cached = catalogCacheRepo.get<CatalogSearchResult>('hangar', cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    params.set('limit', String(req.limit ?? 24));
    params.set('offset', String(req.offset ?? 0));
    if (req.query) params.set('q', req.query);
    if (req.gameVersion) params.set('version', req.gameVersion);
    if (req.loader) params.set('platform', req.loader.toUpperCase());

    try {
      const res = await http<HangarSearchResponse>(`${BASE}/projects?${params.toString()}`);
      const items: CatalogEntry[] = res.body.result.map((h) => ({
        source: 'hangar',
        slug: h.namespace.slug,
        projectId: `${h.namespace.owner}/${h.namespace.slug}`,
        name: h.name,
        description: h.description,
        author: h.namespace.owner,
        iconUrl: h.avatarUrl,
        downloads: h.stats.downloads,
        follows: h.stats.stars,
        rating: null,
        categories: [h.category],
        loaders: ['paper'] as Loader[],
        gameVersions: [],
        latestVersion: null,
        updatedAt: h.lastUpdated,
        websiteUrl: `https://hangar.papermc.io/${h.namespace.owner}/${h.namespace.slug}`,
      }));
      const result: CatalogSearchResult = { total: res.body.pagination.count, items };
      catalogCacheRepo.set('hangar', cacheKey, result, 600);
      return result;
    } catch {
      return { total: 0, items: [] };
    }
  },
  async versions(_projectId: string): Promise<CatalogVersion[]> {
    return []; // implementation deferred: Hangar version listing requires owner/slug split + per-platform queries
  },
};
