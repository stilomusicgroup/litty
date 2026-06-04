import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { orbitronFont } from '@/theme';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  Shuffle,
  SkipBack,
  SkipForward,
  Repeat,
  Play,
  ArrowRight,
  Radio,
  Heart,
  Plus,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTrendingSongs } from '@/hooks/useTrendingSongs';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
} from 'recharts';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { useSongCandles } from '@/hooks/useSongCandles';
import type { Timeframe } from '@/hooks/useSongCandles';
import { useAuth } from '@/hooks/use-privy-auth';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { getIdToken } from '@pooflabs/web';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import {
  subscribeSongs,
  subscribeManySongs,
  getManySongs,
  runGetTokenMintAddressQueryForSongs,
  runGetTokenBalanceQueryForSongs,
  setSongsBuys,
  setSongsSwaps,
  countSongsLikes,
  type SongsResponse,
} from '@/lib/collections/songs';
import { Address } from '@/lib/db-client';
import {
  subscribeSongDetails,
  subscribeManySongDetails,
  getManySongDetails,
  runTokenPriceUsdQueryForSongDetails,
  type SongDetailsResponse,
} from '@/lib/collections/songDetails';
import { isSeedSong } from '@/utils/songFilters';
import { subscribeSongStreams, type SongStreamsResponse } from '@/lib/collections/songStreams';
import TradingActivityFeed from '@/components/TradingActivityFeed';
import RepostButton from '@/components/RepostButton';
import PackCheckoutModal, { type PackInfo } from '@/components/PackCheckoutModal';
import SwapBottomSheet from '@/components/SwapBottomSheet';

/* ─── TIME FRAME MAPPING ───
 * Maps UI buttons → pump.fun candle granularity (minutes).
 * 1H → 1m (~60 candles) | 1D → 5m (~288) | 1W → 1h (~168)
 * 1M → 4h (~180) | 1Y → 1d (~365)
 */
const TF_MAP: Record<string, Timeframe> = {
  '1H': '1m',
  '1D': '5m',
  '1W': '1h',
  '1M': '4h',
  '1Y': '1d',
};

const timeFilters = ['1H', '1D', '1W', '1M', '1Y'];

/* ─── HELPERS ─── */
function formatUsdPrice(val: string | number | null | undefined): string {
  if (val == null) return '—';
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(n)) return '—';
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  if (n >= 0.0001) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(8)}`;
}

function formatCompact(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatPct(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '0.00%';
  const sign = n >= 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

const discoverTabs = ['TRENDING', 'NEW DROPS', 'RISING', 'SIMILAR VIBES', 'SAME ARTIST', 'LOW CAP GEMS'];

const DISCOVER_GRADIENTS = [
  'bg-gradient-to-br from-yellow-600 via-orange-800 to-red-950',
  'bg-gradient-to-br from-orange-500 via-red-700 to-red-950',
  'bg-gradient-to-br from-blue-800 via-slate-800 to-black',
  'bg-gradient-to-br from-green-600 via-green-900 to-black',
  'bg-gradient-to-br from-teal-600 via-cyan-900 to-black',
  'bg-gradient-to-br from-pink-600 via-rose-900 to-black',
  'bg-gradient-to-br from-emerald-600 via-green-900 to-black',
  'bg-gradient-to-br from-indigo-600 via-blue-900 to-black',
];

export default function SongTradePage() {
  const { songId } = useParams<{ songId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTimeFilter, setActiveTimeFilter] = useState('1D');
  const [activeDiscover, setActiveDiscover] = useState('TRENDING');

  /* ── Trade mode (null = closed, 'BUY'/'SELL' = sheet open) ── */
  const [tradeMode, setTradeMode] = useState<'BUY' | 'SELL' | null>(null);

  /* ── Swap bottom sheet ── */
  const [showSwapSheet, setShowSwapSheet] = useState(false);

  /* ── Pack checkout modal (Apple Pay / fiat) ── */
  const [showPackCheckout, setShowPackCheckout] = useState(false);

  /* ── Sheet trade controls ── */
  const [payAmount, setPayAmount] = useState(0.10);
  const [slippage, setSlippage] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* ── Trending navigation (swipe) ── */
  const { songIds: trendingIds } = useTrendingSongs();
  const currentIndex = trendingIds.indexOf(songId ?? '');
  const dragX = useMotionValue(0);
  const swipeOpacity = useTransform(dragX, [-120, 0, 120], [0.6, 1, 0.6]);
  const swipeScale = useTransform(dragX, [-120, 0, 120], [0.95, 1, 0.95]);
  // Show hint arrows when dragging
  const leftHintOpacity = useTransform(dragX, [-80, -20, 0], [1, 0.5, 0]);
  const rightHintOpacity = useTransform(dragX, [0, 20, 80], [0, 0.5, 1]);
  const isNavigating = useRef(false);

  const navigateToPrev = () => {
    if (isNavigating.current || trendingIds.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : 0;
    const prevIndex = (base - 1 + trendingIds.length) % trendingIds.length;
    const prevId = trendingIds[prevIndex];
    if (prevId && prevId !== songId) {
      isNavigating.current = true;
      navigate(`/song/${prevId}`);
      setTimeout(() => { isNavigating.current = false; }, 400);
    }
  };

  const navigateToNext = () => {
    if (isNavigating.current || trendingIds.length === 0) return;
    const base = currentIndex >= 0 ? currentIndex : -1;
    const nextIndex = (base + 1) % trendingIds.length;
    const nextId = trendingIds[nextIndex];
    if (nextId && nextId !== songId) {
      isNavigating.current = true;
      navigate(`/song/${nextId}`);
      setTimeout(() => { isNavigating.current = false; }, 400);
    }
  };

  /* ── Real-time data ── */
  const { data: song } = useRealtimeData<SongsResponse | null>(subscribeSongs, !!songId, songId!);
  const { data: songDetails } = useRealtimeData<SongDetailsResponse | null>(
    subscribeSongDetails,
    !!songId,
    songId!
  );

  /* ── Social stats ── */
  const { data: streamData } = useRealtimeData<SongStreamsResponse | null>(
    subscribeSongStreams,
    !!songId,
    songId!
  );
  const [likeCount, setLikeCount] = useState<number>(0);

  useEffect(() => {
    if (!songId) return;
    countSongsLikes(songId)
      .then((res) => setLikeCount(res?.value ?? 0))
      .catch(() => {});
  }, [songId]);

  const streamCount = streamData?.count ?? 0;

  /* ── Mint & price queries ── */
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [tokenPriceUsd, setTokenPriceUsd] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number>(0);

  const { solBalance: walletBalance } = useSolanaWallet();
  const pumpFunPrice = usePumpFunPrice(mintAddress);
  const tokenPriceSol = pumpFunPrice.priceSol;
  const solPriceUsd = pumpFunPrice.solPriceUsd;

  useEffect(() => {
    if (!songId) return;
    let cancelled = false;

    (async () => {
      try {
        const mint = await runGetTokenMintAddressQueryForSongs(songId);
        if (!cancelled) setMintAddress(mint);
      } catch (e) {
        console.warn('[SongTradePage] mint query failed', e);
      }
      try {
        const price = await runTokenPriceUsdQueryForSongDetails(songId);
        if (!cancelled) setTokenPriceUsd(price);
      } catch (e) {
        console.warn('[SongTradePage] price query failed', e);
      }
    })();

    return () => { cancelled = true; };
  }, [songId]);

  useEffect(() => {
    if (!songId || !user?.address) {
      setTokenBalance(0);
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const bal = await runGetTokenBalanceQueryForSongs(songId, { walletAddress: user.address });
        if (!cancelled) setTokenBalance(bal);
      } catch (e) {
        console.warn('[SongTradePage] balance query failed', e);
        if (!cancelled) setTokenBalance(0);
      }
    })();

    return () => { cancelled = true; };
  }, [songId, user?.address]);

  /* ── Discover songs (real data) ── */
  const [discoverSongs, setDiscoverSongs] = useState<SongsResponse[]>([]);
  const [discoverDetails, setDiscoverDetails] = useState<SongDetailsResponse[]>([]);
  const [discoverLoading, setDiscoverLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const initialSongs = await getManySongs('order by tarobase_created_at desc limit 50');
        if (mounted) setDiscoverSongs((initialSongs ?? []).filter((s) => !isSeedSong(s)).slice(0, 8));
      } catch (e) {
        console.warn('[SongTradePage] getManySongs failed:', e);
      }
      try {
        const initialDetails = await getManySongDetails('order by tarobase_created_at desc limit 50');
        if (mounted) setDiscoverDetails((initialDetails ?? []).filter((d) => !isSeedSong(d)).slice(0, 8));
      } catch (e) {
        console.warn('[SongTradePage] getManySongDetails failed:', e);
      }
      if (mounted) setDiscoverLoading(false);

      try {
        const unsubSongs = await subscribeManySongs((updated) => {
          if (mounted) setDiscoverSongs((updated ?? []).filter((s) => !isSeedSong(s)).slice(0, 8));
        }, 'order by tarobase_created_at desc limit 50');
        const unsubDetails = await subscribeManySongDetails((updated) => {
          if (mounted) setDiscoverDetails((updated ?? []).filter((d) => !isSeedSong(d)).slice(0, 8));
        }, 'order by tarobase_created_at desc limit 50');
        return () => {
          mounted = false;
          unsubSongs().catch(() => {});
          unsubDetails().catch(() => {});
        };
      } catch (e) {
        console.warn('[SongTradePage] subscribeManySongs/Details failed:', e);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  const discoverDetailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    discoverDetails.forEach((d) => { map[d.id] = d; });
    return map;
  }, [discoverDetails]);

  /* ── Candle chart ── */
  const activeTf = TF_MAP[activeTimeFilter] ?? '1d';
  const { candles } = useSongCandles(mintAddress, activeTf);
  const closePrices = useMemo(() => candles.map((c) => c.c), [candles]);

  /* ── Derived values ── */
  const sdAny = songDetails as any;
  const songAny = song as any;
  const displayPrice = pumpFunPrice.priceUsd ?? tokenPriceUsd ?? sdAny?.priceUsd ?? null;
  const priceNum = displayPrice != null ? parseFloat(displayPrice) : null;
  const priceChange = sdAny?.priceChange24h ?? null;

  /* ── Chart data ── */
  const chartData = useMemo(() => {
    if (closePrices.length >= 2) {
      return closePrices.map((v, i) => ({ idx: i, value: v }));
    }
    return [];
  }, [closePrices]);

  const coverImage = songDetails?.coverImage;
  const artistName = songDetails?.artist ?? 'Unknown Artist';
  const songName = song?.name ?? 'Loading…';
  const symbol = song?.symbol ?? '$TOKEN';

  const handleTradeConfirm = useCallback(async () => {
    if (!songId || !user?.address || isSubmitting) return;

    if (tradeMode === 'BUY') {
      setIsSubmitting(true);
      try {
        const lamports = Math.floor(payAmount * 1_000_000_000);
        const slipBps = slippage * 100;

        // Pre-flight simulation
        const token = await getIdToken();
        const authApi = createAuthenticatedApiClient(token ?? '', user.address);
        const simResult = await authApi.post(`/api/songs/${songId}/simulate-buy`, {
          solAmt: lamports,
          slipBps,
          walletAddress: user.address,
        });
        if (!simResult || !simResult.ok) {
          const errors = simResult?.errors?.length
            ? simResult.errors.join(' ')
            : 'Buy simulation failed. Please check your balance or try again.';
          toast.error(errors);
          setIsSubmitting(false);
          return;
        }
        if (simResult?.warnings?.length) {
          simResult.warnings.forEach((w: string) => toast.warning(w));
        }

        const buyId = `buy-${songId}-${user.address.slice(0, 8)}-${Date.now()}`.slice(0, 60);
        const ok = await setSongsBuys(songId, buyId, {
          solAmt: lamports,
          slip: slipBps,
        });
        if (ok) {
          toast.success(`Bought ${payAmount} SOL worth of ${symbol}`);
          setTradeMode(null);
        } else {
          toast.error('Buy failed — check your SOL balance or try again');
        }
      } catch (err: any) {
        toast.error(err?.message ?? 'Buy transaction failed');
      } finally {
        setIsSubmitting(false);
      }
    } else if (tradeMode === 'SELL') {
      if (!mintAddress) {
        toast.error('Token mint address not available — try again shortly');
        return;
      }
      setIsSubmitting(true);
      try {
        // 1. Get quote from backend
        const token = await getIdToken();
        const authApi = createAuthenticatedApiClient(token ?? '', user.address);
        const quoteRes = await authApi.post(`/api/songs/${songId}/sell`, {
          mintAddress,
          tokenAmount: payAmount,
          walletAddress: user.address,
          slippageBps: slippage * 100,
          execute: false,
        });

        const { tokenAmountBaseUnits, quoteOutLamports } = quoteRes as any;
        if (!tokenAmountBaseUnits || !quoteOutLamports) {
          toast.error('Sell quote unavailable — try again shortly');
          setIsSubmitting(false);
          return;
        }

        // 2. Execute sell via user-signed swap
        const swapId = `sell-${songId}-${user.address.slice(0, 8)}-${Date.now()}`.slice(0, 60);
        const ok = await setSongsSwaps(songId, swapId, {
          mint: Address.publicKey(mintAddress),
          amt: tokenAmountBaseUnits,
        });
        if (ok) {
          const solOut = (quoteOutLamports / 1_000_000_000).toFixed(4);
          toast.success(`Sold ${payAmount} ${symbol} for ~${solOut} SOL`);
          setTradeMode(null);
        } else {
          toast.error('Sell failed — check your token balance or try again');
        }
      } catch (err: any) {
        toast.error(err?.message ?? 'Sell transaction failed');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [tradeMode, songId, user, payAmount, slippage, mintAddress, symbol, isSubmitting]);

  return (
    <div className="bg-black min-h-screen w-full pb-24 overflow-x-hidden overflow-y-auto relative">
      <style dangerouslySetInnerHTML={{ __html: `@keyframes waveform { 0%,100%{height:4px} 50%{height:20px} }` }} />
      <main className="flex flex-col gap-2 pt-4 pb-6 max-w-[430px] mx-auto md:max-w-2xl">
        {/* ── UNIFIED SONG + CHART CARD (swipeable) ── */}
        <div className="mx-3 relative">
          {/* Left swipe hint */}
          <motion.div
            style={{ opacity: rightHintOpacity }}
            className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur rounded-full p-1 border border-white/10">
              <ChevronLeft size={14} className="text-[#00FF41]" />
            </div>
          </motion.div>
          {/* Right swipe hint */}
          <motion.div
            style={{ opacity: leftHintOpacity }}
            className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 pointer-events-none"
          >
            <div className="bg-black/60 backdrop-blur rounded-full p-1 border border-white/10">
              <ChevronRightIcon size={14} className="text-[#00FF41]" />
            </div>
          </motion.div>

          <motion.div
            drag="x"
            dragConstraints={{ left: -140, right: 140 }}
            dragElastic={0.18}
            dragMomentum={false}
            onDragEnd={(_e, info) => {
              const threshold = 60;
              const velocity = info.velocity.x;
              const offset = info.offset.x;
              // Snap back first
              animate(dragX, 0, { type: 'spring', stiffness: 400, damping: 30 });
              if (offset < -threshold || velocity < -300) {
                // Swiped left → next token
                navigateToNext();
              } else if (offset > threshold || velocity > 300) {
                // Swiped right → prev token
                navigateToPrev();
              }
            }}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{
              x: dragX, opacity: swipeOpacity, scale: swipeScale, touchAction: 'pan-y', cursor: 'grab',
              background: '#111111',
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 0 16px rgba(0,0,0,0.4)',
            }}
          >
            {/* ── TWO-COLUMN SPLIT ── */}
            <div className="flex gap-2.5 p-3 min-h-[260px]">
              {/* LEFT COLUMN ~45% */}
              <div className="w-[45%] flex flex-col gap-2">
                {/* LATEST DROP pill */}
                <span className="self-start bg-black/50 backdrop-blur rounded-full px-2 py-0.5 text-[9px] text-white font-bold tracking-wider border border-white/10">
                  LATEST DROP
                </span>

                {/* Album art */}
                <div className="aspect-square rounded-xl overflow-hidden border border-white/10 shadow-[0_0_12px_rgba(0,0,0,0.3)]">
                  {coverImage ? (
                    <img src={coverImage} alt={songName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-700/80 via-orange-600/60 to-red-700/80" />
                  )}
                </div>

                {/* Song title + artist */}
                <div>
                  <h2 className="text-white font-bold text-[13px] leading-tight tracking-wide truncate" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    {songName}
                  </h2>
                  <p className="text-white/70 text-[11px] font-medium truncate" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                    {artistName}
                  </p>
                </div>

                {/* Small play + waveform */}
                <div className="flex items-center gap-2">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 rounded-full bg-[#00FF41] opacity-20 blur-sm" />
                    <button className="relative w-8 h-8 rounded-full bg-[#00FF41] flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.3)] active:scale-95 transition">
                      <Play size={14} className="text-white fill-white ml-0.5" />
                    </button>
                  </div>
                  <div className="flex items-end gap-[2px] h-4 flex-1">
                    {Array.from({ length: 14 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-[2px] bg-white/20 rounded-full"
                        style={{
                          animation: 'waveform ' + (0.5 + Math.random() * 0.5) + 's ease-in-out infinite',
                          animationDelay: (i * 0.05) + 's',
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN ~55% */}
              <div className="w-[55%] flex flex-col gap-2">
                {/* Price row with LIVE indicator */}
                <div className="flex items-start justify-between">
                  <div className="flex flex-col gap-0.5">
                    <div className="text-white font-bold text-[22px] leading-none" style={{ fontFamily: orbitronFont, fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                      {formatUsdPrice(displayPrice)}
                    </div>
                    <div className="text-[#00FF41] text-[11px] font-medium" style={{ fontFamily: orbitronFont, fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.02em' }}>
                      {priceChange != null ? formatPct(priceChange) : '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
                    <span className="text-[#00FF41] text-[9px] font-bold tracking-wider" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                      LIVE
                    </span>
                  </div>
                </div>

                {/* Chart */}
                <div className="flex-1 min-h-[110px] relative">
                  {chartData.length >= 2 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <defs>
                          <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                              <feMergeNode in="coloredBlur" />
                              <feMergeNode in="SourceGraphic" />
                            </feMerge>
                          </filter>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00FF41" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#00FF41" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="none"
                          fill="url(#areaGradient)"
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#00FF41"
                          strokeWidth={2}
                          dot={false}
                          filter="url(#lineGlow)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : priceNum != null ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[{ idx: 0, value: priceNum }, { idx: 1, value: priceNum }]}>
                        <defs>
                          <linearGradient id="flatlineGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#00FF41" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#00FF41" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="none"
                          fill="url(#flatlineGradient)"
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#00FF41"
                          strokeWidth={2}
                          dot={false}
                          strokeDasharray="4 4"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-gray-600 text-[10px]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>Loading chart…</span>
                    </div>
                  )}
                  {/* Y-axis labels */}
                  {candles.length > 0 ? (
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-1 pointer-events-none">
                      <span className="text-gray-500 text-[9px]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                        {formatUsdPrice(Math.max(...candles.map((c: any) => c.h)))}
                      </span>
                      <span className="text-gray-500 text-[9px]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                        {formatUsdPrice(Math.min(...candles.map((c: any) => c.l)))}
                      </span>
                    </div>
                  ) : priceNum != null ? (
                    <div className="absolute right-0 top-0 bottom-0 flex flex-col justify-between py-1 pointer-events-none">
                      <span className="text-gray-500 text-[9px]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                        {formatUsdPrice(priceNum * 1.01)}
                      </span>
                      <span className="text-gray-500 text-[9px]" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                        {formatUsdPrice(priceNum * 0.99)}
                      </span>
                    </div>
                  ) : null}
                </div>

                {/* Timeframe pills */}
                <div className="flex gap-1">
                  {timeFilters.map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setActiveTimeFilter(tf)}
                      className={'rounded-full px-2 py-0.5 text-[9px] font-bold transition ' + (activeTimeFilter === tf ? 'bg-[#00FF41] text-black' : 'text-gray-400 bg-white/5 hover:bg-white/10')}
                      style={{ fontFamily: "'Archivo Black', sans-serif" }}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── SOCIAL ACTIONS (compact) ── */}
            <div className="flex items-center justify-between px-3 pb-2">
              <button className="flex flex-col items-center gap-0.5 group">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-[#00FF41]/20 transition">
                  <Heart size={14} className="text-white group-hover:text-[#00FF41] transition" />
                </div>
                <span className="text-[8px] text-white/60 group-hover:text-white transition" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                  {likeCount > 0 ? formatCompact(likeCount) : '—'}
                </span>
              </button>

              <div className="flex flex-col items-center gap-0.5">
                <RepostButton songId={songId!} size="md" showCount={true} />
              </div>

              <button className="flex flex-col items-center gap-0.5 group">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-[#00FF41]/20 transition">
                  <Plus size={14} className="text-white group-hover:text-[#00FF41] transition" />
                </div>
                <span className="text-[8px] text-white/60 group-hover:text-white transition" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                  ADD
                </span>
              </button>

              <button className="flex flex-col items-center gap-0.5 group">
                <div className="w-8 h-8 rounded-full bg-white/10 backdrop-blur flex items-center justify-center group-hover:bg-[#00FF41]/20 transition">
                  <Radio size={14} className="text-white group-hover:text-[#00FF41] transition" />
                </div>
                <span className="text-[8px] text-white/60 group-hover:text-white transition" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                  {streamCount > 0 ? formatCompact(streamCount) : '—'}
                </span>
              </button>
            </div>

            {/* ── STATS GRID ── */}
            <div className="grid grid-cols-2 gap-2 p-3 pt-0">
              <div className="bg-[#111111] rounded-xl p-2.5 border border-white/[0.06]">
                <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>24H VOL</div>
                <div className="text-white font-bold" style={{ fontFamily: orbitronFont, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                  {sdAny?.volume24h != null ? formatCompact(sdAny.volume24h) : '—'}
                </div>
              </div>
              <div className="bg-[#111111] rounded-xl p-2.5 border border-white/[0.06]">
                <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>LIQUIDITY</div>
                <div className="text-white font-bold" style={{ fontFamily: orbitronFont, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                  {sdAny?.liquidity != null ? formatCompact(sdAny.liquidity) : '—'}
                </div>
              </div>
              <div className="bg-[#111111] rounded-xl p-2.5 border border-white/[0.06]">
                <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>MARKET CAP</div>
                <div className="text-white font-bold" style={{ fontFamily: orbitronFont, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                  {sdAny?.marketCap != null ? formatCompact(sdAny.marketCap) : '—'}
                </div>
              </div>
              <div className="bg-[#111111] rounded-xl p-2.5 border border-white/[0.06]">
                <div className="text-white/40 text-[9px] uppercase tracking-wider mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>ATH</div>
                <div className="text-white font-bold" style={{ fontFamily: orbitronFont, fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.01em' }}>
                  {sdAny?.ath != null ? formatUsdPrice(sdAny.ath) : '—'}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Song navigation position indicator */}
          {trendingIds.length > 1 && currentIndex >= 0 && (
            <div className="flex justify-center gap-1 mt-2 pb-1">
              {trendingIds.slice(0, Math.min(trendingIds.length, 9)).map((id) => (
                <div
                  key={id}
                  className="rounded-full transition-all duration-200"
                  style={{
                    width: id === songId ? '16px' : '4px',
                    height: '4px',
                    background: id === songId ? '#00FF41' : 'rgba(255,255,255,0.2)',
                  }}
                />
              ))}
              {trendingIds.length > 9 && (
                <span className="text-gray-600 text-[8px] font-mono ml-1">
                  {currentIndex + 1}/{trendingIds.length}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── APPLE PAY BUTTON ── */}
        <div className="mx-3 mb-3">
          <button
            onClick={() => setShowPackCheckout(true)}
            className="w-full bg-white rounded-2xl py-3 flex flex-col items-center active:scale-95 transition"
          >
            <div className="flex items-center gap-1">
              <svg width="18" height="20" viewBox="0 0 24 24" fill="black">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="text-black text-[18px] font-semibold">Pay</span>
            </div>
            <span className="text-gray-500 text-[8px] tracking-[0.2em] mt-0.5">FAST, SECURE & PRIVACY FIRST</span>
          </button>
        </div>

        {/* ── BUY / SELL / SWAP BUTTONS (inline, scrolls with content) ── */}
        <div className="mx-3 mb-3">
          <div className="flex h-14 rounded-2xl overflow-hidden gap-px shadow-lg">
            <button
              onClick={() => { setTradeMode('BUY'); setPayAmount(0.1); }}
              className="flex-1 font-black text-[14px] tracking-[0.25em] bg-[#00FF41] text-black active:scale-95 transition"
            >
              BUY
            </button>
            <button
              onClick={() => { setTradeMode('SELL'); setPayAmount(0.1); }}
              className="flex-1 font-black text-[14px] tracking-[0.25em] bg-[#FF3333] text-white active:scale-95 transition"
            >
              SELL
            </button>
            {mintAddress && (
              <button
                onClick={() => setShowSwapSheet(true)}
                className="flex-1 font-black text-[14px] tracking-[0.25em] bg-[#111111] text-[#00FF41] active:scale-95 transition flex items-center justify-center gap-1.5"
                style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}
              >
                <ArrowUpDown size={14} />
                SWAP
              </button>
            )}
          </div>
        </div>

        {/* ── ORDER BOOK + RECENT TRADES ROW ── */}
        <div className="mx-3 flex gap-2">
          {/* Order Book */}
          <div className="flex-1 bg-[#111111] rounded-2xl border border-white/[0.06] p-3 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-[11px] uppercase tracking-wider">ORDER BOOK</span>
              <span className="text-white/30 text-[9px] font-mono">AMM ▾</span>
            </div>
            {(() => {
              const midPrice = priceNum ?? (tokenPriceSol && solPriceUsd ? tokenPriceSol * solPriceUsd : null);
              if (midPrice == null || midPrice <= 0) {
                return (
                  <div className="flex-1 flex items-center justify-center min-h-[80px]">
                    <span className="text-gray-600 text-[10px] font-mono tracking-wider">Loading depth…</span>
                  </div>
                );
              }
              const tiers = [
                { pct: 5, depth: '2.1M' },
                { pct: 2, depth: '1.5M' },
                { pct: 1, depth: '0.8M' },
              ];
              return (
                <div className="flex flex-col gap-1 min-h-[80px]">
                  {/* Ask side */}
                  {tiers.map((t) => (
                    <div key={`ask-${t.pct}`} className="flex justify-between items-center text-[10px]">
                      <span className="text-[#FF3333] font-mono font-bold">{t.pct}%</span>
                      <span className="text-white/70 font-mono">{formatUsdPrice(midPrice * (1 + t.pct / 100))}</span>
                      <span className="text-gray-500 font-mono">{t.depth}</span>
                    </div>
                  ))}
                  {/* Mid */}
                  <div className="flex justify-between items-center text-[10px] border-y border-white/5 py-0.5 my-0.5">
                    <span className="text-gray-500 font-mono">MID</span>
                    <span className="text-white font-mono font-bold">{formatUsdPrice(midPrice)}</span>
                    <span className="text-gray-500 font-mono">—</span>
                  </div>
                  {/* Bid side */}
                  {tiers.map((t) => (
                    <div key={`bid-${t.pct}`} className="flex justify-between items-center text-[10px]">
                      <span className="text-[#00FF41] font-mono font-bold">{t.pct}%</span>
                      <span className="text-white/70 font-mono">{formatUsdPrice(midPrice * (1 - t.pct / 100))}</span>
                      <span className="text-gray-500 font-mono">{t.depth}</span>
                    </div>
                  ))}
                  <p className="text-[8px] text-gray-600 mt-1 leading-tight">
                    Bonding curve AMM — no traditional order book. Depth is approximate.
                  </p>
                </div>
              );
            })()}
          </div>

          {/* Recent Trades */}
          <div className="flex-1 bg-[#111111] rounded-2xl border border-white/[0.06] p-3 flex flex-col gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00FF41] animate-pulse" />
              <span className="text-white font-bold text-[11px] uppercase tracking-wider">LIVE TRADES</span>
            </div>
            {songId ? (
              <TradingActivityFeed songId={songId} symbol={symbol} />
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-[80px]">
                <span className="text-gray-600 text-[10px] font-mono tracking-wider">Loading…</span>
              </div>
            )}
          </div>
        </div>

        {/* ── DISCOVER MORE ── */}
        <div className="mx-3 bg-[#111111] rounded-2xl border border-white/[0.06] flex flex-col gap-3 py-3">
          <h3 className="text-white font-bold text-[13px] tracking-wider px-3 uppercase" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            DISCOVER MORE
          </h3>

          {/* Tab bar */}
          <div className="flex gap-4 px-3 overflow-x-auto scrollbar-hide">
            {discoverTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveDiscover(tab)}
                className={`whitespace-nowrap text-[10px] font-bold tracking-wider pb-1 active:scale-95 transition ${
                  activeDiscover === tab
                    ? 'text-white border-b-2 border-[#00FF41]'
                    : 'text-gray-500'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Carousel */}
          <div className="flex gap-3 px-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
            {discoverLoading && (
              <div className="snap-start shrink-0 w-[140px] rounded-2xl overflow-hidden relative border border-gray-900">
                <div className="relative h-[100px] bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse" />
                <div className="bg-black p-2.5 flex flex-col gap-1">
                  <div className="h-3 w-16 bg-gray-800 rounded animate-pulse" />
                  <div className="h-2 w-12 bg-gray-800 rounded animate-pulse" />
                </div>
              </div>
            )}
            {!discoverLoading && discoverSongs.length === 0 && (
              <span className="text-gray-600 text-[10px] font-mono tracking-wider px-1">No songs found</span>
            )}
            {!discoverLoading && discoverSongs.map((song, idx) => {
              const details = discoverDetailsMap[song.id];
              const detailsAny = details as any;
              const price = detailsAny?.priceUsd ? formatUsdPrice(detailsAny.priceUsd) : '—';
              const change = detailsAny?.priceChange24h;
              const isPositive = change != null ? change >= 0 : false;
              const gradient = DISCOVER_GRADIENTS[idx % DISCOVER_GRADIENTS.length];
              return (
                <div
                  key={song.id}
                  onClick={() => navigate(`/song/${song.id}`)}
                  className={`snap-start shrink-0 w-[140px] rounded-2xl overflow-hidden relative border border-gray-900 cursor-pointer active:scale-95 transition ${
                    idx === 0 ? 'ring-1 ring-[#00FF41]/30' : ''
                  }`}
                >
                  <div className={`relative h-[100px] ${gradient}`}>
                    {details?.coverImage ? (
                      <img src={details.coverImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    ) : null}
                    <div className="absolute top-2 left-2 text-white font-bold text-[13px]">{idx + 1}</div>
                    <div className="absolute inset-0 bg-black/20" />
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <Play size={12} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="bg-black p-2.5 flex flex-col gap-1">
                    <span className="text-white text-[11px] font-bold truncate">{details?.title ?? song.name ?? '$TOKEN'}</span>
                    <span className="text-gray-500 text-[9px] truncate">{details?.artist ?? '—'}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-white text-[10px] font-mono font-bold">{price}</span>
                      <span
                        className={`text-[9px] font-mono font-bold ${
                          change != null ? (isPositive ? 'text-[#00FF41]' : 'text-[#FF3333]') : 'text-gray-500'
                        }`}
                      >
                        {change != null ? formatPct(change) : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── SLIDE-UP TRADE SHEET ── */}
      <AnimatePresence>
        {tradeMode && (
          <>
            {/* Backdrop */}
            <motion.div
              key="trade-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setTradeMode(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            />

            {/* Sheet */}
            <motion.div
              key="trade-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 340 }}
              className="fixed bottom-0 inset-x-0 bg-[#0a0a0a] z-50 rounded-t-3xl border-t-2 flex flex-col"
              style={{
                borderColor: tradeMode === 'SELL' ? '#FF3333' : '#00FF41',
                maxHeight: '92dvh',
              }}
            >
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-gray-700 rounded-full" />
        </div>

        <div className="px-4 pb-28 overflow-y-auto overscroll-contain" style={{ paddingBottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-[18px] font-black tracking-wider" style={{
              color: tradeMode === 'SELL' ? '#FF3333' : '#00FF41'
            }}>
              {tradeMode === 'BUY' && `BUY ${symbol}`}
              {tradeMode === 'SELL' && `SELL ${symbol}`}
            </span>
            <button onClick={() => setTradeMode(null)} className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center text-white">✕</button>
          </div>

          {/* Amount input */}
          <div className="bg-black rounded-2xl border border-gray-900 p-4 mb-3">
            <p className="text-gray-500 text-[9px] uppercase tracking-wider">
              {tradeMode === 'SELL' ? 'You Sell' : 'You Pay'}
            </p>
            <div className="flex items-center justify-between mt-1">
              <input
                type="text"
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9.]/g, '');
                  setPayAmount(parseFloat(raw) || 0);
                }}
                className="bg-transparent text-white text-[36px] font-mono leading-none w-full outline-none"
              />
              <span className="text-gray-500 text-[14px] font-mono ml-2">
                {tradeMode === 'SELL' ? symbol : 'SOL'}
              </span>
            </div>
          </div>

          {/* Preset chips */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[0.1, 0.5, 1, 'MAX'].map((amt) => (
              <button
                key={amt}
                onClick={() => setPayAmount(amt === 'MAX' ? walletBalance : amt as number)}
                className={`py-3 rounded-xl text-[12px] font-bold transition ${
                  payAmount === amt || (amt === 'MAX' && payAmount === walletBalance)
                    ? 'bg-[#00FF41] text-black'
                    : 'bg-gray-900 border border-gray-800 text-white'
                }`}
              >
                {amt === 'MAX' ? 'MAX' : `${amt} SOL`}
              </button>
            ))}
          </div>

          {/* You receive */}
          <div className="bg-black rounded-2xl border border-gray-900 p-3 mb-3 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-[9px] uppercase tracking-wider">You Receive</p>
              <p className="text-white text-[22px] font-mono font-bold mt-0.5">
                {(() => {
                  if (tradeMode === 'SELL') {
                    return tokenPriceSol != null
                      ? (payAmount * tokenPriceSol).toFixed(4) + ' SOL'
                      : '—';
                  }
                  // BUY
                  return tokenPriceSol != null && tokenPriceSol > 0
                    ? (payAmount / tokenPriceSol).toFixed(2) + ` ${symbol}`
                    : '—';
                })()}
              </p>
            </div>
          </div>

          {/* Slippage */}
          <div className="mb-4">
            <p className="text-gray-500 text-[9px] uppercase tracking-wider mb-1.5">Max Slippage</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 5].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`py-2 rounded-xl text-[11px] font-bold ${
                    slippage === s ? 'bg-[#00FF41] text-black' : 'bg-gray-900 border border-gray-800 text-white'
                  }`}
                >
                  {s}%
                </button>
              ))}
              <button className="py-2 rounded-xl text-[11px] font-bold bg-gray-900 border border-gray-800 text-white">Custom</button>
            </div>
          </div>

          {/* CONFIRM */}
          <button
            onClick={handleTradeConfirm}
            disabled={isSubmitting}
            className="w-full font-black text-[15px] tracking-widest rounded-2xl py-5 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: tradeMode === 'SELL' ? '#FF3333' : '#00FF41',
              color: tradeMode === 'SELL' ? 'white' : 'black',
              boxShadow: `0 0 24px ${tradeMode === 'SELL' ? '#FF3333' : '#00FF41'}60`
            }}
          >
            {isSubmitting ? 'Processing…' : (
              <>
                {tradeMode === 'BUY' && `BUY ${payAmount} SOL`}
                {tradeMode === 'SELL' && `SELL ${payAmount} ${symbol}`}
              </>
            )}
          </button>
        </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── SWAP BOTTOM SHEET ── */}
      {mintAddress && (
        <SwapBottomSheet
          open={showSwapSheet}
          onClose={() => setShowSwapSheet(false)}
          defaultOutputMint={mintAddress}
        />
      )}

      {/* ── PACK CHECKOUT MODAL (Apple Pay / fiat) ── */}
      {showPackCheckout && songId && (
        <PackCheckoutModal
          songId={songId}
          pack={{
            id: 'studio',
            name: 'Studio Pack',
            price: '$10.99',
            nftCount: 0,
            tokenAmount: 0,
            artistPayout: 0,
          }}
          onClose={() => setShowPackCheckout(false)}
        />
      )}
    </div>
  );
}
