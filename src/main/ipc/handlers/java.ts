import { IPC } from '../../../shared/ipc/channels.js';
import { javaManager } from '../../services/java/javaManager.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const javaHandlers: HandlerGroup = {
  [IPC.java.list]: () => javaManager.listInstalled(),
  [IPC.java.ensure]: (major) => javaManager.ensure(major as number),
};
