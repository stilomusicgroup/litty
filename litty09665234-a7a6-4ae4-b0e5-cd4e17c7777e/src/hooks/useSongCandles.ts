import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';

export type Candle = {
  t: number; // unix seconds
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface UseSongCandlesResult {
  candles: Candle[];
  loading: boolean;
  error: boolean;
}

const POLL_INTERVAL_MS = 30_000;

export function useSongCandles(
  mint: string | null | undefined,
  tf: Timeframe,
): UseSongCandlesResult {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!mint) {
      setLoading(false);
      setCandles([]);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      try {
        const data = await api.get(`/api/songs/${mint}/candles?tf=${tf}`);
        if (cancelled) return;
        setCandles(Array.isArray(data?.candles) ? data.candles : []);
        setError(false);
      } catch (err) {
        if (cancelled) return;
        console.warn('[useSongCandles] fetch error:', err);
        setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    setLoading(true);
    setCandles([]);
    setError(false);
    fetch();

    timerRef.current = setInterval(fetch, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mint, tf]);

  return { candles, loading, error };
}
