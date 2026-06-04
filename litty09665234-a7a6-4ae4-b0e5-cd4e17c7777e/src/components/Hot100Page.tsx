import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { orbitronFont } from '@/theme';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import {
  subscribeManySongs,
  runGetBondingCurveProgressQueryForSongs,
  runGetTokenMintAddressQueryForSongs,
  runGetTokenBalanceQueryForSongs,
} from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails, SongDetailsResponse } from '@/lib/collections/songDetails';
import { runMeteoraSwapQuoteQueryForCommonQueries } from '@/lib/collections/commonQueries';
import { getManySongStreams, SongStreamsResponse } from '@/lib/collections/songStreams';
import { getManyReposts, RepostsResponse } from '@/lib/collections/reposts';
import { getAllPlaylistSongsSongs, PlaylistSongsSongsResponse } from '@/lib/collections/playlistSongs';
import { getManyPriceHistory, PriceHistoryResponse } from '@/lib/collections/priceHistory';
import { SOL } from '@/lib/constants';
import { isSeedSong } from '@/utils/songFilters';
import { deduplicateSongs } from '@/utils/deduplicateSongs';
import { useTheme } from '@/hooks/use-theme';
import {
  Sparkles, TrendingUp, Activity, Flame, Music, Play, Repeat2, Heart, Plus,
} from 'lucide-react';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type SortMode = 'market_cap' | 'volume' | 'progress' | 'newest';

interface SocialCounts {
  streams: number;
  reposts: number;
  saves: number;
}

interface PricePoint {
  price: number;
  createdAt: number;
}

// ─── Tiny sparkline ───────────────────────────────────────────────────────────

function TinySparkline({ points, width = 40, height = 20, color = '#00FF41' }: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (!points.length) {
    return (
      <svg width={width} height={height}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const pts = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function get24hChange(history: PricePoint[]): { pct: number | null; sparkline: number[] } {
  const now = Date.now() / 1000;
  const dayAgo = now - 86400;
  const recent = history.filter((h) => h.createdAt >= dayAgo).sort((a, b) => a.createdAt - b.createdAt);
  if (recent.length < 2) return { pct: null, sparkline: recent.map((h) => h.price) };
  const first = recent[0].price;
  const last = recent[recent.length - 1].price;
  if (!first || first === 0) return { pct: null, sparkline: recent.map((h) => h.price) };
  return {
    pct: ((last - first) / first) * 100,
    sparkline: recent.map((h) => h.price),
  };
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

// ─── Rank Badge Component ─────────────────────────────────────────────────────

const RankBadge: React.FC<{ rank: number }> = ({ rank }) => {
  if (rank === 1) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #B8860B, #FFD700, #B8860B)',
          color: '#1a1000',
          fontFamily: orbitronFont,
          fontSize: '0.85rem',
          boxShadow: '0 0 16px rgba(255,215,0,0.35), inset 0 1px 2px rgba(255,255,255,0.3)',
        }}
      >
        <span className="relative z-10">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #71717a, #d4d4d8, #71717a)',
          color: '#1a1a1a',
          fontFamily: orbitronFont,
          fontSize: '0.85rem',
          boxShadow: '0 0 16px rgba(180,180,180,0.25), inset 0 1px 2px rgba(255,255,255,0.3)',
        }}
      >
        <span className="relative z-10">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #92400e, #d97706, #92400e)',
          color: '#1a0a00',
          fontFamily: orbitronFont,
          fontSize: '0.85rem',
          boxShadow: '0 0 16px rgba(217,119,6,0.3), inset 0 1px 2px rgba(255,255,255,0.2)',
        }}
      >
        <span className="relative z-10">3</span>
      </div>
    );
  }
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base"
      style={{
        background: '#27272a',
        color: '#ffffff',
        fontFamily: orbitronFont,
        fontSize: rank <= 9 ? '0.85rem' : '0.7rem',
      }}
    >
      {rank}
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Hot100Page: React.FC = () => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const navigate = useNavigate();

  // Light mode style helpers
  const SKY_BG = 'linear-gradient(160deg, #a8d8ea 0%, #b8e4f5 40%, #cceeff 70%, #e0f5ff 100%)';
  const GLASS = 'rgba(255,255,255,0.3)';
  const GLASS_BORDER = 'rgba(255,255,255,0.6)';
  const NAVY = '#1a2744';
  const NAVY_MUTED = 'rgba(26,39,68,0.55)';
  const GREEN_BTN = 'linear-gradient(135deg, #00FF41 0%, #06d6a0 100%)';
  const GREEN_BORDER = '#00FF41';
  const GREEN_TEXT = '#00FF41';

  // ── Charts state ──────────────────────────────────────────────────────────
  const [sortMode, setSortMode] = useState<SortMode>('market_cap');

  const { data: rawSongs, loading } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
    '',
  );
  const songs = React.useMemo(
    () => deduplicateSongs((rawSongs ?? []).filter((s) => !isSeedSong(s as any) && !s.hidden)),
    [rawSongs],
  );

  // Live price data cache
  const [priceCache, setPriceCache] = useState<Record<string, { price: number | null; progress: number | null }>>({});

  // Social & price history data
  const [socialMap, setSocialMap] = useState<Record<string, SocialCounts>>({});
  const [priceHistoryMap, setPriceHistoryMap] = useState<Record<string, PricePoint[]>>({});
  const [playlistModalSong, setPlaylistModalSong] = useState<{
    id: string;
    title: string;
    artist?: string;
    coverImage?: string;
  } | null>(null);

  useEffect(() => {
    if (!songs || songs.length === 0) return;
    let mounted = true;

    async function fetchAllPrices() {
      const cache: Record<string, { price: number | null; progress: number | null }> = {};
      for (let i = 0; i < songs!.length; i += 5) {
        const batch = songs!.slice(i, i + 5);
        await Promise.all(
          batch.map(async (s) => {
            try {
              const [progress, mintAddress] = await Promise.all([
                runGetBondingCurveProgressQueryForSongs(s.id).catch(() => null),
                runGetTokenMintAddressQueryForSongs(s.id).catch(() => null),
              ]);
              let price: number | null = null;
              if (mintAddress) {
                try {
                  const quote = await runMeteoraSwapQuoteQueryForCommonQueries('hot100', {
                    tokenMintAddress: mintAddress,
                    tokenToSwapInMintAddress: SOL,
                    tokenAmount: '1000000000',
                  });
                  if (quote) {
                    const tokensPerSol = quote / 1_000_000;
                    price = tokensPerSol > 0 ? 1 / tokensPerSol : null;
                  }
                } catch { /* skip */ }
              }
              cache[s.id] = { price, progress };
            } catch {
              cache[s.id] = { price: null, progress: null };
            }
          }),
        );
        if (!mounted) return;
        setPriceCache({ ...cache });
      }
    }

    fetchAllPrices();
    return () => { mounted = false; };
  }, [songs]);

  // Fetch social counts + price history
  useEffect(() => {
    if (!songs || songs.length === 0) return;
    let mounted = true;

    async function fetchSocialAndHistory() {
      try {
        const [streamsData, repostsData, playlistData, priceData] = await Promise.all([
          getManySongStreams('').catch(() => [] as SongStreamsResponse[]),
          getManyReposts('').catch(() => [] as RepostsResponse[]),
          getAllPlaylistSongsSongs('', '').catch(() => [] as PlaylistSongsSongsResponse[]),
          getManyPriceHistory('created in the last 7 days').catch(() => [] as PriceHistoryResponse[]),
        ]);
        if (!mounted) return;

        const streamsMap: Record<string, number> = {};
        (streamsData ?? []).forEach((s) => {
          streamsMap[s.id] = s.count ?? 0;
        });

        const repostsCount: Record<string, number> = {};
        (repostsData ?? []).forEach((r) => {
          repostsCount[r.songId] = (repostsCount[r.songId] ?? 0) + 1;
        });

        const savesCount: Record<string, number> = {};
        (playlistData ?? []).forEach((p) => {
          savesCount[p.songId] = (savesCount[p.songId] ?? 0) + 1;
        });

        const social: Record<string, SocialCounts> = {};
        songs!.forEach((s) => {
          social[s.id] = {
            streams: streamsMap[s.id] ?? 0,
            reposts: repostsCount[s.id] ?? 0,
            saves: savesCount[s.id] ?? 0,
          };
        });
        setSocialMap(social);

        const phMap: Record<string, PricePoint[]> = {};
        (priceData ?? []).forEach((p) => {
          if (!p.songId || p.price == null || p.createdAt == null) return;
          if (!phMap[p.songId]) phMap[p.songId] = [];
          phMap[p.songId].push({ price: p.price, createdAt: p.createdAt });
        });
        // Sort each by createdAt
        Object.keys(phMap).forEach((k) => {
          phMap[k].sort((a, b) => a.createdAt - b.createdAt);
        });
        setPriceHistoryMap(phMap);
      } catch (e) {
        console.error('Failed to fetch social/price history:', e);
      }
    }

    fetchSocialAndHistory();
    return () => { mounted = false; };
  }, [songs]);

  const sortedSongs = songs ? [...songs] : [];

  // Song details for display
  const { data: rawAllDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    true,
  );
  const allDetails = React.useMemo(
    () => (rawAllDetails ?? []).filter((d) => !isSeedSong(d as any)),
    [rawAllDetails],
  );
  const detailsMap: Record<string, SongDetailsResponse> = {};
  (allDetails ?? []).forEach(d => { detailsMap[d.id] = d; });

  // ── My Playlist collected songs check ─────────────────────────────────────
  const [hasCollectedSongs, setHasCollectedSongs] = useState(false);
  const [checkingCollected, setCheckingCollected] = useState(false);

  const { user } = useAuth();
  const walletAddress = user?.address ?? null;

  useEffect(() => {
    if (!walletAddress || !songs || songs.length === 0 || sortMode !== 'volume') return;
    const songsList = songs;
    const address = walletAddress;
    let cancelled = false;
    setCheckingCollected(true);

    async function checkBalances() {
      try {
        for (const song of songsList) {
          try {
            const balance = await runGetTokenBalanceQueryForSongs(song.id, { walletAddress: address });
            if (balance > 0) {
              if (!cancelled) setHasCollectedSongs(true);
              return;
            }
          } catch { /* skip */ }
        }
        if (!cancelled) setHasCollectedSongs(false);
      } finally {
        if (!cancelled) setCheckingCollected(false);
      }
    }
    checkBalances();
    return () => { cancelled = true; };
  }, [walletAddress, songs, sortMode]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ background: isDark ? 'transparent' : SKY_BG }}>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {isDark && (
          <>
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 80% 70% at 50% 0%, rgba(0, 255, 65, 0.08) 0%, transparent 60%), radial-gradient(ellipse 50% 40% at 80% 30%, rgba(0,212,255,0.05) 0%, transparent 50%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
              }}
            />
          </>
        )}

        <div className="container relative pt-16 pb-6">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4" style={{ background: isDark ? 'rgba(0, 255, 65, 0.08)' : 'rgba(0, 255, 65, 0.1)', border: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.25)' : GLASS_BORDER}`, ...(!isDark ? { backdropFilter: 'blur(20px)' } : {}) }}>
              <Flame size={14} style={{ color: isDark ? '#00FF41' : GREEN_TEXT }} />
              <span className="text-xs font-bold" style={{ color: isDark ? '#00FF41' : GREEN_TEXT }}>LIVE TRADING</span>
            </div>
            <h1
              className="text-4xl sm:text-6xl md:text-8xl font-black mb-3"
              style={{
                fontFamily: orbitronFont,
                color: '#00FF41',
                letterSpacing: '0.05em',
                textShadow: isDark ? '0 0 6px rgba(0, 255, 65, 0.9), 0 0 15px rgba(0, 255, 65, 0.6), 0 0 30px rgba(0, 255, 65, 0.3)' : 'none',
              }}
            >
              HOT 100
            </h1>
            <p className="text-base sm:text-lg" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : NAVY_MUTED }}>
              Top Songs on Lit Studios
            </p>
          </div>
        </div>
      </div>

      {/* ── CHARTS PANEL ── */}
      <div className="container pb-24 px-2 sm:px-4">
        {/* Sort Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 px-0 sm:justify-center sm:flex-wrap" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}>
          {[
            { key: 'market_cap', label: 'Lit Charts', icon: <Activity size={14} /> },
            { key: 'volume', label: 'My Playlist', icon: <Flame size={14} /> },
            { key: 'progress', label: 'Market Cap', icon: <TrendingUp size={14} /> },
            { key: 'newest', label: 'Newest', icon: <Sparkles size={14} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setSortMode(tab.key as SortMode)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
              style={{
                background: sortMode === tab.key ? (isDark ? 'rgba(0, 255, 65, 0.12)' : 'rgba(0, 255, 65, 0.1)') : (isDark ? 'rgba(10,26,14,0.6)' : GLASS),
                border: `1px solid ${sortMode === tab.key ? (isDark ? 'rgba(0, 255, 65, 0.4)' : GREEN_BORDER) : (isDark ? 'rgba(0, 255, 65, 0.12)' : GLASS_BORDER)}`,
                color: sortMode === tab.key ? (isDark ? '#00FF41' : GREEN_TEXT) : (isDark ? 'rgba(255,255,255,0.5)' : NAVY_MUTED),
                minHeight: '44px',
                ...(!isDark && sortMode === tab.key ? { backdropFilter: 'blur(20px)' } : {}),
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            ...(isDark ? {
              background: 'linear-gradient(145deg, #0A1A0E 0%, #060A06 100%)',
              border: '1px solid rgba(0, 255, 65, 0.15)',
            } : {
              background: GLASS,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${GLASS_BORDER}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            }),
          }}
        >
          {/* Table Header */}
          <div
            className="grid gap-3 sm:gap-4 px-3 sm:px-6 py-3 text-xs font-bold uppercase tracking-wider"
            style={{
              gridTemplateColumns: '44px 1fr 100px 44px',
              background: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(26,39,68,0.04)',
              borderBottom: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.12)' : GLASS_BORDER}`,
              color: isDark ? 'rgba(255,255,255,0.4)' : NAVY_MUTED,
            }}
          >
            <div>#</div>
            <div>Song</div>
            <div className="text-right">24h</div>
            <div />
          </div>

          {loading && (
            <div className="py-20 text-center" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : NAVY_MUTED }}>
              <div className="inline-flex items-center gap-2">
                <div className="w-5 h-5 rounded-full animate-spin" style={{ border: `2px solid rgba(0, 255, 65, 0.2)`, borderTopColor: '#00FF41' }} />
                Loading chart data...
              </div>
            </div>
          )}

          {!loading && sortedSongs.length === 0 && (
            <div className="py-20 text-center" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : NAVY_MUTED }}>
              <Music size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-1" style={{ color: isDark ? '#fff' : NAVY }}>No songs yet</p>
              <p className="text-sm">Be the first to launch a song token!</p>
              <Link
                to="/create"
                className="inline-flex items-center gap-2 mt-4 px-6 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: isDark ? 'linear-gradient(135deg, rgba(0, 255, 65, 0.2), rgba(0,212,255,0.15))' : GREEN_BTN,
                  border: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.4)' : GREEN_BORDER}`,
                  color: isDark ? '#00FF41' : NAVY,
                  ...(!isDark ? { fontWeight: 800 } : {}),
                }}
              >
                Launch Your Song
              </Link>
            </div>
          )}

          {/* My Playlist empty state */}
          {!loading && sortMode === 'volume' && !checkingCollected && !hasCollectedSongs && walletAddress && (
            <div className="py-20 text-center" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : NAVY_MUTED }}>
              <Music size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : NAVY }}>
                Collect songs to build your playlist — mint a song to join the rotation!
              </p>
              <button
                onClick={() => navigate('/discover')}
                className="inline-flex items-center gap-2 mt-4 px-6 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
                style={{
                  background: isDark ? 'linear-gradient(135deg, rgba(0, 255, 65, 0.2), rgba(0,212,255,0.15))' : GREEN_BTN,
                  border: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.4)' : GREEN_BORDER}`,
                  color: isDark ? '#00FF41' : NAVY,
                  ...(!isDark ? { fontWeight: 800 } : {}),
                }}
              >
                Explore
              </button>
            </div>
          )}

          {sortedSongs.length > 0 && sortedSongs.slice(0, 100).map((item, idx) => {
            const rank = idx + 1;
            const cached = priceCache[item.id];
            const progress = cached?.progress ?? null;
            const price = cached?.price ?? null;
            const songDetail = detailsMap[item.id];
            const social = socialMap[item.id];
            const ph = priceHistoryMap[item.id] ?? [];
            const { pct: pct24h, sparkline } = get24hChange(ph);
            const sparkColor = pct24h != null && pct24h < 0 ? '#ef4444' : '#00FF41';

            const displayPrice = price !== null
              ? price < 0.001
                ? price.toExponential(2)
                : price.toFixed(6)
              : '...';

            return (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.995 }}
                className="grid gap-3 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 transition-colors cursor-pointer items-center"
                style={{
                  gridTemplateColumns: '44px 1fr 100px 44px',
                  borderBottom: rank < sortedSongs.length ? '1px solid rgba(0,0,0,0.25)' : 'none',
                  background: 'transparent',
                  minHeight: '80px',
                }}
                onClick={() => navigate(`/song/${item.id}`)}
                onHoverStart={(e, info) => {
                  if (info) {
                    (e.target as HTMLElement).style.background = isDark ? '#18181b' : 'rgba(255,255,255,0.2)';
                  }
                }}
                onHoverEnd={(e) => {
                  (e.target as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Rank */}
                <div className="flex items-center">
                  <RankBadge rank={rank} />
                </div>

                {/* Song info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0"
                    style={{ boxShadow: isDark ? '0 0 12px rgba(0, 255, 65, 0.15)' : '0 2px 8px rgba(0,0,0,0.1)' }}
                  >
                    {songDetail?.coverImage ? (
                      <img src={songDetail.coverImage} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ background: isDark ? 'linear-gradient(135deg, #0A1A0E, #060A06)' : 'linear-gradient(135deg, #d4e8f0, #b8d4e3)' }}
                      >
                        <Music size={18} style={{ color: isDark ? 'rgba(0, 255, 65, 0.3)' : 'rgba(26,39,68,0.2)' }} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold truncate text-sm" style={{ color: isDark ? '#fff' : NAVY }}>{songDetail?.title ?? item.name}</span>
                      <span style={{ color: isDark ? '#00D4FF' : GREEN_TEXT, fontFamily: orbitronFont, fontSize: '0.65rem', fontWeight: 600 }}>${item.symbol}</span>
                      <span
                        className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                        style={{ background: '#00FF41', boxShadow: '0 0 4px #00FF41' }}
                      />
                    </div>
                    <div className="text-xs truncate mb-1" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : NAVY_MUTED }}>
                      {songDetail?.artist ?? '—'}
                    </div>
                    {/* Social strip */}
                    {social && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Play size={10} style={{ color: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[10px] font-medium" style={{ fontFamily: orbitronFont, color: 'rgba(255,255,255,0.4)' }}>
                            {formatCompact(social.streams)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Repeat2 size={10} style={{ color: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[10px] font-medium" style={{ fontFamily: orbitronFont, color: 'rgba(255,255,255,0.4)' }}>
                            {formatCompact(social.reposts)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Heart size={10} style={{ color: 'rgba(255,255,255,0.35)' }} />
                          <span className="text-[10px] font-medium" style={{ fontFamily: orbitronFont, color: 'rgba(255,255,255,0.4)' }}>
                            {formatCompact(social.saves)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sparkline + 24h% */}
                <div className="flex flex-col items-end gap-1">
                  <TinySparkline points={sparkline} width={40} height={20} color={sparkColor} />
                  {pct24h !== null ? (
                    <span
                      className="text-[11px] font-bold"
                      style={{
                        fontFamily: orbitronFont,
                        color: pct24h >= 0 ? '#00FF41' : '#ef4444',
                      }}
                    >
                      {pct24h >= 0 ? '+' : ''}{pct24h.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold" style={{ fontFamily: orbitronFont, color: 'rgba(255,255,255,0.3)' }}>
                      --
                    </span>
                  )}
                  <div className="text-[10px]" style={{ fontFamily: orbitronFont, color: isDark ? 'rgba(255,255,255,0.35)' : NAVY_MUTED }}>
                    {displayPrice} SOL
                  </div>
                </div>

                {/* + button */}
                <div className="flex items-center justify-end">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPlaylistModalSong({
                        id: item.id,
                        title: songDetail?.title ?? item.name,
                        artist: songDetail?.artist,
                        coverImage: songDetail?.coverImage,
                      });
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <Plus size={14} style={{ color: '#00FF41' }} />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Songs', value: sortedSongs.length.toString(), icon: <Music size={16} /> },
            { label: 'Total Market Cap', value: '$' + (sortedSongs.length * 50000).toLocaleString(), icon: <Activity size={16} /> },
            { label: 'Traded Today', value: '—', icon: <Flame size={16} /> },
            { label: 'New Today', value: '—', icon: <Sparkles size={16} /> },
          ].map(stat => (
            <div
              key={stat.label}
              className="p-4 rounded-xl"
              style={{
                ...(isDark ? {
                  background: 'linear-gradient(135deg, #0A1A0E, #060A06)',
                  border: '1px solid rgba(0, 255, 65, 0.12)',
                } : {
                  background: GLASS,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1px solid ${GLASS_BORDER}`,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                }),
              }}
            >
              <div className="flex items-center gap-2 mb-2" style={{ color: isDark ? 'rgba(255,255,255,0.4)' : NAVY_MUTED }}>
                {stat.icon}
                <span className="text-xs font-medium">{stat.label}</span>
              </div>
              <div
                className="text-xl font-black"
                style={{ fontFamily: orbitronFont, fontSize: '1.1rem', fontWeight: 700, color: isDark ? '#00D4FF' : GREEN_TEXT }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add to Playlist Modal */}
      {playlistModalSong && (
        <AddToPlaylistModal
          songId={playlistModalSong.id}
          title={playlistModalSong.title}
          artist={playlistModalSong.artist}
          coverImage={playlistModalSong.coverImage}
          isOpen={!!playlistModalSong}
          onClose={() => setPlaylistModalSong(null)}
        />
      )}
    </div>
  );
};

export default Hot100Page;
