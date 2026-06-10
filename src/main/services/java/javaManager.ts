import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import { appPaths } from '../../core/paths.js';
import { downloadFile } from '../downloads/downloader.js';
import { extractArchive } from './archive.js';
import { getDb } from '../../database/db.js';
import log from 'electron-log/main.js';
import { adoptiumUrl, resolveZulu, type JavaArch } from './sources.js';

export interface JavaRuntime {
  major: number;
  vendor: string;
  path: string;
}

/**
 * Acquires a JRE for the requested Java major version.
 *
 * Strategy:
 *   1. Check the registry of JREs we've already extracted under `cache/java/<major>`.
 *   2. Probe the user's `PATH` and well-known install locations.
 *   3. Download from Adoptium (Eclipse Temurin) for the host OS/arch.
 */
/**
 * Concurrent `ensure(major)` calls share one in-flight install. Without this,
 * two simultaneous server operations (e.g. crear + arrancar) download the same
 * JRE archive in parallel and race each other on extract/cleanup, which on
 * Windows surfaces as ENOENT renaming the `.part` file.
 */
const inflight = new Map<number, Promise<JavaRuntime>>();

export const javaManager = {
  async listInstalled(): Promise<JavaRuntime[]> {
    const rows = getDb()
      .prepare(`SELECT major, vendor, path FROM java_runtimes`)
      .all() as JavaRuntime[];
    const usable: JavaRuntime[] = [];
    for (const r of rows) {
      if (!fs.existsSync(r.path)) {
        prune(r.path);
        continue;
      }
      const ok = await canRunJava(r.path);
      if (!ok) {
        log.warn('Stale Java runtime cannot execute on this host; pruning', { path: r.path });
        prune(r.path);
        continue;
      }
      usable.push(r);
    }
    return usable;
  },

  async ensure(major: number): Promise<JavaRuntime> {
    const pending = inflight.get(major);
    if (pending) return pending;

    const job = (async () => {
      const existing = await this.listInstalled();
      const hit = existing.find((j) => j.major === major);
      if (hit) return hit;

      const probed = await probeSystemJava(major);
      if (probed) {
        register(probed);
        return probed;
      }

      return await this.installJre(major);
    })();

    inflight.set(major, job);
    try {
      return await job;
    } finally {
      inflight.delete(major);
    }
  },

  async installAdoptium(major: number): Promise<JavaRuntime> {
    return this.installJre(major);
  },

  /**
   * Acquires a JRE for the requested major.
   *
   * Tries Adoptium (Temurin) and Azul (Zulu) in turn, preferring the host's
   * native arch and only falling back to x64 as a last resort. Azul covers
   * the gap Adoptium has for macOS aarch64 + Java 8/11.
   */
  async installJre(major: number): Promise<JavaRuntime> {
    const platform = mapPlatform();
    const preferredArch = mapArch();
    const archiveExt = platform === 'windows' ? 'zip' : 'tar.gz';

    type Attempt = { source: 'adoptium' | 'zulu'; arch: JavaArch };
    const attempts: Attempt[] =
      preferredArch === 'aarch64'
        ? [
            { source: 'adoptium', arch: 'aarch64' },
            { source: 'zulu', arch: 'aarch64' },
            { source: 'adoptium', arch: 'x64' },
            { source: 'zulu', arch: 'x64' },
          ]
        : [
            { source: 'adoptium', arch: 'x64' },
            { source: 'zulu', arch: 'x64' },
          ];

    let lastError: unknown = null;
    for (const a of attempts) {
      try {
        const url =
          a.source === 'adoptium'
            ? adoptiumUrl(major, platform, a.arch)
            : await resolveZulu(major, platform, a.arch);
        const archivePath = path.join(
          appPaths().javaCache,
          `${a.source}-${major}-${a.arch}.${archiveExt}`,
        );
        log.info('Installing JRE', { source: a.source, major, platform, arch: a.arch });
        await downloadFile({ url, destination: archivePath });
        return await this.extractAndRegister(archivePath, major, a.arch);
      } catch (err) {
        lastError = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (!/404|no .* build|has no/i.test(msg)) throw err;
        log.warn('JRE source missing this combo, trying next', { ...a, msg });
      }
    }
    throw new Error(
      `No JRE ${major} build available for ${platform}/${preferredArch}. Last error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  },

  async extractAndRegister(archivePath: string, major: number, _arch: string): Promise<JavaRuntime> {
    const extractRoot = path.join(appPaths().javaCache, String(major));
    await fsp.rm(extractRoot, { recursive: true, force: true });
    await fsp.mkdir(extractRoot, { recursive: true });
    await extractArchive(archivePath, extractRoot);
    await fsp.rm(archivePath, { force: true });

    const javaBin = await findJavaExecutable(extractRoot);
    if (!javaBin) throw new Error(`Could not locate java binary after extracting JRE ${major}`);
    const runtime: JavaRuntime = { major, vendor: 'Temurin', path: javaBin };
    register(runtime);
    return runtime;
  },
};

function register(rt: JavaRuntime): void {
  getDb()
    .prepare(
      `INSERT INTO java_runtimes (major, vendor, path, installed_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(path) DO NOTHING`,
    )
    .run(rt.major, rt.vendor, rt.path, new Date().toISOString());
}

function prune(path: string): void {
  getDb().prepare(`DELETE FROM java_runtimes WHERE path = ?`).run(path);
}

/** Returns true if the binary can be launched and reports a version. */
function canRunJava(bin: string): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(bin, ['-version'], { stdio: ['ignore', 'ignore', 'pipe'] });
    let answered = false;
    const done = (ok: boolean) => {
      if (answered) return;
      answered = true;
      resolve(ok);
    };
    child.on('error', () => done(false));
    child.on('exit', (code) => done(code === 0));
    setTimeout(() => {
      child.kill();
      done(false);
    }, 3_000).unref();
  });
}

function mapPlatform(): 'mac' | 'linux' | 'windows' {
  if (process.platform === 'darwin') return 'mac';
  if (process.platform === 'win32') return 'windows';
  return 'linux';
}

function mapArch(): 'x64' | 'aarch64' {
  return os.arch() === 'arm64' ? 'aarch64' : 'x64';
}

async function findJavaExecutable(root: string): Promise<string | null> {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile() && e.name === exe) return p;
    }
  }
  return null;
}

async function probeSystemJava(major: number): Promise<JavaRuntime | null> {
  const candidates: string[] = [];
  if (process.platform === 'darwin') {
    const home = await macJavaHome(major);
    if (home) candidates.push(path.join(home, 'bin', 'java'));
  }
  if (process.env.JAVA_HOME) {
    candidates.push(path.join(process.env.JAVA_HOME, 'bin', 'java'));
  }
  candidates.push('java');

  for (const candidate of candidates) {
    const version = await runJavaVersion(candidate);
    if (version && version.major === major) return { ...version, vendor: 'system', path: candidate };
  }
  return null;
}

/** Asks macOS for the JAVA_HOME of an installed JDK matching `major`, if any. */
function macJavaHome(major: number): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn('/usr/libexec/java_home', ['-v', String(major)], {
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    let out = '';
    child.stdout.on('data', (d: Buffer) => (out += d.toString()));
    child.on('error', () => resolve(null));
    child.on('exit', (code) => resolve(code === 0 && out.trim() ? out.trim() : null));
  });
}

function runJavaVersion(bin: string): Promise<{ major: number; path: string } | null> {
  return new Promise((resolve) => {
    const child = spawn(bin, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', () => resolve(null));
    child.on('exit', () => {
      const match = /version\s+"(\d+)(?:\.(\d+))?/.exec(stderr);
      if (!match) return resolve(null);
      const first = Number(match[1]);
      const major = first === 1 ? Number(match[2]) || 8 : first;
      resolve({ major, path: bin });
    });
  });
}
