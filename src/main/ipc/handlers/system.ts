import os from 'node:os';
import { dialog, shell } from 'electron';
import { IPC } from '../../../shared/ipc/channels.js';
import { getMainWindow } from '../../index.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const systemHandlers: HandlerGroup = {
  [IPC.system.info]: () => ({
    platform: process.platform,
    arch: process.arch,
    totalRamMb: Math.round(os.totalmem() / 1024 / 1024),
    cpuModel: os.cpus()[0]?.model ?? 'unknown',
    cores: os.cpus().length,
  }),
  [IPC.system.openPath]: async (p) => {
    await shell.openPath(p as string);
  },
  [IPC.system.pickDirectory]: async () => {
    const win = getMainWindow();
    const result = await dialog.showOpenDialog(win ?? undefined!, {
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  },
};
