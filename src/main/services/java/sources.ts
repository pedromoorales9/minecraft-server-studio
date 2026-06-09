import { http } from '../downloads/httpClient.js';

export type JavaArch = 'aarch64' | 'x64';
export type JavaPlatform = 'mac' | 'linux' | 'windows';

export interface JreResolved {
  url: string;
  source: 'adoptium' | 'zulu';
  arch: JavaArch;
}

/**
 * Adoptium ships the binary at a stable URL. We just return it; the actual
 * download happens in the caller. A HEAD-style validation would cost an
 * extra round trip with little upside — if the URL 404s we let the
 * downloader surface it and the caller falls back.
 */
export function adoptiumUrl(major: number, platform: JavaPlatform, arch: JavaArch): string {
  return `https://api.adoptium.net/v3/binary/latest/${major}/ga/${platform}/${arch}/jre/hotspot/normal/eclipse`;
}

/**
 * Azul Zulu's metadata API. Used to cover the macOS aarch64 + Java 8/11
 * hole that Adoptium has — Azul publishes native arm64 builds for every
 * LTS major back to Java 8.
 */
export async function resolveZulu(
  major: number,
  platform: JavaPlatform,
  arch: JavaArch,
): Promise<string> {
  const params = new URLSearchParams({
    java_version: String(major),
    os: platform === 'mac' ? 'macos' : platform,
    arch,
    archive_type: platform === 'windows' ? 'zip' : 'tar.gz',
    java_package_type: 'jre',
    latest: 'true',
    release_status: 'ga',
    availability_types: 'CA',
    page_size: '1',
  });
  const res = await http<Array<{ download_url: string }>>(
    `https://api.azul.com/metadata/v1/zulu/packages/?${params.toString()}`,
  );
  const hit = res.body[0];
  if (!hit?.download_url) throw new Error(`Azul Zulu has no ${platform}/${arch}/${major}`);
  return hit.download_url;
}
