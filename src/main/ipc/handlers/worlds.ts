import path from 'node:path';
import { promises as fsp } from 'node:fs';
import * as tar from 'tar';
import { IPC } from '../../../shared/ipc/channels.js';
import { serversRepo } from '../../database/repositories/serversRepo.js';
import { runtimeRegistry } from '../../modules/runtime/registry.js';
import type { HandlerGroup } from '../registerHandlers.js';

async function dirSize(dir: string): Promise<number> {
  let total = 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    let entries;
    try {
      entries = await fsp.readdir(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.isFile()) {
        try {
          const stat = await fsp.stat(p);
          total += stat.size;
        } catch {
          /* skip */
        }
      }
    }
  }
  return total;
}

export const worldHandlers: HandlerGroup = {
  [IPC.worlds.list]: async (serverId) => {
    const rec = serversRepo.get(serverId as string);
    if (!rec) return [];
    const out: { name: string; sizeBytes: number }[] = [];
    const entries = await fsp.readdir(rec.directory, { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const dir = path.join(rec.directory, e.name);
      if (await exists(path.join(dir, 'level.dat'))) {
        out.push({ name: e.name, sizeBytes: await dirSize(dir) });
      }
    }
    return out;
  },
  [IPC.worlds.create]: async (args) => {
    const { serverId, name } = args as { serverId: string; name: string };
    const rec = serversRepo.get(serverId);
    if (!rec) throw new Error('Server not found');
    await fsp.mkdir(path.join(rec.directory, name), { recursive: true });
  },
  [IPC.worlds.import]: async (args) => {
    const { serverId, sourcePath } = args as { serverId: string; sourcePath: string };
    const rec = serversRepo.get(serverId);
    if (!rec) throw new Error('Server not found');
    if (sourcePath.endsWith('.tar.gz') || sourcePath.endsWith('.tgz')) {
      await tar.x({ file: sourcePath, cwd: rec.directory });
    } else {
      const target = path.join(rec.directory, path.basename(sourcePath));
      await fsp.cp(sourcePath, target, { recursive: true });
    }
  },
  [IPC.worlds.export]: async (args) => {
    const { serverId, worldName, targetPath } = args as {
      serverId: string;
      worldName: string;
      targetPath: string;
    };
    const rec = serversRepo.get(serverId);
    if (!rec) throw new Error('Server not found');
    await tar.c({ file: targetPath, gzip: true, cwd: rec.directory }, [worldName]);
  },
  [IPC.worlds.setGamerule]: async (args) => {
    const { serverId, rule, value } = args as {
      serverId: string;
      rule: string;
      value: string | number | boolean;
    };
    if (!runtimeRegistry.isRunning(serverId)) {
      throw new Error('Server must be running to set a gamerule');
    }
    runtimeRegistry.sendCommand(serverId, `gamerule ${rule} ${String(value)}`);
  },
};

async function exists(p: string): Promise<boolean> {
  try {
    await fsp.access(p);
    return true;
  } catch {
    return false;
  }
}
