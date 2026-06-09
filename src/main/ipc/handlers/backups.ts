import { IPC } from '../../../shared/ipc/channels.js';
import { backupsRepo } from '../../database/repositories/backupsRepo.js';
import { backupService } from '../../modules/backups/backupService.js';
import { backupScheduler } from '../../modules/backups/scheduler.js';
import type { BackupScheduleConfig } from '../../../shared/types/backup.js';
import type { HandlerGroup } from '../registerHandlers.js';

export const backupHandlers: HandlerGroup = {
  [IPC.backups.list]: (serverId) => backupsRepo.listForServer(serverId as string),
  [IPC.backups.create]: (args) =>
    backupService.create(args as { serverId: string; note?: string }),
  [IPC.backups.restore]: (args) =>
    backupService.restore((args as { backupId: string }).backupId),
  [IPC.backups.remove]: (args) => backupService.remove((args as { backupId: string }).backupId),
  [IPC.backups.schedule]: (cfg) => {
    const c = cfg as BackupScheduleConfig;
    backupsRepo.setSchedule(c);
    backupScheduler.upsert(c.serverId, c.enabled ? c.cron : null, c.retention);
  },
  [IPC.backups.getSchedule]: (serverId) => backupsRepo.getSchedule(serverId as string),
};
