import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AlbumDropsCarousel from '@/components/AlbumDropsCarousel';
import { subscribeManySongs, getManySongs, getManySongsSwaps, getManySongsLikes, runGetBondingCurveProgressQueryForSongs, setSongsBuys } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManyCuratedTrending } from '@/lib/collections/curatedTrending';
import type { CuratedTrendingResponse } from '@/lib/collections/curatedTrending';
import { subscribeManySongDetails, getManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { getManyArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';
import { subscribeManyFollows, getManyFollows } from '@/lib/collections/follows';
import type { FollowsResponse } from '@/lib/collections/follows';
import { useAuth } from '@/hooks/use-privy-auth';
import { usePlayer } from '@/contexts/PlayerContext';
import type { PlayerSong } from '@/contexts/PlayerContext';
import { useTheme } from '@/hooks/use-theme';
import { triggerHapticFeedback } from '@/utils/haptic';
import {
  Play, Pause, Music, User, Plus, Rocket,
  TrendingUp, Users, DollarSign, ChevronRight,
  Search, Zap, ArrowRight, Sparkles,
} from 'lucide-react';
import WalletButton from '@/components/WalletButton';
import CompactSongCard from '@/components/CompactSongCard';
import NewDropCard from '@/components/NewDropCard';
import QuickBuyModal from '@/components/QuickBuyModal';
import SectionBanner from '@/components/SectionBanner';
import PlatformHealthSection from '@/components/PlatformHealthSection';
import RecentPayoutsStrip from '@/components/RecentPayoutsStrip';
import TopEarnersLeaderboard from '@/components/TopEarnersLeaderboard';
import RisingCreators from '@/components/RisingCreators';
import { useCostBasis, estimateTokensFromSol } from '@/hooks/use-cost-basis';
import { subscribeSongsBuys } from '@/lib/collections/songs';
import { useSongCandles } from '@/hooks/useSongCandles';
import LitHeroDesktop from '@/components/LitHero';
import MobileHero from '@/components/MobileHero';
import { isSeedSong } from '@/utils/songFilters';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

// ─── Neon accent colors ─────────────────────────────────────────────────
const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const NEON_PURPLE = '#8B5CF6';

// ─── Theme-aware color helper ──────────────────────────────────────────
function useThemeColors() {
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return {
    isDark,
    bg: isDark ? '#000000' : '#f5f5f5',
    cardBg: isDark ? '#111111' : 'rgba(255,255,255,0.3)',
    cardSolidBg: isDark ? '#111111' : 'rgba(255,255,255,0.3)',
    text: isDark ? '#fff' : '#1a2744',
    mutedText: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,39,68,0.5)',
    subText: isDark ? 'rgba(220,214,240,0.8)' : '#1a2744',
    faintText: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(26,39,68,0.4)',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
    borderStrong: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.8)',
    searchBg: isDark ? '#111111' : 'rgba(255,255,255,0.4)',
    inputText: isDark ? '#fff' : '#1a2744',
    inputPlaceholder: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,39,68,0.4)',
    heroGradient: isDark ? 'linear-gradient(160deg, #0A1A0E 0%, #060D08 40%, #0A1A0E 100%)' : 'transparent',
    heroGrid: isDark ? 'rgba(0, 255, 65, 0.06)' : 'transparent',
    heroBorder: isDark ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,255,255,0.3)',
    cardGradient: isDark ? '#111111' : 'rgba(255,255,255,0.3)',
    cardBorder: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.6)',
    overlayGradient: isDark ? 'rgba(0,0,0,0.99)' : 'rgba(255,255,255,0.7)',
    overlayGradientMid: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.5)',
    overlayGradientLight: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
    vignette: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)',
    navIconInactive: isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(26,39,68,0.5)',
    artistText: isDark ? 'rgba(220,214,240,0.8)' : '#1a2744',
    artistTextDim: isDark ? 'rgba(220,214,240,0.6)' : 'rgba(26,39,68,0.5)',
    searchIcon: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,39,68,0.4)',
    liveChartsText: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.5)',
    noResultsText: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,39,68,0.4)',
    artistFallbackIcon: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,39,68,0.4)',
    dashedBorder: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(26,39,68,0.2)',
    plusIcon: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,39,68,0.3)',
    popupBg: isDark ? 'rgba(16,10,36,0.96)' : 'rgba(255,255,255,0.8)',
    popupBorder: isDark ? 'rgba(0, 255, 65, 0.2)' : 'rgba(255,255,255,0.6)',
    popupCloseBg: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(26,39,68,0.1)',
    popupCloseColor: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.5)',
    popupActiveBg: isDark ? 'rgba(0, 255, 65, 0.08)' : 'rgba(0, 255, 65, 0.1)',
    rocketBtnBg: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.4)',
    rocketBtnBorder: isDark ? 'rgba(0, 255, 65, 0.3)' : 'rgba(0, 255, 65, 0.3)',
    rocketBtnIcon: isDark ? 'rgba(255,255,255,0.7)' : '#00FF41',
    greenAccent: '#00FF41',
    navyText: '#1a2744',
  };
}

// ─── Keyframe animations ───────────────────────────────────────────────
const NeonKeyframes: React.FC = () => (
  <style>{`
    @keyframes scanLine {
      0%   { top: -4px; }
      100% { top: 105%; }
    }
    @keyframes logoPulse {
      0%   { filter: drop-shadow(0 0 20px rgba(0, 255, 65, 0.5)) drop-shadow(0 0 60px rgba(0,212,255,0.25)); }
      50%  { filter: drop-shadow(0 0 35px rgba(0, 255, 65, 0.8)) drop-shadow(0 0 80px rgba(0,212,255,0.45)); }
      100% { filter: drop-shadow(0 0 20px rgba(0, 255, 65, 0.5)) drop-shadow(0 0 60px rgba(0,212,255,0.25)); }
    }
    @keyframes borderGlow {
      0%   { border-color: rgba(0, 255, 65, 0.25); box-shadow: 0 0 20px rgba(0, 255, 65, 0.08); }
      50%  { border-color: rgba(0,212,255,0.45); box-shadow: 0 0 35px rgba(0,212,255,0.18); }
      100% { border-color: rgba(0, 255, 65, 0.25); box-shadow: 0 0 20px rgba(0, 255, 65, 0.08); }
    }
    @keyframes livePulse {
      0%   { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.7); }
      50%  { opacity: 0.8; box-shadow: 0 0 0 4px rgba(0, 255, 65, 0); }
      100% { opacity: 1; box-shadow: 0 0 0 0 rgba(0, 255, 65, 0.7); }
    }
    @keyframes floatGlow {
      0%, 100% { opacity: 0.15; transform: translateY(0) scale(1); }
      50% { opacity: 0.25; transform: translateY(-20px) scale(1.1); }
    }
  `}</style>
);

// ─── Section Header ────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string; seeAllPath?: string; icon?: React.ReactNode }> = ({ title, seeAllPath, icon }) => {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  return (
    <div className="flex items-center justify-between mb-4">
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {isDark && (
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              left: '0',
              right: '0',
              height: '140%',
              background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(0, 255, 65, 0.15), transparent 70%)',
              filter: 'blur(20px)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
        )}
        <h2
          className="text-sm sm:text-base font-black flex items-center gap-2"
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontWeight: 800,
            letterSpacing: '0.02em',
            color: isDark ? '#ffffff' : '#111827',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {icon}
          {title}
        </h2>
      </div>
      {seeAllPath && (
        <button
          onClick={() => { triggerHapticFeedback(); navigate(seeAllPath); }}
          className="flex items-center gap-1 transition-colors"
          style={{
            color: isDark ? HEADLINE_GREEN : '#00FF41',
            fontFamily: isDark ? "'Archivo Black', sans-serif" : "'Inter', sans-serif",
            fontSize: '0.6rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          See All <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
};

// ─── Resilient data fetching hook ──────────────────────────────────────
function useResilientSongs() {
  const [songs, setSongs] = useState<SongsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const initial = await getManySongs('order by tarobase_created_at desc limit 100');
        if (mounted) setSongs((initial ?? []).filter((s) => !isSeedSong(s)));
      } catch (e) {
        console.warn('getManySongs failed:', e);
      }

      if (!mounted) return;
      try {
        const unsub = await subscribeManySongs((updated) => {
          if (mounted) setSongs((updated ?? []).filter((s) => !isSeedSong(s)));
        }, 'order by tarobase_created_at desc limit 100');
        setLoading(false);
        return () => {
          mounted = false;
          unsub().catch(() => {});
        };
      } catch (e) {
        console.warn('subscribeManySongs failed, using static data:', e);
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  return { data: songs, loading };
}

function useResilientSongDetails() {
  const [allDetails, setAllDetails] = useState<SongDetailsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const initial = await getManySongDetails('order by tarobase_created_at desc limit 100');
        if (mounted) setAllDetails((initial ?? []).filter((d) => !isSeedSong(d as any)));
      } catch (e) {
        console.warn('getManySongDetails failed:', e);
      }

      try {
        const unsub = await subscribeManySongDetails((updated) => {
          if (mounted) setAllDetails((updated ?? []).filter((d) => !isSeedSong(d as any)));
        }, 'order by tarobase_created_at desc limit 100');
        setLoading(false);
        return () => {
          mounted = false;
          unsub().catch(() => {});
        };
      } catch (e) {
        console.warn('subscribeManySongDetails failed, using static data:', e);
        if (mounted) setLoading(false);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  return { data: allDetails, loading };
}

// ─── Resilient Follows hook ────────────────────────────────────────────
function useResilientFollows() {
  const [follows, setFollows] = useState<FollowsResponse[]>([]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const initial = await getManyFollows('order by createdAt desc limit 200');
        if (mounted) setFollows(initial ?? []);
      } catch (e) {
        console.warn('getManyFollows failed:', e);
      }

      try {
        const unsub = await subscribeManyFollows((updated) => {
          if (mounted) setFollows(updated ?? []);
        }, 'order by createdAt desc limit 200');
        return () => {
          mounted = false;
          unsub().catch(() => {});
        };
      } catch (e) {
        console.warn('subscribeManyFollows failed:', e);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  return { data: follows };
}

// ─── Sparkline component ───────────────────────────────────────────────
function Sparkline({ positive, history, loading }: { positive: boolean; history?: number[]; loading?: boolean }) {
  const color = positive ? PRIMARY_GREEN : '#ef4444';

  if (loading && (!history || history.length < 2)) {
    return (
      <svg width="50" height="24" viewBox="0 0 50 24" fill="none" style={{ flexShrink: 0 }}>
        <line x1="0" y1="12" x2="50" y2="12" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  let pointsStr: string;
  if (history && history.length >= 2) {
    const mn = Math.min(...history);
    const mx = Math.max(...history);
    const rng = mx - mn || 1;
    pointsStr = history.map((v, i) => {
      const x = (i / (history.length - 1)) * 50;
      const y = 22 - ((v - mn) / rng) * 20;
      return `${x},${y}`;
    }).join(' ');
  } else {
    pointsStr = positive
      ? '0,20 5,18 10,22 15,14 20,16 25,10 30,12 35,8 40,10 45,6 50,4'
      : '0,6 5,8 10,4 15,10 20,12 25,14 30,12 35,18 40,16 45,20 50,18';
  }

  return (
    <svg width="50" height="24" viewBox="0 0 50 24" fill="none" style={{ flexShrink: 0 }}>
      <polyline points={pointsStr} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Animated section wrapper ──────────────────────────────────────
const AnimatedSection: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-50px' }}
    transition={{ duration: 0.5, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
  >
    {children}
  </motion.div>
);


// ─── Streaming Now Card ────────────────────────────────────────────────
const StreamingNowCard: React.FC<{
  song: SongsResponse;
  details: SongDetailsResponse | null;
  volume: number;
  onPlay: (songId: string) => void;
  isPlaying: boolean;
  colors: ReturnType<typeof useThemeColors>;
  index: number;
}> = ({ song, details, volume, onPlay, isPlaying, colors, index }) => {
  const navigate = useNavigate();
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);

  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$TOKEN';
  const title = details?.title ?? song.name ?? 'UNTITLED';
  const artist = details?.artist ?? '—';

  const { candles, loading: candlesLoading } = useSongCandles(song.mintAddress ?? null, '1h');
  const candleHistory = candles.length >= 2 ? candles.map(c => c.c) : undefined;

  // Fetch real price from backend — only for first 10 visible cards
  useEffect(() => {
    if (index >= 10 || !song.mintAddress) {
      setTokenPrice(null);
      return;
    }
    let cancelled = false;
    setPriceLoading(true);

    const fetchPrice = async () => {
      try {
        const data = await api.get<{ priceUsd: number | null; source: string | null }>(
          `/api/token-price?mint=${encodeURIComponent(song.mintAddress!)}`
        );
        if (!cancelled) setTokenPrice(data?.priceUsd ?? null);
      } catch {
        if (!cancelled) setTokenPrice(null);
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    };

    fetchPrice();
    return () => { cancelled = true; };
  }, [song.mintAddress, index]);

  const priceStr = tokenPrice != null ? `$${tokenPrice.toFixed(6)}` : '—';
  const change24h = '—';
  const isPositive = true;

  return (
    <button
      onClick={() => navigate(`/song/${song.id}`)}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: `1px solid ${colors.border}`,
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(0, 255, 65, 0.04)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Play button */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: isPlaying ? '#00FF41' : 'rgba(0, 255, 65, 0.1)',
          border: `1px solid ${isPlaying ? 'rgba(255,255,255,0.3)' : 'rgba(0, 255, 65, 0.2)'}`,
        }}
        onClick={(e) => { e.stopPropagation(); onPlay(song.id); }}
      >
        {isPlaying ? (
          <Pause size={16} color="#0A0A0F" fill="#0A0A0F" />
        ) : (
          <Play size={16} color={PRIMARY_GREEN} fill={PRIMARY_GREEN} style={{ marginLeft: 1 }} />
        )}
      </div>

      {/* Cover */}
      {details?.coverImage ? (
        <img src={details.coverImage} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 44, height: 44, borderRadius: 8, background: '#1a1a1a', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Music size={18} color="rgba(255,255,255,0.15)" />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 9,
          color: colors.faintText,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {artist}
        </div>
      </div>

      {/* Price */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 60 }}>
        <div style={{
          fontFamily: "'Inter', monospace",
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
        }}>{priceStr}</div>
        <div style={{
          fontFamily: "'Inter', monospace",
          fontSize: 10,
          color: tokenPrice != null ? (isPositive ? PRIMARY_GREEN : '#ef4444') : colors.faintText,
        }}>
          {change24h}
        </div>
      </div>

      {/* Volume */}
      {volume > 0 && (
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 9,
          color: colors.faintText,
          flexShrink: 0,
          minWidth: 40,
          textAlign: 'right',
        }}>
          ${volume >= 1000 ? `${(volume / 1000).toFixed(1)}K` : volume.toFixed(1)}
        </div>
      )}

      {/* Sparkline */}
      <Sparkline positive={isPositive} history={candleHistory} loading={candlesLoading || priceLoading} />
    </button>
  );
};

// ─── Main HomePage ─────────────────────────────────────────────────────
const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong: contextPlaySong, togglePlay: contextTogglePlay, currentSong, isPlaying: playerIsPlaying } = usePlayer();
  const [quickBuySong, setQuickBuySong] = useState<SongsResponse | null>(null);
  const { recordBuyLot } = useCostBasis();

  // Data hooks
  const { data: songs } = useResilientSongs();
  const { data: allDetails } = useResilientSongDetails();
  const { data: follows } = useResilientFollows();

  // Artists list
  const [artists, setArtists] = useState<ArtistsResponse[]>([]);
  useEffect(() => {
    getManyArtists('order by tarobase_created_at desc limit 50').then(a => setArtists(a)).catch(() => {});
  }, []);

  // Swap volume per song
  const [songVolume, setSongVolume] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      if (!songs?.length) return;
      const volumeMap: Record<string, number> = {};
      await Promise.all(
        songs.map(async (song) => {
          try {
            const swaps = await getManySongsSwaps(song.id);
            const total = swaps.reduce((sum, sw) => sum + (sw.amt ?? 0), 0);
            volumeMap[song.id] = total;
          } catch {
            volumeMap[song.id] = 0;
          }
        })
      );
      setSongVolume(volumeMap);
    })();
  }, [songs]);

  // Likes count per song
  const [songLikes, setSongLikes] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      if (!songs?.length) return;
      const likesMap: Record<string, number> = {};
      await Promise.all(
        songs.map(async (song) => {
          try {
            const likes = await getManySongsLikes(song.id);
            likesMap[song.id] = likes.length;
          } catch {
            likesMap[song.id] = 0;
          }
        })
      );
      setSongLikes(likesMap);
    })();
  }, [songs]);

  // Bonding curve progress per song
  const [bondingProgress, setBondingProgress] = useState<Record<string, number>>({});
  useEffect(() => {
    (async () => {
      if (!songs?.length) return;
      const progressMap: Record<string, number> = {};
      await Promise.all(
        songs.map(async (song) => {
          try {
            const progress = await runGetBondingCurveProgressQueryForSongs(song.id);
            progressMap[song.id] = progress ?? 0;
          } catch {
            progressMap[song.id] = 0;
          }
        })
      );
      setBondingProgress(progressMap);
    })();
  }, [songs]);

  // Details map
  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    (allDetails ?? []).forEach(d => { map[d.id] = d; });
    return map;
  }, [allDetails]);

  // Filtered + sorted songs
  const sortedSongs = useMemo(() => {
    const detailIds = new Set(
      (allDetails ?? []).filter(d => d.approved !== false).map(d => d.id)
    );
    const filtered = [...(songs ?? [])]
      .filter(s => {
        if (s.hidden === true) return false;
        if (!detailIds.has(s.id)) return false;
        if (s.albumId && s.isPrivate === true) return false;
        const d = detailIds.has(s.id) ? allDetails?.find(dd => dd.id === s.id) : null;
        const name = (d?.title ?? s.name ?? '').toLowerCase();
        const symbol = (s.symbol ?? '').toLowerCase();
        if (name.includes('addicted') || symbol.includes('addicted')) return false;
        return true;
      });
    const bySymbol = new Map<string, typeof filtered[0]>();
    for (const s of filtered) {
      const sym = (s.symbol ?? '').toLowerCase();
      if (!bySymbol.has(sym)) bySymbol.set(sym, s);
    }
    const deduped = Array.from(bySymbol.values());
    return deduped.sort((a, b) => {
      const volA = songVolume[a.id] ?? 0;
      const volB = songVolume[b.id] ?? 0;
      if (volB !== volA) return volB - volA;
      return (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0);
    });
  }, [songs, allDetails, songVolume]);

  // New songs sorted by creation date
  const newSongs = useMemo(() => {
    const detailIds = new Set(
      (allDetails ?? []).filter(d => d.approved !== false).map(d => d.id)
    );
    const filtered = [...(songs ?? [])]
      .filter(s => {
        if (s.hidden === true) return false;
        if (!detailIds.has(s.id)) return false;
        if (s.albumId && s.isPrivate === true) return false;
        const d = detailIds.has(s.id) ? allDetails?.find(dd => dd.id === s.id) : null;
        const name = (d?.title ?? s.name ?? '').toLowerCase();
        const symbol = (s.symbol ?? '').toLowerCase();
        if (name.includes('addicted') || symbol.includes('addicted')) return false;
        return true;
      });
    const bySymbol = new Map<string, typeof filtered[0]>();
    for (const s of filtered) {
      const sym = (s.symbol ?? '').toLowerCase();
      if (!bySymbol.has(sym)) bySymbol.set(sym, s);
    }
    return Array.from(bySymbol.values())
      .sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0));
  }, [songs, allDetails]);

  // Carousel state for hero
  const [carouselIndex, setCarouselIndex] = useState(0);
  const handlePrev = useCallback(() => setCarouselIndex(i => Math.max(0, i - 1)), []);
  const handleNext = useCallback(() => setCarouselIndex(i => Math.min((songs?.length ?? 1) - 1, i + 1)), [songs]);

  // Play a song
  const playSongFromList = useCallback(
    (songId: string) => {
      const song = sortedSongs.find((s) => s.id === songId);
      if (!song) return;
      const d = detailsMap[song.id];
      const audioSrc = d?.audioUrl || d?.audiusStreamUrl || song.audiusStreamUrl || null;
      if (!audioSrc) {
        navigate(`/song/${songId}`);
        return;
      }
      if (currentSong?.songId === songId) {
        contextTogglePlay();
        return;
      }
      contextPlaySong({
        songId,
        title: d?.title ?? song.name ?? 'Unknown',
        artist: d?.artist ?? 'Unknown Artist',
        coverImage: d?.coverImage,
        audioUrl: d?.audioUrl,
        audiusStreamUrl: d?.audiusStreamUrl ?? song.audiusStreamUrl,
        duration: d?.duration,
        symbol: song.symbol,
      });
    },
    [sortedSongs, detailsMap, contextPlaySong, contextTogglePlay, currentSong, navigate]
  );

  const handleAddToPlaylist = useCallback((songId: string) => {
    if (user) {
      toast.success('Added to playlist');
    } else {
      toast.error('Sign in to add songs to a playlist.');
    }
  }, [user]);

  const totalSongs = sortedSongs.length;

  // Curated trending from admin-managed collection
  const [curatedTrending, setCuratedTrending] = useState<CuratedTrendingResponse[]>([]);
  useEffect(() => {
    let unsub: (() => Promise<void>) | null = null;
    subscribeManyCuratedTrending((data) => {
      setCuratedTrending((data ?? []).sort((a, b) => (b.addedAt as number) - (a.addedAt as number)));
    }).then((fn) => { unsub = fn; }).catch(() => {});
    return () => { unsub?.(); };
  }, []);

  // Trending = top 8 by volume
  const trendingSongs = useMemo(() => sortedSongs.slice(0, 8), [sortedSongs]);

  // New drops = newest 8
  const recentLaunches = useMemo(() => newSongs.slice(0, 8), [newSongs]);

  // Top Artists
  const featuredCreators = useMemo(() => {
    const followCounts: Record<string, number> = {};
    (follows ?? []).forEach(f => {
      followCounts[f.artistAddress] = (followCounts[f.artistAddress] ?? 0) + 1;
    });
    return artists
      .map(a => ({ ...a, followerCount: followCounts[a.walletAddress] ?? 0 }))
      .sort((a, b) => b.followerCount - a.followerCount)
      .slice(0, 8);
  }, [artists, follows]);

  const colors = useThemeColors();

  return (
    <div
      className="min-h-screen relative w-full"
      style={{
        background: '#000000',
        paddingBottom: '64px',
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <NeonKeyframes />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MOBILE HERO (full hero for < 768px)                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <MobileHero
        songs={sortedSongs}
        detailsMap={detailsMap}
        carouselIndex={carouselIndex}
        onPrev={handlePrev}
        onNext={handleNext}
        isPlaying={playerIsPlaying && !!currentSong}
        onTogglePlay={playSongFromList}
        onAddToPlaylist={handleAddToPlaylist}
      />

      {/* Wallet connect button — fixed top-right (desktop only) */}
      <div
        className="hidden md:block"
        style={{
          position: 'fixed',
          top: 'max(12px, env(safe-area-inset-top))',
          right: 16,
          zIndex: 50,
        }}
      >
        <WalletButton variant="neon" />
      </div>

      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '-200px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 255, 65, 0.08) 0%, rgba(0,212,255,0.04) 40%, transparent 70%)',
          animation: 'floatGlow 8s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />

      <div className="relative w-full" style={{ zIndex: 1, maxWidth: '100%', overflowX: 'clip' }}>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* LIT STUDIO DASHBOARD HERO                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <LitHeroDesktop
          songs={sortedSongs}
          detailsMap={detailsMap}
          carouselIndex={carouselIndex}
          onPrev={handlePrev}
          onNext={handleNext}
          isPlaying={playerIsPlaying && !!currentSong}
          onTogglePlay={playSongFromList}
          onAddToPlaylist={handleAddToPlaylist}
        />
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* ALBUM DROPS CAROUSEL                                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AlbumDropsCarousel />

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RECENT PAYOUTS TICKER                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatedSection delay={0.08}>
          <RecentPayoutsStrip />
        </AnimatedSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PLATFORM HEALTH                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatedSection delay={0.1}>
          <PlatformHealthSection />
        </AnimatedSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TOP EARNERS                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatedSection delay={0.12}>
          <TopEarnersLeaderboard />
        </AnimatedSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RISING CREATORS                                           */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatedSection delay={0.14}>
          <RisingCreators />
        </AnimatedSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* NEW DROPS THIS WEEK                                       */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {recentLaunches.length > 0 && (
          <AnimatedSection delay={0.15}>
            <div className="pb-6">
              <div className="px-4 sm:px-6 md:px-8 mb-4">
                <SectionBanner
                  titleBefore="New "
                  accentWord="Drops"
                  titleAfter=" This Week"
                  subtitle="New music. Fresh energy."
                  imageUrl="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f0f282558974b276c4325"
                  ctaText="See All"
                  ctaIcon={<ArrowRight size={14} />}
                  ctaPath="/discover?tab=new"
                />
              </div>
              <div
                className="flex gap-4 overflow-x-auto px-4 sm:px-6 md:px-8"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  scrollSnapType: 'x mandatory',
                  scrollPaddingLeft: '16px',
                  WebkitOverflowScrolling: 'touch',
                  paddingTop: '6px',
                  paddingBottom: '16px',
                } as React.CSSProperties}
              >
                {recentLaunches.map((song) => (
                  <div
                    key={song.id}
                    className="flex-shrink-0"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <NewDropCard
                      song={song}
                      details={detailsMap[song.id] ?? null}
                      onBuy={() => setQuickBuySong(song)}
                    />
                  </div>
                ))}
                <div className="flex-shrink-0 w-2" />
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TOP ARTISTS                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {featuredCreators.length > 0 && (
          <AnimatedSection delay={0.2}>
            <div className="pb-6">
              <div className="px-4 sm:px-6 md:px-8">
                <SectionHeader title="Top Artists" seeAllPath="/discover?tab=artists" icon={<Users size={16} />} />
              </div>
              <div
                className="flex gap-5 overflow-x-auto px-4 sm:px-6 md:px-8"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                  paddingTop: '4px',
                  paddingBottom: '16px',
                } as React.CSSProperties}
              >
                {featuredCreators.map((creator) => {
                  const songCount = songs?.filter(s => !s.hidden && s.creator === creator.walletAddress).length ?? 0;
                  return (
                    <button
                      key={creator.walletAddress}
                      onClick={() => { triggerHapticFeedback(); navigate(`/artist/${creator.walletAddress}`); }}
                      className="flex-shrink-0 flex flex-col items-center gap-3 transition-all active:scale-95 hover:-translate-y-1 group"
                      style={{ minWidth: '100px' }}
                    >
                      <div
                        className="w-[72px] h-[72px] rounded-full overflow-hidden flex items-center justify-center transition-all"
                        style={{
                          background: creator.profileImage ? 'transparent' : '#00FF41',
                          border: '2px solid rgba(0, 255, 65, 0.25)',
                          boxShadow: '0 0 12px rgba(0, 255, 65, 0.1)',
                        }}
                      >
                        {creator.profileImage ? (
                          <img src={creator.profileImage} alt={creator.name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={28} style={{ color: '#0A0A0F' }} />
                        )}
                      </div>
                      <span
                        className="text-[11px] font-bold text-center leading-tight truncate w-full"
                        style={{ color: colors.artistText, maxWidth: '90px' }}
                      >
                        {creator.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: 9, color: colors.faintText }}>
                          {songCount} song{songCount !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 9, color: colors.faintText }}>&middot;</span>
                        <span style={{ fontSize: 9, color: HEADLINE_GREEN }}>
                          {creator.followerCount} followers
                        </span>
                      </div>
                    </button>
                  );
                })}
                {/* "Be Next" placeholder */}
                <button
                  onClick={() => { triggerHapticFeedback(); navigate('/create'); }}
                  className="flex-shrink-0 flex flex-col items-center gap-3 transition-all hover:-translate-y-1 group"
                  style={{ minWidth: '100px', opacity: 0.35 }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.35'; }}
                >
                  <div
                    className="w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all group-hover:shadow-[0_0_20px_rgba(0, 255, 65, 0.3)]"
                    style={{
                      background: 'transparent',
                      border: '2px dashed rgba(255,255,255,0.15)',
                    }}
                  >
                    <Plus size={22} style={{ color: 'rgba(255,255,255,0.3)' }} className="group-hover:text-green-400 transition-colors" />
                  </div>
                  <span
                    className="text-[10px] font-medium text-center leading-tight truncate group-hover:text-green-400 transition-colors"
                    style={{ color: colors.artistTextDim, maxWidth: '80px' }}
                  >
                    Be Next
                  </span>
                </button>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TRENDING (admin-curated)                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatedSection delay={0.25}>
          <div className="pb-6">
            <div className="px-4 sm:px-6 md:px-8 mb-4">
              <SectionBanner
                titleBefore="Trending"
                subtitle="Trending songs this week"
                imageUrl="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f0eb61a25fa0767365b23"
              />
            </div>
            {curatedTrending.length === 0 ? (
              <div className="mx-4 sm:mx-6 md:mx-8 rounded-xl py-8 text-center" style={{ background: 'rgba(10,26,14,0.4)', border: `1px solid ${colors.border}` }}>
                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, color: colors.faintText, letterSpacing: '0.08em' }}>
                  No trending songs yet
                </span>
              </div>
            ) : (
              <div className="mx-4 sm:mx-6 md:mx-8 rounded-xl overflow-hidden" style={{ background: 'rgba(10,26,14,0.6)', border: `1px solid ${colors.border}` }}>
                {curatedTrending.map((entry, idx) => {
                  const song = songs?.find(s => s.id === entry.songId);
                  if (!song) return null;
                  return (
                    <StreamingNowCard
                      key={entry.songId}
                      song={song}
                      details={detailsMap[entry.songId] ?? null}
                      volume={songVolume[entry.songId] ?? 0}
                      onPlay={playSongFromList}
                      isPlaying={playerIsPlaying && currentSong?.songId === entry.songId}
                      colors={colors}
                      index={idx}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* BOTTOM CTA                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <AnimatedSection delay={0.3}>
          <div className="px-4 sm:px-6 md:px-8 pb-8">
            <div className="max-w-2xl mx-auto">
              <div
                className="rounded-2xl overflow-hidden text-center relative"
                style={{
                  background: '#111111',
                  border: '1px solid rgba(255,255,255,0.06)',
                  padding: 'clamp(24px, 5vw, 40px) clamp(16px, 4vw, 32px)',
                  boxShadow: '0 0 30px rgba(0, 255, 65, 0.1), 0 8px 40px rgba(0,0,0,0.3)',
                  minHeight: '440px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Background image */}
                <img
                  src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f248fd6a3b6c64d1140ca"
                  alt=""
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'right center',
                    zIndex: 0,
                    opacity: 0.9,
                  }}
                />
                {/* Gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.75) 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.15) 100%)',
                    zIndex: 1,
                  }}
                />
                {/* Content */}
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: '#00FF41' }}
                  >
                    <Rocket size={20} style={{ color: '#0A0A0F' }} />
                  </div>
                  <h3
                    className="text-xl sm:text-2xl font-black mb-2"
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      color: colors.text,
                      textShadow: colors.isDark ? '0 0 20px rgba(0, 255, 65, 0.2)' : 'none',
                    }}
                  >
                    Ready to launch your first song?
                  </h3>
                  <p
                    className="text-sm mb-6 max-w-sm mx-auto"
                    style={{ color: colors.mutedText, lineHeight: 1.6 }}
                  >
                    Upload your track, set your token, and start building your community today.
                  </p>
                  <button
                    onClick={() => { triggerHapticFeedback(); navigate('/create'); }}
                    className="rounded-xl transition-all active:scale-95 hover:scale-105 inline-flex items-center gap-2"
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      padding: '14px 32px',
                      background: '#00FF41',
                      color: '#0A0A0F',
                      border: 'none',
                      borderRadius: '12px',
                      boxShadow: '0 0 24px rgba(0, 255, 65, 0.4), 0 4px 20px rgba(0,0,0,0.3)',
                      minHeight: '48px',
                    }}
                  >
                    Launch Your Song
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Quick Buy Modal */}
        <QuickBuyModal
          song={quickBuySong}
          details={quickBuySong ? detailsMap[quickBuySong.id] ?? null : null}
          bondingProgress={quickBuySong ? (bondingProgress[quickBuySong.id] ?? 0) : 0}
          onClose={() => setQuickBuySong(null)}
          onConfirm={async (song, solAmount, slipBps) => {
            if (!user) {
              toast.error('Connect wallet to trade');
              return;
            }
            const lamports = Math.round(solAmount * 1_000_000_000);
            const title = detailsMap[song.id]?.title ?? song.name ?? 'this song';
            try {
              const buyId = crypto.randomUUID().replace(/-/g, '');
              const success = await setSongsBuys(song.id, buyId, {
                solAmt: lamports,
                slip: slipBps ?? 500,
              });
              if (success) {
                toast.success(`Bought ${title} tokens!`);

                // Subscribe to buy confirmation and record cost basis lot
                let unsub: (() => Promise<void>) | null = null;
                unsub = await subscribeSongsBuys(async (buyData) => {
                  if (buyData?.tarobase_transaction_hash) {
                    unsub?.().catch(() => {});
                    try {
                      const estimatedTokens = await estimateTokensFromSol(song.id, solAmount);
                      await recordBuyLot({
                        userAddress: user.address,
                        songId: song.id,
                        songName: title,
                        songSymbol: song.symbol ?? 'TOKEN',
                        tokenMint: song.mintAddress ?? '',
                        quantity: estimatedTokens,
                        costBasisAmount: lamports,
                        costBasisCurrency: 'SOL',
                        source: 'buy',
                        txSignature: buyData.tarobase_transaction_hash,
                      });
                    } catch (e) {
                      console.error('[HomePage] Failed to record buy lot:', e);
                    }
                  }
                }, song.id, buyId);
              } else {
                toast.error('Buy failed. Try again or open the song for details.');
              }
            } catch (err) {
              console.error('Quick buy failed:', err);
              toast.error(err instanceof Error ? err.message : 'Transaction failed');
            }
            setQuickBuySong(null);
          }}
        />

      </div>

    </div>
  );
};

export default HomePage;
