import { IPC } from '../../../shared/ipc/channels.js';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { provisionServer } from '../../modules/server-creation/provisioner.js';
import { runtimeRegistry } from '../../modules/runtime/registry.js';
import { importExistingServer } from '../../modules/server-creation/import.js';
import type { CreateServerRequest, ServerRecord } from '../../../shared/types/server.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const serverHandlers: HandlerGroup = {
  [IPC.servers.list]: () => serversRepo.list(),
  [IPC.servers.get]: (id) => serversRepo.get(id as string),
  [IPC.servers.create]: (req) => provisionServer(req as CreateServerRequest),
  [IPC.servers.update]: (id, patch) => {
    serversRepo.patch(id as string, patch as Partial<ServerRecord>);
    return serversRepo.get(id as string);
  },
  [IPC.servers.remove]: async (id, options) => {
    const rec = serversRepo.get(id as string);
    if (!rec) return;
    if (runtimeRegistry.isRunning(rec.id)) {
      await runtimeRegistry.stop(rec.id, { force: true });
    }
    if ((options as { deleteFiles?: boolean })?.deleteFiles) {
      const { rm } = await import('node:fs/promises');
      await rm(rec.directory, { recursive: true, force: true });
    }
    serversRepo.remove(rec.id);
  },
  [IPC.servers.start]: async (id) => {
    const rec = serversRepo.get(id as string);
    if (!rec) throw new Error('Server not found');
    await runtimeRegistry.start(rec);
  },
  [IPC.servers.stop]: (id, options) =>
    runtimeRegistry.stop(id as string, options as { force?: boolean } | undefined),
  [IPC.servers.restart]: (id) => runtimeRegistry.restart(id as string),
  [IPC.servers.sendCommand]: (id, command) => {
    runtimeRegistry.sendCommand(id as string, command as string);
  },
  [IPC.servers.importExisting]: (dir) => importExistingServer(dir as string),
};
