/**
 * LitHero — desktop-only hero section (min-width 768px).
 * Mobile is handled entirely by LitHeroMobile — this component only renders at md:block.
 *
 * Layout spec:
 *  1) Top bar (logo | tagline | icons)
 *  2) Live ticker strip
 *  3) Three-column grid: 25% price chart | 45% cover art carousel | 30% right panel
 *  4) Below grid: search bar (50%) + LAUNCH YOUR TOKEN pill (50%)
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Settings,
  ChevronLeft, ChevronRight,
  Shuffle, SkipBack, Play, Pause, SkipForward, Repeat,
  Search, Rocket, ListMusic,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { useJupiterPrice } from '@/hooks/useJupiterPrice';
import { useTimeTab, TimeTab } from '@/contexts/TimeTabContext';

// ─── Logo URL (same as mobile) ────────────────────────────────────────────────
const LOGO_URL =
  'https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69ddd0df21f73302c16fe6fd';

// ─── Deterministic RNG (mirrors mobile) ──────────────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function strHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function deriveSongMetrics(song: SongsResponse | null) {
  if (!song) return { price: '$0.000000', priceChange: '+0.00%', priceIsPositive: true, priceRaw: 0.002, athVal: '$2.0K', symbol: '$—' };
  const rng = makeRng(strHash(song.id + '_price'));
  const priceRaw = rng() * 0.008 + 0.002;
  const changeRaw = (rng() - 0.35) * 300;
  const priceIsPositive = changeRaw >= 0;
  const price = `$${priceRaw.toFixed(6)}`;
  const priceChange = `${priceIsPositive ? '+' : ''}${changeRaw.toFixed(2)}%`;
  const athVal = `$${(rng() * 15 + 2).toFixed(1)}K`;
  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$—';
  return { price, priceChange, priceIsPositive, priceRaw, athVal, symbol };
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface LitHeroDesktopProps {
  songs: SongsResponse[];
  detailsMap: Record<string, SongDetailsResponse>;
  carouselIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isPlaying: boolean;
  onTogglePlay: (songId: string) => void;
  onAddToPlaylist?: (songId: string) => void;
}

// ─── LiveSparkline ─────────────────────────────────────────────────────────────
const LiveSparkline: React.FC<{
  history: number[];
  positive: boolean;
  width?: number;
  height?: number;
  baselinePrice?: number;
}> = ({
  history,
  positive,
  width = 200,
  height = 80,
  baselinePrice,
}) => {
  const color = '#00FF41';

  // ── Normal sparkline with 2+ data points ──
  if (history.length >= 2) {
    const points = history;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = Math.max(max - min, 0.000001);

    const pathPoints = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height * 0.85) - height * 0.05;
      return `${x},${y}`;
    });

    const linePath = `M ${pathPoints.join(' L ')}`;
    const fillPath = `${linePath} L ${width},${height} L 0,${height} Z`;
    const lastY = height - ((points[points.length - 1] - min) / range) * (height * 0.85) - height * 0.05;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#sparkGrad)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={width} cy={lastY} r="3" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
    );
  }

  // ── Flat baseline (0 or 1 data points, with baselinePrice) ──
  const baseline = history.length === 1 ? history[0] : baselinePrice;
  if (baseline != null) {
    const flatY = height * 0.5;
    const linePath = `M 0,${flatY} L ${width},${flatY}`;
    const fillPath = `M 0,${flatY} L ${width},${flatY} L ${width},${height} L 0,${height} Z`;

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkGradFlat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillPath} fill="url(#sparkGradFlat)" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={width} cy={flatY} r="3" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
    );
  }

  // ── No data — render nothing (caller shows shimmer) ──
  return null;
};

// ─── Main Component ───────────────────────────────────────────────────────────
const LitHeroDesktop: React.FC<LitHeroDesktopProps> = ({
  songs,
  detailsMap,
  carouselIndex,
  onPrev,
  onNext,
  isPlaying,
  onTogglePlay,
  onAddToPlaylist,
}) => {
  const navigate = useNavigate();

  // Chart time tab — shared via context with global TickerStrip
  const { activeTab, setActiveTab } = useTimeTab();

  // Search
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDropdown]);

  // Featured song
  const featuredSong = songs[carouselIndex % Math.max(songs.length, 1)] ?? null;
  const featuredDetails = featuredSong ? (detailsMap[featuredSong.id] ?? null) : null;
  const { athVal, symbol } = deriveSongMetrics(featuredSong);

  // Live price from Jupiter (uses song id as mint address)
  const jupiterPrice = useJupiterPrice(featuredSong?.mintAddress ?? null);
  const price = jupiterPrice.price != null ? jupiterPrice.priceStr : '—';
  const priceChange = jupiterPrice.change24h != null ? jupiterPrice.changeStr : '—';
  const priceIsPositive = jupiterPrice.change24h != null ? jupiterPrice.isPositive : true;
  const liveHistory = jupiterPrice.history;

  const coverImage = featuredDetails?.coverImage ?? null;
  const title = featuredDetails?.title ?? featuredSong?.name ?? 'UNTITLED';
  const artist = featuredDetails?.artist ?? '—';

  // Top ticker song
  const topSong = songs.length > 0 ? songs[0] : null;
  const topSymbol = topSong?.symbol ?? 'TOKEN';
  const topChangeStr = '—';

  // Top 5 trending
  const trendingSongs = songs.slice(0, 5).map(s => ({ song: s, price: null as number | null, change: null as number | null }));

  // Search results
  const searchResults = search.trim()
    ? songs.filter(s => {
        const d = detailsMap[s.id];
        const q = search.toLowerCase();
        return (
          (d?.title ?? s.name ?? '').toLowerCase().includes(q) ||
          (d?.artist ?? '').toLowerCase().includes(q) ||
          (s.symbol ?? '').toLowerCase().includes(q)
        );
      }).slice(0, 6)
    : [];

  const handlePlayToggle = useCallback(() => {
    if (featuredSong) onTogglePlay(featuredSong.id);
  }, [featuredSong, onTogglePlay]);

  const dotCount = Math.min(songs.length, 8);
  const activeDot = carouselIndex % Math.max(dotCount, 1);

  return (
    <div
      className="hidden md:block w-full relative overflow-hidden"
      style={{ background: 'rgba(5,13,5,0.72)', backdropFilter: 'blur(2px)', fontFamily: "'Archivo Black', sans-serif" }}
    >
      {/* Subtle smoky green texture overlay — matches LAUNCH YOUR TOKEN button color (#00FF41) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          opacity: 0.06,
          background: `
            radial-gradient(ellipse 80% 50% at 20% 30%, #00FF41 0%, transparent 70%),
            radial-gradient(ellipse 60% 40% at 70% 60%, #06d6a0 0%, transparent 65%),
            radial-gradient(ellipse 90% 45% at 50% 80%, #00FF41 0%, transparent 75%),
            radial-gradient(ellipse 50% 35% at 85% 20%, #06d6a0 0%, transparent 60%),
            radial-gradient(ellipse 70% 55% at 10% 70%, #00FF41 0%, transparent 68%)
          `,
          filter: 'blur(40px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* ══════════════════════════════════════════════════════
          1) TOP BAR
      ══════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 1400,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 32px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        {/* Left: logo */}
        <img src={LOGO_URL} alt="Lit Studio" style={{ width: 140, height: 'auto', objectFit: 'contain', flexShrink: 0 }} />

        {/* Center: tagline */}
        <span style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: '#00FF41',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          textAlign: 'center',
          flex: 1,
          padding: '0 24px',
        }}>
          STREAMS BECOME YOURS
        </span>

        {/* Right: bell + gear */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Bell size={20} color="#fff" />
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 7, height: 7, borderRadius: '50%',
              background: '#00FF41', border: '1px solid #050D05',
            }} />
          </div>
          <Settings size={20} color="#fff" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2) LIVE TICKER STRIP
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: '#0A1A0A',
        padding: '8px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        maxWidth: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', marginRight: 16 }}>
          <span style={{
            background: '#00FF41', color: '#000',
            fontSize: 10, fontWeight: 900,
            padding: '3px 10px', borderRadius: 20,
            marginRight: 12, flexShrink: 0,
            fontFamily: "'Archivo Black', sans-serif",
          }}>
            LIVE
          </span>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{
              whiteSpace: 'nowrap',
              fontSize: 13,
              color: '#fff',
              fontFamily: "'Inter', monospace",
              animation: 'desktopTickerScroll 18s linear infinite',
              display: 'inline-block',
            }}>
              ${topSymbol} surges {topChangeStr} in the last 24h &nbsp;&nbsp;&nbsp; ${topSymbol} surges {topChangeStr} in the last 24h &nbsp;&nbsp;&nbsp; ${topSymbol} surges {topChangeStr} in the last 24h
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          3) THREE-COLUMN GRID
      ══════════════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '25% 45% 30%',
        height: 420,
        width: '100%',
      }}>

        {/* ── LEFT COLUMN: Price chart ── */}
        <div style={{
          background: '#0C1510',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid rgba(0, 255, 65, 0.15)',
        }}>
          {/* Symbol label */}
          <div style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 10, color: '#00FF41',
            letterSpacing: '0.12em', textTransform: 'uppercase',
            marginBottom: 4,
          }}>
            {symbol} PRICE
          </div>

          {/* Current price */}
          <div style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 26, fontWeight: 900,
            color: '#fff',
            lineHeight: 1, marginBottom: 4,
          }}>
            {price}
          </div>

          {/* Price change */}
          <div style={{
            fontSize: 14, fontWeight: 700,
            color: priceIsPositive ? '#00FF41' : '#ef4444',
            marginBottom: 10,
            fontFamily: "'Inter', monospace",
          }}>
            ({priceChange})
          </div>

          {/* Chart fills remaining height */}
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {(() => {
              const baselinePrice = jupiterPrice.price ?? jupiterPrice.firstPrice ?? undefined;
              const hasChartData = liveHistory.length >= 2 || baselinePrice != null;

              if (hasChartData) {
                return (
                  <LiveSparkline
                    history={liveHistory}
                    positive={priceIsPositive}
                    width={200}
                    height={120}
                    baselinePrice={baselinePrice}
                  />
                );
              }

              // Skeleton shimmer when API fails or times out
              return (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.05), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'chart-shimmer 2s linear infinite',
                  }}
                />
              );
            })()}
          </div>

          {/* Time tabs pinned to bottom */}
          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'nowrap' }}>
            {(['1H', '1D', '1W', '1M', '1Y', 'ALL'] as TimeTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 9, padding: '3px 7px',
                  borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? '#1a3a1a' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#555',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── CENTER COLUMN: Cover art carousel ── */}
        <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
          {/* Cover art */}
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', zIndex: 0,
              }}
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 0,
              background: 'linear-gradient(145deg, #0a1e12, #050f0a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: '5rem', opacity: 0.15 }}>♫</span>
            </div>
          )}

          {/* Bottom gradient overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', zIndex: 1,
            background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 50%, transparent 100%)',
            pointerEvents: 'none',
          }} />

          {/* LATEST DROP badge — top left */}
          <div style={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            background: '#00FF41', color: '#000',
            fontSize: 9, fontWeight: 900,
            padding: '4px 10px', borderRadius: 20,
            fontFamily: "'Archivo Black', sans-serif",
            letterSpacing: '0.05em',
          }}>
            LATEST DROP
          </div>

          {/* Carousel dots — top right */}
          <div style={{
            position: 'absolute', top: 12, right: 12, zIndex: 2,
            display: 'flex', gap: 4, alignItems: 'center',
          }}>
            {Array.from({ length: dotCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === activeDot ? 18 : 6,
                  height: 6,
                  borderRadius: i === activeDot ? 3 : '50%',
                  background: i === activeDot ? '#00FF41' : '#444',
                  transition: 'all 0.3s',
                }}
              />
            ))}
          </div>

          {/* Left carousel arrow */}
          <button
            onClick={e => { e.stopPropagation(); onPrev(); }}
            style={{
              position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 8px', opacity: 0.7,
            }}
          >
            <ChevronLeft size={24} color="#fff" />
          </button>

          {/* Right carousel arrow */}
          <button
            onClick={e => { e.stopPropagation(); onNext(); }}
            style={{
              position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', zIndex: 3,
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 8px', opacity: 0.7,
            }}
          >
            <ChevronRight size={24} color="#fff" />
          </button>

          {/* Bottom content overlay */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
            padding: '12px 14px',
          }}>
            {/* Artist small caps */}
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.6)',
              letterSpacing: '0.18em', textTransform: 'uppercase',
              marginBottom: 3,
              fontFamily: "'Archivo Black', sans-serif",
            }}>
              {artist}
            </div>

            {/* Song title */}
            <div style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 20, fontWeight: 900,
              color: '#fff', marginBottom: 6,
              lineHeight: 1.1,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as React.CSSProperties}>
              {title}
            </div>

            {/* Green progress bar */}
            <div style={{
              width: '45%', height: 3,
              background: '#00FF41', borderRadius: 2,
              marginBottom: 10,
            }} />

            {/* Playback controls */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 18,
              marginBottom: 10,
            }}>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Shuffle size={16} color="rgba(255,255,255,0.5)" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onPrev(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <SkipBack size={18} color="#fff" fill="#fff" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); handlePlayToggle(); }}
                style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: '#00FF41',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 20px rgba(0, 255, 65, 0.5)',
                  flexShrink: 0,
                }}
              >
                {isPlaying
                  ? <Pause size={20} color="#fff" fill="#fff" />
                  : <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                }
              </button>
              <button
                onClick={e => { e.stopPropagation(); onNext(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <SkipForward size={18} color="#fff" fill="#fff" />
              </button>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <Repeat size={16} color="rgba(255,255,255,0.5)" />
              </button>
            </div>

            {/* Bottom info strip: ATH | BUY | symbol btn */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)', borderRadius: 6,
                padding: '4px 8px',
              }}>
                <div style={{ fontSize: 9, color: '#888', fontFamily: "'Archivo Black', sans-serif" }}>ATH</div>
                <div style={{ fontSize: 10, color: '#00FF41', fontFamily: "'Inter', monospace" }}>{athVal}</div>
              </div>

              <button
                onClick={() => featuredSong && navigate(`/song/${featuredSong.id}`)}
                style={{
                  background: '#00FF41', color: '#000',
                  fontWeight: 900, fontSize: 12,
                  padding: '7px 18px', borderRadius: 8,
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                  flexShrink: 0,
                }}
              >
                BUY
              </button>

              <button
                onClick={() => featuredSong && navigate(`/song/${featuredSong.id}`)}
                style={{
                  border: '1.5px solid #00FF41', color: '#00FF41',
                  fontWeight: 700, fontSize: 11,
                  padding: '7px 12px', borderRadius: 8,
                  background: 'transparent', cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                  flexShrink: 0,
                }}
              >
                {symbol}
              </button>

              <button
                onClick={() => {
                  if (featuredSong) {
                    if (onAddToPlaylist) {
                      onAddToPlaylist(featuredSong.id);
                    } else {
                      toast.success('Added to playlist');
                    }
                  }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  border: '1.5px solid rgba(0, 255, 65, 0.85)',
                  color: '#0a0a0a',
                  fontWeight: 900, fontSize: 10,
                  padding: '7px 20px', borderRadius: 999,
                  background: '#00FF41', cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                  flexShrink: 0,
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 0 12px rgba(0, 255, 65, 0.5)',
                }}
              >
                <ListMusic size={13} color="#0a0a0a" />
                + ADD
              </button>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{
          background: '#0C1510',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflow: 'hidden',
          borderLeft: '1px solid rgba(0, 255, 65, 0.15)',
        }}>
          {/* LAUNCH YOUR TOKEN card */}
          <div style={{
            background: '#0C1510',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: 16,
            padding: 16,
            flexShrink: 0,
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Rocket size={20} color="#00FF41" />
              <span style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 11, fontWeight: 900,
                color: '#00FF41', letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}>
                LAUNCH YOUR TOKEN
              </span>
            </div>

            {/* Description */}
            <p style={{
              color: '#888', fontSize: 11,
              margin: '0 0 12px',
              fontFamily: "'Archivo Black', sans-serif",
              lineHeight: 1.6,
              letterSpacing: '0.02em',
            }}>
              Create your token and get your music onchain
            </p>

            {/* LAUNCH NOW button */}
            <button
              onClick={() => navigate('/create')}
              style={{
                width: '100%', height: 40,
                background: '#00FF41',
                color: '#000',
                fontWeight: 900, fontSize: 11,
                borderRadius: 50, border: 'none',
                cursor: 'pointer',
                fontFamily: "'Archivo Black', sans-serif",
                letterSpacing: '0.12em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 0 18px rgba(0, 255, 65, 0.4), 0 0 36px rgba(0, 255, 65, 0.15)',
              }}
            >
              LAUNCH NOW <span style={{ fontSize: 13, fontWeight: 900 }}>→</span>
            </button>
          </div>

          {/* TOP TRENDING */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 8, flexShrink: 0,
            }}>
              <span style={{
                color: '#00FF41', fontWeight: 800, fontSize: 13,
                fontFamily: "'Archivo Black', sans-serif",
              }}>
                HOT 100
              </span>
              <button
                onClick={() => navigate('/hot100')}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#00FF41', fontSize: 11, fontWeight: 600,
                  fontFamily: "'Archivo Black', sans-serif",
                }}
              >
                VIEW ALL
              </button>
            </div>

            {/* Trending items */}
            <div style={{ overflow: 'hidden', flex: 1 }}>
              {trendingSongs.map(({ song, price: p, change }, i) => {
                const d = detailsMap[song.id];
                const isPos = change != null ? change >= 0 : true;
                const sym = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$—';
                return (
                  <button
                    key={song.id}
                    onClick={() => navigate(`/song/${song.id}`)}
                    style={{
                      width: '100%', height: 54,
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '0 4px',
                      borderBottom: '1px solid rgba(0, 255, 65, 0.15)',
                      background: 'transparent', border: 'none',
                      borderBottomColor: 'rgba(0, 255, 65, 0.15)',
                      borderBottomWidth: 1,
                      borderBottomStyle: 'solid',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      minWidth: 20, textAlign: 'center',
                      color: '#fff', fontWeight: 700, fontSize: 14,
                      fontFamily: "'Archivo Black', sans-serif",
                    }}>
                      {i + 1}
                    </div>
                    {d?.coverImage ? (
                      <img src={d.coverImage} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 38, height: 38, borderRadius: 8, background: '#1a1a1a', flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: "'Archivo Black', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {sym}
                      </div>
                      <div style={{ color: '#888', fontSize: 9, fontFamily: "'Archivo Black', sans-serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d?.artist ?? '—'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 600, fontSize: 12, fontFamily: "'Inter', monospace" }}>
                        {p != null ? `$${p.toFixed(6)}` : '—'}
                      </div>
                      <div style={{ color: isPos ? '#00FF41' : '#ef4444', fontSize: 11, fontFamily: "'Inter', monospace" }}>
                        {change != null ? `${isPos ? '+' : ''}${change.toFixed(2)}%` : '—'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>{/* end three-column grid */}

      {/* ══════════════════════════════════════════════════════
          4) BELOW GRID: search bar (50%) + launch pill (50%)
      ══════════════════════════════════════════════════════ */}
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        display: 'flex', gap: 12,
        padding: '12px 16px',
        alignItems: 'center',
      }}>
        {/* Search bar — 50% */}
        <div style={{ flex: 1, position: 'relative' }} ref={searchRef}>
          <div style={{
            background: '#0C1510', border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: 50, height: 44, padding: '0 18px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Search size={16} color="#555" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
              onFocus={() => search && setShowDropdown(true)}
              placeholder="Search for songs, artists, or tokens…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: '#fff', fontSize: 13,
                fontFamily: "'Archivo Black', sans-serif",
                cursor: 'text',
                position: 'relative',
                zIndex: 10,
              }}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setShowDropdown(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
              >
                <span style={{ color: '#555', fontSize: 16 }}>×</span>
              </button>
            )}
          </div>

          {/* Search dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: '#0C1510', border: '1px solid rgba(0, 255, 65, 0.3)',
              borderRadius: 12, marginTop: 4,
              zIndex: 50, overflow: 'hidden',
            }}>
              {searchResults.map(s => {
                const d = detailsMap[s.id];
                return (
                  <button
                    key={s.id}
                    onClick={() => { navigate(`/song/${s.id}`); setShowDropdown(false); setSearch(''); }}
                    style={{
                      width: '100%', padding: '10px 14px',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      textAlign: 'left',
                    }}
                  >
                    {d?.coverImage ? (
                      <img src={d.coverImage} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: 6, background: '#1a1a1a', flexShrink: 0 }} />
                    )}
                    <div>
                      <div style={{ color: '#fff', fontSize: 11, fontWeight: 600, fontFamily: "'Archivo Black', sans-serif" }}>
                        {d?.title ?? s.name}
                      </div>
                      <div style={{ color: '#888', fontSize: 9, fontFamily: "'Archivo Black', sans-serif" }}>
                        {d?.artist ?? ''} · ${s.symbol}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* LAUNCH YOUR TOKEN pill — 50% */}
        <div style={{ flex: 1 }}>
          <button
            onClick={() => navigate('/create')}
            style={{
              width: '100%', height: 44,
              background: '#00FF41',
              borderRadius: 50, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 0 24px rgba(0, 255, 65, 0.4), 0 0 48px rgba(0, 255, 65, 0.15)',
            }}
          >
            <Rocket size={15} color="#1a2744" />
            <span style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 11, fontWeight: 900,
              color: '#1a2744', letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              LAUNCH YOUR TOKEN
            </span>
            <span style={{ color: '#1a2744', fontWeight: 900, fontSize: 14 }}>→</span>
          </button>
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes desktopTickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

export default LitHeroDesktop;
