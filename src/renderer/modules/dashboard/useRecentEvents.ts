import { useQuery } from '@tanstack/react-query';

interface DashEvent {
  id: number;
  serverId: string | null;
  ts: string;
  kind: string;
  message: string;
}

/**
 * The renderer does not expose direct event listing through IPC by design —
 * we surface them via the existing `onLog` and `onStatusChanged` channels,
 * then assemble a short rolling log in renderer memory.
 *
 * For first paint we read the last events from a `settings` cache key that
 * the main process refreshes opportunistically. (Wire-up TBD; the hook
 * returns an empty list when unavailable.)
 */
export function useRecentEvents() {
  return useQuery<DashEvent[]>({
    queryKey: ['recent-events'],
    queryFn: async () => {
      const cached = (await window.api.settings.get<DashEvent[]>('recent-events')) ?? [];
      return cached;
    },
    refetchInterval: 5000,
  });
}
