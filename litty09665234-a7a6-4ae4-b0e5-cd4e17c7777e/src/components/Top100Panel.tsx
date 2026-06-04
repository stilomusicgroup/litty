import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSongCandles } from '@/hooks/useSongCandles';
import { getManyPriceHistory } from '@/lib/collections/priceHistory';
import type { PriceHistoryResponse } from '@/lib/collections/priceHistory';
import {
  runGetBondingCurveProgressQueryForSongs,
  runGetTokenMintAddressQueryForSongs,
} from '@/lib/collections/songs';
import { runMeteoraSwapQuoteQueryForCommonQueries } from '@/lib/collections/commonQueries';
import { SOL } from '@/lib/constants';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { Music, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ───────────────────────────────────────────────────────────────
const NEON_GREEN = '#00FF41';
const NEON_RED = '#FF3B3B';
const CYAN = '#00D4FF';

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toExponential(2)}`;
}

function formatCompact(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

// ─── Sparkline SVG ───────────────────────────────────────────────────────────
interface SparklineProps {
  prices: number[];
  positive: boolean;
  width?: number;
  height?: number;
}

function SparklineSVG({ prices, positive, width = 80, height = 28 }: SparklineProps) {
  const color = positive ? NEON_GREEN : NEON_RED;

  if (prices.length < 2) {
    // flat line if no data
    const y = height / 2;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
        <line x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;
  const pad = 3;

  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * (width - 2) + 1;
    const y = height - pad - ((p - minP) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  // Fill area under line
  const firstX = 1;
  const lastX = width - 1;
  const baseY = height;
  const fillPts = `${firstX},${baseY} ${pts.join(' ')} ${lastX},${baseY}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
      <defs>
        <linearGradient id={`sg-${positive ? 'up' : 'dn'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg-${positive ? 'up' : 'dn'})`} />
      <polyline
        points={pts.join(' ')}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      {pts[pts.length - 1] && (() => {
        const [cx, cy] = pts[pts.length - 1].split(',').map(Number);
        return (
          <circle cx={cx} cy={cy} r="2" fill={color} />
        );
      })()}
    </svg>
  );
}

// ─── Row skeleton ─────────────────────────────────────────────────────────────
function SkeletonRow({ rank }: { rank: number }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: '1px solid rgba(0, 255, 65, 0.06)' }}
    >
      <span style={{ width: 24, fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter',monospace", flexShrink: 0, textAlign: 'right' }}>{rank}</span>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ height: 10, width: '55%', borderRadius: 4, background: 'rgba(255,255,255,0.07)', marginBottom: 5 }} />
        <div style={{ height: 8, width: '35%', borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} />
      </div>
      <div style={{ width: 80, height: 28, borderRadius: 4, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
      <div style={{ width: 60, height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
      <div style={{ width: 48, height: 20, borderRadius: 20, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }} />
    </div>
  );
}

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span style={{ width: 24, fontSize: 13, color: '#FFD700', fontFamily: "'Inter',monospace", flexShrink: 0, textAlign: 'right', textShadow: '0 0 8px rgba(255,215,0,0.6)' }}>1</span>;
  if (rank === 2) return <span style={{ width: 24, fontSize: 13, color: '#C0C0C0', fontFamily: "'Inter',monospace", flexShrink: 0, textAlign: 'right', textShadow: '0 0 6px rgba(192,192,192,0.4)' }}>2</span>;
  if (rank === 3) return <span style={{ width: 24, fontSize: 13, color: '#CD7F32', fontFamily: "'Inter',monospace", flexShrink: 0, textAlign: 'right', textShadow: '0 0 6px rgba(205,127,50,0.4)' }}>3</span>;
  return <span style={{ width: 24, fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter',monospace", flexShrink: 0, textAlign: 'right' }}>{rank}</span>;
}

// ─── Token row ────────────────────────────────────────────────────────────────
interface TokenRowData {
  songId: string;
  rank: number;
  symbol: string;
  title: string;
  coverImage?: string;
  currentPrice: number;
  change24h: number;
  volume24h: number;
  marketCap: number;
  sparklinePrices: number[];
  mintAddress?: string | null;
  /** Set for songs using bonding curve fallback (no priceHistory) */
  bondingProgress?: number | null;
  isFallback?: boolean;
}

interface TokenRowProps {
  row: TokenRowData;
  isLast: boolean;
}

function TokenRow({ row, isLast }: TokenRowProps) {
  const navigate = useNavigate();
  const isPositive = row.change24h >= 0;
  const pillColor = isPositive ? NEON_GREEN : NEON_RED;
  const pillBg = isPositive ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,59,59,0.12)';

  // Real candle data fallback
  const { candles, loading: candlesLoading } = useSongCandles(row.mintAddress ?? null, '1h');
  const candlePrices = candles.length >= 2 ? candles.map(c => c.c) : undefined;
  const sparklinePrices = candlePrices && candlePrices.length >= 2
    ? candlePrices
    : row.sparklinePrices;

  // For fallback (bonding curve) rows, show curve progress instead of 24h change
  const showCurvePill = !!row.isFallback && !candlePrices;
  const curveProgress = row.bondingProgress ?? null;

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: Math.min(row.rank * 0.03, 0.4) }}
      onClick={() => navigate(`/song/${row.songId}`)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        background: 'transparent',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid rgba(0, 255, 65, 0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s',
        minHeight: 52,
      }}
      whileHover={{ backgroundColor: 'rgba(0, 255, 65, 0.03)' }}
    >
      {/* Rank */}
      <RankBadge rank={row.rank} />

      {/* Cover art */}
      {row.coverImage ? (
        <img
          src={row.coverImage}
          alt={row.title}
          style={{ width: 36, height: 36, borderRadius: 7, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.08)' }}
        />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: 7, background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.1), rgba(0,212,255,0.06))', flexShrink: 0, border: '1px solid rgba(0, 255, 65, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Music size={16} color="rgba(0, 255, 65, 0.4)" />
        </div>
      )}

      {/* Token identity */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.04em' }}>
          {row.symbol.startsWith('$') ? row.symbol : `$${row.symbol}`}
        </div>
        <div style={{ fontFamily: "'Inter', monospace", fontSize: 9, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>
          {row.title}
        </div>
      </div>

      {/* Sparkline — hidden on very small screens */}
      <div className="hidden sm:block" style={{ flexShrink: 0 }}>
        {showCurvePill && curveProgress !== null ? (
          // Bonding curve progress bar for fallback songs
          <div style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(0, 255, 65, 0.1)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${Math.min(curveProgress, 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${NEON_GREEN}, #00FFD1)`,
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        ) : (
          candlesLoading && (!candlePrices || candlePrices.length < 2) ? (
            <svg width={80} height={28} viewBox="0 0 80 28" fill="none">
              <line x1="0" y1="14" x2="80" y2="14" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <SparklineSVG prices={sparklinePrices} positive={isPositive} width={80} height={28} />
          )
        )}
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 68 }}>
        {showCurvePill ? (
          // Fallback: show bonding curve progress as main metric
          <>
            <div style={{ fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 600, color: NEON_GREEN, letterSpacing: '-0.02em' }}>
              {curveProgress !== null ? `${curveProgress.toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontFamily: "'Archivo Black', monospace", fontSize: 8, color: 'rgba(0, 255, 65, 0.45)', marginTop: 2, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              curve
            </div>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em' }}>
              {formatUsd(row.currentPrice)}
            </div>
            <div style={{ fontFamily: "'Inter', monospace", fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
              vol {formatCompact(row.volume24h)}
            </div>
          </>
        )}
      </div>

      {/* 24h change pill — or curve progress pill for fallback */}
      {showCurvePill ? (
        <div
          style={{
            flexShrink: 0,
            minWidth: 52,
            textAlign: 'center',
            borderRadius: 20,
            padding: '3px 8px',
            background: 'rgba(0, 255, 65, 0.08)',
            border: '1px solid rgba(0, 255, 65, 0.2)',
          }}
        >
          <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 8, fontWeight: 700, color: 'rgba(0, 255, 65, 0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            NEW
          </span>
        </div>
      ) : (
        <div
          style={{
            flexShrink: 0,
            minWidth: 52,
            textAlign: 'center',
            borderRadius: 20,
            padding: '3px 8px',
            background: pillBg,
            border: `1px solid ${pillColor}30`,
          }}
        >
          <span style={{ fontFamily: "'Inter', monospace", fontSize: 10, fontWeight: 700, color: pillColor, letterSpacing: '-0.02em' }}>
            {isPositive ? '+' : ''}{row.change24h.toFixed(1)}%
          </span>
        </div>
      )}
    </motion.button>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ totalMarketCap, totalVolume24h }: { totalMarketCap: number; totalVolume24h: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        padding: '10px 16px',
        borderBottom: '1px solid rgba(0, 255, 65, 0.1)',
        background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.04), rgba(0,212,255,0.02))',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          TOTAL MKT CAP
        </span>
        <span style={{ fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 700, color: NEON_GREEN, textShadow: '0 0 8px rgba(0, 255, 65, 0.4)' }}>
          {formatCompact(totalMarketCap)}
        </span>
      </div>
      <div style={{ width: 1, height: 14, background: 'rgba(0, 255, 65, 0.15)', flexShrink: 0 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          24H VOL
        </span>
        <span style={{ fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 700, color: CYAN, textShadow: '0 0 8px rgba(0,212,255,0.4)' }}>
          {formatCompact(totalVolume24h)}
        </span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: NEON_GREEN, animation: 'livePulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 7, color: 'rgba(0, 255, 65, 0.6)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>LIVE</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
interface Top100PanelProps {
  songs: SongsResponse[];
  detailsMap: Record<string, SongDetailsResponse>;
}

const INITIAL_VISIBLE = 10;
const EXPAND_INCREMENT = 20;

// Bonding curve fallback data per song
interface BondingFallback {
  progress: number | null;
  priceSol: number | null;
}

export default function Top100Panel({ songs, detailsMap }: Top100PanelProps) {
  const [priceHistory, setPriceHistory] = useState<PriceHistoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(INITIAL_VISIBLE);
  const [expanded, setExpanded] = useState(false);
  const [bondingFallbacks, setBondingFallbacks] = useState<Record<string, BondingFallback>>({});
  const fetchedRef = useRef(false);
  const bondingFetchedRef = useRef(false);

  // Fetch all priceHistory once and group client-side
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    getManyPriceHistory('order by tarobase_created_at desc limit 500')
      .then(data => {
        setPriceHistory(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Fetch bonding curve data for all songs (used as fallback when no priceHistory)
  const songsKey = songs.map((s) => s.id).join(',');
  useEffect(() => {
    if (songs.length === 0) return;
    if (bondingFetchedRef.current) return;
    bondingFetchedRef.current = true;

    let mounted = true;
    const results: Record<string, BondingFallback> = {};

    Promise.allSettled(
      songs.map(async (song) => {
        try {
          const [progress, mintAddress] = await Promise.all([
            runGetBondingCurveProgressQueryForSongs(song.id).catch(() => null),
            runGetTokenMintAddressQueryForSongs(song.id).catch(() => null),
          ]);

          let priceSol: number | null = null;
          if (mintAddress) {
            try {
              const quoteResult = await runMeteoraSwapQuoteQueryForCommonQueries(
                'price-check',
                {
                  tokenMintAddress: mintAddress,
                  tokenToSwapInMintAddress: SOL,
                  tokenAmount: '1000000000',
                },
              );
              if (quoteResult) {
                const tokensPerSol = quoteResult / 1_000_000;
                priceSol = tokensPerSol > 0 ? 1 / tokensPerSol : 0;
              }
            } catch {
              // price unavailable
            }
          }

          results[song.id] = { progress, priceSol };
        } catch {
          results[song.id] = { progress: null, priceSol: null };
        }
      })
    ).then(() => {
      if (mounted) setBondingFallbacks(results);
    });

    return () => { mounted = false; };
  }, [songsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group snapshots by songId
  const snapshotsBySong = useMemo(() => {
    const map = new Map<string, PriceHistoryResponse[]>();
    for (const snap of priceHistory) {
      const list = map.get(snap.songId) ?? [];
      list.push(snap);
      map.set(snap.songId, list);
    }
    // Sort each song's snapshots by createdAt ascending
    for (const [id, snaps] of map) {
      map.set(id, snaps.slice().sort((a, b) => (a.createdAt ?? a.tarobase_created_at ?? 0) - (b.createdAt ?? b.tarobase_created_at ?? 0)));
    }
    return map;
  }, [priceHistory]);

  // Build ranked token data
  const rankedTokens = useMemo((): TokenRowData[] => {
    const now = Date.now() / 1000; // unix seconds
    const oneDayAgo = now - 86400;

    const tokensWithData: TokenRowData[] = [];
    const songsWithHistory = new Set<string>();

    // Primary: songs with priceHistory snapshots
    for (const song of songs) {
      const snaps = snapshotsBySong.get(song.id);
      if (!snaps?.length) continue;

      songsWithHistory.add(song.id);

      const latest = snaps[snaps.length - 1];
      const currentPrice = latest.price ?? 0;

      // 24h volume: use latest snapshot's volume24h field (it's a running total)
      const vol24h = latest.volume24h ?? 0;

      // Market cap from latest snapshot
      const mkCap = latest.marketCap ?? 0;

      // 24h price change: find snapshot ~24h ago or use oldest
      const snapThen = snaps.find(s => (s.createdAt ?? s.tarobase_created_at ?? 0) >= oneDayAgo) ?? snaps[0];
      const priceThen = snapThen.price ?? currentPrice;
      const change24h = priceThen > 0 ? ((currentPrice - priceThen) / priceThen) * 100 : 0;

      // Sparkline: last 24 snapshots
      const sparklineSnaps = snaps.slice(-24);
      const sparklinePrices = sparklineSnaps.map(s => s.price ?? 0).filter(p => p > 0);

      const details = detailsMap[song.id];
      tokensWithData.push({
        songId: song.id,
        rank: 0,
        symbol: song.symbol ?? song.name ?? '?',
        title: details?.title ?? song.name ?? 'Unknown',
        coverImage: details?.coverImage,
        currentPrice,
        change24h,
        volume24h: vol24h,
        marketCap: mkCap,
        sparklinePrices,
        mintAddress: song.mintAddress,
      });
    }

    // Fallback: songs with no priceHistory but with on-chain bonding curve data
    for (const song of songs) {
      if (songsWithHistory.has(song.id)) continue;
      const fallback = bondingFallbacks[song.id];
      if (!fallback) continue;

      const { progress, priceSol } = fallback;
      // Only include if we have at least some on-chain data (progress fetched)
      if (progress === null && priceSol === null) continue;

      const details = detailsMap[song.id];
      // Represent bonding curve progress as a pseudo price (0–1 range in SOL-equivalent)
      // Use priceSol if available, otherwise represent progress as a fractional value
      const currentPrice = priceSol ?? (progress !== null ? progress / 100 * 0.0001 : 0);

      // Encode progress in the sparkline as a single-point flat line to show curve state
      const sparklinePrices = progress !== null ? [0, progress / 100] : [];

      tokensWithData.push({
        songId: song.id,
        rank: 0,
        symbol: song.symbol ?? song.name ?? '?',
        title: details?.title ?? song.name ?? 'Unknown',
        coverImage: details?.coverImage,
        currentPrice,
        change24h: 0,
        volume24h: 0,
        marketCap: 0,
        sparklinePrices,
        mintAddress: song.mintAddress,
        bondingProgress: progress,
        isFallback: true,
      });
    }

    // Sort: priceHistory songs by volume24h descending, then fallback songs by bonding progress descending
    tokensWithData.sort((a, b) => {
      const aHasHistory = songsWithHistory.has(a.songId);
      const bHasHistory = songsWithHistory.has(b.songId);
      if (aHasHistory && bHasHistory) return b.volume24h - a.volume24h;
      if (aHasHistory && !bHasHistory) return -1; // history songs rank above fallback
      if (!aHasHistory && bHasHistory) return 1;
      // Both fallback: sort by bonding progress descending
      const ap = bondingFallbacks[a.songId]?.progress ?? 0;
      const bp = bondingFallbacks[b.songId]?.progress ?? 0;
      return bp - ap;
    });

    // Assign ranks
    return tokensWithData.slice(0, 100).map((t, i) => ({ ...t, rank: i + 1 }));
  }, [songs, snapshotsBySong, detailsMap, bondingFallbacks]);

  // Aggregate stats
  const { totalMarketCap, totalVolume24h } = useMemo(() => {
    let mc = 0;
    let vol = 0;
    for (const t of rankedTokens) {
      mc += t.marketCap;
      vol += t.volume24h;
    }
    return { totalMarketCap: mc, totalVolume24h: vol };
  }, [rankedTokens]);

  const visibleTokens = rankedTokens.slice(0, visible);
  const hasMore = rankedTokens.length > visible;

  const handleShowMore = () => {
    const next = Math.min(visible + EXPAND_INCREMENT, rankedTokens.length);
    setVisible(next);
    if (next >= rankedTokens.length) setExpanded(true);
  };

  const handleCollapse = () => {
    setVisible(INITIAL_VISIBLE);
    setExpanded(false);
  };

  // Don't render at all while loading AND there would be no data
  // (show skeleton instead)
  return (
    <div className="mx-4 sm:mx-6 md:mx-8">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-3">
        <h2
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontWeight: 800,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: NEON_GREEN,
            textShadow: '0 0 6px rgba(0, 255, 65, 0.9), 0 0 15px rgba(0, 255, 65, 0.6), 0 0 30px rgba(0, 255, 65, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <TrendingUp size={14} />
          Top 100
        </h2>
        <span
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '0.55rem',
            color: 'rgba(0, 255, 65, 0.45)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
        >
          Most traded songs
        </span>
      </div>

      {/* Main panel */}
      <div
        style={{
          background: 'rgba(10,26,14,0.65)',
          border: '1px solid rgba(0, 255, 65, 0.12)',
          borderRadius: 16,
          overflow: 'hidden',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          boxShadow: '0 4px 32px rgba(0,0,0,0.4), 0 0 20px rgba(0, 255, 65, 0.04)',
        }}
      >
        {/* Column headers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            borderBottom: '1px solid rgba(0, 255, 65, 0.08)',
          }}
        >
          <span style={{ width: 24, fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: "'Archivo Black',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0, textAlign: 'right' }}>#</span>
          <span style={{ flex: 1, fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: "'Archivo Black',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase' }}>TOKEN</span>
          <span className="hidden sm:block" style={{ width: 80, fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: "'Archivo Black',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>7D</span>
          <span style={{ width: 68, fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: "'Archivo Black',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0, textAlign: 'right' }}>PRICE</span>
          <span style={{ width: 52, fontSize: 8, color: 'rgba(255,255,255,0.2)', fontFamily: "'Archivo Black',sans-serif", letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0, textAlign: 'center' }}>24H</span>
        </div>

        {/* Stats bar */}
        {!loading && rankedTokens.length > 0 && (
          <StatsBar totalMarketCap={totalMarketCap} totalVolume24h={totalVolume24h} />
        )}

        {/* Loading skeletons */}
        {loading && (
          <div>
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonRow key={i} rank={i + 1} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && rankedTokens.length === 0 && (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 12,
                background: 'rgba(0, 255, 65, 0.06)',
                border: '1px solid rgba(0, 255, 65, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <TrendingUp size={22} color="rgba(0, 255, 65, 0.3)" />
            </div>
            <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em' }}>
              No trading activity yet
            </div>
            <div style={{ fontFamily: "'Inter', monospace", fontSize: 9, color: 'rgba(255,255,255,0.15)', marginTop: 6 }}>
              Rankings will appear once songs start trading
            </div>
          </div>
        )}

        {/* Token rows */}
        {!loading && visibleTokens.length > 0 && (
          <div>
            <AnimatePresence initial={false}>
              {visibleTokens.map((row, i) => (
                <TokenRow key={row.songId} row={row} isLast={i === visibleTokens.length - 1 && !hasMore} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Show more / collapse */}
        {!loading && rankedTokens.length > INITIAL_VISIBLE && (
          <div
            style={{
              borderTop: '1px solid rgba(0, 255, 65, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            {hasMore && (
              <button
                onClick={handleShowMore}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  color: NEON_GREEN,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: '0 0 8px rgba(0, 255, 65, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Show More
                <ChevronDown size={12} />
              </button>
            )}
            {!hasMore && expanded && (
              <button
                onClick={handleCollapse}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 9,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.3)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
              >
                Collapse
                <ChevronUp size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
