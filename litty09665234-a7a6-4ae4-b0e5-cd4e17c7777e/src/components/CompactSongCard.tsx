import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { Play, Pause, BarChart2, Plus } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import { useArtistVerified } from '@/hooks/use-artist-verified';
import { useAuth } from '@/hooks/use-privy-auth';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import { useSongCandles } from '@/hooks/useSongCandles';
import { subscribeSongStreams, SongStreamsResponse } from '@/lib/collections/songStreams';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { formatStreamCount } from '@/utils/formatCount';

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function strHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface CompactSongCardProps {
  song: SongsResponse;
  details: SongDetailsResponse | null;
  rank?: number;
  onBuy?: (song: SongsResponse) => void;
  bondingProgress?: number | null;
  priceSol?: number | null;
}

function MiniSparkline({ songId, positive, history, loading }: { songId: string; positive: boolean; history?: number[]; loading?: boolean }) {
  const color = positive ? '#00FF41' : '#ef4444';

  if (loading && (!history || history.length < 2)) {
    return (
      <svg width="44" height="24" viewBox="0 0 44 24" fill="none" style={{ flexShrink: 0 }}>
        <line x1="0" y1="12" x2="44" y2="12" stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  const points: string[] = [];
  if (history && history.length >= 2) {
    const mn = Math.min(...history);
    const mx = Math.max(...history);
    const rng = mx - mn || 1;
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * 44;
      const y = 22 - ((v - mn) / rng) * 20;
      points.push(`${x},${y}`);
    });
  } else {
    const seed = strHash(songId + '_spark');
    const rng = makeRng(seed);
    let y = 12;
    for (let i = 0; i < 12; i++) {
      y += (rng() - (positive ? 0.35 : 0.65)) * 8;
      y = Math.max(2, Math.min(22, y));
      points.push(`${i * 4},${y}`);
    }
  }
  return (
    <svg width="44" height="24" viewBox="0 0 44 24" fill="none" style={{ flexShrink: 0 }}>
      <polyline points={points.join(' ')} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CompactSongCard: React.FC<CompactSongCardProps> = ({ song, details, rank, onBuy, bondingProgress = null, priceSol = null }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isArtistVerified = useArtistVerified(song.creator);
  const isThisSong = currentSong?.songId === song.id;
  const [hovered, setHovered] = useState(false);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const { data: streamData } = useRealtimeData<SongStreamsResponse | null>(
    subscribeSongStreams,
    !!song.id,
    song.id,
  );

  const { priceUsdStr, priceSolStr } = usePumpFunPrice(song.mintAddress ?? null);
  const hasLivePrice = priceUsdStr !== '—' || priceSolStr !== '—';

  const { candles, loading: candlesLoading } = useSongCandles(song.mintAddress ?? null, '1h');
  const candleHistory = candles.length >= 2 ? candles.map(c => c.c) : undefined;

  const changeData = useMemo(() => {
    const rng = makeRng(strHash(song.id + '_change'));
    const pct = (rng() * 50 - 10);
    return { pct, positive: pct >= 0 };
  }, [song.id]);

  // Live price display from pump.fun
  const priceDisplay = hasLivePrice
    ? (priceUsdStr !== '—' ? priceUsdStr : priceSolStr)
    : null;

  const title = details?.title ?? song.name ?? 'UNTITLED';
  const artist = details?.artist ?? 'Unknown';
  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$TOKEN';
  const coverImage = details?.coverImage;
  const songId = song.id;

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      setShowPlaylistModal(true);
    } else {
      toast.error('Sign in to add songs to a playlist.');
    }
  };

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
      className="flex-shrink-0 cursor-pointer group"
      style={{ width: 152 }}
      onClick={() => navigate(`/song/${song.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Cover image */}
      <div className="relative overflow-hidden" style={{ width: 152, height: 152, borderRadius: 10 }}>
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #0a1e12, #050f0a)' }}>
            <span style={{ fontSize: '3rem', opacity: 0.12 }}>♫</span>
          </div>
        )}
        {/* Gradient overlay for text */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%',
          background: 'linear-gradient(to top, rgba(6,10,6,0.98) 0%, rgba(6,10,6,0.6) 45%, rgba(6,10,6,0.15) 75%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        {/* Rank badge */}
        {rank && (
          <div style={{
            position: 'absolute', top: 6, left: 6,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            borderRadius: 6, padding: '2px 7px',
            fontFamily: "'Archivo Black', sans-serif", fontSize: 10, fontWeight: 700,
            color: '#fff', zIndex: 2,
          }}>#{rank}</div>
        )}
        {/* Stream count badge */}
        {streamData && (
          <div style={{
            position: 'absolute', top: 6, right: 6,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            borderRadius: 6, padding: '2px 6px',
            display: 'flex', alignItems: 'center', gap: 3,
            zIndex: 2,
          }}>
            <Play size={8} style={{ color: 'rgba(255,255,255,0.8)' }} />
            <span style={{ fontFamily: "'Inter', monospace", fontSize: 9, fontWeight: 700, color: '#fff' }}>
              {formatStreamCount(streamData.count)}
            </span>
          </div>
        )}
        {/* Play button */}
        <button
          onClick={handlePlay}
          className="absolute z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
          style={{
            bottom: 8, right: 8,
            background: isThisSong && isPlaying ? 'rgba(0, 255, 65, 0.85)' : 'rgba(0,0,0,0.6)',
            border: `1px solid ${isThisSong && isPlaying ? 'rgba(0, 255, 65, 0.5)' : 'rgba(255,255,255,0.2)'}`,
            backdropFilter: 'blur(8px)',
            opacity: hovered || (isThisSong && isPlaying) ? 1 : 0.7,
            boxShadow: isThisSong && isPlaying ? '0 0 14px rgba(0, 255, 65, 0.5)' : '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {isThisSong && isPlaying ? (
            <Pause size={14} className="text-black" />
          ) : (
            <Play size={14} className="text-white ml-0.5" />
          )}
        </button>
        {/* Bonding curve progress bar — bottom edge */}
        {bondingProgress !== null && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(0,0,0,0.4)', zIndex: 3, pointerEvents: 'none' }}>
            <div style={{
              width: `${Math.min(bondingProgress, 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #00FF41, #00FFD1)',
              boxShadow: '0 0 6px rgba(0, 255, 65, 0.5)',
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}

        {/* Artist name overlaid on image */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, zIndex: 1 }}>
          <div className="flex items-center gap-1">
            <p style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(220,214,240,0.7)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{artist}</p>
            <VerifiedBadge isVerified={isArtistVerified} size="sm" />
          </div>
        </div>
      </div>

      {/* Info below image */}
      <div style={{ padding: '8px 2px 4px' }}>
        {/* Title */}
        <p style={{
          fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 800,
          color: '#fff', textTransform: 'uppercase', letterSpacing: '0.02em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          lineHeight: 1.2,
        }}>{title}</p>

        {/* Price + change + sparkline row */}
        <div className="flex items-center justify-between mt-2" style={{ gap: 4 }}>
          <div>
            <p style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 700,
              letterSpacing: '0.1em', color: '#00FF41',
              textShadow: '0 0 6px rgba(0, 255, 65, 0.4)',
            }}>{symbol}</p>
            <div className="mt-1">
              {priceUsdStr !== '—' ? (
                <>
                  <p style={{
                    fontFamily: "'Inter', monospace", fontSize: 10, fontWeight: 700,
                    color: '#fff', letterSpacing: '0.02em', marginTop: 2,
                  }}>{priceUsdStr}</p>
                  <p style={{
                    fontFamily: "'Inter', monospace", fontSize: 9, fontWeight: 700,
                    color: changeData.positive ? '#00FF41' : '#ef4444', marginTop: 2,
                  }}>
                    {changeData.positive ? '+' : ''}{changeData.pct.toFixed(1)}%
                  </p>
                </>
              ) : priceDisplay !== null ? (
                <>
                  <div style={{
                    fontFamily: "'Archivo Black', sans-serif", fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase', lineHeight: 1,
                  }}>PRICE</div>
                  <p style={{
                    fontFamily: "'Inter', monospace", fontSize: 10, fontWeight: 700,
                    color: '#00FF41', letterSpacing: '0.02em', marginTop: 2,
                    textShadow: '0 0 6px rgba(0, 255, 65, 0.4)',
                  }}>{priceDisplay}</p>
                  {bondingProgress !== null && (
                    <p style={{ fontFamily: "'Archivo Black', monospace", fontSize: 7, fontWeight: 700, color: 'rgba(0, 255, 65, 0.5)', marginTop: 2 }}>
                      {bondingProgress.toFixed(1)}% curve
                    </p>
                  )}
                </>
              ) : bondingProgress !== null ? (
                <>
                  <div style={{
                    fontFamily: "'Archivo Black', sans-serif", fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase', lineHeight: 1,
                  }}>CURVE</div>
                  <p style={{
                    fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 700,
                    color: '#00FF41', letterSpacing: '0.02em', marginTop: 2,
                  }}>{bondingProgress.toFixed(1)}%</p>
                </>
              ) : (
                <>
                  <div style={{
                    fontFamily: "'Archivo Black', sans-serif", fontSize: 7, fontWeight: 700,
                    letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase', lineHeight: 1,
                  }}>PRICE</div>
                  <p style={{
                    fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 700,
                    color: '#fff', letterSpacing: '0.02em', marginTop: 2,
                  }}>{priceDisplay ?? '—'}</p>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end" style={{ gap: 2 }}>
            <MiniSparkline songId={song.id} positive={changeData.positive} history={candleHistory} loading={candlesLoading} />
            {/* Green + playlist button */}
            <button
              onClick={handleAddToPlaylist}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid rgba(0, 255, 65, 0.35)',
                color: '#00FF41',
                transition: 'all 0.2s',
              }}
              title="Add to playlist"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-2.5">
          <button
            onClick={e => { e.stopPropagation(); if (onBuy) onBuy(song); else navigate(`/song/${song.id}`); }}
            style={{
              flex: 1, padding: '7px 0', borderRadius: 10, border: 'none',
              fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
              color: '#000',
              boxShadow: '0 0 12px rgba(0, 255, 65, 0.3)',
              minHeight: 32, cursor: 'pointer', transition: 'box-shadow 0.2s',
            }}
          >BUY</button>
          {song.mintAddress && (
            <button
              onClick={e => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
              style={{
                width: 32, height: 32, borderRadius: 10,
                background: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid rgba(0, 255, 65, 0.35)',
                color: '#00FF41',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'box-shadow 0.2s',
              }}
              title="View chart"
            >
              <BarChart2 size={14} />
            </button>
          )}
        </div>
      </div>

      {showPlaylistModal && (
        <AddToPlaylistModal
          songId={songId}
          title={title}
          artist={artist}
          coverImage={coverImage}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  );
};

export default CompactSongCard;
