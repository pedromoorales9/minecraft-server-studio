import { http } from '../../../services/downloads/httpClient.js';
import { catalogCacheRepo } from '../../../database/repositories/cacheRepo.js';
import type {
  CatalogEntry,
  CatalogSearchRequest,
  CatalogSearchResult,
} from '../../../../shared/types/plugin.js';

const BASE = 'https://api.spiget.org/v2';

interface SpigetResource {
  id: number;
  name: string;
  tag: string;
  downloads: number;
  rating: { count: number; average: number };
  testedVersions: string[];
  icon: { url: string | null };
  author: { id: number };
  updateDate: number;
  premium: boolean;
}

export const spigetSource = {
  async search(req: CatalogSearchRequest): Promise<CatalogSearchResult> {
    if (req.kind !== 'plugin') return { total: 0, items: [] };
    const cacheKey = `search:${JSON.stringify(req)}`;
    const cached = catalogCacheRepo.get<CatalogSearchResult>('spigotmc', cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams();
    params.set('size', String(req.limit ?? 24));
    params.set('page', String(Math.floor((req.offset ?? 0) / (req.limit ?? 24)) + 1));
    params.set('fields', 'id,name,tag,downloads,rating,testedVersions,icon,author,updateDate,premium');

    try {
      const url = req.query
        ? `${BASE}/search/resources/${encodeURIComponent(req.query)}?${params.toString()}`
        : `${BASE}/resources?${params.toString()}`;
      const res = await http<SpigetResource[]>(url);
      const items: CatalogEntry[] = res.body
        .filter((r) => !r.premium)
        .map((r) => ({
          source: 'spigotmc',
          slug: String(r.id),
          projectId: String(r.id),
          name: r.name,
          description: r.tag,
          author: String(r.author.id),
          iconUrl: r.icon?.url ?? null,
          downloads: r.downloads,
          follows: r.rating.count,
          rating: r.rating.average,
          categories: [],
          loaders: ['spigot', 'bukkit'],
          gameVersions: r.testedVersions ?? [],
          latestVersion: null,
          updatedAt: new Date(r.updateDate * 1000).toISOString(),
          websiteUrl: `https://www.spigotmc.org/resources/${r.id}`,
        }));
      const result: CatalogSearchResult = { total: items.length, items };
      catalogCacheRepo.set('spigotmc', cacheKey, result, 600);
      return result;
    } catch {
      return { total: 0, items: [] };
    }
  },
};
