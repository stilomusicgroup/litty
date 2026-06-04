import React from 'react';
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Bookmark } from 'lucide-react';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import type { SongsResponse } from '@/lib/collections/songs';

interface HeroAlbumCardProps {
  song: SongsResponse | null;
  details: SongDetailsResponse | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  onTogglePlay: () => void;
  onBookmark?: () => void;
}

const CYAN = '#00D4FF';
const NEON_GREEN = '#00FF41';

const HeroAlbumCard: React.FC<HeroAlbumCardProps> = ({
  song,
  details,
  isPlaying,
  progress,
  duration,
  onTogglePlay,
  onBookmark,
}) => {
  const coverImage = details?.coverImage;
  const title = details?.title ?? song?.name ?? 'LATEST DROP';
  const artist = details?.artist ?? 'LIT STUDIO';
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  // Generate a unique gradient from the song name
  const hue1 = song ? (song.name.charCodeAt(0) * 7) % 360 : 230;
  const hue2 = (hue1 + 40) % 360;

  return (
    <div className="px-0.5 sm:px-4 md:flex md:justify-center">
      <div
        className="relative overflow-hidden rounded-lg sm:rounded-2xl w-full md:max-w-lg"
        style={{
          aspectRatio: '1 / 1.1',
          maxHeight: '520px',
        }}
      >
        {/* Background - cover image or gradient */}
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, hsl(${hue1}, 60%, 20%) 0%, hsl(${hue2}, 70%, 8%) 40%, #080512 100%)`,
            }}
          />
        )}

        {/* Overlay gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.8) 85%, rgba(0,0,0,0.95) 100%)',
          }}
        />

        {/* Bookmark icon */}
        <button
          onClick={onBookmark}
          className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10 p-2.5 rounded-lg transition-all"
          style={{
            background: 'rgba(0, 255, 65, 0.3)',
            backdropFilter: 'blur(8px)',
            minWidth: '44px',
            minHeight: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Bookmark size={18} style={{ color: '#00FF41' }} />
        </button>

        {/* Text overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-2 pb-2 sm:p-5 sm:pb-4">
          <p
            className="text-[10px] sm:text-xs font-bold tracking-[0.35em] uppercase mb-0.5 sm:mb-1"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            {artist}
          </p>
          <h2
            className="text-3xl sm:text-5xl font-black uppercase leading-[0.95] mb-3 sm:mb-5"
            style={{ color: '#fff', textShadow: '0 2px 24px rgba(0,0,0,0.8)' }}
          >
            {title}
          </h2>

          {/* Mini transport controls */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mb-3 sm:mb-4">
            <button className="opacity-50 hover:opacity-80 transition-opacity p-2" style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shuffle size={16} color="#fff" />
            </button>
            <button className="opacity-60 hover:opacity-100 transition-opacity p-2" style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkipBack size={22} color="#fff" fill="#fff" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all"
              style={{
                background: 'rgba(255,255,255,0.18)',
                border: '2px solid rgba(255,255,255,0.35)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 0 24px rgba(255,255,255,0.15)',
              }}
            >
              {isPlaying ? (
                <Pause size={24} color="#fff" fill="#fff" />
              ) : (
                <Play size={24} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
              )}
            </button>
            <button className="opacity-60 hover:opacity-100 transition-opacity p-2" style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkipForward size={22} color="#fff" fill="#fff" />
            </button>
            <button className="opacity-50 hover:opacity-80 transition-opacity p-2" style={{ minWidth: '40px', minHeight: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Repeat size={16} color="#fff" />
            </button>
          </div>

          {/* Progress bar on image */}
          <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <div
              className="h-full rounded-full transition-all duration-300 progress-glow"
              style={{
                width: `${progressPct}%`,
                background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`,
                boxShadow: `0 0 10px rgba(0, 255, 65, 0.8), 0 0 20px rgba(0,212,255,0.4)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroAlbumCard;
