/**
 * SongDetailPage — hero theme redesign
 * All logic/modals/hooks preserved. Visual layer replaced with hero 3-column layout.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import {
  subscribeSongs, getSongs,
  runGetTokenMintAddressQueryForSongs,
  runGetTokenBalanceQueryForSongs,
  runGetBondingCurveProgressQueryForSongs,
} from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import {
  subscribeSongDetails, getSongDetails,
  runTokenPriceUsdQueryForSongDetails,
  subscribeManySongDetails,
} from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { getArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';
import PayWhatYouWantModal from '@/components/PayWhatYouWantModal';
import LikeButton from '@/components/LikeButton';
import ShareMenu from '@/components/ShareMenu';
import { CommentWall } from '@/components/CommentWall';
import { usePlayer } from '@/contexts/PlayerContext';
import type { PlayerSong } from '@/contexts/PlayerContext';
import { triggerHapticFeedback, hapticSuccess, hapticError } from '@/utils/haptic';
import {
  ArrowLeft, Music, Play, Pause,
  Copy, ExternalLink, Wallet,
  Zap, CreditCard, ListMusic,
  ChevronDown, Heart, X, User,
  Shuffle, SkipBack, SkipForward, Repeat,
  Percent, ChevronRight, Pencil,
  Coins, ArrowUpDown, LineChart,
} from 'lucide-react';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useArtistVerified } from '@/hooks/use-artist-verified';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import SellModal from '@/components/SellModal';
import TradingActivityFeed from '@/components/TradingActivityFeed';
import TokenHolders from '@/components/TokenHolders';
import TradeQuote from '@/components/TradeQuote';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { isSeedSong } from '@/utils/songFilters';
import RiskDisclaimerBanner from '@/components/RiskDisclaimerBanner';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import { useSolPrice } from '@/hooks/useJupiterPrice';
import { useSongCandles } from '@/hooks/useSongCandles';
import type { Timeframe } from '@/hooks/useSongCandles';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, AccountLayout } from '@solana/spl-token';
import { TAROBASE_CONFIG } from '@/lib/config';

// ── EXACT TOKENS FROM LitHero.tsx ──────────────────────────
const BG    = '#000000';
const CARD  = '#111111';
const DEEP  = '#111111';
const ACTV  = '#1a1a1a';
const G     = '#00FF41';
const G2    = 'rgba(255,255,255,0.03)';
const GB    = 'rgba(255,255,255,0.08)';
const GB2   = 'rgba(255,255,255,0.06)';
const NEON  = '#00FF41';
const TEAL  = '#00FF41';
const TACCT = '#00FF41';
const CTA   = '#00FF41';
const T1    = '#ffffff';
const T2    = '#888888';
const T3    = '#555555';
const RED   = '#ef4444';
const R     = 6;

const FONT_DISPLAY = "'Archivo Black',sans-serif";
const FONT_BODY = "'Inter',monospace";
const DETAIL_TABS = ['Activity', 'Holders', 'About'] as const;


// ─── SVG CANDLE CHART ────────────────────────────────────────────────────────
const SvgCandleChart: React.FC<{ candles: ReturnType<typeof useSongCandles>['candles']; width: number; height: number }> = ({ candles, width, height }) => {
  if (candles.length === 0) return null;
  const n = Math.min(candles.length, 120);
  const visible = candles.slice(-n);
  const allPrices = visible.flatMap(c => [c.l, c.h]);
  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = Math.max(maxP - minP, maxP * 0.001);
  const pad = 4;
  const plotH = height - pad * 2;
  const totalW = width;
  const candleW = Math.max(2, Math.floor(totalW / n) - 1);
  const toY = (p: number) => pad + plotH - ((p - minP) / range) * plotH;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {visible.map((c, i) => {
        const cx = (i / n) * totalW + candleW / 2;
        const isBull = c.c >= c.o;
        const col = isBull ? G : RED;
        const bodyTop = toY(Math.max(c.o, c.c));
        const bodyBot = toY(Math.min(c.o, c.c));
        const bodyH = Math.max(bodyBot - bodyTop, 1);
        return (
          <g key={i}>
            <line x1={cx} y1={toY(c.h)} x2={cx} y2={toY(c.l)} stroke={col} strokeWidth={1} opacity={0.7} />
            <rect x={cx - candleW / 2} y={bodyTop} width={candleW} height={bodyH} fill={col} opacity={isBull ? 0.9 : 0.75} rx={0.5} />
          </g>
        );
      })}
    </svg>
  );
};

// ─── SVG LINE CHART ──────────────────────────────────────────────────────────
const SvgLineChart: React.FC<{ data: number[]; width: number; height: number; color: string }> = ({ data, width, height, color }) => {
  if (data.length < 2) return null;
  const W = width, H = height;
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pad = 7;
  const plotH = H - pad * 2;
  const coords = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = pad + plotH - ((v - mn) / rng) * plotH;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`hc-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${H - pad} ${coords} ${W},${H - pad}`} fill={`url(#hc-${color.replace('#', '')})`} />
      <polyline fill="none" stroke={color} strokeWidth="2" points={coords} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={W} cy={pad + plotH - ((data[data.length - 1] - mn) / rng) * plotH} r="4" fill={color} style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
    </svg>
  );
};

// ─── WAVEFORM ────────────────────────────────────────────────────────────────
function Waveform({ progress = 0 }: { progress: number }) {
  const bars = Array.from({ length: 52 }, (_, i) => ({
    h: Math.max(3, 7 + Math.sin(i * 0.4) * 10 + Math.sin(i * 1.1) * 5),
    active: i / 52 < progress,
  }));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 1.5, height: 36, width: '100%' }}>
      {bars.map((b, i) => (
        <div key={i} style={{
          width: 4, height: b.h, borderRadius: 1, flexShrink: 0,
          background: b.active ? G : 'rgba(255,255,255,0.06)',
        }} />
      ))}
    </div>
  );
}

// ─── PRICE CHART ─────────────────────────────────────────────────────────────
const PriceChart: React.FC<{
  candles: ReturnType<typeof useSongCandles>['candles'];
  liveHistory: number[];
  tf: Timeframe;
  positive: boolean;
  mint: string | null;
  chartType: 'line' | 'candles';
  loading: boolean;
}> = ({ candles, liveHistory, positive, mint, chartType, loading }) => {
  const [W, setW] = useState(300);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) setW(Math.floor(e.contentRect.width));
    });
    ro.observe(el);
    setW(el.clientWidth || 300);
    return () => ro.disconnect();
  }, []);

  const H = 130;
  const color = positive ? G : RED;

  if (loading && candles.length === 0 && liveHistory.length === 0) {
    return (
      <div ref={containerRef} style={{ width: '100%', height: H + 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: 6,
        }} />
      </div>
    );
  }

  let pts: number[];
  if (candles.length >= 2) {
    pts = candles.map(c => c.c);
  } else if (liveHistory.length >= 2) {
    pts = liveHistory;
  } else {
    // No data yet — render empty state below
    pts = [];
  }

  if (pts.length < 2) {
    return (
      <div ref={containerRef} style={{ width: '100%', height: H + 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: '100%', height: '100%',
          background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          borderRadius: 6,
        }} />
      </div>
    );
  }

  if (chartType === 'candles' && candles.length >= 2) {
    return <div ref={containerRef}><SvgCandleChart candles={candles} width={W + 36} height={H} /></div>;
  }

  // Line chart with Y-axis labels
  const mn = Math.min(...pts), mx = Math.max(...pts), rng = mx - mn || 1;
  const pad = 7, plotH = H - pad * 2;
  const coords = pts.map((v, i) => {
    const x = (i / (pts.length - 1)) * W;
    const y = pad + plotH - ((v - mn) / rng) * plotH;
    return `${x},${y}`;
  }).join(' ');
  const ly = pad + plotH - ((pts[pts.length - 1] - mn) / rng) * plotH;
  const yL = 4;

  return (
    <div ref={containerRef}>
      <svg width={W + 36} height={H + 22} viewBox={`-36 0 ${W + 36} ${H + 22}`} style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="ccgrd" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: yL + 1 }, (_, i) => {
          const y = H - pad - (i / yL) * plotH;
          const v = ((mn + rng * (i / yL)) * 0.000027).toFixed(6);
          return (
            <g key={i}>
              <line x1={0} y1={y} x2={W} y2={y} stroke={GB2} strokeWidth="0.5" />
              <text x={-4} y={y + 3} fill={T3} fontSize="7" textAnchor="end" fontFamily={FONT_BODY}>${v}</text>
            </g>
          );
        })}
        <polygon points={`0,${H - pad} ${coords} ${W},${H - pad}`} fill="url(#ccgrd)" />
        <polyline fill="none" stroke={color} strokeWidth="2" points={coords} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={W} cy={ly} r="5" fill={color} style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
      </svg>
    </div>
  );
};

// ─── Scan-line overlay ───────────────────────────────────────────────────────
const ScanLines: React.FC = () => (
  <div style={{
    position: 'absolute', inset: 0, borderRadius: 'inherit', pointerEvents: 'none',
    background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)',
  }} />
);

// ─── Buy/Sell bottom sheet (preserved logic, hero-styled) ─────────────────────
interface BuySellSheetProps {
  open: boolean;
  onClose: () => void;
  mode: 'buy' | 'sell';
  song: SongsResponse | null;
  details: SongDetailsResponse | null;
  hasWallet: boolean;
  onBuy: () => void;
  tokenBalance: number | null;
  onSell: () => void;
  songId: string;
  onPurchaseSuccess?: () => void;
}
const BuySellSheet: React.FC<BuySellSheetProps> = ({ open, onClose, mode: initialMode, song, details, hasWallet, onBuy, tokenBalance, onSell, songId, onPurchaseSuccess }) => {
  const [mode, setMode] = useState<'buy' | 'sell'>(initialMode);
  const [amount, setAmount] = useState('');
  const [preset, setPreset] = useState<number | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'SOL'>('USD');
  const [buying, setBuying] = useState(false);
  const localAuth = useAuth();

  useEffect(() => { setMode(initialMode); }, [initialMode]);

  const symbol = song?.symbol ?? 'TOKEN';
  const coverImage = details?.coverImage;
  const solPrice = useSolPrice();

  const solAmount = currency === 'SOL' ? Number(amount) : (Number(amount) / (solPrice.price ?? 200));

  const handlePreset = (v: number) => { setPreset(v); setAmount(String(v)); };
  const clearPreset = () => setPreset(null);
  const presets = currency === 'SOL' ? [0.01, 0.05, 0.1, 0.5] : [1, 5, 25, 100];

  const handleDirectSolBuy = async () => {
    if (!songId || !localAuth.user?.address || !amount) return;
    try {
      setBuying(true);
      const authToken = await getIdToken();
      if (!authToken) { toast.error('Not authenticated'); return; }
      const api = createAuthenticatedApiClient(authToken, localAuth.user.address);
      const result = await api.post('/api/direct-sol-purchase', { songId, amountSol: solAmount, walletAddress: localAuth.user.address, walletSource: 'direct_sol' });
      if (result) { hapticSuccess(); toast.success('Purchase successful!'); onPurchaseSuccess?.(); onClose(); }
    } catch (e: any) {
      hapticError();
      toast.error(e.message || 'Purchase failed');
    } finally { setBuying(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100 }} />
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101, background: CARD, borderRadius: `${R}px ${R}px 0 0`, borderTop: `1px solid ${GB}`, paddingBottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 4, background: '#222', borderRadius: 2 }} />
            </div>
            <div style={{ display: 'flex', gap: 6, margin: '0 16px 16px' }}>
              <button onClick={() => setMode('buy')} style={{
                flex: '3', height: 44, borderRadius: R, border: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                background: mode === 'buy' ? CTA : '#111', color: mode === 'buy' ? '#000' : '#555',
                fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, letterSpacing: '2px',
                boxShadow: mode === 'buy' ? `0 0 20px ${GB}` : 'none',
              }}><ScanLines />BUY</button>
              <button onClick={() => setMode('sell')} style={{
                flex: '2', height: 44, borderRadius: R, border: 'none', cursor: 'pointer', position: 'relative', overflow: 'hidden',
                background: mode === 'sell' ? `linear-gradient(135deg, ${RED}, #cc0000)` : '#111', color: mode === 'sell' ? '#fff' : '#555',
                fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, letterSpacing: '2px',
                boxShadow: mode === 'sell' ? `0 0 20px rgba(239,68,68,0.4)` : 'none',
              }}><ScanLines />SELL</button>
            </div>
            <div style={{ padding: '0 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: DEEP, borderRadius: R, padding: '10px 14px', marginBottom: 12 }}>
                {coverImage
                  ? <img src={coverImage} alt={symbol} style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover' }} />
                  : <div style={{ width: 28, height: 28, borderRadius: 6, background: ACTV, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={14} style={{ color: G }} /></div>
                }
                <span style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, color: T1, flex: 1 }}>${symbol}</span>
                <ChevronDown size={16} style={{ color: T3 }} />
              </div>
              <p style={{ fontFamily: FONT_BODY, fontSize: 12, color: T3, textAlign: 'center', marginBottom: 8 }}>{mode === 'buy' ? 'YOU WILL PAY' : 'YOU WILL RECEIVE'}</p>
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <input type="number" value={amount} onChange={e => { setAmount(e.target.value); clearPreset(); }} placeholder="0" style={{
                  width: '100%', background: 'transparent', border: 'none', outline: 'none', fontFamily: FONT_DISPLAY, fontSize: 44, fontWeight: 900, color: T1, textAlign: 'center', padding: '0', boxSizing: 'border-box',
                }} />
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 900, color: T3 }}>
                  {mode === 'buy' ? (currency === 'SOL' ? '\u25CE' : '$') : '\u25CE'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: DEEP, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUpDown size={16} style={{ color: T3 }} /></div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                {presets.map(v => (
                  <button key={v} onClick={() => handlePreset(v)} style={{
                    flex: 1, height: 36, borderRadius: R, border: `1px solid ${preset === v ? GB : GB2}`,
                    background: preset === v ? ACTV : DEEP, cursor: 'pointer',
                    fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700,
                    color: preset === v ? T1 : T3, transition: 'all 0.15s',
                  }}>{currency === 'SOL' ? `\u25CE${v}` : `$${v}`}</button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                <div onClick={() => { setCurrency(prev => prev === 'USD' ? 'SOL' : 'USD'); setAmount(''); setPreset(null); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: DEEP, borderRadius: R, padding: '6px 14px', cursor: 'pointer', border: `1px solid ${GB2}` }}>
                  <span style={{ fontSize: 14 }}>{currency === 'USD' ? '\uD83C\uDDFA\uD83C\uDDF8' : '\u25CE'}</span>
                  <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T2 }}>{currency}</span>
                  <ChevronDown size={12} style={{ color: T3 }} />
                </div>
              </div>
              {amount && Number(amount) > 0 && songId && (
                <div style={{ marginBottom: 14 }}><TradeQuote songId={songId} symbol={symbol} mode={mode} amount={mode === 'buy' ? solAmount : Number(amount)} slipBps={500} /></div>
              )}
              {mode === 'buy' ? (
                <button onClick={() => { triggerHapticFeedback(); if (hasWallet && amount && Number(amount) > 0) handleDirectSolBuy(); else { onClose(); onBuy(); } }} disabled={buying} style={{
                  width: '100%', height: 52, borderRadius: R, border: 'none', cursor: buying ? 'not-allowed' : 'pointer',
                  background: hasWallet && amount && Number(amount) > 0 ? 'linear-gradient(135deg, #9945FF, #7b2ff7)' : CTA,
                  color: '#000', fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: hasWallet ? '0 0 24px rgba(153,69,255,0.4)' : `0 0 18px ${GB}`,
                }}>
                  {buying ? <div style={{ width: 16, height: 16, border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : hasWallet ? <Wallet size={16} /> : null}
                  {buying ? 'PROCESSING...' : hasWallet ? 'PAY WITH PHANTOM' : 'PAY WITH APPLE PAY'}
                </button>
              ) : (
                <button onClick={() => { triggerHapticFeedback(); onClose(); onSell(); }} style={{
                  width: '100%', height: 52, borderRadius: R, border: 'none', cursor: 'pointer',
                  background: `linear-gradient(135deg, ${RED}, #cc0000)`, color: '#fff', fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
                  boxShadow: `0 0 24px rgba(239,68,68,0.35)`,
                }}>CONFIRM SELL</button>
              )}
              {mode === 'buy' && (
                <p style={{ fontFamily: FONT_BODY, fontSize: 11, color: T3, textAlign: 'center', marginTop: 10 }}>
                  {hasWallet ? (
                    <span onClick={() => { onClose(); onBuy(); }} style={{ cursor: 'pointer', color: T2, textDecoration: 'underline' }}>Use Apple Pay instead</span>
                  ) : <span style={{ color: T3 }}>Connect wallet to buy with SOL</span>}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── Artist songs carousel ───────────────────────────────────────────────────
interface ArtistSongsCarouselProps { currentSongId: string; artistAddress: string; artistName: string; }
function ArtistSongsCarousel({ currentSongId, artistAddress, artistName }: ArtistSongsCarouselProps) {
  const { playSong, setQueue, currentSong, isPlaying } = usePlayer();
  const { data: artistDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails, !!artistAddress, `where artistAddress = '${artistAddress}' and approved = true`
  );
  const otherSongs = (artistDetails ?? []).filter((d) => d.id !== currentSongId && !isSeedSong(d as any));
  if (otherSongs.length === 0) return null;
  const toPlayerSong = (d: SongDetailsResponse): PlayerSong => ({
    songId: d.id, title: d.title, artist: d.artist, coverImage: d.coverImage,
    audioUrl: d.audioUrl, audiusStreamUrl: d.audiusStreamUrl, duration: d.duration, genre: d.genre,
  });
  return (
    <div style={{ background: CARD, border: `1px solid ${GB2}`, borderRadius: R, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${GB2}` }}>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 11, color: T1, fontWeight: 900, letterSpacing: '0.08em' }}>More by {artistName}</span>
        <button onClick={() => { triggerHapticFeedback(); const songs = otherSongs.map(toPlayerSong); setQueue(songs, 0); }} style={{ background: CTA, color: '#000', fontFamily: FONT_DISPLAY, fontSize: 10, fontWeight: 900, padding: '6px 12px', borderRadius: R, border: 'none', cursor: 'pointer' }}>
          Play All
        </button>
      </div>
      <div style={{ display: 'flex', gap: 14, overflowX: 'auto', padding: '14px 16px', scrollbarWidth: 'none' } as React.CSSProperties}>
        {otherSongs.slice(0, 5).map((d) => {
          const isThisPlaying = currentSong?.songId === d.id && isPlaying;
          return (
            <div key={d.id} style={{ flexShrink: 0, width: 120 }}>
              <div style={{ position: 'relative', width: 120, height: 120, borderRadius: 10, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
                {d.coverImage ? <img src={d.coverImage} alt={d.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: DEEP, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={24} style={{ color: `${G}44` }} /></div>}
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
                <button style={{ position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: '50%', background: isThisPlaying ? `${G}CC` : 'rgba(0,0,0,0.75)', border: `1px solid ${isThisPlaying ? GB : 'rgba(255,255,255,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => { triggerHapticFeedback(); playSong(toPlayerSong(d)); }}>
                  {isThisPlaying ? <Pause size={10} style={{ color: '#000' }} /> : <Play size={10} style={{ color: '#fff' }} />}
                </button>
              </div>
              <p style={{ fontFamily: FONT_DISPLAY, fontSize: 10, color: T1, fontWeight: 700, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
              {d.duration && <p style={{ fontFamily: FONT_BODY, fontSize: 9, color: `${G}88`, marginTop: 2 }}>{Math.floor(d.duration / 60)}:{String(d.duration % 60).padStart(2, '0')}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
const SongDetailPage: React.FC = () => {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentSong, isPlaying, currentTime, duration, playSong, togglePlay, seek } = usePlayer();

  const isThisSong = currentSong?.songId === songId;

  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showBuySellSheet, setShowBuySellSheet] = useState(false);
  const [sheetMode, setSheetMode] = useState<'buy' | 'sell'>('buy');
  const [lyricsExpanded, setLyricsExpanded] = useState(false);
  const [song, setSong] = useState<SongsResponse | null>(null);
  const [details, setDetails] = useState<SongDetailsResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [tokenPriceUsd, setTokenPriceUsd] = useState<string | null>(null);
  const [artistProfile, setArtistProfile] = useState<ArtistsResponse | null>(null);
  const [tipExpanded, setTipExpanded] = useState(false);
  const [tipOption, setTipOption] = useState<'10' | '20' | 'custom' | null>(null);
  const [customTip, setCustomTip] = useState<number>(5);
  const [descExpanded, setDescExpanded] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<typeof DETAIL_TABS[number]>('Activity');
  const [candleTab, setCandleTab] = useState<Timeframe>('15m');
  const [chartType, setChartType] = useState<'line' | 'candles'>('line');

  const pumpFunPrice = usePumpFunPrice(mintAddress);
  const { candles: songCandles, loading: candlesLoading } = useSongCandles(mintAddress, candleTab);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Accumulate price history for chart sparkline
  useEffect(() => {
    if (pumpFunPrice.priceUsd != null) {
      setPriceHistory(prev => {
        const next = [...prev, pumpFunPrice.priceUsd!];
        return next.length > 60 ? next.slice(next.length - 60) : next;
      });
    }
  }, [pumpFunPrice.priceUsd]);

  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [holderLoading, setHolderLoading] = useState(true);
  const [totalSupply, setTotalSupply] = useState<number | null>(null);
  const [bondingProgress, setBondingProgress] = useState<number | null>(null);

  // Bonding curve
  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    runGetBondingCurveProgressQueryForSongs(songId)
      .then(p => { if (!cancelled) setBondingProgress(Math.min(100, p)); })
      .catch(() => { if (!cancelled) setBondingProgress(null); });
    return () => { cancelled = true; };
  }, [songId]);

  // Total supply
  useEffect(() => {
    if (!mintAddress) return;
    let cancelled = false;
    const rpcUrl = TAROBASE_CONFIG.rpcUrl || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    connection.getTokenSupply(new PublicKey(mintAddress))
      .then(result => { if (!cancelled && result.value.uiAmount != null) setTotalSupply(result.value.uiAmount); })
      .catch(() => { if (!cancelled) setTotalSupply(null); });
    return () => { cancelled = true; };
  }, [mintAddress]);

  // Holder count polling
  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    const fetchHolders = async () => {
      try {
        const res = await fetch(`/api/songs/${songId}/holders`);
        if (res.ok) { const json = await res.json(); if (!cancelled && json.success) { setHolderCount(json.data.holderCount); setHolderLoading(false); } }
        else { if (!cancelled) setHolderLoading(false); }
      } catch { if (!cancelled) setHolderLoading(false); }
    };
    fetchHolders();
    const timer = setInterval(fetchHolders, 30_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [songId]);

  // Price flash
  const [priceFlash, setPriceFlash] = useState(false);
  const prevPriceRef = useRef<number | null>(null);
  useEffect(() => {
    if (pumpFunPrice.priceUsd !== null && prevPriceRef.current !== null && pumpFunPrice.priceUsd !== prevPriceRef.current) {
      setPriceFlash(true);
      const t = setTimeout(() => setPriceFlash(false), 350);
      return () => clearTimeout(t);
    }
    prevPriceRef.current = pumpFunPrice.priceUsd;
  }, [pumpFunPrice.priceUsd]);

  // Balance flash
  const [balanceFlash, setBalanceFlash] = useState<'up' | 'down' | null>(null);
  const prevBalanceRef = useRef<number | null>(null);
  useEffect(() => {
    if (tokenBalance !== null && prevBalanceRef.current !== null && tokenBalance !== prevBalanceRef.current) {
      const diff = tokenBalance - prevBalanceRef.current;
      setBalanceFlash(diff > 0 ? 'up' : 'down');
      setTimeout(() => setBalanceFlash(null), diff > 0 ? 1000 : 500);
    }
    if (tokenBalance !== null) prevBalanceRef.current = tokenBalance;
  }, [tokenBalance]);

  // Updated timer
  const [secondsAgo, setSecondsAgo] = useState(0);
  useEffect(() => {
    if (pumpFunPrice.lastFetchedAt === null) return;
    setSecondsAgo(0);
    const interval = setInterval(() => setSecondsAgo(Math.floor((Date.now() - (pumpFunPrice.lastFetchedAt ?? Date.now())) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [pumpFunPrice.lastFetchedAt]);

  // WebSocket for bonding curve
  useEffect(() => {
    if (!mintAddress) return;
    let subId: number | undefined;
    let cancelled = false;
    let lastRefreshTime = 0;
    const debouncedRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshTime >= 2000) { lastRefreshTime = now; pumpFunPrice.triggerRefresh(); }
    };
    const rpcUrl = TAROBASE_CONFIG.rpcUrl || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    (async () => {
      try {
        const mintPubkey = new PublicKey(mintAddress);
        const PUMP_FUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
        const [bondingCurvePda] = await PublicKey.findProgramAddress([new TextEncoder().encode('bonding-curve'), mintPubkey.toBytes()], PUMP_FUN_PROGRAM_ID);
        if (cancelled) return;
        subId = connection.onAccountChange(bondingCurvePda, () => { if (!cancelled) debouncedRefresh(); }, 'confirmed');
      } catch (e) { console.debug('Bonding curve subscription skipped:', e); }
    })();
    return () => { cancelled = true; if (subId !== undefined) connection.removeAccountChangeListener(subId); };
  }, [mintAddress, pumpFunPrice]);

  // Data loading
  useEffect(() => {
    if (!songId) return;
    if (isSeedSong({ id: songId })) { setPageLoading(false); setLoadError(true); return; }
    let mounted = true;
    async function init() {
      setPageLoading(true);
      setLoadError(false);
      try {
        const [songData, detailsData] = await Promise.all([getSongs(songId!), getSongDetails(songId!)]);
        if (mounted) {
          if (!songData || isSeedSong(songData as any) || isSeedSong(detailsData as any)) {
            setPageLoading(false);
            setLoadError(true);
            return;
          }
          setSong(songData);
          setDetails(detailsData);
          setPageLoading(false);
        }
      } catch {
        if (mounted) { setPageLoading(false); setLoadError(true); }
        return;
      }
      try {
        const unsubSong = await subscribeSongs((u) => { if (mounted && u && !isSeedSong(u as any)) setSong(u); }, songId!);
        const unsubDetails = await subscribeSongDetails((u) => { if (mounted && u && !isSeedSong(u as any)) setDetails(u); }, songId!);
        return () => { mounted = false; Promise.all([unsubSong(), unsubDetails()]).catch(() => {}); };
      } catch {}
    }
    init();
    return () => { mounted = false; };
  }, [songId]);

  useEffect(() => {
    if (!songId) return;
    runGetTokenMintAddressQueryForSongs(songId).then(m => setMintAddress(m)).catch(() => {});
  }, [songId]);

  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    runTokenPriceUsdQueryForSongDetails(songId).then(raw => {
      if (cancelled) return;
      const num = Number(raw);
      if (!isNaN(num) && num > 0) setTokenPriceUsd((num / 1_000_000).toFixed(6));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [songId]);

  useEffect(() => {
    const artistAddr = details?.artistAddress ?? song?.creator;
    if (!artistAddr) return;
    getArtists(artistAddr).then(p => { if (p) setArtistProfile(p); }).catch(() => {});
  }, [details?.artistAddress, song?.creator]);

  useEffect(() => {
    if (!songId || !user?.address) return;
    runGetTokenBalanceQueryForSongs(songId, { walletAddress: user.address }).then(b => setTokenBalance(b)).catch(() => {});
  }, [songId, user?.address]);

  // ATA WebSocket
  useEffect(() => {
    if (!mintAddress || !user?.address) return;
    let subId: number | undefined;
    let cancelled = false;
    const rpcUrl = TAROBASE_CONFIG.rpcUrl || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    try {
      const ata = getAssociatedTokenAddressSync(new PublicKey(mintAddress), new PublicKey(user.address));
      subId = connection.onAccountChange(ata, (accountInfo) => {
        if (cancelled || !accountInfo.data || accountInfo.data.length === 0) return;
        try { const decoded = AccountLayout.decode(accountInfo.data); setTokenBalance(Number(decoded.amount) / Number(10n ** 6n)); }
        catch (e) { console.debug('ATA parse error:', e); }
      }, 'confirmed');
    } catch (e) { console.debug('ATA subscription skipped:', e); }
    return () => { cancelled = true; if (subId !== undefined) connection.removeAccountChangeListener(subId); };
  }, [mintAddress, user?.address]);

  const refetchBalance = () => {
    if (!songId || !user?.address) return;
    runGetTokenBalanceQueryForSongs(songId, { walletAddress: user.address }).then(b => setTokenBalance(b)).catch(() => {});
  };

  const songTitle = details?.title ?? song?.name ?? 'Loading...';
  const songArtist = details?.artist ?? 'Unknown Artist';
  const songCoverImage = details?.coverImage;
  const title = details?.title ?? song?.name ?? 'Loading...';
  const artist = details?.artist ?? 'Unknown Artist';
  const coverImage = details?.coverImage;
  const creatorAddress = song?.creator ?? details?.artistAddress ?? null;
  const isArtistVerified = useArtistVerified(creatorAddress);
  const hasAudio = !!(details?.audioUrl || details?.audiusStreamUrl || song?.audiusStreamUrl);

  const displayTime = isThisSong ? currentTime : 0;
  const displayDuration = isThisSong ? duration : (details?.duration ?? 0);
  const progressPct = displayDuration > 0 ? (displayTime / displayDuration) * 100 : 35;

  const handleTogglePlay = async () => {
    if (!hasAudio) { toast.info('Preview unavailable'); return; }
    if (isThisSong) { togglePlay(); }
    else { playSong({ songId: songId!, title: songTitle, artist: songArtist, coverImage: songCoverImage, audioUrl: details?.audioUrl, audiusStreamUrl: details?.audiusStreamUrl ?? song?.audiusStreamUrl, duration: details?.duration, symbol: song?.symbol, genre: details?.genre }); }
  };

  const copyMint = async () => {
    if (!mintAddress) return;
    try { await navigator.clipboard.writeText(mintAddress); toast.success('Mint address copied!'); }
    catch { toast.error('Failed to copy address'); }
  };

  const openRamp = () => {
    if (!user?.address) { toast.error('Connect wallet first'); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.ramp.network/v4/main.js';
    script.onload = () => {
      // @ts-expect-error Ramp widget
      window.RampWidget?.createWidget({ host: document.body, swapAsset: 'SOL', userAddress: user.address });
    };
    document.head.appendChild(script);
    toast.success('Opening Ramp...');
  };

  // Derived metrics
  const athVal = tokenPriceUsd ? `$${tokenPriceUsd}` : '—';
  const symbol = song?.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$—';

  const marketCapUsd = (pumpFunPrice.priceUsd != null && totalSupply != null && totalSupply > 0) ? pumpFunPrice.priceUsd * totalSupply : null;
  const formatMarketCap = (val: number | null): string => {
    if (val == null) return '$—';
    if (val < 1000) return `$${val.toFixed(0)}`;
    if (val < 1_000_000) return `$${(val / 1000).toFixed(val < 10_000 ? 2 : 1)}K`;
    return `$${(val / 1_000_000).toFixed(val < 10_000_000 ? 2 : 1)}M`;
  };

  const priceChange24h = null as number | null;
  const formatPriceChange = (val: number | null): string => {
    if (val == null) return '\u2014';
    return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
  };

  const priceDisplay = pumpFunPrice.priceUsd != null ? pumpFunPrice.priceUsdStr : (tokenPriceUsd ? `$${tokenPriceUsd}` : '—');
  const priceIsPositive = true;
  const priceChangeDisplay = '\u2014';

  const dotCount = 5;
  const activeTipPercent: number | null = (() => {
    if (tipOption === null) return null;
    if (tipOption === '10') return 10;
    if (tipOption === '20') return 20;
    return Math.min(100, Math.max(1, Math.round(customTip)));
  })();

  if (song && song.isPrivate === true && song.albumId) return <Navigate to={`/album/${song.albumId}/vault`} replace />;

  const coverBg = '#111111';

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 14px rgba(0, 255, 65, 0.2) } 50% { box-shadow: 0 0 28px rgba(0, 255, 65, 0.5) } }
        @keyframes liveDot { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .row-hover:hover { background: rgba(255,255,255,0.03) !important; }
        .tab-btn:hover { color: ${T1} !important; }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: BG, color: T1, fontFamily: FONT_BODY, overflow: 'hidden' }}>

        {/* TOP NAV (preserved NavBar for consistency with rest of app) */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50 }}>
                  </div>

        <RiskDisclaimerBanner style={{ flexShrink: 0 }} />

        {loadError ? (
          <div style={{ paddingTop: 80, textAlign: 'center', padding: '80px 24px' }}>
            <p style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: G, marginBottom: 8 }}>Song not found</p>
            <p style={{ fontSize: 13, color: T3, marginBottom: 24 }}>This song may not exist or is pending approval.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => window.location.reload()} style={{ fontSize: 13, color: '#000', background: G, padding: '8px 16px', borderRadius: R, border: 'none', fontWeight: 600, cursor: 'pointer' }}>Retry</button>
              <Link to="/" style={{ fontSize: 13, color: G, textDecoration: 'none', fontWeight: 600, padding: '8px 16px' }}>Back to Marketplace</Link>
            </div>
          </div>
        ) : pageLoading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, padding: '64px 16px 16px' }}>
            <div style={{ height: 28, background: CARD, borderRadius: R, width: '60%' }} />
            <div style={{ display: 'flex', flex: 1, gap: 12 }}>
              <div style={{ width: 272, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ aspectRatio: '1', background: CARD, borderRadius: R }} />
                <div style={{ height: 20, background: CARD, borderRadius: R, width: '80%' }} />
                <div style={{ height: 14, background: CARD, borderRadius: R, width: '50%' }} />
                <div style={{ height: 120, background: CARD, borderRadius: R }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ height: 200, background: CARD, borderRadius: R }} />
                <div style={{ height: 140, background: CARD, borderRadius: R }} />
                <div style={{ height: 100, background: CARD, borderRadius: R }} />
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* BREADCRUMB */}
            <div style={{ marginTop: 48, height: 28, background: CARD, borderBottom: `1px solid ${GB2}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, flexShrink: 0 }}>
              <Link to="/" style={{ fontSize: 10, color: T3, cursor: 'pointer', fontFamily: FONT_DISPLAY, textDecoration: 'none' }}>&larr; ALL SONGS</Link>
              <span style={{ color: T3, fontSize: 10 }}>/</span>
              <span style={{ fontSize: 10, color: T2, fontFamily: FONT_DISPLAY }}>{title.toUpperCase()}</span>
              <span style={{ fontSize: 8, padding: '1px 7px', borderRadius: R, background: G2, border: `1px solid ${GB}`, color: TACCT, fontFamily: FONT_DISPLAY, letterSpacing: '0.06em' }}>{symbol}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: G, animation: 'liveDot 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 8, color: TACCT, fontFamily: FONT_DISPLAY, letterSpacing: '0.12em' }}>LIVE</span>
              </div>
            </div>

            {/* BODY — 3 columns */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

              {/* LEFT — song info + player */}
              <div style={{ width: 272, background: BG, borderRight: `1px solid ${GB2}`, overflowY: 'auto', flexShrink: 0 }}>
                {/* Cover art */}
                <div style={{ position: 'relative', aspectRatio: '1', background: coverBg, overflow: 'hidden', flexShrink: 0 }}>
                  {coverImage
                    ? <img src={coverImage} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 72, opacity: 0.2 }}><Music /></div>
                  }
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(5,26,10,0.95), transparent 55%)` }} />
                  <div style={{ position: 'absolute', top: 10, left: 10, background: G, color: '#000', fontSize: 7, fontWeight: 900, fontFamily: FONT_DISPLAY, padding: '3px 7px', borderRadius: 3, letterSpacing: '0.1em' }}>LATEST DROP</div>
                  <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {[{ l: 'SPL', c: G }, { l: 'BEAM', c: '#06b6d4' }, { l: symbol, c: NEON }, ...(details?.genre ? [{ l: details.genre, c: '#a78bfa' }] : [])].map(b => (
                      <div key={b.l} style={{ padding: '2px 7px', borderRadius: 3, background: 'rgba(5,15,10,0.8)', border: `1px solid ${b.c}`, color: b.c, fontSize: 8, fontWeight: 700, fontFamily: FONT_DISPLAY }}>{b.l}</div>
                    ))}
                  </div>
                </div>

                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color: '#00FF41', fontFamily: FONT_DISPLAY, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3, lineHeight: 1.1 }}>{title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Link to={`/song/${songId}`} style={{ fontSize: 11, color: G, fontWeight: 700, fontFamily: FONT_DISPLAY, textDecoration: 'none' }}>by {artist}</Link>
                    <VerifiedBadge isVerified={isArtistVerified} size="sm" />
                  </div>

                  {/* Waveform + playback */}
                  {hasAudio && (
                    <>
                      <Waveform progress={progressPct / 100} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: T3, fontFamily: FONT_BODY, marginBottom: 10, marginTop: 3 }}>
                        <span>{Math.floor(displayTime / 60)}:{String(Math.floor(displayTime) % 60).padStart(2, '0')}</span>
                        <span style={{ color: G }}>{Math.floor(displayTime / 60)}:{String(Math.floor(displayTime) % 60).padStart(2, '0')}</span>
                        <span>{displayDuration > 0 ? `${Math.floor(displayDuration / 60)}:${String(Math.floor(displayDuration) % 60).padStart(2, '0')}` : '0:00'}</span>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18, marginBottom: 12 }}>
                        {['shuffle', 'skipBack', 'play', 'skipForward', 'repeat'].map((ic, i) => ic === 'play' ? (
                          <button key={i} onClick={e => { e.stopPropagation(); triggerHapticFeedback(); handleTogglePlay(); }} style={{
                            width: 44, height: 44, borderRadius: '50%', background: CTA, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#000', fontWeight: 900,
                            boxShadow: `0 0 20px ${GB}`, animation: 'pulse 2s ease-in-out infinite',
                          }}>{isThisSong && isPlaying ? <Pause size={15} fill="#000" /> : <Play size={15} fill="#000" style={{ marginLeft: 2 }} />}</button>
                        ) : (
                          <button key={i} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T3, fontSize: 13 }}>
                            {ic === 'shuffle' ? <Shuffle size={13} /> : ic === 'skipBack' ? <SkipBack size={13} fill={T3} /> : ic === 'skipForward' ? <SkipForward size={13} fill={T3} /> : <Repeat size={13} />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Like / Playlist / Share */}
                  {songId && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 5, marginBottom: 12 }}>
                      {[{
                        icon: <Heart size={14} />, label: 'LIKE',
                        active: false,
                        onClick: undefined,
                      }, {
                        icon: <ListMusic size={14} />, label: 'PLAYLIST',
                        active: false,
                        onClick: () => { triggerHapticFeedback(); setShowPlaylistModal(true); },
                      }, {
                        icon: <ExternalLink size={14} />, label: 'SHARE',
                        active: false,
                        onClick: undefined,
                      }].map((a, i) => (
                        <button key={i} onClick={a.onClick} style={{
                          padding: '7px 2px', borderRadius: R, border: `1px solid ${a.active ? GB : GB2}`,
                          background: a.active ? G2 : CARD, color: a.active ? G : T2, cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s',
                        }}>
                          {a.icon}
                          <span style={{ fontSize: 7, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em' }}>{a.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  {details?.description && (
                    <>
                      <p style={{ fontSize: 10, color: T3, lineHeight: 1.6, marginBottom: 12, fontFamily: FONT_BODY,
                        overflow: descExpanded ? 'visible' : 'hidden',
                        display: descExpanded ? 'block' : '-webkit-box',
                        WebkitLineClamp: descExpanded ? 'unset' : 4,
                        WebkitBoxOrient: 'vertical',
                      } as React.CSSProperties}>{details.description}</p>
                      {details.description.length > 200 && (
                        <button onClick={() => setDescExpanded(prev => !prev)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: G, fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, padding: '4px 0', marginTop: -8, marginBottom: 12 }}>
                          {descExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </>
                  )}

                  {/* Token Overview */}
                  <div style={{ background: CARD, borderRadius: R, padding: '10px', border: `1px solid ${GB2}` }}>
                    <div style={{ fontSize: 7, color: TACCT, fontFamily: FONT_DISPLAY, letterSpacing: '0.18em', marginBottom: 8 }}>TOKEN OVERVIEW</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                      {[
                        { l: 'PRICE', v: priceDisplay, c: NEON },
                        { l: '24H', v: priceChangeDisplay, c: priceIsPositive ? G : RED },
                        { l: 'MARKET CAP', v: formatMarketCap(marketCapUsd), c: T1 },
                        { l: 'HOLDERS', v: holderLoading ? '\u2026' : holderCount?.toLocaleString() ?? '\u2014', c: T1 },
                        { l: 'VOLUME', v: '$—', c: T1 },
                        { l: 'ATH', v: athVal, c: '#ffd700' },
                      ].map((s, i) => (
                        <div key={i}>
                          <div style={{ fontSize: 7, color: T3, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em', marginBottom: 1 }}>{s.l}</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: s.c, fontFamily: FONT_BODY }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tip section */}
                  {songId && (
                    <div style={{ marginTop: 12 }}>
                      {!tipExpanded ? (
                        <button onClick={() => { triggerHapticFeedback(); setTipExpanded(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', width: '100%' }}>
                          <Heart size={13} style={{ color: T3 }} />
                          <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T3, flex: 1, textAlign: 'left' }}>Support {songArtist !== 'Unknown Artist' ? songArtist : 'the artist'} directly?</span>
                          <ChevronDown size={13} style={{ color: T3 }} />
                        </button>
                      ) : (
                        <div style={{ background: CARD, border: `1px solid ${GB}`, borderRadius: R, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontFamily: FONT_BODY, fontSize: 12, color: T2 }}>Support {songArtist !== 'Unknown Artist' ? songArtist : 'the artist'}</span>
                            <button onClick={() => { triggerHapticFeedback(); setTipExpanded(false); setTipOption(null); }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <X size={11} style={{ color: T3 }} />
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            {(['10', '20'] as const).map(pct => (
                              <button key={pct} onClick={() => { triggerHapticFeedback(); setTipOption(prev => prev === pct ? null : pct); }} style={{
                                flex: 1, padding: '8px 0', borderRadius: R, border: `1px solid ${tipOption === pct ? GB : GB2}`,
                                background: tipOption === pct ? G2 : DEEP, color: tipOption === pct ? G : T3,
                                fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                              }}>{pct}%</button>
                            ))}
                            <button onClick={() => { triggerHapticFeedback(); setTipOption(prev => prev === 'custom' ? null : 'custom'); }} style={{
                              flex: 1, padding: '8px 0', borderRadius: R, border: `1px solid ${tipOption === 'custom' ? GB : GB2}`,
                              background: tipOption === 'custom' ? G2 : DEEP, color: tipOption === 'custom' ? G : T3,
                              fontFamily: FONT_BODY, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                            }}>Custom</button>
                          </div>
                          {tipOption === 'custom' && (
                            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                              <input type="number" min={1} max={100} step={1} value={customTip} onChange={e => setCustomTip(Math.min(100, Math.max(1, Math.round(Number(e.target.value)))))} style={{ flex: 1, background: DEEP, border: `1px solid ${GB}`, borderRadius: R, padding: '8px 12px', color: T1, fontFamily: FONT_DISPLAY, fontSize: 13, outline: 'none', textAlign: 'right' }} />
                              <span style={{ fontFamily: FONT_BODY, fontSize: 13, color: G, display: 'flex', alignItems: 'center' }}>%</span>
                            </div>
                          )}
                          {activeTipPercent !== null && activeTipPercent > 0 && (
                            <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: TACCT }}>
                              At {activeTipPercent}% tip \u2014 you get ~{92 - activeTipPercent}% in tokens instead of ~92%
                            </p>
                          )}
                          <p style={{ fontFamily: FONT_BODY, fontSize: 10, color: T3, marginTop: 4 }}>Optional \u2014 tip comes from your token allocation, never from fees.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* CENTER — chart + buy/sell */}
              <div style={{ flex: 1, overflowY: 'auto', background: BG }}>
                {/* Price header */}
                <div style={{ padding: '12px 16px 10px', borderBottom: `1px solid ${GB2}`, background: CARD }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                    <span style={{
                      fontSize: 28, fontWeight: 900, fontFamily: FONT_DISPLAY, color: priceFlash ? '#52FF20' : T1, letterSpacing: -1,
                      transition: priceFlash ? 'none' : 'color 0.35s ease',
                    }}>{priceDisplay}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: priceIsPositive ? G : RED, fontFamily: FONT_BODY }}>{priceChangeDisplay}</span>
                    <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: R, background: G2, border: `1px solid ${GB}`, color: TACCT, fontFamily: FONT_DISPLAY }}>24H</span>
                  </div>
                  {pumpFunPrice.lastFetchedAt !== null && (
                    <div style={{ color: T3, fontSize: 10, fontFamily: FONT_BODY, marginBottom: 8 }}>updated {secondsAgo}s ago</div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[
                      { l: 'ATH', v: athVal, c: '#ffd700' },
                      { l: 'MCAP', v: formatMarketCap(marketCapUsd), c: T1 },
                      { l: 'HOLDERS', v: holderLoading ? '\u2026' : holderCount?.toLocaleString() ?? '\u2014', c: T1 },
                      { l: 'VOLUME', v: '$\u2014', c: T1 },
                    ].map(s => (
                      <div key={s.l} style={{ background: DEEP, borderRadius: R, padding: '6px 10px', border: `1px solid ${GB2}` }}>
                        <div style={{ fontSize: 7, color: T3, fontFamily: FONT_DISPLAY, letterSpacing: '0.1em', marginBottom: 1 }}>{s.l}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: s.c, fontFamily: FONT_BODY }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart + timeframe tabs */}
                <div style={{ padding: '12px 16px 8px', borderBottom: `1px solid ${GB2}` }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
                    {(['1m', '5m', '15m', '1h', '4h', '1d'] as const).map(t => (
                      <button key={t} className="tab-btn" onClick={() => setCandleTab(t as Timeframe)} style={{
                        padding: '4px 10px', borderRadius: R, border: 'none', cursor: 'pointer',
                        fontSize: 8, fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: '0.06em',
                        background: candleTab === t ? ACTV : 'transparent',
                        color: candleTab === t ? T1 : T3,
                        outline: candleTab === t ? `1px solid ${GB}` : 'none',
                        transition: 'all 0.15s',
                      }}>{t.toUpperCase()}</button>
                    ))}
                    {/* Chart type toggle */}
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: R, padding: '3px 4px' }}>
                      <button onClick={() => setChartType('line')} style={{
                        display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: R, border: 'none', cursor: 'pointer',
                        background: chartType === 'line' ? G2 : 'transparent', color: chartType === 'line' ? G : T3,
                        fontFamily: FONT_DISPLAY, fontSize: 9, transition: 'all 0.15s',
                      }}><LineChart size={11} /><span>LINE</span></button>
                      <button onClick={() => setChartType('candles')} style={{
                        display: 'flex', alignItems: 'center', gap: 3, padding: '3px 8px', borderRadius: R, border: 'none', cursor: 'pointer',
                        background: chartType === 'candles' ? G2 : 'transparent', color: chartType === 'candles' ? G : T3,
                        fontFamily: FONT_DISPLAY, fontSize: 9, transition: 'all 0.15s',
                      }}>CANDLES</button>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <PriceChart candles={songCandles} liveHistory={priceHistory} tf={candleTab} positive={priceIsPositive} mint={mintAddress} chartType={chartType} loading={pumpFunPrice.loading || candlesLoading} />
                  </div>
                </div>

                {/* Bonding curve — prominent section */}
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${GB2}`, background: 'rgba(255,255,255,0.02)' }}>
                  {/* Header row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: G, boxShadow: `0 0 6px ${G}`, animation: 'liveDot 1.5s ease-in-out infinite' }} />
                      <span style={{ fontSize: 8, color: TACCT, fontFamily: FONT_DISPLAY, letterSpacing: '0.12em' }}>BONDING CURVE</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Progress % — big prominent number */}
                      <span style={{ fontSize: 16, fontWeight: 900, color: bondingProgress != null ? NEON : T3, fontFamily: FONT_DISPLAY, textShadow: bondingProgress != null ? `0 0 8px rgba(0, 255, 65, 0.5)` : 'none' }}>
                        {bondingProgress != null ? `${bondingProgress.toFixed(1)}%` : '—'}
                      </span>
                      <span style={{ fontSize: 8, color: G, fontFamily: FONT_BODY }}>
                        {bondingProgress != null ? `${(100 - Math.min(100, bondingProgress)).toFixed(1)}% to grad` : '—'}
                      </span>
                    </div>
                  </div>
                  {/* Progress track */}
                  <div style={{ height: 8, background: G2, borderRadius: 4, overflow: 'hidden', border: `1px solid ${GB2}`, position: 'relative' }}>
                    <div style={{ width: `${bondingProgress != null ? Math.min(100, bondingProgress) : 0}%`, height: '100%', background: CTA, borderRadius: 4, boxShadow: `0 0 10px ${GB}`, transition: 'width 0.8s ease-out' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 8, color: T3 }}>0%</span>
                    <span style={{ fontFamily: FONT_BODY, fontSize: 8, color: T3 }}>100% → $69K</span>
                  </div>
                </div>

                {/* Balance row */}
                <div style={{ padding: '10px 16px', borderBottom: `1px solid ${GB2}` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: G, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: T2, fontFamily: FONT_BODY }}>Balance</span>
                    <span style={{
                      fontSize: 12, fontWeight: 900, fontFamily: FONT_DISPLAY,
                      color: balanceFlash === 'up' ? '#52FF20' : balanceFlash === 'down' ? RED : T1,
                    }}>{user && tokenBalance !== null ? `${tokenBalance.toLocaleString()} ${song?.symbol ?? 'tokens'}` : '0 tokens'}</span>
                    {user && tokenBalance !== null && (
                      <>
                        <span style={{ color: T3, fontSize: 10 }}>&bull;</span>
                        <span style={{ fontSize: 11, color: T2, fontFamily: FONT_BODY }}>${(tokenBalance * 0.001).toFixed(2)}</span>
                      </>
                    )}
                    <ChevronRight size={13} style={{ color: '#444', marginLeft: 'auto', marginRight: 0 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[1, 2, 5].map(amt => (
                      <button key={amt} onClick={() => { triggerHapticFeedback(); setSheetMode('buy'); setShowBuySellSheet(true); }} style={{
                        flex: 1, height: 44, borderRadius: R, cursor: 'pointer',
                        background: DEEP, border: `1px solid ${GB}`,
                        color: G, fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 900,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      }}><Coins size={12} style={{ opacity: 0.4 }} />${amt}</button>
                    ))}
                    <button onClick={() => { triggerHapticFeedback(); if (user && tokenBalance && tokenBalance > 0) setShowSellModal(true); }} style={{
                      flex: 1, height: 44, borderRadius: R, cursor: 'pointer',
                      background: '#1a0808', border: `1px solid rgba(239,68,68,0.3)`,
                      color: RED, fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}><Percent size={11} style={{ opacity: 0.6 }} />100</button>
                  </div>
                </div>

                {/* Buy/Sell buttons */}
                {songId && (
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                      {[{ m: 'buy' as const, g: CTA, glow: `0 0 16px ${GB}` }, { m: 'sell' as const, g: `linear-gradient(135deg, ${RED}, #cc0000)`, glow: `0 0 16px rgba(239,68,68,0.35)` }].map(({ m, g, glow }) => (
                        <button key={m} onClick={() => { triggerHapticFeedback(); setSheetMode(m); setShowBuySellSheet(true); }} style={{
                          flex: 1, padding: '13px', borderRadius: R, border: 'none', cursor: 'pointer',
                          fontFamily: FONT_DISPLAY, fontWeight: 900, fontSize: 12, letterSpacing: '0.08em',
                          background: g, color: '#000',
                          boxShadow: glow, transition: 'all 0.15s', position: 'relative', overflow: 'hidden',
                        }}><ScanLines />{m.toUpperCase()}</button>
                      ))}
                    </div>
                    {/* Trade → */}
                    <button onClick={() => { triggerHapticFeedback(); if (songId) navigate(`/song/${songId}`); }} style={{
                      width: '100%', height: 48, borderRadius: R, border: `2px solid ${GB}`,
                      background: 'transparent', cursor: 'pointer',
                      boxShadow: `0 0 20px ${G2}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      color: G, fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
                      marginBottom: 14,
                    }}><ArrowUpDown size={16} /> Trade {symbol}</button>
                    {/* Add to Playlist */}
                    <button onClick={() => { triggerHapticFeedback(); setShowPlaylistModal(true); }} style={{
                      width: '100%', height: 48, borderRadius: R, border: `2px solid ${GB}`,
                      background: 'transparent', cursor: 'pointer',
                      boxShadow: `0 0 20px ${G2}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      color: G, fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
                    }}><ListMusic size={16} /> Add to Playlist</button>
                  </div>
                )}

                {/* Floating Buy SOL */}
                {user && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 400, damping: 30 }} style={{ position: 'fixed', bottom: 80, right: 16, zIndex: 40 }}>
                    <button onClick={openRamp} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 50,
                      background: `linear-gradient(135deg, ${DEEP}, #0A1A0E)`, color: G, fontSize: 13, fontWeight: 700,
                      fontFamily: FONT_BODY, boxShadow: `0 0 24px ${GB}, 0 4px 16px rgba(0,0,0,0.5)`,
                      border: `1px solid ${GB}`, minHeight: 44, cursor: 'pointer',
                    }}><Zap size={14} /> Buy SOL</button>
                  </motion.div>
                )}
              </div>

              {/* RIGHT — activity / holders / about */}
              <div style={{ width: 284, background: CARD, borderLeft: `1px solid ${GB2}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${GB2}`, flexShrink: 0 }}>
                  {DETAIL_TABS.map(t => (
                    <button key={t} className="tab-btn" onClick={() => setActiveDetailTab(t)} style={{
                      flex: 1, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 9, fontWeight: 700, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em',
                      color: activeDetailTab === t ? T1 : T3,
                      borderBottom: activeDetailTab === t ? `2px solid ${G}` : '2px solid transparent',
                      marginBottom: -1, transition: 'all 0.15s',
                    }}>{t === 'Holders' ? `HOLDERS (${holderLoading ? '\u2026' : holderCount ?? '\u2014'})` : t.toUpperCase()}</button>
                  ))}
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {activeDetailTab === 'Activity' && songId && (
                    <div style={{ padding: '0 12px' }}>
                      <TradingActivityFeed songId={songId} symbol={song?.symbol} />
                    </div>
                  )}

                  {activeDetailTab === 'Holders' && songId && mintAddress && (
                    <div style={{ padding: '0 12px' }}>
                      <TokenHolders mint={mintAddress} symbol={song?.symbol} />
                    </div>
                  )}
                  {activeDetailTab === 'Holders' && songId && !mintAddress && (
                    <div style={{ padding: '0 24px', textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}>
                      <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T3 }}>Token mint not yet available</p>
                    </div>
                  )}

                  {activeDetailTab === 'About' && (
                    <div style={{ padding: '14px 12px' }}>
                      {/* Artist info */}
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14 }}>
                        <div style={{ width: 52, height: 52, borderRadius: R, background: coverBg, border: `1px solid ${GB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0, overflow: 'hidden' }}>
                          {artistProfile?.profileImage
                            ? <img src={artistProfile.profileImage} alt={artist} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <User size={20} style={{ color: G }} />
                          }
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: T1, fontFamily: FONT_DISPLAY, marginBottom: 2 }}>
                            {artistProfile?.name ?? artist}
                            <VerifiedBadge isVerified={isArtistVerified} size="sm" />
                          </div>
                          {artistProfile?.bio && (
                            <div style={{ fontSize: 9, color: T3, fontFamily: FONT_BODY, marginBottom: 8 }}>{artistProfile.bio}</div>
                          )}
                          <div style={{ display: 'flex', gap: 5 }}>
                            {song?.creator && (
                              <Link to={`/artist/${song.creator}`} style={{ padding: '3px 8px', borderRadius: R, background: G2, border: `1px solid ${GB}`, color: G, fontSize: 8, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_DISPLAY, textDecoration: 'none' }}>FOLLOW</Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* On-chain details */}
                      {mintAddress && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: R, background: DEEP, border: `1px solid ${GB2}`, marginBottom: 8 }}>
                            <span style={{ fontSize: 7, color: T3, fontFamily: FONT_DISPLAY, flexShrink: 0 }}>MINT</span>
                            <span style={{ fontSize: 9, color: T1, fontFamily: FONT_BODY, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mintAddress}</span>
                            <button onClick={copyMint} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}><Copy size={12} style={{ color: T3 }} /></button>
                            <a href={`https://solscan.io/token/${mintAddress}`} target="_blank" rel="noreferrer" style={{ color: T3 }}><ExternalLink size={11} /></a>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                            {[
                              { label: 'Token Price / ATH', value: athVal },
                              { label: 'Volume (24h)', value: '$\u2014' },
                            ].map(s => (
                              <div key={s.label} style={{ background: DEEP, borderRadius: R, padding: '10px', border: `1px solid ${GB2}`, textAlign: 'center' }}>
                                <div style={{ fontSize: 16, fontWeight: 900, color: G, fontFamily: FONT_DISPLAY }}>{s.value}</div>
                                <div style={{ fontSize: 7, color: T3, marginTop: 2, fontFamily: FONT_DISPLAY, letterSpacing: '0.1em' }}>{s.label}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <a href={`https://dexscreener.com/solana/${mintAddress}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: R, background: G2, border: `1px solid ${GB}`, color: G, fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>DexScreener</a>
                            <a href={`https://solscan.io/token/${mintAddress}`} target="_blank" rel="noreferrer" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: R, background: DEEP, border: `1px solid ${GB2}`, color: '#06b6d4', fontFamily: FONT_BODY, fontSize: 10, fontWeight: 600, textDecoration: 'none' }}>Solscan</a>
                          </div>
                        </div>
                      )}

                      {/* Lyrics */}
                      {details?.lyrics && (
                        <div style={{ borderRadius: R, overflow: 'hidden', border: `1px solid ${GB2}`, background: DEEP, marginBottom: 14 }}>
                          <button onClick={() => setLyricsExpanded(prev => !prev)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 11, fontWeight: 900, color: T1, letterSpacing: '0.08em' }}>LYRICS</span>
                            <ChevronDown size={15} style={{ color: G, transform: lyricsExpanded ? 'rotate(180deg)' : 'rotate(0)', transition: '0.25s' }} />
                          </button>
                          {lyricsExpanded && (
                            <div style={{ padding: '0 14px 14px' }}>
                              <p style={{ fontFamily: FONT_BODY, fontSize: 13, color: T2, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{details.lyrics}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* GeckoTerminal embed */}
                      {mintAddress && (
                        <div style={{ borderRadius: R, overflow: 'hidden', border: `1px solid ${GB2}`, marginBottom: 14 }}>
                          <iframe src={`https://www.geckoterminal.com/solana/tokens/${mintAddress}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0`} title={`${song?.symbol ?? 'Token'} price chart`} width="100%" height="340" frameBorder="0" loading="lazy" sandbox="allow-scripts allow-same-origin" style={{ display: 'block', border: 'none' }} />
                        </div>
                      )}

                      {/* More by artist */}
                      {details?.artistAddress && (
                        <ArtistSongsCarousel currentSongId={songId!} artistAddress={details.artistAddress} artistName={songArtist} />
                      )}

                      {/* Comments */}
                      {details?.artistAddress && (
                        <div style={{ marginTop: 16 }}>
                          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 12, color: T1, fontWeight: 900, letterSpacing: '0.08em', marginBottom: 12 }}>COMMENTS</h3>
                          <CommentWall artistAddress={details.artistAddress} artistName={songArtist} canPost={!!user} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* On-chain details footer */}
                <div style={{ borderTop: `1px solid ${GB2}`, padding: '10px 12px', flexShrink: 0 }}>
                  <div style={{ fontSize: 7, color: TACCT, fontFamily: FONT_DISPLAY, letterSpacing: '0.18em', marginBottom: 7 }}>&#9889; ON-CHAIN DETAILS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                    {[
                      { l: 'MINT', v: mintAddress ? `${mintAddress.slice(0, 4)}...pump` : '\u2014' },
                      { l: 'PROGRAM', v: 'pump.fun' },
                      { l: 'SUPPLY', v: totalSupply != null ? `${(totalSupply / 1_000_000_000).toFixed(0)}B ${symbol}` : `1B ${symbol}` },
                      { l: 'DECIMALS', v: '6' },
                    ].map(d => (
                      <div key={d.l} style={{ background: DEEP, borderRadius: R, padding: '6px 8px', border: `1px solid ${GB2}` }}>
                        <div style={{ fontSize: 7, color: T3, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em', marginBottom: 1 }}>{d.l}</div>
                        <div style={{ fontSize: 9, color: T1, fontFamily: FONT_BODY, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* STATUS BAR */}
            <div style={{ height: 28, background: DEEP, borderTop: `1px solid ${GB2}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: G, animation: 'liveDot 2s ease-in-out infinite' }} />
                <span style={{ fontSize: 9, color: T3, fontFamily: FONT_DISPLAY, letterSpacing: '0.1em' }}>SOL PRICE</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: T1, fontFamily: FONT_BODY }}>$167.32</span>
                <span style={{ fontSize: 9, color: G, fontFamily: FONT_BODY }}>+4.21%</span>
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 9, color: T3, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em' }}>NETWORK <span style={{ color: TACCT }}>SOLANA</span></span>
                <span style={{ fontSize: 9, color: T3, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em' }}>TPS <span style={{ color: T1 }}>2,847</span></span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: G }} />
                <span style={{ fontSize: 9, color: TACCT, fontFamily: FONT_DISPLAY, letterSpacing: '0.08em' }}>ALL SYSTEMS OPERATIONAL</span>
              </div>
            </div>
          </>
        )}

        {/* Modals */}
        {songId && (
          <PayWhatYouWantModal open={showPayModal} onClose={() => setShowPayModal(false)} songId={songId} songTitle={title} artist={songArtist} coverImage={coverImage} />
        )}
        {songId && (
          <AddToPlaylistModal songId={songId} title={title} artist={artist} coverImage={coverImage} isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} />
        )}
        {songId && song && mintAddress && (
          <SellModal open={showSellModal} onClose={() => setShowSellModal(false)} songId={songId} songTitle={title} symbol={song.symbol} mintAddress={mintAddress} tokenBalance={tokenBalance ?? 0} onSellConfirmed={refetchBalance} />
        )}
        <BuySellSheet open={showBuySellSheet} onClose={() => setShowBuySellSheet(false)} mode={sheetMode} song={song} details={details} hasWallet={!!user} onBuy={() => setShowPayModal(true)} tokenBalance={tokenBalance} onSell={() => { if (songId && song && mintAddress) setShowSellModal(true); }} songId={songId!} onPurchaseSuccess={refetchBalance} />
      </div>
    </>
  );
};

export default SongDetailPage;
