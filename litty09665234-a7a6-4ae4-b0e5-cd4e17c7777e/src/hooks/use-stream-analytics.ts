import { useState, useEffect } from 'react';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import { createAuthenticatedApiClient } from '@/lib/api-client';

export interface StreamAnalyticsData {
  dailyStreams: { date: string; count: number }[];
  topSongs: { songId: string; count: number; title?: string }[];
  totalStreams: number;
  uniqueListeners: number;
  streamsToday: number;
}

export function useStreamAnalytics() {
  const { user } = useAuth();
  const [data, setData] = useState<StreamAnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      if (!user?.address) return;
      setLoading(true);
      setError(null);

      try {
        const token = await getIdToken();
        if (!token || cancelled) return;

        const authApi = createAuthenticatedApiClient(token, user.address);
        const result = await authApi.get<StreamAnalyticsData>('/api/admin/stream-analytics');
        if (!cancelled) setData(result);
      } catch (err: any) {
        if (!cancelled) setError(err?.message ?? 'Failed to load stream analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [user?.address]);

  return { data, loading, error };
}
