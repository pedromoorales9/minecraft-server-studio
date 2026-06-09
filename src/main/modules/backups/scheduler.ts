import cron from 'node-cron';
import log from 'electron-log/main.js';
import { backupsRepo } from '../../database/repositories/backupsRepo.js';
import { backupService } from './backupService.js';

class BackupScheduler {
  private jobs = new Map<string, cron.ScheduledTask>();

  start(): void {
    const schedules = backupsRepo.listAllSchedules();
    for (const s of schedules) this.applySchedule(s.serverId, s.cron, s.retention);
    log.info('Backup scheduler started', { count: schedules.length });
  }

  stop(): void {
    for (const job of this.jobs.values()) job.stop();
    this.jobs.clear();
  }

  upsert(serverId: string, expr: string | null, retention: number): void {
    const existing = this.jobs.get(serverId);
    if (existing) {
      existing.stop();
      this.jobs.delete(serverId);
    }
    if (expr) this.applySchedule(serverId, expr, retention);
  }

  private applySchedule(serverId: string, expr: string, retention: number): void {
    if (!cron.validate(expr)) {
      log.warn('Invalid cron expression, ignoring', { serverId, expr });
      return;
    }
    const job = cron.schedule(expr, () => {
      void this.runBackup(serverId, retention);
    });
    this.jobs.set(serverId, job);
  }

  private async runBackup(serverId: string, retention: number): Promise<void> {
    try {
      await backupService.create({ serverId, trigger: 'scheduled' });
      await this.enforceRetention(serverId, retention);
    } catch (e) {
      log.error('Scheduled backup failed', e);
    }
  }

  private async enforceRetention(serverId: string, retention: number): Promise<void> {
    if (retention <= 0) return;
    const list = backupsRepo.listForServer(serverId).filter((b) => b.trigger === 'scheduled');
    const drop = list.slice(retention);
    for (const old of drop) {
      try {
        await backupService.remove(old.id);
      } catch (e) {
        log.warn('Failed to drop old backup', { id: old.id, e });
      }
    }
  }
}

export const backupScheduler = new BackupScheduler();
