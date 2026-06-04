import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { orbitronFont } from '@/theme';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribeSongStreams } from '@/lib/collections/songStreams';
import { Play, Pause } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import type { SongStreamsResponse } from '@/lib/collections/songStreams';

interface LiveChartCardProps {
  song: SongsResponse;
  details: SongDetailsResponse | null;
  rank?: number;
  onBuy?: (song: SongsResponse) => void;
}

function formatStreamCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

const LiveChartCard: React.FC<LiveChartCardProps> = ({ song, details, rank }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const isThisSong = currentSong?.songId === song.id;
  const [hovered, setHovered] = useState(false);

  const { data: streamData } = useRealtimeData<SongStreamsResponse | null>(
    subscribeSongStreams,
    !!song.id,
    song.id,
  );

  const playsDisplay = useMemo(() => {
    const count = streamData?.count ?? 0;
    return formatStreamCount(count);
  }, [streamData]);

  const title = details?.title ?? song.name ?? 'UNTITLED';
  const artist = details?.artist ?? 'Unknown';
  const coverImage = details?.coverImage;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isThisSong) {
      togglePlay();
    } else {
      playSong({
        songId: song.id,
        title,
        artist,
        coverImage,
        audioUrl: details?.audioUrl,
        audiusStreamUrl: details?.audiusStreamUrl ?? song.audiusStreamUrl,
        duration: details?.duration,
        symbol: song.symbol,
      });
    }
  };

  return (
    <div
      className="w-full cursor-pointer group"
      onClick={() => navigate(`/song/${song.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: '1px solid rgba(0, 255, 65, 0.08)',
        padding: '10px 12px',
        transition: 'background 0.15s ease',
        background: hovered ? 'rgba(0, 255, 65, 0.03)' : 'transparent',
      }}
    >
      <div className="flex items-center gap-3">

        {/* Rank */}
        {rank !== undefined && (
          <div style={{
            flexShrink: 0,
            width: 24,
            fontFamily: orbitronFont,
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(255,255,255,0.3)',
            textAlign: 'center',
            letterSpacing: '0.02em',
          }}>
            {rank}
          </div>
        )}

        {/* Thumbnail */}
        <div
          className="relative overflow-hidden flex-shrink-0"
          style={{ width: 52, height: 52, borderRadius: 8 }}
        >
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #0a1e12, #050f0a)' }}
            >
              <span style={{ fontSize: '1.4rem', opacity: 0.12 }}>♫</span>
            </div>
          )}
          {/* Play button overlay */}
          <button
            onClick={handlePlay}
            className="absolute inset-0 flex items-center justify-center transition-all duration-200 active:scale-90"
            style={{
              background: isThisSong && isPlaying
                ? 'rgba(0, 255, 65, 0.7)'
                : 'rgba(0,0,0,0.5)',
              opacity: hovered || (isThisSong && isPlaying) ? 1 : 0,
              borderRadius: 8,
            }}
          >
            {isThisSong && isPlaying ? (
              <Pause size={16} className="text-black" />
            ) : (
              <Play size={16} className="text-white ml-0.5" />
            )}
          </button>
        </div>

        {/* Title + artist */}
        <div className="flex-1 min-w-0">
          <p style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 12,
            fontWeight: 800,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.2,
          }}>{title}</p>
          <p style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(220,214,240,0.5)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginTop: 3,
          }}>{artist}</p>
        </div>

        {/* Live play count — the only stat */}
        <div
          className="flex-shrink-0 flex flex-col items-end"
          style={{ gap: 2 }}
        >
          <span style={{
            fontFamily: orbitronFont,
            fontSize: 16,
            fontWeight: 700,
            color: '#00FF41',
            letterSpacing: '-0.01em',
            lineHeight: 1,
            textShadow: '0 0 12px rgba(0, 255, 65, 0.5)',
          }}>
            {playsDisplay}
          </span>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 7,
            fontWeight: 700,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(0, 255, 65, 0.55)',
          }}>
            plays
          </span>
        </div>

      </div>
    </div>
  );
};

export default LiveChartCard;
