import React, { useRef, useState } from 'react';
import { BadgeCheck, Share2, Users, TrendingUp, TrendingDown, Music } from 'lucide-react';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { orbitronFont } from '@/theme';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import { useSongCandles } from '@/hooks/useSongCandles';

// ── Deterministic RNG (same as SongCard) ──
function makeRng(seed: number): () => number {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}
function strHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// ── Sparkline data generator ──
function generateSparkline(seed: number, points = 30): number[] {
  const rng = makeRng(seed);
  const data: number[] = [];
  let value = 0.002 + rng() * 0.003;
  for (let i = 0; i < points; i++) {
    const change = (rng() - 0.42) * 0.0012;
    value = Math.max(0.0005, value + change);
    data.push(value);
  }
  return data;
}

interface ViralSongCardProps {
  song: SongsResponse;
  details?: SongDetailsResponse | null;
  repostCount?: number;
  bondingProgress?: number;
  onShare?: () => void;
  onBuy?: () => void;
}

const ViralSongCard: React.FC<ViralSongCardProps> = ({
  song,
  details,
  repostCount = 0,
  bondingProgress = 0,
  onShare,
  onBuy,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const coverImage = details?.coverImage;
  const title = details?.title ?? song.name;
  const artist = details?.artist ?? 'Unknown Artist';
  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : null;

  const { priceUsdStr, priceSolStr } = usePumpFunPrice(song.mintAddress ?? null);
  const hasLivePrice = priceUsdStr !== '—' || priceSolStr !== '—';
  const priceDisplay = priceUsdStr !== '—' ? priceUsdStr : (priceSolStr !== '—' ? priceSolStr : '—');

  const { candles, loading: candlesLoading } = useSongCandles(song.mintAddress ?? null, '1h');
  const candleHistory = candles.length >= 2 ? candles.map(c => c.c) : undefined;

  // Deterministic values for sparkline only (not price)
  const rng = makeRng(strHash(song.id + '_price'));
  const priceChange = hasLivePrice ? (rng() * 40 - 12).toFixed(1) : '—';
  const isPositive = hasLivePrice ? parseFloat(priceChange) >= 0 : true;
  const holdersCount = Math.floor(rng() * 480 + 20);
  const cardNumber = `#${String(strHash(song.id) % 999 + 1).padStart(3, '0')}`;

  // Sparkline
  const sparklineData = candleHistory && candleHistory.length >= 2
    ? candleHistory
    : generateSparkline(strHash(song.id + '_spark'), 36);
  const sparkMin = Math.min(...sparklineData);
  const sparkMax = Math.max(...sparklineData);
  const sparkRange = Math.max(sparkMax - sparkMin, 0.0001);
  const sw = 300;
  const sh = 70;
  const sparkPoints = sparklineData.map((v, i) => {
    const x = (i / (sparklineData.length - 1)) * sw;
    const y = sh - 6 - ((v - sparkMin) / sparkRange) * (sh - 12);
    return `${x},${y}`;
  }).join(' ');

  const lastSparkX = sw;
  const lastSparkY = sh - 6 - ((sparklineData[sparklineData.length - 1] - sparkMin) / sparkRange) * (sh - 12);

  // Avatar colors for holder stack
  const avatarColors = ['#00FF66', '#00CC4D', '#00FF41', '#06b6d4', '#f59e0b', '#ef4444', '#ec4899'];

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: 380,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'linear-gradient(165deg, #0f130f 0%, #0d0d0d 50%, #0a0a0a 100%)',
        border: '1px solid #252525',
        boxShadow: isHovered
          ? '0 0 30px rgba(0,255,102,0.15), 0 0 60px rgba(0,255,102,0.06), 0 20px 60px rgba(0,0,0,0.6)'
          : '0 0 20px rgba(0,255,102,0.08), 0 12px 40px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.4s ease, transform 0.4s ease',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Green glow border effect */}
      <div
        style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 25,
          background: 'linear-gradient(135deg, rgba(0,255,102,0.25), transparent 40%, transparent 60%, rgba(0,255,102,0.12))',
          zIndex: 0,
          pointerEvents: 'none',
          opacity: isHovered ? 1 : 0.6,
          transition: 'opacity 0.4s ease',
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Top bar: Card number + Share ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px 8px' }}>
          <span
            style={{
              fontFamily: orbitronFont,
              fontSize: 10,
              fontWeight: 700,
              color: '#00FF66',
              letterSpacing: '0.12em',
              textShadow: '0 0 8px rgba(0,255,102,0.3)',
            }}
          >
            VIRAL CARD {cardNumber}
          </span>
          <button
            onClick={onShare}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '5px 8px',
              cursor: 'pointer',
              color: '#A1A1AA',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 9,
              fontWeight: 600,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#00FF66'; e.currentTarget.style.borderColor = 'rgba(0,255,102,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
          >
            <Share2 size={12} />
            Share
          </button>
        </div>

        {/* ── Cover Art Section ── */}
        <div style={{ padding: '0 16px', position: 'relative' }}>
          <div
            style={{
              width: '100%',
              aspectRatio: '16/10',
              borderRadius: 16,
              overflow: 'hidden',
              position: 'relative',
              background: '#1a1a1a',
            }}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt={title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.95)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(135deg, hsl(${strHash(song.id) % 360}, 60%, 15%), #0a0a0a)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Music size={48} style={{ color: 'rgba(255,255,255,0.15)' }} />
              </div>
            )}
            {/* Gradient overlay at bottom */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.4) 30%, transparent 60%)',
                pointerEvents: 'none',
              }}
            />
            {/* Title overlay on cover */}
            <div style={{ position: 'absolute', bottom: 12, left: 14, right: 14 }}>
              <h2
                style={{
                  fontFamily: orbitronFont,
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                  textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>{artist}</span>
                <BadgeCheck size={14} style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.5))' }} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Token Ticker + Price Row ── */}
        <div style={{ padding: '14px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {symbol && (
              <span
                style={{
                  fontFamily: orbitronFont,
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#00FF66',
                  background: 'rgba(0,255,102,0.1)',
                  border: '1px solid rgba(0,255,102,0.25)',
                  padding: '4px 10px',
                  borderRadius: 8,
                  letterSpacing: '0.08em',
                  textShadow: '0 0 8px rgba(0,255,102,0.3)',
                }}
              >
                {symbol}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontFamily: orbitronFont,
                fontSize: 20,
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                textShadow: '0 0 12px rgba(255,255,255,0.15)',
              }}
            >
              {priceDisplay}
            </span>
            <span
              style={{
                fontFamily: orbitronFont,
                fontSize: 11,
                fontWeight: 700,
                color: isPositive ? '#00FF66' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                textShadow: `0 0 8px ${isPositive ? 'rgba(0,255,102,0.4)' : 'rgba(239,68,68,0.4)'}`,
              }}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? '+' : ''}{priceChange}%
            </span>
          </div>
        </div>

        {/* ── Sparkline Chart ── */}
        <div style={{ padding: '4px 16px 8px' }}>
          {candlesLoading && (!candleHistory || candleHistory.length < 2) ? (
            <svg width="100%" viewBox={`0 0 ${sw} ${sh}`} style={{ display: 'block' }}>
              <rect x="0" y="0" width={sw} height={sh} rx="4" fill="rgba(255,255,255,0.03)" />
              <line x1="0" y1={sh / 2} x2={sw} y2={sh / 2} stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
          <svg width="100%" viewBox={`0 0 ${sw} ${sh}`} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id="sparklineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00FF66" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#00FF66" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="sparklineStroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#00CC4D" />
                <stop offset="100%" stopColor="#00FF66" />
              </linearGradient>
            </defs>
            {/* Fill area */}
            <polygon
              points={`0,${sh - 6} ${sparkPoints} ${sw},${sh - 6}`}
              fill="url(#sparklineGrad)"
            />
            {/* Line */}
            <polyline
              fill="none"
              stroke="url(#sparklineStroke)"
              strokeWidth="2"
              points={sparkPoints}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,255,102,0.4))' }}
            />
            {/* Endpoint dot */}
            <circle
              cx={lastSparkX}
              cy={lastSparkY}
              r="4"
              fill="#00FF66"
              style={{ filter: 'drop-shadow(0 0 6px rgba(0,255,102,0.6))' }}
            />
          </svg>
          )}
        </div>

        {/* ── Bonding Curve Progress ── */}
        <div style={{ padding: '4px 16px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 9, color: '#A1A1AA', fontWeight: 600, letterSpacing: '0.06em', fontFamily: orbitronFont }}>
              BONDING CURVE
            </span>
            <span style={{ fontSize: 10, color: '#00FF66', fontWeight: 700, fontFamily: orbitronFont }}>
              {bondingProgress.toFixed(1)}%
            </span>
          </div>
          <div
            style={{
              height: 6,
              background: 'rgba(0,255,102,0.08)',
              borderRadius: 3,
              overflow: 'hidden',
              border: '1px solid rgba(0,255,102,0.15)',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, bondingProgress)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00CC4D, #00FF66)',
                borderRadius: 3,
                boxShadow: '0 0 8px rgba(0,255,102,0.4)',
                transition: 'width 1s ease-out',
              }}
            />
          </div>
        </div>

        {/* ── Own This Song CTA ── */}
        <div style={{ padding: '6px 16px 10px' }}>
          <button
            onClick={onBuy}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 14,
              border: 'none',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, #00FF66 0%, #00CC4D 100%)',
              color: '#000000',
              fontFamily: orbitronFont,
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: '0.1em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 0 20px rgba(0,255,102,0.35), 0 0 40px rgba(0,255,102,0.12), inset 0 1px 0 rgba(255,255,255,0.3)',
              transition: 'all 0.25s ease',
              transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0,255,102,0.55), 0 0 60px rgba(0,255,102,0.2), inset 0 1px 0 rgba(255,255,255,0.35)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 0 20px rgba(0,255,102,0.35), 0 0 40px rgba(0,255,102,0.12), inset 0 1px 0 rgba(255,255,255,0.3)';
            }}
          >
            OWN THIS SONG
          </button>
        </div>

        {/* ── Footer: Holders + Reposts ── */}
        <div
          style={{
            padding: '10px 16px 14px',
            borderTop: '1px solid #252525',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Holder avatar stack */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', marginRight: -6 }}>
              {avatarColors.slice(0, 4).map((color, i) => (
                <div
                  key={i}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${color}, ${color}88)`,
                    border: '2px solid #0f130f',
                    marginLeft: i > 0 ? -8 : 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#000',
                    zIndex: 4 - i,
                    position: 'relative',
                  }}
                >
                  {String.fromCharCode(65 + i)}
                </div>
              ))}
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#1a1a1a',
                  border: '2px solid #252525',
                  marginLeft: -8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 8,
                  color: '#A1A1AA',
                  position: 'relative',
                  zIndex: 0,
                }}
              >
                +{holdersCount - 4}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Users size={12} style={{ color: '#A1A1AA' }} />
              <span style={{ fontSize: 11, color: '#A1A1AA', fontWeight: 600 }}>
                {holdersCount} holders
              </span>
            </div>
          </div>

          {/* Repost count */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 8,
              background: 'rgba(0,255,102,0.06)',
              border: '1px solid rgba(0,255,102,0.15)',
            }}
          >
            <Share2 size={11} style={{ color: '#00FF66' }} />
            <span style={{ fontSize: 10, color: '#00FF66', fontWeight: 700, fontFamily: orbitronFont }}>
              {repostCount} Cher{repostCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViralSongCard;
