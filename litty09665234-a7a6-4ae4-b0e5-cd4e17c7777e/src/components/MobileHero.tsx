/**
 * MobileHero — mobile hero section (< 768px).
 * Reuses the same data logic as LitHeroDesktop: price chart, carousel, ticker,
 * search, trending, play controls, and action buttons.
 *
 * Layout:
 * 1) Brand bar (logo | tagline | icons)
 * 2) Live ticker strip
 * 3) Two-column hero panel (price chart | latest drop) inside single rounded card
 * 4) ADD TO PLAYLIST button
 * 5) LAUNCH YOUR TOKEN button
 * 6) Search bar
 * 7) TOP TRENDING list
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Settings, ChevronLeft, ChevronRight,
  Shuffle, SkipBack, Play, Pause, SkipForward, Repeat,
  Search, ListMusic,
} from 'lucide-react';
import { toast } from 'sonner';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import { useTimeTab, TimeTab } from '@/contexts/TimeTabContext';

const LOGO_URL =
  'https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69ddd0df21f73302c16fe6fd';

const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';

// ─── LiveSparkline ─────────────────────────────────────────────────────────────
const LiveSparkline: React.FC<{ history: number[]; positive: boolean; width?: number; height?: number; showAxes?: boolean }> = ({
  history,
  positive,
  width = 200,
  height = 80,
  showAxes = false,
}) => {
  const color = positive ? PRIMARY_GREEN : '#EF4444';
  const points = history.length >= 2 ? history : [...history, ...Array(Math.max(0, 2 - history.length)).fill(history[0] ?? 0)];

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = Math.max(max - min, 0.000001);

  const chartH = showAxes ? height - 14 : height;
  const chartW = showAxes ? width - 16 : width;
  const offsetX = showAxes ? 14 : 0;
  const offsetY = showAxes ? 0 : 0;

  const pathPoints = points.map((p, i) => {
    const x = offsetX + (i / (points.length - 1)) * chartW;
    const y = offsetY + chartH - ((p - min) / range) * (chartH * 0.85) - chartH * 0.05;
    return `${x},${y}`;
  });

  const linePath = `M ${pathPoints.join(' L ')}`;
  const fillPath = `${linePath} L ${offsetX + chartW},${offsetY + chartH} L ${offsetX},${offsetY + chartH} Z`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sparkGradMob_${showAxes ? 'ax' : 'no'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#sparkGradMob_${showAxes ? 'ax' : 'no'})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.length > 0 && (() => {
        const lastX = offsetX + chartW;
        const lastY = offsetY + chartH - ((points[points.length - 1] - min) / range) * (chartH * 0.85) - chartH * 0.05;
        return (
          <circle cx={lastX} cy={lastY} r="3" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        );
      })()}

      {showAxes && (
        <>
          {/* Y-axis labels */}
          <text x={2} y={offsetY + 6} fill="#555" fontSize="6" fontFamily="'Inter', monospace">H</text>
          <text x={4} y={offsetY + chartH / 2 + 2} fill="#555" fontSize="6" fontFamily="'Inter', monospace">M</text>
          <text x={6} y={offsetY + chartH - 2} fill="#555" fontSize="6" fontFamily="'Inter', monospace">L</text>
          {/* X-axis labels */}
          <text x={offsetX + 2} y={height - 2} fill="#555" fontSize="6" fontFamily="'Inter', monospace">1m</text>
          <text x={offsetX + chartW - 16} y={height - 2} fill="#555" fontSize="6" fontFamily="'Inter', monospace">NOW</text>
        </>
      )}
    </svg>
  );
};

// ─── Props ──────────────────────────────────────────────────────────────────────
interface MobileHeroProps {
  songs: SongsResponse[];
  detailsMap: Record<string, SongDetailsResponse>;
  carouselIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isPlaying: boolean;
  onTogglePlay: (songId: string) => void;
  onAddToPlaylist?: (songId: string) => void;
}

const MobileHero: React.FC<MobileHeroProps> = ({
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
  const { activeTab, setActiveTab } = useTimeTab();

  // Ticker timer
  const [timerSecs, setTimerSecs] = useState(6);
  useEffect(() => {
    const t = setInterval(() => setTimerSecs(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const fmtTimer = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

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

  // Symbol directly from song metadata — never fabricated
  const symbol = featuredSong?.symbol
    ? (featuredSong.symbol.startsWith('$') ? featuredSong.symbol : `$${featuredSong.symbol}`)
    : '$—';

  // Live price from pump.fun — real bonding-curve data, never fabricated
  const pumpFunPrice = usePumpFunPrice(featuredSong?.mintAddress ?? null);

  // Accumulate price history for sparkline
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  useEffect(() => {
    setPriceHistory([]);
  }, [featuredSong?.id]);

  useEffect(() => {
    if (pumpFunPrice.priceUsd != null) {
      setPriceHistory(prev => {
        const next = [...prev, pumpFunPrice.priceUsd!];
        return next.length > 30 ? next.slice(next.length - 30) : next;
      });
    }
  }, [pumpFunPrice.priceUsd]);

  const price = pumpFunPrice.priceUsd != null ? pumpFunPrice.priceUsdStr : '—';
  const firstPrice = priceHistory.length > 0 ? priceHistory[0] : null;
  const lastPrice = priceHistory.length > 0 ? priceHistory[priceHistory.length - 1] : null;
  const change24h = firstPrice != null && lastPrice != null && firstPrice > 0
    ? ((lastPrice - firstPrice) / firstPrice) * 100
    : null;
  const priceChange = change24h != null
    ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%`
    : '—';
  const priceIsPositive = change24h != null ? change24h >= 0 : true;
  const liveHistory = priceHistory;

  // No real ATH source available — never show fabricated data
  const athVal = '—';

  const coverImage = featuredDetails?.coverImage ?? null;
  const title = featuredDetails?.title ?? featuredSong?.name ?? 'UNTITLED';
  const artist = featuredDetails?.artist ?? '—';

  // Top ticker song
  const topSong = songs.length > 0 ? songs[0] : null;
  const topSymbol = topSong?.symbol ?? 'TOKEN';
  const topChangeStr = '—';

  // Top 5 by volume — songs array is already sorted by buy/sell volume from parent
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
      className="md:hidden w-full relative"
      style={{
        background: '#000000',
        fontFamily: "'Archivo Black', sans-serif",
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8px)',
      }}
    >
      {/* ══════════════════════════════════════════════════════
          1) BRAND BAR
      ══════════════════════════════════════════════════════ */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <img src={LOGO_URL} alt="Lit Studio" style={{ width: 56, height: 'auto', objectFit: 'contain', flexShrink: 0 }} />
        <span style={{
          fontSize: 8,
          fontWeight: 700,
          color: '#00FF41',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          textAlign: 'center',
          flex: 1,
          padding: '0 8px',
        }}>
          STREAMS BECOME YOURS
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <Bell size={16} color="#fff" />
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: 5, height: 5, borderRadius: '50%',
              background: '#00FF41', border: '1px solid #050D05',
            }} />
          </div>
          <Settings size={16} color="#fff" />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          2) LIVE TICKER STRIP
      ══════════════════════════════════════════════════════ */}
      <div style={{
        background: '#0A1A0A',
        padding: '6px 12px',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', minWidth: 0 }}>
          <span style={{
            background: '#00FF41', color: '#000',
            fontSize: 8, fontWeight: 900,
            padding: '2px 8px', borderRadius: 20,
            marginRight: 8, flexShrink: 0,
          }}>
            LIVE
          </span>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{
              whiteSpace: 'nowrap',
              fontSize: 11,
              color: '#fff',
              fontFamily: "'Inter', monospace",
              animation: 'mobileTickerScroll 14s linear infinite',
              display: 'inline-block',
            }}>
              ${topSymbol} surges {topChangeStr} in the last 24h &nbsp;&nbsp;&nbsp; ${topSymbol} surges {topChangeStr} in the last 24h &nbsp;&nbsp;&nbsp; ${topSymbol} surges {topChangeStr} in the last 24h
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, marginLeft: 6 }}>
          <span style={{ color: '#fff', fontSize: 8, fontFamily: "'Inter', monospace", fontWeight: 600 }}>${topSymbol}</span>
          <span style={{ color: '#888', fontSize: 8 }}>⏱</span>
          <span style={{ color: '#fff', fontSize: 8, fontFamily: "'Inter', monospace" }}>{fmtTimer(timerSecs)}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          3) TWO-COLUMN HERO PANEL (edge-to-edge)
      ══════════════════════════════════════════════════════ */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: 340,
          overflow: 'hidden',
        }}
      >
          {/* ── LEFT COLUMN: Price chart (~45%) ── */}
          <div
            style={{
              flex: '0 0 45%',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ fontSize: 8, color: HEADLINE_GREEN, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 3 }}>
              {symbol} PRICE
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1, marginBottom: 3, fontFamily: "'Inter', monospace" }}>
              {price}
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700,
              color: priceIsPositive ? PRIMARY_GREEN : '#ef4444',
              marginBottom: 6,
              fontFamily: "'Inter', monospace",
            }}>
              ({priceChange})
            </div>

            {/* Chart */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {(() => {
                if (liveHistory.length >= 2) {
                  return <LiveSparkline history={liveHistory} positive={priceIsPositive} width={200} height={120} showAxes />;
                }
                return <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ color: '#555', fontSize: 10, fontFamily: "'Inter', monospace" }}>—</span></div>;
              })()}
            </div>

            {/* Time tabs */}
            <div style={{ display: 'flex', gap: 2, marginTop: 6, flexWrap: 'nowrap', justifyContent: 'space-between' }}>
              {(['1H', '1D', '1W', '1M', '1Y'] as TimeTab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontSize: 7, padding: '3px 5px',
                    borderRadius: 4, border: 'none', cursor: 'pointer',
                    background: activeTab === tab ? '#00FF41' : 'transparent',
                    color: activeTab === tab ? '#000' : '#555',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                    fontWeight: activeTab === tab ? 800 : 600,
                    fontFamily: "'Archivo Black', sans-serif",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* ── RIGHT COLUMN: LATEST DROP card (~55%) ── */}
          <div style={{
            flex: '0 0 55%',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {coverImage ? (
              <img src={coverImage} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />
            ) : (
              <div style={{ position: 'absolute', inset: 0, zIndex: 0, background: 'linear-gradient(145deg, #0a1e12, #050f0a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '4rem', opacity: 0.15 }}>♫</span>
              </div>
            )}

            {/* Bottom gradient overlay */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '78%', zIndex: 1,
              background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0.2) 70%, transparent 100%)',
              pointerEvents: 'none',
            }} />

            {/* LATEST DROP badge */}
            <div style={{
              position: 'absolute', top: 8, left: 8, zIndex: 2,
              background: '#00FF41', color: '#000',
              fontSize: 8, fontWeight: 900,
              padding: '3px 8px', borderRadius: 20,
              letterSpacing: '0.05em',
            }}>
              LATEST DROP
            </div>

            {/* Carousel dots */}
            <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', gap: 3, alignItems: 'center' }}>
              {Array.from({ length: dotCount }).map((_, i) => (
                <div key={i} style={{
                  width: i === activeDot ? 14 : 5,
                  height: 5,
                  borderRadius: i === activeDot ? 3 : '50%',
                  background: i === activeDot ? '#00FF41' : '#444',
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>

            {/* Arrows */}
            <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{
              position: 'absolute', left: 2, top: '35%', transform: 'translateY(-50%)', zIndex: 3,
              background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
              padding: 5, borderRadius: '50%',
            }}>
              <ChevronLeft size={16} color="#fff" />
            </button>
            <button onClick={e => { e.stopPropagation(); onNext(); }} style={{
              position: 'absolute', right: 2, top: '35%', transform: 'translateY(-50%)', zIndex: 3,
              background: 'rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
              padding: 5, borderRadius: '50%',
            }}>
              <ChevronRight size={16} color="#fff" />
            </button>

            {/* Bottom content */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2, padding: '10px 10px' }}>
              {/* Artist */}
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
                {artist}
              </div>
              {/* Title */}
              <div style={{
                fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 6,
                lineHeight: 1.1, overflow: 'hidden', display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
              } as React.CSSProperties}>
                {title}
              </div>

              {/* Playback controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 10 }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                  <Shuffle size={12} color="rgba(255,255,255,0.5)" />
                </button>
                <button onClick={e => { e.stopPropagation(); onPrev(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                  <SkipBack size={14} color="#fff" fill="#fff" />
                </button>
                <button onClick={e => { e.stopPropagation(); handlePlayToggle(); }} style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: '#00FF41', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(0, 255, 65, 0.5)',
                  flexShrink: 0,
                }}>
                  {isPlaying
                    ? <Pause size={16} color="#fff" fill="#fff" />
                    : <Play size={16} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                  }
                </button>
                <button onClick={e => { e.stopPropagation(); onNext(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                  <SkipForward size={14} color="#fff" fill="#fff" />
                </button>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 3 }}>
                  <Repeat size={12} color="rgba(255,255,255,0.5)" />
                </button>
              </div>

              {/* Bottom info strip: price | ATH | BUY */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                background: 'rgba(0,0,0,0.5)',
                borderRadius: 10,
                padding: '6px 10px',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div>
                  <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{symbol}</div>
                  <div style={{ fontSize: 10, color: '#fff', fontWeight: 700, fontFamily: "'Inter', monospace" }}>{price}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>ATH</div>
                  <div style={{ fontSize: 10, color: PRIMARY_GREEN, fontWeight: 700, fontFamily: "'Inter', monospace" }}>{athVal}</div>
                </div>
                <button onClick={() => featuredSong && navigate(`/song/${featuredSong.id}`)} style={{
                  background: '#00FF41', color: '#000',
                  fontWeight: 900, fontSize: 11, padding: '6px 14px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', flexShrink: 0,
                  fontFamily: "'Archivo Black', sans-serif",
                }}>
                  BUY
                </button>
              </div>
            </div>
          </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          4) ADD TO PLAYLIST (full width)
      ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '6px 8px' }}>
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
            width: '100%', height: 40,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 50,
            color: '#fff',
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontFamily: "'Archivo Black', sans-serif",
          }}
        >
          <span style={{ fontSize: 14, opacity: 0.7 }}>&#8801;</span>
          ADD TO PLAYLIST
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          5) LAUNCH YOUR TOKEN (full width)
      ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 8px 10px' }}>
        <button
          onClick={() => navigate('/create')}
          style={{
            width: '100%', height: 48,
            background: '#00FF41',
            borderRadius: 50,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.35)',
          }}
        >
          <span style={{ fontSize: 16 }}>&#128640;</span>
          <span style={{ fontWeight: 900, fontSize: 12, color: '#000', letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: "'Archivo Black', sans-serif" }}>
            LAUNCH YOUR TOKEN
          </span>
          <span style={{ color: '#000', fontWeight: 900, fontSize: 14 }}>&rarr;</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          6) SEARCH BAR
      ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 8px 10px', position: 'relative' }} ref={searchRef}>
        <div style={{
          background: '#0C1510',
          border: '1px solid rgba(0, 255, 65, 0.25)',
          borderRadius: 50,
          height: 40,
          padding: '0 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Search size={14} color="#555" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => search && setShowDropdown(true)}
            placeholder="Search for songs, artists, or tokens..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#fff',
              fontSize: 12,
              cursor: 'text',
              position: 'relative',
              zIndex: 10,
              fontFamily: "'Archivo Black', sans-serif",
            }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setShowDropdown(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <span style={{ color: '#555', fontSize: 14 }}>&#x2715;</span>
            </button>
          )}
        </div>

        {/* Search dropdown */}
        {showDropdown && searchResults.length > 0 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#0C1510', border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: 12, marginTop: 4, zIndex: 50, overflow: 'hidden',
          }}>
            {searchResults.map(s => {
              const d = detailsMap[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => { navigate(`/song/${s.id}`); setShowDropdown(false); setSearch(''); }}
                  style={{
                    width: '100%', padding: '8px 12px',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    textAlign: 'left',
                  }}
                >
                  {d?.coverImage ? (
                    <img src={d.coverImage} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 30, height: 30, borderRadius: 6, background: '#1a1a1a', flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ color: '#fff', fontSize: 10, fontWeight: 600, fontFamily: "'Archivo Black', sans-serif" }}>
                      {d?.title ?? s.name}
                    </div>
                    <div style={{ color: '#888', fontSize: 8, fontFamily: "'Archivo Black', sans-serif" }}>
                      {d?.artist ?? ''} &middot; ${s.symbol}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          7) TOP TRENDING
      ══════════════════════════════════════════════════════ */}
      <div style={{ padding: '0 8px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ color: '#00FF41', fontWeight: 800, fontSize: 11, fontFamily: "'Archivo Black', sans-serif" }}>
            HOT 100
          </span>
          <button
            onClick={() => navigate('/hot100')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: HEADLINE_GREEN, fontSize: 9, fontWeight: 600, fontFamily: "'Archivo Black', sans-serif" }}
          >
            VIEW ALL
          </button>
        </div>

        <div>
          {trendingSongs.map(({ song, price: p, change }, i) => {
            const d = detailsMap[song.id];
            const isPos = change != null ? change >= 0 : true;
            const sym = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$—';
            return (
              <button
                key={song.id}
                onClick={() => navigate(`/song/${song.id}`)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid rgba(0, 255, 65, 0.12)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ minWidth: 18, textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 12, fontFamily: "'Archivo Black', sans-serif" }}>
                  {i + 1}
                </div>
                {d?.coverImage ? (
                  <img src={d.coverImage} alt="" style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 34, height: 34, borderRadius: 6, background: '#1a1a1a', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Archivo Black', sans-serif" }}>
                    {sym}
                  </div>
                  <div style={{ color: '#888', fontSize: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Archivo Black', sans-serif" }}>
                    {d?.artist ?? '—'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 10, fontFamily: "'Inter', monospace" }}>
                    {p != null ? `$${p.toFixed(6)}` : '—'}
                  </div>
                  <div style={{ color: isPos ? '#00FF41' : '#ef4444', fontSize: 9, fontFamily: "'Inter', monospace" }}>
                    {change != null ? `${isPos ? '+' : ''}${change.toFixed(2)}%` : '—'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes mobileTickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
};

export default MobileHero;
