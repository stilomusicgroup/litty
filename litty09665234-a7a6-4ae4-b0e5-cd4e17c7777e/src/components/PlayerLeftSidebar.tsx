import React, { useState, useCallback, useEffect } from 'react';
import {
  ListMusic, Heart, Disc3, Users, History, Download, Plus, Upload, CheckCircle2,
} from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';

const ACCENT = '#00FF41';

interface NavItem {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  id: string;
}

const NAV_ITEMS: NavItem[] = [
  { icon: ListMusic, label: 'Playlists', id: 'playlists' },
  { icon: Heart, label: 'Liked Songs', id: 'liked' },
  { icon: Disc3, label: 'Albums', id: 'albums' },
  { icon: Users, label: 'Artists', id: 'artists' },
  { icon: History, label: 'History', id: 'history' },
  { icon: Download, label: 'Downloads', id: 'downloads' },
];

const CUSTOM_PLAYLISTS_KEY = 'lit_custom_playlists';

interface CustomPlaylist {
  id: string;
  name: string;
  tracks: number;
}

interface PlayerLeftSidebarProps {
  activePlaylist: string;
  onSelectPlaylist: (id: string) => void;
}

export function PlayerLeftSidebar({ activePlaylist, onSelectPlaylist }: PlayerLeftSidebarProps) {
  const [activeNav, setActiveNav] = useState('playlists');
  const { currentSong } = usePlayer();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [customPlaylists, setCustomPlaylists] = useState<CustomPlaylist[]>(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_PLAYLISTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CUSTOM_PLAYLISTS_KEY, JSON.stringify(customPlaylists));
    } catch {
      // ignore
    }
  }, [customPlaylists]);

  const handleCreated = useCallback((playlistId: string, name: string) => {
    setCustomPlaylists((prev) => [...prev, { id: playlistId, name, tracks: 0 }]);
    onSelectPlaylist(playlistId);
  }, [onSelectPlaylist]);

  const allPlaylists = customPlaylists.map((pl) => ({ ...pl, active: activePlaylist === pl.id }));

  return (
    <aside
      style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        height: '100%',
      }}
    >
      {/* Your Library header */}
      <div style={{ padding: '0 0 16px' }}>
        <p
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: ACCENT,
            margin: 0,
            fontFamily: "'Archivo Black', sans-serif",
          }}
        >
          Your Library
        </p>
      </div>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 24 }}>
        {NAV_ITEMS.map(({ icon: Icon, label, id }) => {
          const isActive = activeNav === id;
          return (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                background: isActive ? 'rgba(0, 255, 65, 0.08)' : 'transparent',
                border: 'none',
                borderLeft: isActive ? `2px solid ${ACCENT}` : '2px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                width: '100%',
              }}
            >
              <Icon size={15} style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.45)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Playlists section */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: ACCENT,
              margin: 0,
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            Playlists
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)',
              padding: 2,
              lineHeight: 1,
            }}
          >
            <Plus size={14} />
          </button>
        </div>

        {allPlaylists.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '24px 16px',
              borderRadius: 12,
              background: '#111611',
              border: '1px solid rgba(0,255,70,0.12)',
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
              <Plus size={18} style={{ color: '#00FF41' }} />
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                fontWeight: 500,
                color: 'rgba(255,255,255,0.6)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              No playlists yet
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
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
              + Create playlist
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allPlaylists.map((pl) => {
              const isActive = activePlaylist === pl.id;
              return (
                <button
                  key={pl.id}
                  onClick={() => onSelectPlaylist(pl.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: isActive ? 'rgba(0, 255, 65, 0.06)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Playlist thumbnail */}
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 6,
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(0, 255, 65, 0.3), rgba(0, 255, 65, 0.08))'
                        : 'rgba(255,255,255,0.06)',
                      border: isActive ? `1.5px solid rgba(0, 255, 65, 0.5)` : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      boxShadow: isActive ? '0 0 8px rgba(0, 255, 65, 0.3)' : 'none',
                    }}
                  >
                    <ListMusic size={14} style={{ color: isActive ? ACCENT : 'rgba(255,255,255,0.3)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                        fontFamily: "'Inter', sans-serif",
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {pl.name}
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: isActive ? 'rgba(0, 255, 65, 0.6)' : 'rgba(255,255,255,0.3)',
                        fontFamily: "'Inter', monospace",
                      }}
                    >
                      {pl.tracks} tracks
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleCreated}
      />

      {/* Upload promo at bottom */}
      <div
        style={{
          marginTop: 20,
          padding: '14px',
          borderRadius: 12,
          background: 'rgba(0, 255, 65, 0.04)',
          border: '1px solid rgba(0, 255, 65, 0.15)',
        }}
      >
        <Upload size={16} style={{ color: ACCENT, marginBottom: 6 }} />
        <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: "'Inter', sans-serif" }}>
          Upload Your Music
        </p>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
          Share your sound with the world.
        </p>
        <button
          style={{
            padding: '6px 14px',
            borderRadius: 8,
            background: ACCENT,
            border: 'none',
            color: '#000',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.03em',
            boxShadow: '0 0 12px rgba(0, 255, 65, 0.4)',
          }}
        >
          Launch Track →
        </button>
      </div>
    </aside>
  );
}
