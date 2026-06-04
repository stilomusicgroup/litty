import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';

const POLL_INTERVAL_MS = 10_000;
const SOL_MINT = 'So11111111111111111111111111111111111111112';

interface PriceResult {
  price: number | null;
  firstPrice: number | null;
  priceStr: string;
  change24h: number | null;
  changeStr: string;
  isPositive: boolean;
  history: number[];
  loading: boolean;
  triggerRefresh: () => void;
  lastFetchedAt: number | null;
}

interface TokenPriceResponse {
  priceUsd: number;
  priceSol?: number | null;
  source?: string;
  cachedAt?: number;
  cacheTtlMs?: number;
}

async function fetchBackendPrice(mintAddress: string): Promise<number | null> {
  try {
    let data: TokenPriceResponse;
    if (mintAddress === SOL_MINT) {
      data = await api.get<TokenPriceResponse>('/api/token-price');
    } else {
      data = await api.get<TokenPriceResponse>(`/api/token-price?mint=${encodeURIComponent(mintAddress)}`);
    }
    if (data?.priceUsd != null && !isNaN(data.priceUsd)) {
      return data.priceUsd;
    }
    return null;
  } catch {
    return null;
  }
}

export function useJupiterPrice(mintAddress: string | null | undefined): PriceResult {
  const [price, setPrice] = useState<number | null>(null);
  const [firstPrice, setFirstPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<number[]>([]);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const pollFnRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!mintAddress) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let localFirst: number | null = null;

    const poll = async () => {
      const p = await fetchBackendPrice(mintAddress);
      if (cancelled) return;
      if (p != null) {
        if (localFirst == null) {
          localFirst = p;
          setFirstPrice(p);
        }
        setPrice(p);
        setLastFetchedAt(Date.now());
        setHistory((prev) => {
          const next = [...prev, p];
          return next.length > 30 ? next.slice(next.length - 30) : next;
        });
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

  const isPositive = price != null && firstPrice != null
    ? price >= firstPrice
    : true;

  const change24h = price != null && firstPrice != null && firstPrice > 0
    ? ((price - firstPrice) / firstPrice) * 100
    : null;

  const priceStr = price != null
    ? price < 0.001
      ? `$${price.toFixed(8)}`
      : price < 1
        ? `$${price.toFixed(6)}`
        : `$${price.toFixed(4)}`
    : '—';

  const changeStr = change24h != null
    ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`
    : '—';

  return { price, firstPrice, priceStr, change24h, changeStr, isPositive, history, loading, triggerRefresh, lastFetchedAt };
}

export function useSolPrice(): { price: number | null; priceStr: string; loading: boolean } {
  const { price, priceStr, loading } = useJupiterPrice(SOL_MINT);
  return { price, priceStr, loading };
}
