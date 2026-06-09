import { IPC } from '../../../shared/ipc/channels.js';
import { settingsRepo } from '../../database/repositories/settingsRepo.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const settingsHandlers: HandlerGroup = {
  [IPC.settings.get]: (key) => settingsRepo.get(key as string),
  [IPC.settings.set]: (key, value) => settingsRepo.set(key as string, value),
};
