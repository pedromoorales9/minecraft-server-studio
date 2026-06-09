import path from 'node:path';
import { spawn } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import { http } from '../../../services/downloads/httpClient.js';
import type { LoaderResolver } from '../types.js';

const PROMO_URL = 'https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json';
const MAVEN_BASE = 'https://maven.minecraftforge.net/net/minecraftforge/forge';

interface Promotions {
  promos: Record<string, string>;
}

/**
 * Forge ships an installer JAR that must be run with `--installServer`.
 * The resolver downloads the installer; `runInstaller` invokes Java to
 * produce the runnable layout and returns the `run.sh`/`run.bat`-equivalent
 * launch jar (we shell out to the produced launch script for newer versions).
 */
export const forgeResolver: LoaderResolver = {
  loader: 'forge',
  async listLoaderVersions(mcVersion) {
    const res = await http<Promotions>(PROMO_URL);
    const recommended = res.body.promos[`${mcVersion}-recommended`];
    const latest = res.body.promos[`${mcVersion}-latest`];
    const out: { version: string; stable: boolean }[] = [];
    if (recommended) out.push({ version: recommended, stable: true });
    if (latest && latest !== recommended) out.push({ version: latest, stable: false });
    return out;
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    const res = await http<Promotions>(PROMO_URL);
    const version = loaderVersion ?? res.body.promos[`${mcVersion}-recommended`] ?? res.body.promos[`${mcVersion}-latest`];
    if (!version) throw new Error(`No Forge version for ${mcVersion}`);
    const fullVersion = `${mcVersion}-${version}`;
    return {
      url: `${MAVEN_BASE}/${fullVersion}/forge-${fullVersion}-installer.jar`,
      filename: `forge-${fullVersion}-installer.jar`,
      isInstaller: true,
      loaderVersion: version,
    };
  },
  async runInstaller({ artifactPath, serverDir, javaPath }) {
    await runJava(javaPath, ['-jar', artifactPath, '--installServer', serverDir], serverDir);
    // Modern Forge writes a `run.sh` / `run.bat`; older versions produce a
    // `forge-<ver>.jar` we can launch directly. Prefer the shim if present.
    const shim = process.platform === 'win32' ? 'run.bat' : 'run.sh';
    const shimPath = path.join(serverDir, shim);
    if (await exists(shimPath)) return { launchJar: shimPath };
    const candidates = (await fsp.readdir(serverDir)).filter(
      (f) => f.startsWith('forge-') && f.endsWith('.jar') && !f.includes('installer'),
    );
    if (!candidates.length) throw new Error('Forge install completed but no launch jar found.');
    return { launchJar: path.join(serverDir, candidates[0]!) };
  },
};

export const neoForgeResolver: LoaderResolver = {
  loader: 'neoforge',
  async listLoaderVersions(mcVersion) {
    // NeoForge maven metadata is XML; the recommended endpoint is the
    // versions JSON published alongside their releases.
    const res = await http<{ versions: string[] }>(
      'https://maven.neoforged.net/api/maven/versions/releases/net/neoforged/neoforge',
    );
    const prefix = mcVersion.replace(/^1\./, '').split('.').slice(0, 2).join('.');
    return res.body.versions
      .filter((v) => v.startsWith(prefix))
      .reverse()
      .map((v) => ({ version: v, stable: !v.includes('beta') }));
  },
  async resolveArtifact(mcVersion, loaderVersion) {
    if (!loaderVersion) {
      const list = await this.listLoaderVersions(mcVersion);
      loaderVersion = list[0]?.version ?? null;
    }
    if (!loaderVersion) throw new Error(`No NeoForge version available for ${mcVersion}`);
    return {
      url: `https://maven.neoforged.net/releases/net/neoforged/neoforge/${loaderVersion}/neoforge-${loaderVersion}-installer.jar`,
      filename: `neoforge-${loaderVersion}-installer.jar`,
      isInstaller: true,
      loaderVersion,
    };
  },
  async runInstaller({ artifactPath, serverDir, javaPath }) {
    await runJava(javaPath, ['-jar', artifactPath, '--installServer', serverDir], serverDir);
    const shim = process.platform === 'win32' ? 'run.bat' : 'run.sh';
    return { launchJar: path.join(serverDir, shim) };
  },
};

function runJava(java: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(java, args, { cwd, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`Installer exited with code ${code}`)),
    );
  });
}

async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}
