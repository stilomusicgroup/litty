import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { orbitronFont } from '@/theme';
import {
  runGetTokenMintAddressQueryForSongs,
  runGetBondingCurveProgressQueryForSongs,
} from '@/lib/collections/songs';
import { fetchPumpFunPrice } from '@/hooks/usePumpFunPrice';
import type { SongsResponse } from '@/lib/collections/songs';

interface TokenPriceStripProps {
  song: SongsResponse | null;
}

const CYAN = '#00D4FF';
const GREEN = '#10B981';

const TokenPriceStrip: React.FC<TokenPriceStripProps> = ({ song }) => {
  const navigate = useNavigate();
  const symbol = song?.symbol ?? '$Lit';

  const [priceSol, setPriceSol] = useState<number | null>(null);
  const [bondingProgress, setBondingProgress] = useState<number | null>(null);

  useEffect(() => {
    if (!song?.id) return;
    let mounted = true;

    async function fetchPrice() {
      try {
        const [mintAddress, progress] = await Promise.all([
          runGetTokenMintAddressQueryForSongs(song!.id).catch(() => null),
          runGetBondingCurveProgressQueryForSongs(song!.id).catch(() => null),
        ]);

        if (!mounted) return;
        setBondingProgress(progress);

        if (mintAddress) {
          try {
            const pf = await fetchPumpFunPrice(mintAddress);
            if (mounted && pf) {
              setPriceSol(pf.priceSol);
            }
          } catch {
            // Price unavailable
          }
        }
      } catch {
        // Silently handle
      }
    }

    fetchPrice();
    return () => { mounted = false; };
  }, [song?.id]);

  const displayPrice = priceSol !== null
    ? priceSol < 0.001
      ? priceSol.toExponential(2)
      : priceSol.toFixed(6)
    : '...';

  const displayProgress = bondingProgress !== null
    ? `${Number(bondingProgress).toFixed(1)}%`
    : null;

  return (
    <div className="px-4">
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(10,8,20,0.8)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Green pulsing dot + label */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
            style={{ background: GREEN, boxShadow: `0 0 6px ${GREEN}` }}
          />
          <span
            className="text-[10px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ color: GREEN }}
          >
            Live
          </span>
        </div>

        <div className="w-px h-4 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Token info */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-x-auto no-scrollbar mobile-scroll-x">
          <span className="font-black whitespace-nowrap" style={{ fontFamily: orbitronFont, fontSize: '0.7rem', fontWeight: 700, color: '#00D4FF' }}>
            ${symbol}
          </span>
          <span className="font-bold whitespace-nowrap" style={{ color: CYAN, fontFamily: orbitronFont, fontSize: '0.7rem', fontWeight: 600 }}>
            {displayPrice} SOL
          </span>
          {displayProgress && (
            <span className="text-[10px] font-semibold whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Curve: {displayProgress}
            </span>
          )}
        </div>

        {/* CHART button */}
        <button
          onClick={() => song && navigate(`/song/${song.id}`)}
          className="flex-shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
          style={{
            background: 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.3)',
            color: CYAN,
            minHeight: '36px',
          }}
        >
          CHART
        </button>
      </div>
    </div>
  );
};

export default TokenPriceStrip;
