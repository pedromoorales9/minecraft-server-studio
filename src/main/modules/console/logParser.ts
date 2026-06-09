import type { LogLevel, LogLine } from '../../../shared/types/console.js';

/**
 * Parses standard Minecraft/Paper/Fabric log lines into structured records.
 *
 * Vanilla format:    [HH:MM:SS] [Thread/LEVEL]: message
 * Paper/Spigot:      [HH:MM:SS INFO]: message  or  [HH:MM:SS] [Server thread/INFO]: message
 * Fabric/Forge:      [HH:MM:SS] [Server thread/INFO] [module]: message
 *
 * Anything that doesn't match is captured as `STDOUT` so users still see it.
 */
const PATTERNS: RegExp[] = [
  /^\[(\d{2}:\d{2}:\d{2})\]\s+\[([^/\]]+)\/(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)\](?:\s+\[([^\]]+)\])?:\s*(.*)$/,
  /^\[(\d{2}:\d{2}:\d{2})\s+(INFO|WARN|ERROR|DEBUG|TRACE|FATAL)\]:\s*(.*)$/,
  /^\[(\d{2}:\d{2}:\d{2})\]\s+(INFO|WARN|ERROR|DEBUG|TRACE|FATAL):\s*(.*)$/,
];

let seq = 0;

export function parseLogLine(serverId: string, raw: string): LogLine {
  const trimmed = raw.replace(/\r$/, '');
  for (const pat of PATTERNS) {
    const m = pat.exec(trimmed);
    if (!m) continue;
    if (m.length === 6) {
      return makeLine(serverId, trimmed, m[1]!, m[3] as LogLevel, m[2] ?? null, m[4] ?? null, m[5] ?? '');
    }
    if (m.length === 4) {
      return makeLine(serverId, trimmed, m[1]!, m[2] as LogLevel, null, null, m[3] ?? '');
    }
  }
  return makeLine(serverId, trimmed, currentTime(), 'STDOUT', null, null, trimmed);
}

function makeLine(
  serverId: string,
  raw: string,
  time: string,
  level: LogLevel,
  thread: string | null,
  source: string | null,
  message: string,
): LogLine {
  const ts = combineWithToday(time);
  return {
    serverId,
    sequence: ++seq,
    timestamp: ts,
    level,
    thread,
    source,
    message,
    raw,
  };
}

function currentTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function combineWithToday(hms: string): number {
  const [h, m, s] = hms.split(':').map((n) => Number.parseInt(n, 10));
  const d = new Date();
  d.setHours(h ?? 0, m ?? 0, s ?? 0, 0);
  return d.getTime();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Extracts the username that joined from a join line, or null if not a join. */
export function tryParseJoin(line: LogLine): string | null {
  const m = /^([A-Za-z0-9_]{1,16})\[/.exec(line.message);
  if (m && line.message.includes('joined the game')) return m[1] ?? null;
  return null;
}

/** Extracts the username that left, or null. */
export function tryParseLeave(line: LogLine): string | null {
  const m = /^([A-Za-z0-9_]{1,16}) left the game/.exec(line.message);
  return m?.[1] ?? null;
}
