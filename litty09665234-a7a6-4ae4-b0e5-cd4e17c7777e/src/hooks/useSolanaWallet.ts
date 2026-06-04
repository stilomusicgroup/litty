import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/use-privy-auth';
import { TAROBASE_CONFIG } from '@/lib/config';
import { USDC } from '@/lib/constants';
import { api } from '@/lib/api-client';

const LAMPORTS_PER_SOL = 1_000_000_000;

interface SolanaWalletState {
  solBalance: number;
  usdcBalance: number;
  solPriceUsd: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface TokenPriceResponse {
  solUsd: number;
  source: string;
  cachedAt: number;
  cacheTtlMs: number;
}

async function fetchSOLBalance(rpcUrl: string, walletAddress: string): Promise<number> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getBalance',
      params: [walletAddress],
    }),
  });
  const data = await res.json();
  if (data?.result?.value != null) {
    return data.result.value / LAMPORTS_PER_SOL;
  }
  throw new Error(data?.error?.message || 'Failed to fetch SOL balance');
}

async function fetchUSDCBalance(rpcUrl: string, walletAddress: string): Promise<number> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        walletAddress,
        { mint: USDC },
        { encoding: 'jsonParsed' },
      ],
    }),
  });
  const data = await res.json();
  if (data?.result?.value && Array.isArray(data.result.value)) {
    let total = 0;
    for (const account of data.result.value) {
      const info = account.account?.data?.parsed?.info;
      const amountRaw = info?.tokenAmount?.amount;
      const decimals = info?.tokenAmount?.decimals;
      if (amountRaw != null && decimals != null) {
        total += Number(amountRaw) / Math.pow(10, decimals);
      }
    }
    return total;
  }
  // No token accounts = 0 balance, not an error
  return 0;
}

async function fetchSOLPrice(): Promise<number | null> {
  try {
    const data = await api.get<TokenPriceResponse>('/api/token-price');
    if (data?.solUsd != null && !isNaN(data.solUsd)) {
      return data.solUsd;
    }
    return null;
  } catch (err) {
    console.warn('Error fetching SOL price from backend:', err instanceof Error ? err.message : String(err));
    return null;
  }
}

/**
 * Hook that fetches real Solana wallet balances (native SOL + USDC) and SOL price.
 * Returns zero balances on error with a refresh function.
 */
export function useSolanaWallet(): SolanaWalletState {
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;
  const rpcUrl = TAROBASE_CONFIG.rpcUrl;

  const [solBalance, setSolBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchAll = useCallback(async () => {
    if (!walletAddress || !rpcUrl) {
      if (mounted.current) {
        setSolBalance(0);
        setUsdcBalance(0);
        setSolPriceUsd(null);
        setLoading(false);
        setError(null);
      }
      return;
    }

    setLoading(true);
    setError(null);

    const promises: Promise<void>[] = [];

    // Fetch SOL balance
    const solPromise = (async () => {
      try {
        const balance = await fetchSOLBalance(rpcUrl, walletAddress);
        if (mounted.current) setSolBalance(balance);
      } catch (err) {
        console.error('Error fetching SOL balance:', err);
        if (mounted.current) {
          setSolBalance(0);
          setError(err instanceof Error ? err.message : 'Failed to fetch SOL balance');
        }
      }
    })();
    promises.push(solPromise);

    // Fetch USDC balance (non-fatal if fails)
    const usdcPromise = (async () => {
      try {
        const balance = await fetchUSDCBalance(rpcUrl, walletAddress);
        if (mounted.current) setUsdcBalance(balance);
      } catch (err) {
        console.warn('Error fetching USDC balance:', err);
        if (mounted.current) setUsdcBalance(0);
      }
    })();
    promises.push(usdcPromise);

    // Fetch SOL price (non-fatal if fails)
    const pricePromise = (async () => {
      try {
        const price = await fetchSOLPrice();
        if (mounted.current) setSolPriceUsd(price);
      } catch (err) {
        console.warn('Error fetching SOL price:', err);
        if (mounted.current) setSolPriceUsd(null);
      }
    })();
    promises.push(pricePromise);

    await Promise.allSettled(promises);

    if (mounted.current) {
      setLoading(false);
    }
  }, [walletAddress, rpcUrl, refreshSignal]);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const refresh = useCallback(() => {
    setRefreshSignal(s => s + 1);
  }, []);

  return {
    solBalance,
    usdcBalance,
    solPriceUsd,
    loading,
    error,
    refresh,
  };
}
