/**
 * MyTokensSection — Collapsible "MY TOKENS" panel for ArtistDashboardPage.
 * Shows tokens the current user holds (from packPurchases records).
 * Positioned between Quick Actions and My Songs.
 */

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Coins, Music, TrendingUp, TrendingDown } from 'lucide-react';
import { BlurFade } from '@/components/effects';
import type { PackPurchasesResponse } from '@/lib/collections/packPurchases';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import type { SongsResponse } from '@/lib/collections/songs';

// ─── Design tokens matching the home page / hero aesthetic ───────────────────
const NEON_GREEN = '#00FF41';
// rgba equivalent: rgba(34, 197, 94,…)

// ─── Per-song token holding (aggregated from multiple purchases) ──────────────
interface TokenHolding {
  songId: string;
  tokenAmount: number;
  costBasisUsd: number;    // sum of purchaseAmountUsd across purchases
  purchaseCount: number;
  lastPurchasedAt: number;
}

// ─── Token Row ─────────────────────────────────────────────────────────────────
const TokenRow: React.FC<{
  holding: TokenHolding;
  detail: SongDetailsResponse | undefined;
  song: SongsResponse | undefined;
  delay?: number;
  onClick: () => void;
}> = ({ holding, detail, song, delay = 0, onClick }) => {
  const title = detail?.title ?? song?.name ?? holding.songId;
  const symbol = detail?.tokenSymbol ?? song?.symbol ?? '???';
  const coverImage = detail?.coverImage;

  // Format token amount compactly
  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  // Cost basis in USD (cents → dollars)
  const costUsd = holding.costBasisUsd > 0
    ? `$${(holding.costBasisUsd / 100).toFixed(2)}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, type: 'spring', stiffness: 320, damping: 24 }}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 cursor-pointer group"
      style={{
        background: 'rgba(6,10,6,0.7)',
        border: '1px solid rgba(0, 255, 65, 0.1)',
      }}
      onClick={onClick}
      whileHover={{ borderColor: 'rgba(0, 255, 65, 0.28)', y: -1 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Token logo */}
      <div
        className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.12), rgba(0, 255, 65, 0.06))',
          border: '1.5px solid rgba(0, 255, 65, 0.22)',
        }}
      >
        {coverImage ? (
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={14} style={{ color: 'rgba(0, 255, 65, 0.55)' }} />
        )}
      </div>

      {/* Name + ticker */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-bold truncate leading-tight"
          style={{ color: '#fff' }}
        >
          {title}
        </p>
        <p
          className="text-[10px] truncate mt-0.5 font-mono"
          style={{ color: NEON_GREEN, opacity: 0.7 }}
        >
          ${symbol}
        </p>
      </div>

      {/* Balance + cost */}
      <div className="text-right flex-shrink-0 flex flex-col items-end gap-0.5">
        <span
          className="text-sm font-black leading-tight"
          style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}
        >
          {formatTokens(holding.tokenAmount)}
        </span>
        {costUsd && (
          <span
            className="text-[9px] font-medium"
            style={{ color: 'rgba(220,214,240,0.38)' }}
          >
            {costUsd} spent
          </span>
        )}
      </div>
    </motion.div>
  );
};

// ─── MyTokensSection ──────────────────────────────────────────────────────────
interface MyTokensSectionProps {
  walletAddress: string;
  purchases: PackPurchasesResponse[];
  songs: SongsResponse[];
  songDetails: SongDetailsResponse[];
  delay?: number;
}

const MyTokensSection: React.FC<MyTokensSectionProps> = ({
  walletAddress,
  purchases,
  songs,
  songDetails,
  delay = 0,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Build maps for fast lookups
  const songMap = useMemo(() => {
    const m: Record<string, SongsResponse> = {};
    songs.forEach(s => { m[s.id] = s; });
    return m;
  }, [songs]);

  const detailMap = useMemo(() => {
    const m: Record<string, SongDetailsResponse> = {};
    songDetails.forEach(d => { m[d.id] = d; });
    return m;
  }, [songDetails]);

  // Aggregate purchases by songId where buyer = walletAddress
  const holdings = useMemo(() => {
    const map: Record<string, TokenHolding> = {};

    purchases.forEach(p => {
      if (!p.songId) return;
      if (p.buyerAddress !== walletAddress) return;
      // Only count completed/fulfilled purchases
      if (p.status === 'cancelled') return;

      const tokenAmt = p.buyerTokenAmount ?? p.tokenAmount ?? 0;
      if (tokenAmt <= 0) return;

      if (!map[p.songId]) {
        map[p.songId] = {
          songId: p.songId,
          tokenAmount: 0,
          costBasisUsd: 0,
          purchaseCount: 0,
          lastPurchasedAt: 0,
        };
      }

      map[p.songId].tokenAmount += tokenAmt;
      map[p.songId].costBasisUsd += (p.purchaseAmountUsd ?? 0);
      map[p.songId].purchaseCount += 1;
      if (p.createdAt > map[p.songId].lastPurchasedAt) {
        map[p.songId].lastPurchasedAt = p.createdAt;
      }
    });

    // Sort by last purchased desc
    return Object.values(map).sort((a, b) => b.lastPurchasedAt - a.lastPurchasedAt);
  }, [purchases, walletAddress]);

  const tokenCount = holdings.length;

  return (
    <BlurFade delay={delay}>
      <div className="mb-6">
        {/* Collapsible header */}
        <motion.button
          className="w-full flex items-center justify-between mb-3 group"
          onClick={() => setIsOpen(prev => !prev)}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-2">
            <h2
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: NEON_GREEN, fontFamily: "'Archivo Black', monospace" }}
            >
              My Tokens
            </h2>
            {tokenCount > 0 && (
              <span
                className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-black leading-none"
                style={{
                  background: `${NEON_GREEN}15`,
                  border: `1px solid ${NEON_GREEN}35`,
                  color: NEON_GREEN,
                  fontFamily: "'Inter', monospace",
                }}
              >
                {tokenCount}
              </span>
            )}
          </div>

          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          >
            <ChevronDown
              size={14}
              style={{ color: NEON_GREEN }}
            />
          </motion.div>
        </motion.button>

        {/* Expanded content */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              key="tokens-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #0A1A0E, #060A06)',
                  border: '1px solid rgba(0, 255, 65, 0.12)',
                }}
              >
                {tokenCount === 0 ? (
                  /* Empty state */
                  <div className="py-8 px-4 flex flex-col items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{
                        background: 'rgba(0, 255, 65, 0.06)',
                        border: '1px solid rgba(0, 255, 65, 0.2)',
                      }}
                    >
                      <Coins size={18} style={{ color: 'rgba(0, 255, 65, 0.55)' }} />
                    </div>
                    <p
                      className="text-xs text-center"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      No tokens held yet.
                    </p>
                    <motion.button
                      onClick={() => navigate('/discover')}
                      className="px-5 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wide"
                      style={{
                        background: 'rgba(0, 255, 65, 0.08)',
                        border: '1px solid rgba(0, 255, 65, 0.3)',
                        color: NEON_GREEN,
                        fontFamily: "'Archivo Black', monospace",
                      }}
                      whileHover={{ background: 'rgba(0, 255, 65, 0.15)' }}
                      whileTap={{ scale: 0.96 }}
                    >
                      Discover Songs
                    </motion.button>
                  </div>
                ) : (
                  <div className="p-2 space-y-1.5">
                    {holdings.map((holding, i) => (
                      <TokenRow
                        key={holding.songId}
                        holding={holding}
                        detail={detailMap[holding.songId]}
                        song={songMap[holding.songId]}
                        delay={i * 0.04}
                        onClick={() => navigate(`/song/${holding.songId}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed hint line when there are tokens */}
        {!isOpen && tokenCount > 0 && (
          <div
            className="text-[10px]"
            style={{ color: 'rgba(0, 255, 65, 0.3)' }}
          >
            {tokenCount} song token{tokenCount !== 1 ? 's' : ''} &mdash; click to expand
          </div>
        )}
      </div>
    </BlurFade>
  );
};

export default MyTokensSection;
