/**
 * TradeQuote — live quote display for buy/sell modals.
 *
 * For buys: shows estimated tokens received for the given SOL amount.
 * For sells: shows estimated SOL received for the given token amount.
 *
 * Uses the songDetails tokenPriceSol query (which uses @DeFiPlugin.getSwapQuote for 1M token units → SOL).
 * We scale this rate to the user's actual amount.
 *
 * Limitation: getSwapQuote is on the offchain songDetails collection, so it gets Jupiter's
 * "best price" route. This is the most accurate price signal we can get without a dedicated
 * buy-quote collection (which would need a policy change for PumpFunPlugin.getBuyQuote).
 */

import React, { useEffect, useState, useRef } from 'react';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';
import { runTokenPriceSolQueryForSongDetails } from '@/lib/collections/songDetails';

// Token decimals for pump.fun tokens
const TOKEN_DECIMALS = 6;
const TOKEN_UNITS_PER_TOKEN = Math.pow(10, TOKEN_DECIMALS); // 1_000_000

const NEON_GREEN = '#00FF41';
const NEON_RED = '#FF3F4B';
const SOL_DECIMALS = 1_000_000_000; // lamports per SOL

interface TradeQuoteProps {
  songId: string;
  symbol: string;
  /** 'buy' → user enters SOL amount, we show estimated tokens. 'sell' → user enters token amount, we show estimated SOL. */
  mode: 'buy' | 'sell';
  /** For buy: SOL amount in SOL units (e.g. 0.1). For sell: token amount (whole tokens). */
  amount: number;
  /** Slippage in bps (e.g. 500 = 5%) */
  slipBps: number;
}

interface QuoteState {
  tokensPerSol: number | null; // how many tokens per 1 SOL (based on 1M token quote)
  loading: boolean;
  error: boolean;
}

const TradeQuote: React.FC<TradeQuoteProps> = ({ songId, symbol, mode, amount, slipBps }) => {
  const [quote, setQuote] = useState<QuoteState>({ tokensPerSol: null, loading: false, error: false });
  const lastSongId = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the baseline rate: how many lamports out for 1M token units (sell direction)
  // This gives us the SOL value of 1M tokens → invert for buy direction
  useEffect(() => {
    if (!songId) return;

    // Only re-fetch when songId changes (rate is stable per song, doesn't depend on amount)
    if (lastSongId.current === songId) return;
    lastSongId.current = songId;

    setQuote({ tokensPerSol: null, loading: true, error: false });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        // tokenPriceSol returns lamports for swapping 1_000_000 token units → SOL
        const raw = await runTokenPriceSolQueryForSongDetails(songId);
        const lamportsFor1MTokens = Number(raw);
        if (isNaN(lamportsFor1MTokens) || lamportsFor1MTokens <= 0) {
          setQuote({ tokensPerSol: null, loading: false, error: true });
          return;
        }
        // Convert: lamportsFor1MTokens lamports = 1M token units
        // solFor1Token = lamportsFor1MTokens / (1M * SOL_DECIMALS)
        // But we want tokensPerSol = 1 / solFor1Token = (1M * SOL_DECIMALS) / lamportsFor1MTokens
        // In displayable units: 1 SOL buys (SOL_DECIMALS * TOKEN_UNITS_PER_TOKEN) / lamportsFor1MTokens tokens
        const tokensPerSol = (SOL_DECIMALS * TOKEN_UNITS_PER_TOKEN) / lamportsFor1MTokens;
        setQuote({ tokensPerSol, loading: false, error: false });
      } catch {
        setQuote({ tokensPerSol: null, loading: false, error: true });
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [songId]);

  if (amount <= 0) return null;

  const slipFactor = 1 - slipBps / 10000;

  if (quote.loading) {
    return (
      <div
        className="rounded-xl px-4 py-3 flex items-center gap-2"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Loader2 size={13} className="animate-spin" style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Fetching quote...</span>
      </div>
    );
  }

  if (quote.error || quote.tokensPerSol === null) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Quote unavailable — price will be determined at execution
        </p>
      </div>
    );
  }

  const { tokensPerSol } = quote;

  if (mode === 'buy') {
    // amount = SOL to spend
    const estimatedTokens = amount * tokensPerSol;
    const minimumTokens = estimatedTokens * slipFactor;
    // Price impact estimate: conservative bonding-curve approximation.
    // Pump.fun tokens mint 1B total supply (1_000_000_000 tokens). Impact ≈ x / (T + x) * 100.
    // We assume 1B supply since actual circulating supply isn't available in this context.
    const ASSUMED_TOTAL_SUPPLY = 1_000_000_000;
    const priceImpactPct = Math.min((estimatedTokens / (ASSUMED_TOTAL_SUPPLY + estimatedTokens)) * 100, 50);

    return (
      <div
        className="rounded-xl px-4 py-3 space-y-2"
        style={{ background: 'rgba(0, 255, 65, 0.04)', border: '1px solid rgba(0, 255, 65, 0.14)' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingUp size={11} style={{ color: NEON_GREEN }} />
          <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', monospace" }}>
            Quote
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Est. tokens received</span>
          <span className="font-black" style={{ fontFamily: "'Inter', monospace", color: NEON_GREEN }}>
            ≈{formatTokens(estimatedTokens)} {symbol}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Minimum ({(slipBps / 100).toFixed(0)}% slip)</span>
          <span className="font-bold" style={{ fontFamily: "'Inter', monospace", color: 'rgba(255,255,255,0.6)' }}>
            {formatTokens(minimumTokens)} {symbol}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Price impact</span>
          <span
            className="font-bold"
            style={{
              fontFamily: "'Inter', monospace",
              color: priceImpactPct > 10 ? NEON_RED : priceImpactPct > 3 ? '#FFA500' : 'rgba(255,255,255,0.6)',
            }}
          >
            ~{priceImpactPct.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  } else {
    // mode === 'sell': amount = token count (whole tokens, not raw units)
    const solFromSell = amount / tokensPerSol; // SOL received
    const minimumSol = solFromSell * slipFactor;
    // Conservative bonding-curve approximation assuming 1B total supply (standard pump.fun mint).
    const ASSUMED_TOTAL_SUPPLY = 1_000_000_000;
    const priceImpactPct = Math.min((amount / (ASSUMED_TOTAL_SUPPLY + amount)) * 100, 50);

    return (
      <div
        className="rounded-xl px-4 py-3 space-y-2"
        style={{ background: 'rgba(255,63,75,0.04)', border: '1px solid rgba(255,63,75,0.14)' }}
      >
        <div className="flex items-center gap-1.5 mb-1">
          <TrendingDown size={11} style={{ color: NEON_RED }} />
          <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', monospace" }}>
            Quote
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Est. SOL received</span>
          <span className="font-black" style={{ fontFamily: "'Inter', monospace", color: '#86efac' }}>
            ≈{solFromSell.toFixed(6)} ◎
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Minimum ({(slipBps / 100).toFixed(0)}% slip)</span>
          <span className="font-bold" style={{ fontFamily: "'Inter', monospace", color: 'rgba(255,255,255,0.6)' }}>
            {minimumSol.toFixed(6)} ◎
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>Price impact</span>
          <span
            className="font-bold"
            style={{
              fontFamily: "'Inter', monospace",
              color: priceImpactPct > 10 ? NEON_RED : priceImpactPct > 3 ? '#FFA500' : 'rgba(255,255,255,0.6)',
            }}
          >
            ~{priceImpactPct.toFixed(1)}%
          </span>
        </div>
      </div>
    );
  }
};

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(0);
}

export default TradeQuote;
