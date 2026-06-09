export const LOADERS = [
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
] as const;

export type Loader = (typeof LOADERS)[number];

export const PLUGIN_LOADERS: ReadonlySet<Loader> = new Set([
  'paper',
  'purpur',
  'spigot',
  'bukkit',
  'sponge',
  'mohist',
  'arclight',
  'magma',
]);

export const MOD_LOADERS: ReadonlySet<Loader> = new Set([
  'forge',
  'neoforge',
  'fabric',
  'quilt',
  'mohist',
  'arclight',
  'magma',
]);

export const HYBRID_LOADERS: ReadonlySet<Loader> = new Set([
  'mohist',
  'arclight',
  'magma',
]);

export function supportsPlugins(loader: Loader): boolean {
  return PLUGIN_LOADERS.has(loader);
}

export function supportsMods(loader: Loader): boolean {
  return MOD_LOADERS.has(loader);
}

export function isHybrid(loader: Loader): boolean {
  return HYBRID_LOADERS.has(loader);
}

export const LOADER_LABEL: Record<Loader, string> = {
  vanilla: 'Vanilla',
  paper: 'Paper',
  purpur: 'Purpur',
  spigot: 'Spigot',
  bukkit: 'Bukkit',
  forge: 'Forge',
  neoforge: 'NeoForge',
  fabric: 'Fabric',
  quilt: 'Quilt',
  mohist: 'Mohist',
  arclight: 'Arclight',
  magma: 'Magma',
  sponge: 'Sponge',
};
