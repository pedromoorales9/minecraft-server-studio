import { promises as fsp } from 'node:fs';
import path from 'node:path';
import type { ServerRecord } from '../../shared/types/server.js';

/**
 * Generates and updates `server.properties` for a server directory.
 *
 * Uses an additive write strategy: read existing keys, merge our managed
 * keys on top, and rewrite. Anything the user has tweaked manually that we
 * don't manage is preserved untouched.
 */

const MANAGED_KEYS = new Set([
  'server-port',
  'online-mode',
  'motd',
  'max-players',
  'difficulty',
  'gamemode',
  'level-name',
  'enable-rcon',
  'rcon.port',
  'rcon.password',
  'query.port',
  'enable-query',
]);

export async function writeServerProperties(rec: ServerRecord): Promise<void> {
  const file = path.join(rec.directory, 'server.properties');
  const existing = await readPropertiesIfPresent(file);

  const props: Record<string, string> = {
    ...existing,
    'server-port': String(rec.port),
    'online-mode': String(rec.authMode === 'premium'),
    motd: rec.motd,
    'max-players': String(rec.maxPlayers),
    difficulty: rec.difficulty,
    gamemode: rec.gamemode,
    'level-name': rec.worldName,
    'enable-rcon': rec.rconPort ? 'true' : 'false',
    'rcon.port': String(rec.rconPort ?? 25575),
    'rcon.password': rec.rconPassword ?? '',
    'enable-query': 'true',
    'query.port': String(rec.port),
  };

  const header = '# Managed by Minecraft Server Studio. Lines below may be edited manually.\n';
  const body = Object.entries(props)
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  await fsp.writeFile(file, header + body + '\n', 'utf8');
}

async function readPropertiesIfPresent(file: string): Promise<Record<string, string>> {
  try {
    const text = await fsp.readFile(file, 'utf8');
    const out: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      const key = line.slice(0, idx).trim();
      const value = line.slice(idx + 1);
      if (!MANAGED_KEYS.has(key)) out[key] = value;
    }
    return out;
  } catch {
    return {};
  }
}
