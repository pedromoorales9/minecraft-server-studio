import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { nanoid } from 'nanoid';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { requiredJavaMajor } from '../../services/mojang/manifest.js';
import { javaManager } from '../../services/java/javaManager.js';
import type { ServerRecord } from '../../../shared/types/server.js';
import type { Loader } from '../../../shared/types/loader.js';

/**
 * Adopts an existing server directory.
 *
 * Heuristics:
 *   • Detect loader from jar filename (forge-*, paper-*, purpur-*, fabric-server-*, …).
 *   • Parse server.properties for port/MOTD/world name.
 *   • Default `eula_accepted_at` from existing eula.txt (`eula=true`).
 */
export async function importExistingServer(dir: string): Promise<ServerRecord> {
  const entries = await fsp.readdir(dir);
  const jar = pickLaunchJar(entries);
  if (!jar) throw new Error('No server jar found in directory');

  const loader = inferLoader(jar);
  const mcVersion = inferMcVersion(jar) ?? '1.21.1';
  const props = await parseProperties(path.join(dir, 'server.properties'));
  const eulaAccepted = await isEulaAccepted(path.join(dir, 'eula.txt'));
  const major = await requiredJavaMajor(mcVersion);
  const java = await javaManager.ensure(major).catch(() => null);

  const now = new Date().toISOString();
  const rec: ServerRecord = {
    id: `srv_${nanoid(10)}`,
    name: props['motd'] || path.basename(dir),
    loader,
    minecraftVersion: mcVersion,
    loaderVersion: null,
    contentMode: 'none',
    authMode: props['online-mode'] === 'false' ? 'offline' : 'premium',
    port: Number(props['server-port'] ?? 25565),
    ramMinMb: 1024,
    ramMaxMb: 4096,
    worldName: props['level-name'] ?? 'world',
    directory: dir,
    javaPath: java?.path ?? null,
    javaMajor: major,
    status: 'stopped',
    rconPort: Number(props['rcon.port'] ?? 25575),
    rconPassword: props['rcon.password'] ?? null,
    autoStart: false,
    autoBackup: false,
    motd: props['motd'] ?? 'Imported server',
    maxPlayers: Number(props['max-players'] ?? 20),
    difficulty: (props['difficulty'] as ServerRecord['difficulty']) ?? 'normal',
    gamemode: (props['gamemode'] as ServerRecord['gamemode']) ?? 'survival',
    createdAt: now,
    updatedAt: now,
    lastStartedAt: null,
    eulaAcceptedAt: eulaAccepted ? now : null,
  };
  serversRepo.insert(rec);
  await fsp.writeFile(
    path.join(dir, '.studio-launch.json'),
    JSON.stringify({ launchJar: path.join(dir, jar) }, null, 2),
    'utf8',
  );
  return rec;
}

function pickLaunchJar(entries: string[]): string | null {
  const candidates = entries.filter((f) => f.endsWith('.jar') && !f.includes('installer'));
  if (!candidates.length) return null;
  const order = ['paper', 'purpur', 'spigot', 'forge', 'fabric', 'server.jar'];
  for (const prefix of order) {
    const hit = candidates.find((c) => c.toLowerCase().startsWith(prefix));
    if (hit) return hit;
  }
  return candidates[0] ?? null;
}

function inferLoader(jar: string): Loader {
  const lower = jar.toLowerCase();
  if (lower.includes('paper')) return 'paper';
  if (lower.includes('purpur')) return 'purpur';
  if (lower.includes('forge')) return 'forge';
  if (lower.includes('neoforge')) return 'neoforge';
  if (lower.includes('fabric')) return 'fabric';
  if (lower.includes('quilt')) return 'quilt';
  if (lower.includes('mohist')) return 'mohist';
  if (lower.includes('arclight')) return 'arclight';
  if (lower.includes('magma')) return 'magma';
  if (lower.includes('sponge')) return 'sponge';
  if (lower.includes('spigot')) return 'spigot';
  if (lower.includes('craftbukkit') || lower.includes('bukkit')) return 'bukkit';
  return 'vanilla';
}

function inferMcVersion(jar: string): string | null {
  const m = /(\d+\.\d+(?:\.\d+)?)/.exec(jar);
  return m?.[1] ?? null;
}

async function parseProperties(file: string): Promise<Record<string, string>> {
  try {
    const text = await fsp.readFile(file, 'utf8');
    const out: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx <= 0) continue;
      out[line.slice(0, idx).trim()] = line.slice(idx + 1);
    }
    return out;
  } catch {
    return {};
  }
}

async function isEulaAccepted(file: string): Promise<boolean> {
  try {
    const text = await fsp.readFile(file, 'utf8');
    return /^\s*eula\s*=\s*true/m.test(text);
  } catch {
    return false;
  }
}
