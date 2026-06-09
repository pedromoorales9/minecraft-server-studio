import path from 'node:path';
import { spawn } from 'node:child_process';
import { promises as fsp } from 'node:fs';
import { downloadFile } from '../../../services/downloads/downloader.js';
import type { LoaderResolver } from '../types.js';

const BUILDTOOLS_URL = 'https://hub.spigotmc.org/jenkins/job/BuildTools/lastSuccessfulBuild/artifact/target/BuildTools.jar';

/**
 * Spigot/CraftBukkit can't be redistributed, so we use BuildTools.
 *
 * The resolver returns an artifact descriptor pointing at BuildTools; the
 * provisioner downloads it then runs it inside the server directory to
 * produce `spigot-<version>.jar` / `craftbukkit-<version>.jar`.
 */
export const spigotResolver: LoaderResolver = {
  loader: 'spigot',
  async listLoaderVersions() {
    return [{ version: 'buildtools', stable: true }];
  },
  async resolveArtifact() {
    return {
      url: BUILDTOOLS_URL,
      filename: 'BuildTools.jar',
      isInstaller: true,
      loaderVersion: null,
    };
  },
  async runInstaller({ artifactPath, serverDir, javaPath }) {
    return await runBuildTools(artifactPath, serverDir, javaPath, 'spigot');
  },
};

export const bukkitResolver: LoaderResolver = {
  loader: 'bukkit',
  async listLoaderVersions() {
    return [{ version: 'buildtools', stable: true }];
  },
  async resolveArtifact() {
    return {
      url: BUILDTOOLS_URL,
      filename: 'BuildTools.jar',
      isInstaller: true,
      loaderVersion: null,
    };
  },
  async runInstaller({ artifactPath, serverDir, javaPath }) {
    return await runBuildTools(artifactPath, serverDir, javaPath, 'craftbukkit');
  },
};

async function runBuildTools(
  jar: string,
  cwd: string,
  java: string,
  flavor: 'spigot' | 'craftbukkit',
): Promise<{ launchJar: string }> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      java,
      ['-jar', jar, '--compile', flavor, '--output-dir', cwd],
      { cwd, stdio: 'inherit' },
    );
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`BuildTools exited ${code}`))));
  });
  const entries = await fsp.readdir(cwd);
  const built = entries.find((f) => f.startsWith(flavor) && f.endsWith('.jar'));
  if (!built) throw new Error(`BuildTools did not produce a ${flavor} jar`);
  return { launchJar: path.join(cwd, built) };
}

export const _buildToolsDownload = { downloadFile }; // referenced by ensure step; kept for tree-shake clarity
