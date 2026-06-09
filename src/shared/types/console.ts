export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE' | 'FATAL' | 'STDOUT';

export interface LogLine {
  serverId: string;
  sequence: number;
  timestamp: number;
  level: LogLevel;
  thread: string | null;
  source: string | null;
  message: string;
  raw: string;
}
