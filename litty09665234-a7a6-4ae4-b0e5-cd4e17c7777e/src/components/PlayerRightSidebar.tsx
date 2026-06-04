import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Users, Share2 } from 'lucide-react';
import { usePlayer, PlayerSong } from '@/contexts/PlayerContext';
import EqualizerBars from '@/components/EqualizerBars';

const ACCENT = '#00FF41';

function formatDur(s?: number) {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

interface PlayerRightSidebarProps {
  upNext: PlayerSong[];
  onPlaySong: (index: number) => void;
}

export function PlayerRightSidebar({ upNext, onPlaySong }: PlayerRightSidebarProps) {
  const { currentSong, isPlaying } = usePlayer();

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* UP NEXT card */}
      <div
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 18px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: ACCENT,
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            Up Next
          </p>
          <button
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ padding: '0 8px 12px' }}>
          {upNext.length === 0 ? (
            <p style={{ padding: '16px', fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontFamily: "'Inter', sans-serif", margin: 0 }}>
              Queue is empty
            </p>
          ) : (
            upNext.slice(0, 6).map((song, i) => {
              const isActive = currentSong?.songId === song.songId;
              return (
                <button
                  key={song.songId}
                  onClick={() => onPlaySong(i)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '7px 10px',
                    borderRadius: 10,
                    background: isActive ? 'rgba(0,255,102,0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${isActive ? 'rgba(0,255,102,0.4)' : 'rgba(255,255,255,0.06)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {song.coverImage ? (
                      <img src={song.coverImage} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Music size={14} style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.2)' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link
                      to={`/song/${song.songId}`}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        display: 'block',
                        margin: 0,
                        fontSize: 12,
                        fontWeight: 600,
                        color: isActive ? ACCENT : 'rgba(255,255,255,0.85)',
                        fontFamily: "'Archivo Black', sans-serif",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        textDecoration: 'none',
                      }}
                    >
                      {song.title}
                    </Link>
                    <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                      {song.artist}
                    </p>
                  </div>
                  {song.duration && (
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', monospace", flexShrink: 0 }}>
                      {formatDur(song.duration)}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* FRIENDS ACTIVITY card */}
      <div
        style={{
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(20px)',
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: ACCENT,
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            Friends Activity
          </p>
          <Users size={13} style={{ color: 'rgba(255,255,255,0.3)' }} />
        </div>

        {/* Empty state — no real friends data yet */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 10,
            padding: '24px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(0, 255, 65, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={18} style={{ color: '#00FF41' }} />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.4,
              maxWidth: 180,
            }}
          >
            Invite friends to see what they're playing
          </p>
          <button
            onClick={() => {
              const url = typeof window !== 'undefined' ? window.location.origin : '';
              if (url) {
                navigator.clipboard.writeText(url).catch(() => {});
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 16px',
              borderRadius: 8,
              background: 'rgba(0, 255, 65, 0.1)',
              border: '1px solid rgba(0, 255, 65, 0.25)',
              color: '#00FF41',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 65, 0.18)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 255, 65, 0.4)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 65, 0.1)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0, 255, 65, 0.25)';
            }}
          >
            <Share2 size={13} />
            Share
          </button>
        </div>
      </div>
    </aside>
  );
}
