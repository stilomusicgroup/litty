import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';

interface TracklistProps {
  songs: SongsResponse[];
  detailsMap: Record<string, SongDetailsResponse>;
  activeTab: string;
  tabs: string[];
  onTabChange: (tab: string) => void;
  onPlay: (songId: string) => void;
}

const CYAN = '#00D4FF';

const Tracklist: React.FC<TracklistProps> = ({
  songs,
  detailsMap,
  activeTab,
  tabs,
  onTabChange,
  onPlay,
}) => {
  const navigate = useNavigate();

  // Determine if a track is available (has audioUrl or was created in the past)
  const isAvailable = (song: SongsResponse) => {
    const d = detailsMap[song.id];
    return !!d?.audioUrl;
  };

  return (
    <div className="px-4">
      {/* Album/Release Tabs */}
      {tabs.length > 0 && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3 mb-4">
          {tabs.map(tab => {
            const active = tab === activeTab;
            return (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                className="flex-shrink-0 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
                style={{
                  background: active ? 'transparent' : 'rgba(255,255,255,0.03)',
                  border: active
                    ? `1.5px solid ${CYAN}`
                    : '1.5px solid rgba(255,255,255,0.06)',
                  color: active ? CYAN : 'rgba(255,255,255,0.4)',
                }}
              >
                {tab}
              </button>
            );
          })}
        </div>
      )}

      {/* Track list */}
      {songs.length === 0 ? (
        <div className="text-center py-16">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}
          >
            <Music size={28} style={{ color: 'rgba(0,212,255,0.3)' }} />
          </div>
          <p className="text-sm font-semibold text-white mb-1">First drop coming soon...</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Stay tuned for new tracks from Lit Studios
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.map((song, i) => {
            const d = detailsMap[song.id];
            const available = isAvailable(song);
            const title = d?.title ?? song.name;

            return (
              <button
                key={song.id}
                onClick={() => {
                  if (available) {
                    onPlay(song.id);
                  } else {
                    navigate(`/song/${song.id}`);
                  }
                }}
                className="w-full flex items-center gap-4 px-3 py-3 rounded-xl transition-all group"
                style={{
                  background: 'transparent',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Track number */}
                <span
                  className="text-sm font-bold w-7 text-right flex-shrink-0"
                  style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', monospace" }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Track title */}
                <span
                  className="text-sm font-semibold text-left flex-1 truncate"
                  style={{ color: available ? '#fff' : 'rgba(255,255,255,0.4)' }}
                >
                  {title}
                </span>

                {/* Action button */}
                {available ? (
                  <span
                    className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase transition-all"
                    style={{
                      background: 'rgba(0,212,255,0.12)',
                      border: '1px solid rgba(0,212,255,0.3)',
                      color: CYAN,
                    }}
                  >
                    PLAY
                  </span>
                ) : (
                  <span
                    className="flex-shrink-0 text-xs font-semibold"
                    style={{ color: 'rgba(255,255,255,0.25)' }}
                  >
                    {'✨'} SOON
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tracklist;
