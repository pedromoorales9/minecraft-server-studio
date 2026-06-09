import path from 'node:path';
import { promises as fsp } from 'node:fs';
import { spawn } from 'node:child_process';
import * as tar from 'tar';

/**
 * Extracts .tar.gz and .zip archives.
 *
 * tar.gz uses the cross-platform `tar` npm module. zip falls back to the
 * platform's native unzipper (PowerShell on Windows, `unzip` elsewhere) so
 * we don't add another native dependency just for one format.
 */
export async function extractArchive(archivePath: string, destDir: string): Promise<void> {
  await fsp.mkdir(destDir, { recursive: true });
  if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
    await tar.x({ file: archivePath, cwd: destDir });
    return;
  }
  if (archivePath.endsWith('.zip')) {
    if (process.platform === 'win32') {
      await runCommand('powershell.exe', [
        '-NoProfile',
        '-Command',
        `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`,
      ]);
    } else {
      await runCommand('unzip', ['-q', '-o', archivePath, '-d', destDir]);
    }
    return;
  }
  throw new Error(`Unsupported archive type: ${path.basename(archivePath)}`);
}

function runCommand(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited with code ${code}`)),
    );
  });
}
