import { describe, it, expect } from 'vitest';
import { parseLogLine, tryParseJoin, tryParseLeave } from '../../src/main/modules/console/logParser';

describe('logParser', () => {
  it('parses vanilla format with thread/level', () => {
    const line = parseLogLine('srv_1', '[12:34:56] [Server thread/INFO]: Starting minecraft server');
    expect(line.level).toBe('INFO');
    expect(line.thread).toBe('Server thread');
    expect(line.message).toContain('Starting');
  });

  it('parses paper-style level inline', () => {
    const line = parseLogLine('srv_1', '[12:34:56 WARN]: Something happened');
    expect(line.level).toBe('WARN');
    expect(line.message).toBe('Something happened');
  });

  it('falls back to STDOUT for unknown formats', () => {
    const line = parseLogLine('srv_1', 'just some text');
    expect(line.level).toBe('STDOUT');
    expect(line.message).toBe('just some text');
  });

  it('detects player joins and leaves', () => {
    const joinLine = parseLogLine(
      'srv_1',
      '[12:00:00] [Server thread/INFO]: Pedro[/127.0.0.1:5000] joined the game',
    );
    const leaveLine = parseLogLine(
      'srv_1',
      '[12:01:00] [Server thread/INFO]: Pedro left the game',
    );
    expect(tryParseJoin(joinLine)).toBe('Pedro');
    expect(tryParseLeave(leaveLine)).toBe('Pedro');
  });
});
