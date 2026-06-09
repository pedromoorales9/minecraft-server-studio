import { modrinthSource } from './sources/modrinth.js';
import { hangarSource } from './sources/hangar.js';
import { spigetSource } from './sources/spiget.js';
import type {
  CatalogSearchRequest,
  CatalogSearchResult,
  CatalogVersion,
  CatalogSource,
} from '../../../shared/types/plugin.js';
import type { Loader } from '../../../shared/types/loader.js';

/**
 * Multi-source search aggregator.
 *
 * Modrinth covers both plugins (Paper/Spigot/etc.) and mods (Fabric/Forge/etc.)
 * and is our primary source. Hangar fills in Paper-first projects that don't
 * publish to Modrinth; Spiget covers historical Spigot resources.
 *
 * Results are de-duplicated by `name + author` and ranked by downloads.
 */
export const catalog = {
  async search(req: CatalogSearchRequest): Promise<CatalogSearchResult> {
    const limit = req.limit ?? 24;
    const tasks: Promise<CatalogSearchResult>[] = [modrinthSource.search(req)];

    if (req.kind === 'plugin') {
      tasks.push(hangarSource.search(req));
      tasks.push(spigetSource.search(req));
    }

    const settled = await Promise.allSettled(tasks);
    const all = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value.items : []));
    const seen = new Set<string>();
    const deduped = all
      .filter((e) => {
        const key = `${e.name.toLowerCase()}::${e.author.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, limit);

    const total = settled.reduce((acc, r) => acc + (r.status === 'fulfilled' ? r.value.total : 0), 0);
    return { total, items: deduped };
  },

  async versions(args: {
    source: CatalogSource;
    projectId: string;
    loader?: Loader;
    gameVersion?: string;
  }): Promise<CatalogVersion[]> {
    if (args.source === 'modrinth') {
      return modrinthSource.versions(args.projectId, {
        loader: args.loader,
        gameVersion: args.gameVersion,
      });
    }
    if (args.source === 'hangar') return hangarSource.versions(args.projectId);
    return [];
  },
};
