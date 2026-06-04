/**
 * TradingActivityFeed — live scrolling feed of buys + sells for a song.
 *
 * Merges subscribeManySongsBuys + subscribeManySongsSwaps into a unified
 * timeline sorted newest-first. Smooth fade-in for new arrivals. Cap at 50 rows.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Activity } from 'lucide-react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import {
  subscribeManySongsBuys,
  subscribeManySongsSwaps,
} from '@/lib/collections/songs';
import type { SongsBuysResponse, SongsSwapsResponse } from '@/lib/collections/songs';

const NEON_GREEN = '#00FF41';
const NEON_RED = '#FF3F4B';
const SOL_DECIMALS = 1_000_000_000;
const TOKEN_DECIMALS = 1_000_000;
const MAX_ROWS = 50;

interface FeedEntry {
  id: string;
  type: 'BUY' | 'SELL';
  wallet: string;
  amountDisplay: string;
  createdAt: number;
  isNew?: boolean;
}

function truncateWallet(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return `${Math.max(0, diff)}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function formatSol(lamports: number): string {
  const sol = lamports / SOL_DECIMALS;
  if (sol < 0.001) return `${lamports} lamports`;
  return `${sol.toFixed(4)} ◎`;
}

function formatTokens(rawUnits: number): string {
  const tokens = rawUnits / TOKEN_DECIMALS;
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return tokens.toFixed(0);
}

interface TradingActivityFeedProps {
  songId: string;
  symbol?: string;
}

const TradingActivityFeed: React.FC<TradingActivityFeedProps> = ({ songId, symbol }) => {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const prevEntryIds = useRef<Set<string>>(new Set());
  const [tick, setTick] = useState(0); // force re-render for time-ago updates

  const { data: buys } = useRealtimeData<SongsBuysResponse[]>(
    subscribeManySongsBuys,
    !!songId,
    songId,
    '', // no filter — get all
  );

  const { data: swaps } = useRealtimeData<SongsSwapsResponse[]>(
    subscribeManySongsSwaps,
    !!songId,
    songId,
    '',
  );

  // Merge buys + swaps into a unified feed
  useEffect(() => {
    const buyEntries: FeedEntry[] = (buys ?? []).map(b => ({
      id: `buy-${b.id}`,
      type: 'BUY',
      // For buys, wallet isn't directly in response — use id prefix as identifier
      wallet: b.id.startsWith('buy-') ? b.id.slice(4, 14) : b.id.slice(0, 10),
      amountDisplay: formatSol(b.solAmt),
      createdAt: b.tarobase_created_at,
    }));

    const sellEntries: FeedEntry[] = (swaps ?? []).map(s => ({
      id: `swap-${s.id}`,
      type: 'SELL',
      wallet: s.id.startsWith('swap-') ? s.id.slice(5, 15) : s.id.slice(0, 10),
      amountDisplay: `${formatTokens(s.amt)} ${symbol ?? ''}`,
      createdAt: s.tarobase_created_at,
    }));

    const merged = [...buyEntries, ...sellEntries]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_ROWS);

    // Mark truly new entries
    const newIds = new Set(merged.map(e => e.id));
    const markedNew = merged.map(e => ({
      ...e,
      isNew: !prevEntryIds.current.has(e.id),
    }));

    prevEntryIds.current = newIds;
    setEntries(markedNew);

    // Clear "isNew" after animation
    const timer = setTimeout(() => {
      setEntries(prev => prev.map(e => ({ ...e, isNew: false })));
    }, 800);
    return () => clearTimeout(timer);
  }, [buys, swaps, symbol]);

  // Tick every 10s to refresh "Xs ago" timestamps
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  // Force time re-render on tick
  void tick;

  const isEmpty = entries.length === 0;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #060A06, #030503)',
        border: '1px solid rgba(0, 255, 65, 0.18)',
        boxShadow: '0 0 20px rgba(0, 255, 65, 0.04)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(0, 255, 65, 0.1)' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: NEON_GREEN, boxShadow: '0 0 8px rgba(0, 255, 65, 0.8)', animation: 'pulse 2s infinite' }}
          />
          <Activity size={13} style={{ color: NEON_GREEN }} />
          <span
            className="text-xs font-black tracking-widest uppercase"
            style={{ color: '#fff', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.1em' }}
          >
            Live Trades
          </span>
        </div>
        {entries.length > 0 && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(0, 255, 65, 0.1)',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              color: 'rgba(0, 255, 65, 0.8)',
              fontFamily: "'Inter', monospace",
            }}
          >
            {entries.length}
          </span>
        )}
      </div>

      {/* Feed list */}
      <div style={{ maxHeight: 320, overflowY: 'auto', scrollbarWidth: 'none' }}>
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Zap size={20} style={{ color: 'rgba(0, 255, 65, 0.25)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
              No trades yet — be the first!
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={entry.isNew ? { opacity: 0, x: -8, backgroundColor: 'rgba(0, 255, 65, 0.08)' } : false}
                animate={{ opacity: 1, x: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className="flex items-center gap-3 px-4 py-2.5 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                {/* Action badge */}
                <span
                  className="flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-md tracking-widest"
                  style={{
                    fontFamily: "'Archivo Black', monospace",
                    background: entry.type === 'BUY' ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,63,75,0.12)',
                    color: entry.type === 'BUY' ? NEON_GREEN : NEON_RED,
                    border: `1px solid ${entry.type === 'BUY' ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255,63,75,0.3)'}`,
                    minWidth: 34,
                    textAlign: 'center' as const,
                  }}
                >
                  {entry.type}
                </span>

                {/* Wallet */}
                <span
                  className="text-xs font-mono flex-1 truncate"
                  style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', monospace" }}
                >
                  {truncateWallet(entry.wallet)}
                </span>

                {/* Amount */}
                <span
                  className="text-xs font-black flex-shrink-0"
                  style={{
                    fontFamily: "'Inter', monospace",
                    color: entry.type === 'BUY' ? NEON_GREEN : 'rgba(255,150,150,0.85)',
                  }}
                >
                  {entry.amountDisplay}
                </span>

                {/* Time ago */}
                <span
                  className="text-[10px] flex-shrink-0 min-w-[26px] text-right"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}
                >
                  {timeAgo(entry.createdAt)}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default TradingActivityFeed;
