import type { Loader } from './loader.js';

export type CatalogSource = 'modrinth' | 'hangar' | 'spigotmc' | 'curseforge' | 'local';

export interface CatalogEntry {
  source: CatalogSource;
  slug: string;
  projectId: string;
  name: string;
  description: string;
  author: string;
  iconUrl: string | null;
  downloads: number;
  follows: number;
  rating: number | null;
  categories: string[];
  loaders: Loader[];
  gameVersions: string[];
  latestVersion: string | null;
  updatedAt: string;
  websiteUrl: string | null;
}

export interface CatalogVersion {
  source: CatalogSource;
  versionId: string;
  versionNumber: string;
  changelog: string | null;
  loaders: Loader[];
  gameVersions: string[];
  dependencies: CatalogDependency[];
  files: CatalogVersionFile[];
  publishedAt: string;
}

export interface CatalogVersionFile {
  url: string;
  filename: string;
  size: number;
  sha1: string | null;
  sha512: string | null;
  primary: boolean;
}

export type DependencyType = 'required' | 'optional' | 'incompatible' | 'embedded';

export interface CatalogDependency {
  source: CatalogSource;
  projectId: string | null;
  versionId: string | null;
  type: DependencyType;
}

export interface CatalogSearchRequest {
  kind: 'plugin' | 'mod';
  query: string;
  loader?: Loader;
  gameVersion?: string;
  categories?: string[];
  limit?: number;
  offset?: number;
}

export interface CatalogSearchResult {
  total: number;
  items: CatalogEntry[];
}

export interface InstalledExtension {
  id: string;
  serverId: string;
  kind: 'plugin' | 'mod';
  source: CatalogSource;
  projectId: string;
  versionId: string;
  name: string;
  version: string;
  filename: string;
  enabled: boolean;
  installedAt: string;
}
