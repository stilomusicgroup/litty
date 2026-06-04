import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import PriceChartSVG from './PriceChartSVG';
import { useSongCandles } from '@/hooks/useSongCandles';
import LikeButton from '@/components/LikeButton';
import RepostButton from '@/components/RepostButton';
import ShareMenu from '@/components/ShareMenu';
import VerifiedBadge from '@/components/VerifiedBadge';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import EqualizerBars from '@/components/EqualizerBars';
import { useArtistVerified } from '@/hooks/use-artist-verified';
import { useWishlist } from '@/hooks/useWishlist';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/use-privy-auth';
import { useTheme } from '@/hooks/use-theme';
import { triggerHapticFeedback } from '@/utils/haptic';
import { Heart, Plus, ListPlus, BarChart2 } from 'lucide-react';
import { poppinsFont } from '@/theme';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const CARD_BG = 'linear-gradient(135deg, #0f2a0f, #0a1e0a)';

function timeAgo(timestamp: number): string {
  if (!timestamp) return 'recently';
  const now = Date.now() / 1000;
  const diff = now - timestamp;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface SongRowProps {
  song: SongsResponse;
  details: SongDetailsResponse | null;
  rank?: number;
  onBuy?: (song: SongsResponse) => void;
  bondingProgress?: number | null;
  priceSol?: number | null;
}

const SongRow: React.FC<SongRowProps> = ({ song, details, rank, onBuy, bondingProgress = null, priceSol = null }) => {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const isArtistVerified = useArtistVerified(song.creator);
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { currentSong, isPlaying, addToQueue } = usePlayer();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const isThisSong = currentSong?.songId === song.id;
  const wishlisted = isWishlisted(song.id);

  const { candles, loading: candlesLoading } = useSongCandles(song.mintAddress ?? null, '1h');
  const candleHistory = candles.length >= 2 ? candles.map(c => c.c) : undefined;

  const priceData = useMemo(() => {
    const changeVal = '—';
    const isPositive = true;
    // Live price when available
    const livePrice = priceSol !== null
      ? priceSol < 0.000001
        ? `${(priceSol * 1e9).toFixed(2)} LAMP`
        : priceSol < 0.001
        ? `${(priceSol * 1000).toFixed(4)}m◎`
        : `◎${priceSol.toFixed(6)}`
      : null;
    const price = livePrice ?? '—';
    const isLive = livePrice !== null;
    return { price, changeVal, isPositive, isLive };
  }, [song.id, priceSol]);

  const title = details?.title ?? song.name ?? 'Untitled';
  const artist = details?.artist ?? 'Unknown Artist';
  const genre = details?.genre ?? '🎵';
  const coverImage = details?.coverImage;
  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$TOKEN';
  const timePosted = timeAgo(song.tarobase_created_at ?? 0);

  const handleArtworkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/artist/${song.creator}`);
  };

  // ── Light mode: frosted glass on sky ──
  if (!isDark) {
    return (
      <motion.div
        className="flex items-center gap-2 sm:gap-3 p-1 sm:p-3 rounded-lg sm:rounded-[20px] cursor-default transition-all active:scale-[0.99] group"
        style={{
          background: 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
        }}
        whileTap={{ scale: 0.99 }}
        onTapStart={() => navigator.vibrate?.(5)}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.8)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.6)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
        }}
      >
        {/* Album art */}
        <div
          className="w-[60px] h-[60px] sm:w-[110px] sm:h-[110px] rounded-md sm:rounded-xl overflow-hidden flex-shrink-0 relative cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.4)' }}
          onClick={handleArtworkClick}
          title={`View ${artist}'s profile`}
        >
          {coverImage ? (
            <img src={coverImage} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ opacity: 0.3 }}>
              <span style={{ fontSize: '2.5rem', color: '#1a2744' }}>♫</span>
            </div>
          )}
          <div
            className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-bold"
            style={{
              background: 'rgba(255,255,255,0.5)',
              color: '#1a2744',
              border: '1px solid rgba(255,255,255,0.6)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {genre.length > 2 ? genre : '🎵'}
          </div>
        </div>

        {/* Info section */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0 sm:py-1 overflow-hidden">
          <div>
            <div className="flex items-center gap-2">
              {isThisSong && <EqualizerBars isPlaying={isPlaying} color="#00FF41" size="sm" />}
              <p
                className="text-sm sm:text-base leading-tight truncate cursor-pointer transition-colors"
                style={{ color: '#1a2744', fontFamily: poppinsFont, fontWeight: 800 }}
                onClick={handleArtworkClick}
                title={`View ${artist}'s profile`}
              >{title}</p>
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <button
                className="text-[11px] sm:text-sm font-semibold truncate text-left transition-colors"
                style={{ color: 'rgba(26,39,68,0.6)' }}
                onClick={handleArtworkClick}
              >{artist}</button>
              <VerifiedBadge isVerified={isArtistVerified} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1.5 flex-wrap">
            <span
              className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black tracking-wider uppercase"
              style={{
                fontFamily: poppinsFont,
                border: '2px solid #00FF41',
                color: '#00FF41',
                background: 'rgba(255,255,255,0.3)',
              }}
            >
              {symbol}
            </span>
            <span className="text-[10px] sm:text-[11px] font-semibold" style={{ color: 'rgba(26,39,68,0.5)' }}>{timePosted}</span>
            <div onClick={e => e.stopPropagation()} className="flex items-center gap-0.5 sm:gap-1">
              <LikeButton songId={song.id} size="sm" showCount />
              <RepostButton songId={song.id} size="sm" showCount />
              <ShareMenu songId={song.id} songTitle={title} artist={artist} />
              <button
                onClick={(e) => { e.stopPropagation(); addToQueue({ songId: song.id, title, artist, coverImage, audioUrl: details?.audioUrl, audiusStreamUrl: details?.audiusStreamUrl ?? song.audiusStreamUrl, duration: details?.duration, symbol: song.symbol }); }}
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)' }}
                title="Add to queue"
              >
                <Plus size={11} style={{ color: '#1a2744' }} />
              </button>
              {user && (
                <button
                  onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); toggleWishlist(song.id); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: wishlisted ? 'rgba(0, 255, 65, 0.2)' : 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)' }}
                  title={wishlisted ? 'Remove from wishlist' : 'Wishlist'}
                >
                  <Heart size={11} style={{ color: wishlisted ? '#00FF41' : '#1a2744', fill: wishlisted ? '#00FF41' : 'none' }} />
                </button>
              )}
              {user && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); }}
                  className="w-6 h-6 rounded-md flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.5)' }}
                  title="Add to playlist"
                >
                  <ListPlus size={11} style={{ color: '#1a2744' }} />
                </button>
              )}
            </div>
          </div>
          {showPlaylistModal && (
            <div onClick={e => e.stopPropagation()}>
              <AddToPlaylistModal songId={song.id} title={title} artist={artist} coverImage={coverImage} isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} />
            </div>
          )}

          {details?.description && (
            <p
              className="text-[11px] sm:text-[12px] mt-1 sm:mt-1.5 line-clamp-1 sm:line-clamp-2"
              style={{ color: 'rgba(26,39,68,0.5)' }}
            >
              {details.description}
            </p>
          )}
        </div>

        {/* Chart section */}
        <div className="flex flex-col items-end justify-between h-[60px] sm:h-[110px] py-0 sm:py-1 flex-shrink-0">
          <div className="text-right">
            <p
              className="text-[11px] sm:text-sm font-black"
              style={{ color: '#1a2744', fontFamily: poppinsFont }}
            >
              {priceData.price}
            </p>
            <p
              className="text-[9px] sm:text-[11px] font-bold"
              style={{
                color: priceData.isPositive ? '#00FF41' : '#ef4444',
                fontFamily: poppinsFont,
              }}
            >
              {priceData.isPositive ? '+' : ''}{priceData.changeVal}%
            </p>
          </div>

          <div className="hidden sm:flex flex-col items-end gap-1">
            <PriceChartSVG songId={song.id} width={120} height={40} history={candleHistory} loading={candlesLoading} />
            <div className="flex items-center gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                className="px-4 py-2 rounded-full text-[10px] font-black tracking-wider uppercase transition-all active:scale-95"
                style={{
                  background: 'linear-gradient(135deg, #00FF41 0%, #06d6a0 100%)',
                  color: '#1a2744',
                  fontFamily: poppinsFont,
                  boxShadow: '0 2px 8px rgba(0, 255, 65, 0.3)',
                }}
              >
                BUY
              </button>
              {song.mintAddress && (
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0, 255, 65, 0.1)', border: '1px solid rgba(0, 255, 65, 0.3)', color: '#00FF41' }}
                  title="View chart"
                >
                  <BarChart2 size={14} />
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 sm:hidden">
            <button
              className="px-3 py-2 rounded-full text-[9px] font-black tracking-wider uppercase transition-all active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00FF41 0%, #06d6a0 100%)',
                color: '#1a2744',
                fontFamily: poppinsFont,
                boxShadow: '0 2px 8px rgba(0, 255, 65, 0.3)',
              }}
              onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
            >
              BUY
            </button>
            {song.mintAddress && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0, 255, 65, 0.1)', border: '1px solid rgba(0, 255, 65, 0.3)', color: '#00FF41' }}
                title="View chart"
              >
                <BarChart2 size={14} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Dark mode: Compact, high-contrast (80-96px max height) ──
  return (
    <motion.div
      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 rounded-xl sm:rounded-2xl cursor-default transition-all active:scale-[0.99] group"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 1px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)',
        transition: 'all 0.25s ease',
      }}
      whileTap={{ scale: 0.99 }}
      onTapStart={() => navigator.vibrate?.(5)}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03)';
      }}
    >
      {/* Album art — 56x56 rounded, clicking goes to Artist Profile */}
      <div
        className="w-[56px] h-[56px] sm:w-[96px] sm:h-[96px] rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0 relative cursor-pointer"
        style={{ background: 'rgba(255,255,255,0.06)' }}
        onClick={handleArtworkClick}
        title={`View ${artist}'s profile`}
      >
        {coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.1), rgba(0,212,255,0.08))' }}>
            <span style={{ fontSize: '2rem', opacity: 0.3, color: NEON_GREEN }}>♫</span>
          </div>
        )}

        {/* Genre badge overlay - smaller */}
        <div
          className="absolute bottom-0.5 left-0.5 sm:bottom-1 sm:left-1 px-1 py-0.5 rounded text-[8px] sm:text-[9px] font-bold"
          style={{
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {genre.length > 2 ? genre : '🎵'}
        </div>
      </div>

      {/* Info section - compact stack */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5">
          {isThisSong && <EqualizerBars isPlaying={isPlaying} color="#00FF41" size="sm" />}
          {/* Title with Orbitron font */}
          <p
            className="text-xs sm:text-sm font-bold leading-tight truncate cursor-pointer transition-colors"
            style={{ color: '#ffffff', fontFamily: "'Archivo Black', sans-serif", maxWidth: '120px' }}
            onClick={handleArtworkClick}
            title={`View ${artist}'s profile`}
          >{title}</p>
          {/* Rank number */}
          {rank && (
            <span
              className="text-[9px] font-bold flex-shrink-0"
              style={{ fontFamily: "'Archivo Black', sans-serif", color: 'rgba(255,255,255,0.25)' }}
            >
              #{rank}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <button
            className="text-[10px] sm:text-[11px] font-medium truncate text-left transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onClick={handleArtworkClick}
          >{artist}</button>
          <VerifiedBadge isVerified={isArtistVerified} size="sm" />
          {/* Symbol pill inline */}
          <span className="px-1.5 py-0.5 rounded-full text-[8px] font-bold flex-shrink-0" style={{ background: 'rgba(0, 255, 65, 0.12)', color: '#00FF41', border: '1px solid rgba(0, 255, 65, 0.25)' }}>
            {symbol}
          </span>
        </div>
        {/* Compact actions row - mobile only */}
        <div className="flex items-center gap-1 mt-1 sm:hidden" onClick={e => e.stopPropagation()}>
          <LikeButton songId={song.id} size="sm" />
          <RepostButton songId={song.id} size="sm" showCount />
          <ShareMenu songId={song.id} songTitle={title} artist={artist} />
          <button
            onClick={(e) => { e.stopPropagation(); addToQueue({ songId: song.id, title, artist, coverImage, audioUrl: details?.audioUrl, audiusStreamUrl: details?.audiusStreamUrl ?? song.audiusStreamUrl, duration: details?.duration, symbol: song.symbol }); }}
            className="w-6 h-6 rounded-md flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            title="Add to queue"
          >
            <Plus size={10} style={{ color: '#ffffff' }} />
          </button>
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); toggleWishlist(song.id); }}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: wishlisted ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              title={wishlisted ? 'Remove from wishlist' : 'Wishlist'}
            >
              <Heart size={10} style={{ color: wishlisted ? '#00FF41' : '#ffffff', fill: wishlisted ? '#00FF41' : 'none' }} />
            </button>
          )}
          {user && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowPlaylistModal(true); }}
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              title="Add to playlist"
            >
              <ListPlus size={10} style={{ color: '#ffffff' }} />
            </button>
          )}
        </div>
      </div>

      {/* Chart section - compact right side */}
      <div className="flex flex-col items-end justify-between h-[56px] sm:h-[96px] py-0 sm:py-1 flex-shrink-0">
        <div className="text-right">
          <p
            className="text-[11px] sm:text-sm font-black"
            style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}
          >
            {priceData.price}
          </p>
          {priceData.isLive && bondingProgress !== null ? (
            <p className="text-[8px] font-bold" style={{ color: 'rgba(0, 255, 65, 0.5)', fontFamily: "'Archivo Black', monospace" }}>
              {bondingProgress.toFixed(1)}% curve
            </p>
          ) : (
            <p
              className="text-[9px] sm:text-[11px] font-bold"
              style={{
                color: priceData.isPositive ? '#00FF41' : '#ef4444',
                fontFamily: "'Inter', monospace"
              }}
            >
              {priceData.isPositive ? '+' : ''}{priceData.changeVal}%
            </p>
          )}
        </div>

        {/* Desktop: sparkline + buy */}
        <div className="hidden sm:flex flex-col items-end gap-1.5">
          <PriceChartSVG songId={song.id} width={100} height={36} history={candleHistory} loading={candlesLoading} />
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); if (onBuy) onBuy(song); else navigate(`/song/${song.id}`); }}
              className="px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wide uppercase transition-all active:scale-95 flex items-center gap-1"
              style={{
                background: 'linear-gradient(135deg, #00FF41 0%, #00FF41 100%)',
                color: '#000000',
                boxShadow: '0 1px 8px rgba(0, 255, 65, 0.3)',
                minHeight: '28px',
              }}
            >
              BUY
            </button>
            {song.mintAddress && (
              <button
                onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(0, 255, 65, 0.06)', border: '1.5px solid rgba(0, 255, 65, 0.35)', color: '#00FF41' }}
                title="View chart"
              >
                <BarChart2 size={12} />
              </button>
            )}
          </div>
        </div>
        {/* Mobile: compact BUY pill */}
        <div className="flex flex-col items-end gap-1 sm:hidden">
          <button
            className="px-3 py-1.5 rounded-full text-[9px] font-bold tracking-wide uppercase transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00FF41 0%, #00FF41 100%)',
              color: '#000000',
              boxShadow: '0 1px 8px rgba(0, 255, 65, 0.3)',
              minHeight: '28px',
            }}
            onClick={(e) => { e.stopPropagation(); if (onBuy) onBuy(song); else navigate(`/song/${song.id}`); }}
          >
            BUY
          </button>
          {song.mintAddress && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/song/${song.id}`); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(0, 255, 65, 0.06)', border: '1.5px solid rgba(0, 255, 65, 0.35)', color: '#00FF41' }}
              title="View chart"
            >
              <BarChart2 size={12} />
            </button>
          )}
        </div>
      </div>

      {showPlaylistModal && (
        <div onClick={e => e.stopPropagation()}>
          <AddToPlaylistModal songId={song.id} title={title} artist={artist} coverImage={coverImage} isOpen={showPlaylistModal} onClose={() => setShowPlaylistModal(false)} />
        </div>
      )}
    </motion.div>
  );
};

export default SongRow;
