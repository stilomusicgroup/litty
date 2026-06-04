import React from 'react';
import { SkipBack, SkipForward, Play, ExternalLink } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HeroState = 'idle' | 'active' | 'metadata' | 'tokenomics' | 'minted';

interface LaunchHeroCardProps {
  state: HeroState;
  coverPreview: string | null;
  trackTitle: string;
  artistName: string;
  genre: string;
  ticker: string;
  duration: string;
  disabled?: boolean;
  onCoverClick?: () => void;
}

// ─── Waveform Bars ────────────────────────────────────────────────────────────

const HEIGHTS = [18, 32, 45, 28, 52, 38, 62, 41, 55, 35, 48, 29, 57, 44, 31, 66, 40, 53, 27, 47, 60, 36, 43, 58, 34, 50, 39, 63, 25, 55, 42, 48, 33, 61, 37, 52, 46, 29, 57, 44, 38, 64, 31, 49, 56, 41, 27, 60, 35, 53];

const WaveformBars: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '52px', width: '100%', overflow: 'hidden' }}>
    {HEIGHTS.map((h, i) => (
      <div
        key={i}
        style={{
          flex: '1 0 0',
          height: `${h}%`,
          borderRadius: '2px 2px 0 0',
          background: isActive
            ? `#00FF66`
            : 'rgba(0,255,102,0.12)',
          opacity: isActive ? (0.4 + (h / 66) * 0.6) : 1,
          animation: isActive ? `waveBar${(i % 5) + 1} ${1.2 + (i % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
          transition: 'background 500ms ease, opacity 500ms ease',
        }}
      />
    ))}
  </div>
);

// ─── Token sparkline SVG (gray placeholder for pre-launch preview) ────────────

const TokenSparkline: React.FC = () => (
  <svg width="100%" height="48" viewBox="0 0 200 48" preserveAspectRatio="none" style={{ display: 'block' }}>
    <line x1="0" y1="24" x2="200" y2="24" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const LaunchHeroCard: React.FC<LaunchHeroCardProps> = ({
  state,
  coverPreview,
  trackTitle,
  artistName,
  ticker,
  duration,
  disabled,
  onCoverClick,
}) => {
  const isActive = state !== 'idle';
  const hasMetadata = state === 'metadata' || state === 'tokenomics' || state === 'minted';
  const hasTokenomics = state === 'tokenomics' || state === 'minted';

  const displayTicker = hasTokenomics && ticker ? ticker : '----';
  const displayTitle = hasMetadata && trackTitle ? trackTitle : 'UNTITLED TRACK';
  const displayArtist = hasMetadata && artistName ? artistName.toUpperCase() : 'UNKNOWN ARTIST';

  return (
    <>
      <style>{`
        @keyframes pulseGreen {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes waveBar1 { from { height: 30%; } to { height: 75%; } }
        @keyframes waveBar2 { from { height: 40%; } to { height: 60%; } }
        @keyframes waveBar3 { from { height: 25%; } to { height: 80%; } }
        @keyframes waveBar4 { from { height: 45%; } to { height: 65%; } }
        @keyframes waveBar5 { from { height: 20%; } to { height: 70%; } }
        @media (max-width: 900px) {
          .hero-card-fh-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div
        style={{
          background: '#0f130f',
          border: `1px solid ${isActive ? 'rgba(0,255,102,0.25)' : '#252525'}`,
          borderRadius: '12px',
          padding: '20px',
          transition: 'border-color 400ms ease',
          boxShadow: isActive ? '0 0 40px rgba(0,255,102,0.06)' : 'none',
        }}
      >
        <div
          className="hero-card-fh-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 220px',
            gap: '20px',
            alignItems: 'stretch',
          }}
        >
          {/* ── Col 1: Cover art ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              onClick={!disabled ? onCoverClick : undefined}
              style={{
                width: '100%',
                aspectRatio: '1',
                borderRadius: '8px',
                overflow: 'hidden',
                cursor: onCoverClick && !disabled ? 'pointer' : 'default',
                background: '#0A0A0A',
                border: `1px solid ${isActive ? 'rgba(0,255,102,0.3)' : '#252525'}`,
                transition: 'border-color 400ms ease',
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {coverPreview ? (
                <img
                  src={coverPreview}
                  alt="Cover"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'column', gap: '8px',
                }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="rgba(0,255,102,0.15)" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10"/>
                    <circle cx="12" cy="12" r="3"/>
                    <line x1="12" y1="2" x2="12" y2="5"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif", fontSize: '7px',
                    color: 'rgba(0,255,102,0.2)', letterSpacing: '0.15em',
                  }}>NO COVER</span>
                </div>
              )}

              {/* AUDIO UPLOADED chip — top left */}
              {isActive && (
                <div style={{
                  position: 'absolute', top: '8px', left: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(0,255,102,0.4)',
                  borderRadius: '4px',
                  padding: '3px 7px',
                  display: 'flex', alignItems: 'center', gap: '5px',
                }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%', background: '#00FF66',
                    animation: 'pulseGreen 1.8s ease-in-out infinite', flexShrink: 0,
                  }} />
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif", fontSize: '8px', fontWeight: 700,
                    color: '#00FF66', letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>AUDIO UPLOADED</span>
                </div>
              )}

              {/* Album title bottom overlay */}
              {hasMetadata && trackTitle && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
                  padding: '20px 8px 8px',
                }}>
                  <div style={{
                    fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', fontWeight: 700,
                    color: '#FFFFFF', letterSpacing: '0.06em', textTransform: 'uppercase',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {trackTitle}
                  </div>
                </div>
              )}
            </div>

            {/* File info */}
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: '11px', color: '#A1A1AA' }}>
              {duration ? `${duration} · MP3` : 'MP3 · 44.1kHz'}
            </div>
          </div>

          {/* ── Col 2: Waveform + Title + Controls ── */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px', minWidth: 0 }}>
            {/* Track title + artist */}
            <div>
              <h2 style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: 'clamp(18px, 2.2vw, 32px)',
                fontWeight: 900,
                color: hasMetadata ? '#FFFFFF' : 'rgba(255,255,255,0.12)',
                margin: '0 0 5px',
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
                transition: 'color 400ms ease',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {displayTitle}
              </h2>
              <div style={{
                fontFamily: "'Archivo Black', sans-serif", fontSize: '12px', fontWeight: 700,
                color: hasMetadata ? '#A1A1AA' : 'rgba(161,161,170,0.2)',
                transition: 'color 400ms ease',
                letterSpacing: '0.08em',
              }}>
                {displayArtist}
              </div>
            </div>

            {/* Waveform */}
            <div style={{ flex: 1, minHeight: '52px', position: 'relative' }}>
              <WaveformBars isActive={isActive} />
              {/* Duration label */}
              <div style={{
                textAlign: 'right',
                fontFamily: "'Inter', monospace", fontSize: '10px', color: '#A1A1AA',
                marginTop: '4px',
              }}>
                {duration || '0:00'}
              </div>
            </div>

            {/* Playback controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button type="button" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#252525', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'background 200ms ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#333'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#252525'; }}
              >
                <SkipBack size={13} style={{ color: '#00FF66' }} />
              </button>

              <button type="button" style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: isActive ? '#00FF66' : '#252525',
                border: `1px solid ${isActive ? '#00FF66' : '#252525'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0,
                boxShadow: isActive ? '0 0 20px rgba(0,255,102,0.4)' : 'none',
                transition: 'all 300ms ease',
              }}>
                <Play size={16} fill={isActive ? '#000' : '#666'} style={{ color: isActive ? '#000' : '#666', marginLeft: '2px' }} />
              </button>

              <button type="button" style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#252525', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', flexShrink: 0, transition: 'background 200ms ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#333'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#252525'; }}
              >
                <SkipForward size={13} style={{ color: '#00FF66' }} />
              </button>

              <button
                type="button"
                style={{
                  marginLeft: 'auto',
                  display: 'flex', alignItems: 'center', gap: '5px',
                  background: 'transparent',
                  border: '1px solid #252525',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  color: '#A1A1AA',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '11px',
                  letterSpacing: '0.04em',
                  transition: 'border-color 180ms ease, color 180ms ease',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#00FF66';
                  (e.currentTarget as HTMLElement).style.color = '#00FF66';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = '#252525';
                  (e.currentTarget as HTMLElement).style.color = '#A1A1AA';
                }}
              >
                <ExternalLink size={10} />
                PREVIEW
              </button>
            </div>
          </div>

          {/* ── Col 3: Token Preview Panel ── */}
          <div style={{
            background: '#0A0A0A',
            border: `1px solid ${hasTokenomics ? 'rgba(0,255,102,0.3)' : '#252525'}`,
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            transition: 'border-color 400ms ease',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{
                fontFamily: "'Archivo Black', sans-serif", fontSize: '9px', fontWeight: 700,
                color: '#A1A1AA', letterSpacing: '0.15em', textTransform: 'uppercase',
              }}>
                TOKEN PREVIEW (TEST)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{
                  width: '5px', height: '5px', borderRadius: '50%', background: '#00FF66',
                  animation: 'pulseGreen 1.8s ease-in-out infinite', flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: '8px', color: '#00FF66',
                  letterSpacing: '0.1em', fontWeight: 700,
                }}>LIVE</span>
              </div>
            </div>

            {/* Token symbol large */}
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '24px', fontWeight: 900,
              color: hasTokenomics ? '#00FF66' : 'rgba(0,255,102,0.15)',
              letterSpacing: '-0.02em',
              transition: 'color 400ms ease',
            }}>
              ${displayTicker}
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#252525' }} />

            {/* Price line */}
            <div>
              <div style={{
                fontFamily: "'Archivo Black', sans-serif", fontSize: '9px', color: '#A1A1AA',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3px',
              }}>PRICE (TEST)</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{
                  fontFamily: "'Inter', monospace", fontSize: '15px', fontWeight: 700,
                  color: hasTokenomics ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                  transition: 'color 400ms ease',
                }}>
                  {hasTokenomics ? '$0.000420' : '------'}
                </span>
                <span style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: '11px', fontWeight: 700,
                  color: hasTokenomics ? '#00FF66' : 'rgba(0,255,102,0.1)',
                  transition: 'color 400ms ease',
                }}>
                  {hasTokenomics ? '+12.40%' : '----'}
                </span>
              </div>
            </div>

            {/* Market cap + Holders */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: '8px', color: '#A1A1AA',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px',
                }}>MCAP</div>
                <div style={{
                  fontFamily: "'Inter', monospace", fontSize: '12px', fontWeight: 700,
                  color: hasTokenomics ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                  transition: 'color 400ms ease',
                }}>
                  {hasTokenomics ? '$4.2K' : '—'}
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: '8px', color: '#A1A1AA',
                  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2px',
                }}>HOLDERS</div>
                <div style={{
                  fontFamily: "'Inter', monospace", fontSize: '12px', fontWeight: 700,
                  color: hasTokenomics ? '#FFFFFF' : 'rgba(255,255,255,0.1)',
                  transition: 'color 400ms ease',
                }}>
                  {hasTokenomics ? '1' : '—'}
                </div>
              </div>
            </div>

            {/* Sparkline */}
            <div style={{
              borderRadius: '4px', overflow: 'hidden',
              opacity: hasTokenomics ? 1 : 0.1,
              transition: 'opacity 400ms ease',
            }}>
              <TokenSparkline />
            </div>

            {/* View bonding curve button */}
            <button
              type="button"
              style={{
                width: '100%', height: '34px',
                background: 'transparent',
                border: '1px solid #252525',
                borderRadius: '6px',
                color: '#FFFFFF',
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'border-color 180ms ease, color 180ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#00FF66';
                (e.currentTarget as HTMLElement).style.color = '#00FF66';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = '#252525';
                (e.currentTarget as HTMLElement).style.color = '#FFFFFF';
              }}
            >
              VIEW BONDING CURVE
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default LaunchHeroCard;
