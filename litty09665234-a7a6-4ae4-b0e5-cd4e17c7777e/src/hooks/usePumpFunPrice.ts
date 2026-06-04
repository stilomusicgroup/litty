import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';

const POLL_INTERVAL_MS = 10_000;

interface MintPriceResponse {
  priceUsd: number;
  priceSol: number | null;
  source: string;
  cachedAt: number;
  cacheTtlMs: number;
}

interface PumpFunPriceResult {
  /** Token price in USD. */
  priceUsd: number | null;
  /** Token price in SOL. */
  priceSol: number | null;
  /** SOL price in USD (derived). */
  solPriceUsd: number | null;
  /** Formatted USD price string, or '—'. */
  priceUsdStr: string;
  /** Formatted SOL price string, or '—'. */
  priceSolStr: string;
  /** Whether the first fetch is in progress. */
  loading: boolean;
  /** True if the last fetch failed. */
  error: boolean;
  /** Force an immediate refetch. */
  triggerRefresh: () => void;
  /** Unix ms of last successful fetch. */
  lastFetchedAt: number | null;
}

function formatPrice(n: number | null): string {
  if (n == null || isNaN(n)) return '—';
  if (n < 0.000001) return `$${n.toFixed(12)}`;
  if (n < 0.001) return `$${n.toFixed(8)}`;
  if (n < 1) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

function formatSol(n: number | null): string {
  if (n == null || isNaN(n)) return '—';
  if (n < 0.000001) return `${n.toFixed(12)} SOL`;
  if (n < 0.001) return `${n.toFixed(8)} SOL`;
  if (n < 1) return `${n.toFixed(6)} SOL`;
  return `${n.toFixed(4)} SOL`;
}

/**
 * Fetch token price from backend proxy (pump.fun primary, Jupiter fallback).
 * Routing through the backend avoids iframe/CORS issues on preview/draft.
 */
export async function fetchPumpFunPrice(mintAddress: string): Promise<{ priceUsd: number | null; priceSol: number | null } | null> {
  try {
    const data = await api.get<MintPriceResponse>(`/api/token-price?mint=${encodeURIComponent(mintAddress)}`);
    if (data?.priceUsd != null && !isNaN(data.priceUsd)) {
      return {
        priceUsd: data.priceUsd,
        priceSol: data.priceSol ?? null,
      };
    }
    return null;
  } catch (err) {
    console.warn('[usePumpFunPrice] Backend token-price fetch error:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Polls backend token-price API every 10s for a given mint address.
 * Derives token price in SOL and USD from pump.fun bonding-curve data (primary)
 * with Jupiter fallback handled server-side.
 */
export function usePumpFunPrice(mintAddress: string | null | undefined): PumpFunPriceResult {
  const [priceUsd, setPriceUsd] = useState<number | null>(null);
  const [priceSol, setPriceSol] = useState<number | null>(null);
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const pollFnRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!mintAddress) {
      setLoading(false);
      setPriceUsd(null);
      setPriceSol(null);
      setSolPriceUsd(null);
      return;
    }
    let cancelled = false;

    const poll = async () => {
      const result = await fetchPumpFunPrice(mintAddress);
      if (cancelled) return;
      if (result !== null) {
        setPriceUsd(result.priceUsd);
        setPriceSol(result.priceSol);
        const derivedSolPrice =
          result.priceUsd != null && result.priceSol != null && result.priceSol > 0
            ? result.priceUsd / result.priceSol
            : null;
        setSolPriceUsd(derivedSolPrice);
        setLastFetchedAt(Date.now());
        setError(false);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    pollFnRef.current = poll;
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      pollFnRef.current = null;
      clearInterval(timer);
    };
  }, [mintAddress]);

  useEffect(() => {
    if (!mintAddress || !pollFnRef.current) return;
    pollFnRef.current();
  }, [refreshSignal, mintAddress]);

  const triggerRefresh = useCallback(() => {
    setRefreshSignal(prev => prev + 1);
  }, []);

  return {
    priceUsd,
    priceSol,
    solPriceUsd,
    priceUsdStr: formatPrice(priceUsd),
    priceSolStr: formatSol(priceSol),
    loading,
    error,
    triggerRefresh,
    lastFetchedAt,
  };
}
