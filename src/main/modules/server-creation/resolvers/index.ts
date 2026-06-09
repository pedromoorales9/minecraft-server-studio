import type { Loader } from '../../../../shared/types/loader.js';
import type { LoaderResolver } from '../types.js';
import { vanillaResolver } from './vanilla.js';
import { paperResolver } from './paper.js';
import { purpurResolver } from './purpur.js';
import { fabricResolver } from './fabric.js';
import { quiltResolver } from './quilt.js';
import { forgeResolver, neoForgeResolver } from './forge.js';
import { spigotResolver, bukkitResolver } from './spigot.js';
import { hybridResolvers } from './hybrid.js';
import { spongeResolver } from './sponge.js';

const REGISTRY: Partial<Record<Loader, LoaderResolver>> = {
  vanilla: vanillaResolver,
  paper: paperResolver,
  purpur: purpurResolver,
  fabric: fabricResolver,
  quilt: quiltResolver,
  forge: forgeResolver,
  neoforge: neoForgeResolver,
  spigot: spigotResolver,
  bukkit: bukkitResolver,
  sponge: spongeResolver,
  ...hybridResolvers,
};

export function getResolver(loader: Loader): LoaderResolver {
  const r = REGISTRY[loader];
  if (!r) throw new Error(`No resolver registered for loader: ${loader}`);
  return r;
}

export function availableLoaders(): Loader[] {
  return Object.keys(REGISTRY) as Loader[];
}
