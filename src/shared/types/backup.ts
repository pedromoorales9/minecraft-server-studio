export type BackupTrigger = 'manual' | 'scheduled' | 'pre-update';

export interface BackupRecord {
  id: string;
  serverId: string;
  trigger: BackupTrigger;
  path: string;
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  note: string | null;
}

export interface BackupScheduleConfig {
  serverId: string;
  enabled: boolean;
  cron: string;
  retention: number;
}
