import { useEffect, useState } from 'react';
import type { ServerMetricsSnapshot } from '../../../shared/types/server';

/**
 * Subscribes to live metric snapshots for the given server.
 *
 * Returns the latest snapshot only; the monitoring page keeps its own
 * rolling time-series in state for charts.
 */
export function useLiveMetrics(serverId: string | null): ServerMetricsSnapshot | null {
  const [snap, setSnap] = useState<ServerMetricsSnapshot | null>(null);
  useEffect(() => {
    if (!serverId) return;
    const off = window.api.servers.onMetrics((s) => {
      if (s.serverId === serverId) setSnap(s);
    });
    return off;
  }, [serverId]);
  return snap;
}

export function useMetricsHistory(serverId: string | null, limit = 60): ServerMetricsSnapshot[] {
  const [history, setHistory] = useState<ServerMetricsSnapshot[]>([]);
  useEffect(() => {
    if (!serverId) return setHistory([]);
    const off = window.api.servers.onMetrics((s) => {
      if (s.serverId !== serverId) return;
      setHistory((prev) => {
        const next = [...prev, s];
        return next.length > limit ? next.slice(next.length - limit) : next;
      });
    });
    return off;
  }, [serverId, limit]);
  return history;
}
