import { http } from '../downloads/httpClient.js';
import { catalogCacheRepo } from '../../database/repositories/cacheRepo.js';

const MANIFEST_URL = 'https://launchermeta.mojang.com/mc/game/version_manifest_v2.json';

export interface MojangManifestVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_beta' | 'old_alpha';
  url: string;
  time: string;
  releaseTime: string;
  sha1: string;
}

interface ManifestResponse {
  latest: { release: string; snapshot: string };
  versions: MojangManifestVersion[];
}

export interface MojangVersionMeta {
  id: string;
  downloads: {
    server: { sha1: string; size: number; url: string };
    server_mappings?: { sha1: string; size: number; url: string };
  };
  javaVersion: { component: string; majorVersion: number };
}

const CACHE_KEY = 'manifest_v2';

export async function getMojangManifest(force = false): Promise<ManifestResponse> {
  if (!force) {
    const cached = catalogCacheRepo.get<ManifestResponse>('mojang', CACHE_KEY);
    if (cached) return cached;
  }
  const res = await http<ManifestResponse>(MANIFEST_URL);
  catalogCacheRepo.set('mojang', CACHE_KEY, res.body, 3600);
  return res.body;
}

export async function getMojangVersionMeta(version: string): Promise<MojangVersionMeta> {
  const cached = catalogCacheRepo.get<MojangVersionMeta>('mojang', `meta:${version}`);
  if (cached) return cached;
  const manifest = await getMojangManifest();
  const entry = manifest.versions.find((v) => v.id === version);
  if (!entry) throw new Error(`Unknown Minecraft version: ${version}`);
  const res = await http<MojangVersionMeta>(entry.url);
  catalogCacheRepo.set('mojang', `meta:${version}`, res.body, 24 * 3600);
  return res.body;
}

/**
 * Suggested Java major version for a given Minecraft release.
 *
 * Heuristic fallback only — prefer `requiredJavaMajor`, which asks Mojang.
 * Handles both the legacy `1.x` scheme and the year-based scheme
 * introduced in 2026 (`26.1`, `26.1.2`, …).
 */
export function recommendedJavaMajor(mcVersion: string): number {
  const [, major, minor = '0'] = /^(\d+)\.(\d+)/.exec(mcVersion) ?? [];
  const M = Number(major ?? 1);
  const m = Number(minor);
  if (M >= 2) return 25; // year-based versions (26.x+) all require modern Java
  if (M < 1) return 8;
  if (m <= 16) return 8;
  if (m === 17) return 16;
  if (m === 18 || m === 19) return 17;
  if (m === 20 && /^1\.20(\.[0-4])?$/.test(mcVersion)) return 17;
  return 21;
}

/**
 * Authoritative Java major for a Minecraft version, straight from Mojang's
 * version metadata (`javaVersion.majorVersion`). Falls back to the local
 * heuristic when the version is unknown to Mojang (e.g. custom builds) or
 * the network is unavailable.
 */
export async function requiredJavaMajor(mcVersion: string): Promise<number> {
  try {
    const meta = await getMojangVersionMeta(mcVersion);
    if (meta.javaVersion?.majorVersion) return meta.javaVersion.majorVersion;
  } catch {
    // ignore — fall through to heuristic
  }
  return recommendedJavaMajor(mcVersion);
}
