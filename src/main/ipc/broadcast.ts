import { webContents } from 'electron';

/** Broadcast an event to every renderer that's currently open. */
export function broadcast(channel: string, payload: unknown): void {
  for (const wc of webContents.getAllWebContents()) {
    if (!wc.isDestroyed()) wc.send(channel, payload);
  }
}
