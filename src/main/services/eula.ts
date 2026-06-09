import path from 'node:path';
import { promises as fsp } from 'node:fs';

/**
 * Writes a Minecraft eula.txt with eula=true.
 *
 * **Important**: only invoke this AFTER the user has explicitly accepted the
 * Mojang EULA in the wizard UI. Auto-accepting silently would violate Mojang's
 * terms. The caller is responsible for recording acceptance with a timestamp
 * in the server record.
 */
export async function writeEulaAccepted(serverDir: string): Promise<void> {
  const file = path.join(serverDir, 'eula.txt');
  const body = `# Accepted by user through Minecraft Server Studio at ${new Date().toISOString()}\n# Mojang EULA: https://aka.ms/MinecraftEULA\neula=true\n`;
  await fsp.writeFile(file, body, 'utf8');
}
