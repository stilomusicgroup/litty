import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, Music, ShoppingCart, BarChart2, Plus } from 'lucide-react';
import { usePlayer } from '@/contexts/PlayerContext';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/hooks/use-privy-auth';
import { toast } from 'sonner';
import { triggerHapticFeedback } from '@/utils/haptic';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';

interface NewDropCardProps {
  song: SongsResponse;
  details: SongDetailsResponse | null;
  onBuy?: (song: SongsResponse) => void;
}

const NewDropCard: React.FC<NewDropCardProps> = ({ song, details, onBuy }) => {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { user } = useAuth();
  const { currentSong, isPlaying: playerIsPlaying, playSong, togglePlay } = usePlayer();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const title = details?.title ?? song.name ?? 'UNTITLED';
  const artist = details?.artist ?? 'Unknown Artist';
  const coverImage = details?.coverImage;
  const songId = song.id;
  const isThisSong = currentSong?.songId === songId;
  const isPlaying = playerIsPlaying && isThisSong;
  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$TOKEN';

  const { priceUsdStr, priceSolStr } = usePumpFunPrice(song.mintAddress ?? null);
  const priceDisplay = priceUsdStr !== '—' ? priceUsdStr : (priceSolStr !== '—' ? priceSolStr : '—');

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
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

  const handleCardClick = () => {
    triggerHapticFeedback();
    navigate(`/song/${song.id}`);
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    if (onBuy) {
      onBuy(song);
    } else {
      navigate(`/song/${song.id}`);
    }
  };

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      setShowPlaylistModal(true);
    } else {
      toast.error('Sign in to add songs to a playlist.');
    }
  };

  // ── Dark mode: cover + title + ticker/ATH/+ + BUY/CHART ──
  if (isDark) {
    return (
      <div
        className="cursor-pointer flex-shrink-0"
        style={{ width: 150 }}
        onClick={handleCardClick}
      >
        {/* Cover art */}
        <div
          className="relative overflow-hidden rounded-lg"
          style={{
            width: 150,
            height: 150,
            background: 'linear-gradient(135deg, #0A1A0E, #060A06)',
            border: '1px solid rgba(0, 255, 65, 0.12)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(0, 255, 65, 0.35)';
            el.style.boxShadow = '0 0 14px rgba(0, 255, 65, 0.2), 0 4px 20px rgba(0,0,0,0.5)';
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLElement;
            el.style.borderColor = 'rgba(0, 255, 65, 0.12)';
            el.style.boxShadow = '0 2px 12px rgba(0,0,0,0.4)';
          }}
        >
          {coverImage ? (
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-300"
              style={{ display: 'block' }}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: 'linear-gradient(145deg, #0a1e12, #050f0a, #0a1a12)' }}
            >
              <Music size={28} style={{ opacity: 0.12, color: NEON_GREEN }} />
            </div>
          )}

          {/* Gradient overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '40%',
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
              pointerEvents: 'none',
            }}
          />

          {/* Play button overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background: isPlaying ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0,0,0,0)',
              transition: 'background 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handlePlay}
              className="rounded-full active:scale-90 transition-all duration-200 hover:scale-105"
              style={{
                width: 36,
                height: 36,
                background: isPlaying
                  ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                  : 'rgba(0,0,0,0.6)',
                border: isPlaying
                  ? '2px solid rgba(255,255,255,0.3)'
                  : '1.5px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(4px)',
                boxShadow: isPlaying
                  ? `0 0 20px rgba(0, 255, 65, 0.5), 0 0 40px rgba(0,212,255,0.2)`
                  : '0 2px 12px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPlaying ? (
                <Pause size={16} color="#0A0A0F" fill="#0A0A0F" />
              ) : (
                <Play size={16} color="#ffffff" fill="#ffffff" style={{ marginLeft: 1 }} />
              )}
            </button>
          </div>
        </div>

        {/* Info below cover */}
        <div style={{ padding: '8px 2px 4px' }}>
          {/* Title */}
          <p
            className="truncate font-bold"
            style={{
              color: '#ffffff',
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.02em',
              lineHeight: 1.2,
            }}
            title={title}
          >
            {title}
          </p>

          {/* Ticker + ATH + playlist button row */}
          <div className="flex items-center justify-between mt-2" style={{ gap: 4 }}>
            <div>
              <p style={{
                fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 700,
                letterSpacing: '0.1em', color: NEON_GREEN,
                textShadow: '0 0 6px rgba(0, 255, 65, 0.4)',
              }}>{symbol}</p>
              <div className="mt-1">
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: 7, fontWeight: 700,
                  letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
                  textTransform: 'uppercase', lineHeight: 1,
                }}>PRICE</div>
                <p style={{
                  fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 700,
                  color: '#fff', letterSpacing: '0.02em', marginTop: 2,
                }}>{priceDisplay}</p>
              </div>
            </div>
            {/* Green + playlist button */}
            <button
              onClick={handleAddToPlaylist}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid rgba(0, 255, 65, 0.35)',
                color: NEON_GREEN,
                transition: 'all 0.2s',
              }}
              title="Add to playlist"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* BUY + CHART buttons */}
          <div className="flex items-center gap-2 mt-2.5">
            <button
              onClick={handleBuy}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10, border: 'none',
                fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
                color: '#000',
                boxShadow: '0 0 12px rgba(0, 255, 65, 0.3)',
                minHeight: 32, cursor: 'pointer', transition: 'box-shadow 0.2s',
              }}
            >
              BUY
            </button>
            <button
              onClick={e => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 10,
                fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 800,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                border: '1.5px solid #00FF41',
                color: '#00FF41',
                background: 'rgba(0, 255, 65, 0.06)',
                minHeight: 32, cursor: 'pointer', transition: 'box-shadow 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
              }}
            >
              <BarChart2 size={10} />CHART
            </button>
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
  }

  // ── Light mode: compact thumbnail with same stat layout ──
  const THUMB_SIZE = 130;
  return (
    <div
      className="cursor-pointer flex-shrink-0"
      style={{ width: THUMB_SIZE }}
      onClick={handleCardClick}
    >
      <div
        className="relative overflow-hidden rounded-lg"
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          background: 'rgba(255,255,255,0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s ease',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1), 0 0 10px rgba(0, 255, 65, 0.12)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement;
          el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
        }}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(145deg, #e8f5e9, #c8e6c9, #a5d6a7)' }}
          >
            <Music size={28} style={{ opacity: 0.2, color: '#1a2744' }} />
          </div>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handlePlay}
            className="rounded-full active:scale-90 transition-all duration-200 hover:scale-105"
            style={{
              width: 36,
              height: 36,
              background: isPlaying
                ? 'linear-gradient(135deg, #00FF41, #06d6a0)'
                : 'rgba(255,255,255,0.8)',
              border: isPlaying ? 'none' : '1px solid rgba(255,255,255,0.8)',
              backdropFilter: 'blur(4px)',
              boxShadow: isPlaying
                ? '0 2px 12px rgba(0, 255, 65, 0.4)'
                : '0 2px 8px rgba(0,0,0,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isPlaying ? (
              <Pause size={16} color="#ffffff" fill="#ffffff" />
            ) : (
              <Play size={16} color="#1a2744" fill="#1a2744" style={{ marginLeft: 1 }} />
            )}
          </button>
        </div>
      </div>

      <p
        className="mt-1.5 truncate text-xs font-bold"
        style={{ color: '#1a2744' }}
        title={title}
      >
        {title}
      </p>

      {/* Ticker + ATH + playlist button row */}
      <div className="flex items-center justify-between mt-1" style={{ gap: 4 }}>
        <div className="flex-1 min-w-0">
          <p style={{
            fontFamily: "'Inter', sans-serif", fontSize: 9, fontWeight: 700,
            letterSpacing: '0.05em', color: '#00FF41',
          }}>{symbol}</p>
          <div className="mt-0.5">
            <div style={{
              fontFamily: "'Inter', sans-serif", fontSize: 7, fontWeight: 700,
              letterSpacing: '0.1em', color: 'rgba(26,39,68,0.35)',
              textTransform: 'uppercase', lineHeight: 1,
            }}>PRICE</div>
            <p style={{
              fontFamily: "'Inter', monospace", fontSize: 11, fontWeight: 700,
              color: '#1a2744', marginTop: 1,
            }}>{priceDisplay}</p>
          </div>
        </div>
        <button
          onClick={handleAddToPlaylist}
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'rgba(0, 255, 65, 0.1)',
            border: '1px solid rgba(0, 255, 65, 0.35)',
            color: '#00FF41',
          }}
          title="Add to playlist"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* BUY + CHART buttons */}
      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={handleBuy}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 10, border: 'none',
            fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 800,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            background: '#00FF41',
            color: '#000',
            boxShadow: '0 2px 8px rgba(0, 255, 65, 0.3)',
            minHeight: 28, cursor: 'pointer',
          }}
        >BUY</button>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
          style={{
            flex: 1, padding: '6px 0', borderRadius: 10,
            fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 800,
            letterSpacing: '0.05em', textTransform: 'uppercase',
            border: '1.5px solid #00FF41',
            color: '#00FF41',
            background: 'rgba(0, 255, 65, 0.06)',
            minHeight: 28, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
          }}
        >
          <BarChart2 size={10} />CHART
        </button>
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

export default NewDropCard;
