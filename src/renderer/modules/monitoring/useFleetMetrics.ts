import { useEffect, useRef, useState } from 'react';
import type { ServerMetricsSnapshot } from '../../../shared/types/server';

export interface FleetHistory {
  cpu: number[];
  players: number[];
}

/**
 * Aggregated live metrics across ALL servers.
 *
 * Keeps the latest snapshot per server plus a small rolling history of
 * fleet-wide CPU and player counts for the dashboard sparklines.
 */
export function useFleetMetrics(): {
  byServer: Record<string, ServerMetricsSnapshot>;
  history: FleetHistory;
} {
  const [byServer, setByServer] = useState<Record<string, ServerMetricsSnapshot>>({});
  const [history, setHistory] = useState<FleetHistory>({
    cpu: Array(16).fill(0),
    players: Array(16).fill(0),
  });
  const latest = useRef<Record<string, ServerMetricsSnapshot>>({});

  useEffect(() => {
    const off = window.api.servers.onMetrics((s) => {
      latest.current = { ...latest.current, [s.serverId]: s };
      setByServer(latest.current);
    });
    const tick = setInterval(() => {
      const snaps = Object.values(latest.current);
      const now = Date.now();
      const fresh = snaps.filter((s) => now - s.timestamp < 6000);
      const cpu = fresh.reduce((a, s) => a + s.cpuPercent, 0);
      const players = fresh.reduce((a, s) => a + s.playersOnline, 0);
      setHistory((h) => ({
        cpu: [...h.cpu.slice(1), Math.min(cpu, 100)],
        players: [...h.players.slice(1), players],
      }));
    }, 2000);
    return () => {
      off();
      clearInterval(tick);
    };
  }, []);

  return { byServer, history };
}
