import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Play, Pause, ListPlus, BarChart2, ShoppingCart, ArrowUpDown } from 'lucide-react';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import QuickBuyModal from '@/components/QuickBuyModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { usePlayer } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/use-privy-auth';
import { useTheme } from '@/hooks/use-theme';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useArtistVerified } from '@/hooks/use-artist-verified';
import { toast } from 'sonner';
import type { SongsResponse } from '@/lib/collections/songs';
import { setSongsBuys, subscribeSongsBuys } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribeSongStreams, SongStreamsResponse } from '@/lib/collections/songStreams';
import { poppinsFont, orbitronFont } from '@/theme';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { formatStreamCount } from '@/utils/formatCount';
import { subscribeManyReposts } from '@/lib/collections/reposts';
import type { RepostsResponse } from '@/lib/collections/reposts';
import { useCostBasis, estimateTokensFromSol } from '@/hooks/use-cost-basis';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import ViralSongCardModal from '@/components/ViralSongCardModal';
import RepostButton from '@/components/RepostButton';
import SwapBottomSheet from '@/components/SwapBottomSheet';

interface SongCardProps {
  song: SongsResponse;
  details?: SongDetailsResponse | null;
  bondingProgress?: number | null;
  priceSol?: number | null;
}

const SongCard: React.FC<SongCardProps> = ({ song, details, bondingProgress: _bondingProgress = null, priceSol = null }) => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { user } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const isArtistVerified = useArtistVerified(song.creator);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [showQuickBuy, setShowQuickBuy] = useState(false);
  const [showViralCard, setShowViralCard] = useState(false);
  const [showSwapSheet, setShowSwapSheet] = useState(false);
  const { recordBuyLot } = useCostBasis();

  // ── Repost state (for ViralSongCardModal count) ───────────────────────────
  const { data: repostDocs } = useRealtimeData<RepostsResponse[]>(
    subscribeManyReposts,
    true,
    `where songId = '${song.id}'`,
  );
  const repostCount = repostDocs?.length ?? 0;

  const coverImage = details?.coverImage;
  const title = details?.title ?? song.name;
  const artist = details?.artist ?? 'Unknown Artist';
  const songId = song.id;
  const isThisSong = currentSong?.songId === songId;

  const { data: streamData } = useRealtimeData<SongStreamsResponse | null>(
    subscribeSongStreams,
    !!song.id,
    song.id,
  );

  const { priceUsdStr, priceSolStr } = usePumpFunPrice(song.mintAddress ?? null);
  const hasLivePrice = priceUsdStr !== '—' || priceSolStr !== '—';
  const priceDisplay = hasLivePrice
    ? (priceUsdStr !== '—' ? priceUsdStr : priceSolStr)
    : '—';
  const athDisplay = '—';
  // Bonding curve progress bar display (if live data available)
  const bondingProgressVal = _bondingProgress ?? null;
  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : null;

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

  const handleCardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    navigate(`/song/${song.id}`);
  };

  const handleArtistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    navigate(`/artist/${song.creator}`);
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

  const handleBuy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    setShowQuickBuy(true);
  };

  const handleSwap = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    if (!song.mintAddress) {
      toast.error('This song does not have a tradable token yet.');
      return;
    }
    setShowSwapSheet(true);
  };

  const handleQuickBuyConfirm = async (_song: SongsResponse, solAmount: number, slipBps?: number) => {
    setShowQuickBuy(false);
    if (!user) { toast.error('Connect wallet to trade'); return; }
    const lamports = Math.round(solAmount * 1_000_000_000);
    try {
      const buyId = crypto.randomUUID().replace(/-/g, '');
      const success = await setSongsBuys(song.id, buyId, { solAmt: lamports, slip: slipBps ?? 500 });
      if (success) {
        toast.success(`Bought ${title} tokens!`);

        // Subscribe to buy confirmation and record cost basis lot
        let unsub: (() => Promise<void>) | null = null;
        unsub = await subscribeSongsBuys(async (buyData) => {
          if (buyData?.tarobase_transaction_hash) {
            unsub?.().catch(() => {});
            try {
              const estimatedTokens = await estimateTokensFromSol(song.id, solAmount);
              await recordBuyLot({
                userAddress: user.address,
                songId: song.id,
                songName: title,
                songSymbol: song.symbol ?? 'TOKEN',
                tokenMint: song.mintAddress ?? '',
                quantity: estimatedTokens,
                costBasisAmount: lamports,
                costBasisCurrency: 'SOL',
                source: 'buy',
                txSignature: buyData.tarobase_transaction_hash,
              });
            } catch (e) {
              console.error('[SongCard] Failed to record buy lot:', e);
            }
          }
        }, song.id, buyId);
      } else {
        toast.error('Buy failed. Try again or open the song for details.');
      }
    } catch (err) {
      console.error('Quick buy failed:', err);
      toast.error(err instanceof Error ? err.message : 'Transaction failed');
    }
  };

  const handleChart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    navigate(`/song/${song.id}`);
  };

  // ── Light mode: dramatically simplified — cover + title/artist/token + BUY ──
  if (!isDark) {
    return (
      <motion.div
        className="group relative overflow-hidden rounded-[20px] transition-all duration-300 hover:-translate-y-0.5"
        style={{
          background: 'rgba(255,255,255,0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.6)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
        whileTap={{ scale: 0.98 }}
        onTapStart={() => navigator.vibrate?.(5)}
      >
        <div className="flex items-center gap-3">
          {/* Cover art 60x60 rounded */}
          <div
            className="w-[60px] h-[60px] rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
            onClick={handleCardClick}
            title={`View ${title}`}
            style={{ background: 'rgba(255,255,255,0.4)' }}
          >
            {coverImage ? (
              <img
                src={coverImage}
                alt={title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music size={24} className="opacity-30" style={{ color: '#1a2744' }} />
              </div>
            )}
            {/* Stream count badge */}
            {streamData && (
              <div
                className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md"
                style={{
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  zIndex: 2,
                }}
              >
                <Play size={8} style={{ color: 'rgba(255,255,255,0.85)' }} />
                <span style={{ fontFamily: "'Inter', monospace", fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
                  {formatStreamCount(streamData.count)}
                </span>
              </div>
            )}
          </div>

          {/* Title + Artist + Token pill */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={handleCardClick}>
            <h3
              className="font-black leading-tight truncate"
              style={{ color: '#1a2744', fontSize: '0.88rem', fontFamily: poppinsFont }}
              title={title}
            >
              {title}
            </h3>
            <button
              onClick={handleArtistClick}
              className="flex items-center gap-1 mt-0.5 text-left truncate max-w-full"
              style={{ color: 'rgba(26,39,68,0.6)', fontSize: '0.75rem', fontWeight: 600 }}
            >
              <span className="truncate">{artist}</span>
              <VerifiedBadge isVerified={isArtistVerified} size="sm" />
            </button>
            {/* Badge row */}
            {(song.hasSplToken || (song.assetType === 'spl' && song.mintStatus === 'cold' && song.beamUpEnabled) || song.assetType === 'streaming') && (
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {song.hasSplToken && (
                  <span className="inline-flex items-center px-2 rounded-full text-[10px] font-bold leading-none bg-green-500/15 text-green-600" style={{ height: 28 }}>⚡ SPL</span>
                )}
                {song.assetType === 'spl' && song.mintStatus === 'cold' && song.beamUpEnabled && (
                  <span className="inline-flex items-center px-2 rounded-full text-[10px] font-bold leading-none bg-cyan-500/15 text-cyan-600" style={{ height: 28 }}>🚀 BEAM</span>
                )}
                {song.assetType === 'streaming' && (
                  <span className="inline-flex items-center px-2 rounded-full text-[10px] font-bold leading-none bg-gray-500/15 text-gray-500" style={{ height: 28 }}>🎵 Streaming Only</span>
                )}
              </div>
            )}
            {symbol && (
              <span
                className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase"
                style={{
                  fontFamily: poppinsFont,
                  border: '2px solid #00FF41',
                  color: '#00FF41',
                  background: 'rgba(255,255,255,0.3)',
                }}
              >
                {symbol}
              </span>
            )}
          </div>

          {/* BUY button */}
          <button
            onClick={handleBuy}
            className="flex-shrink-0 py-2.5 px-5 rounded-full text-xs font-black tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #00FF41 0%, #06d6a0 100%)',
              color: '#1a2744',
              fontFamily: poppinsFont,
              letterSpacing: '0.04em',
              boxShadow: '0 2px 12px rgba(0, 255, 65, 0.35)',
              border: 'none',
            }}
          >
            <ShoppingCart size={12} />
            BUY
          </button>

          {/* SWAP button */}
          {song.mintAddress && (
            <button
              onClick={handleSwap}
              className="flex-shrink-0 py-2.5 px-4 rounded-full text-xs font-black tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-1 active:scale-[0.97]"
              style={{
                background: 'rgba(0, 255, 65, 0.1)',
                color: '#00FF41',
                fontFamily: poppinsFont,
                letterSpacing: '0.04em',
                border: '1.5px solid rgba(0, 255, 65, 0.4)',
                boxShadow: '0 2px 8px rgba(0, 255, 65, 0.15)',
              }}
            >
              <ArrowUpDown size={12} />
              SWAP
            </button>
          )}
        </div>

        {/* Light mode repost row */}
        <div className="flex items-center gap-1.5">
          <RepostButton songId={song.id} size="sm" showCount={true} />
        </div>

        {showPlaylistModal && (
          <AddToPlaylistModal
            songId={songId}
            title={title ?? ''}
            artist={artist}
            coverImage={coverImage}
            isOpen={showPlaylistModal}
            onClose={() => setShowPlaylistModal(false)}
          />
        )}
        <QuickBuyModal
          song={showQuickBuy ? song : null}
          details={details}
          presets={[0.01, 0.1, 0.5]}
          unit="◎"
          onClose={() => setShowQuickBuy(false)}
          onConfirm={handleQuickBuyConfirm}
        />
        <ViralSongCardModal
          song={song}
          details={details}
          repostCount={repostCount}
          bondingProgress={_bondingProgress ?? undefined}
          isOpen={showViralCard}
          onClose={() => setShowViralCard(false)}
        />
      </motion.div>
    );
  }

  // ── Dark mode ──
  return (
    <motion.div
      className="card-shine group relative overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: '#111111',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(255,255,255,0.12)';
        el.style.boxShadow = '0 8px 40px rgba(0,0,0,0.6)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = 'rgba(255,255,255,0.06)';
        el.style.boxShadow = '0 4px 24px rgba(0,0,0,0.5)';
      }}
    >
      {/* Shine overlay */}
      <div className="card-shine-overlay rounded-2xl" />

      {/* ── Album Art ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{ borderRadius: '1rem 1rem 0 0', aspectRatio: '1/1' }}
        onClick={handleCardClick}
        title={`View ${title}`}
      >
        {coverImage ? (
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg,
                hsl(${(song.name.charCodeAt(0) * 7) % 360}, 65%, 20%) 0%,
                hsl(${(song.name.charCodeAt(0) * 7 + 80) % 360}, 75%, 10%) 100%)`,
            }}
          >
            <Music size={52} className="opacity-20 text-white" />
          </div>
        )}

        {/* Bottom gradient for depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent pointer-events-none" />

        {/* Bonding curve progress bar — bottom edge of art */}
        {bondingProgressVal !== null && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: 3, background: 'rgba(0,0,0,0.4)' }}>
            <div
              style={{
                width: `${Math.min(bondingProgressVal, 100)}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #00FF41, #00FF41)',
                boxShadow: '0 0 6px rgba(0, 255, 65, 0.5)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        )}

        {/* Stream count badge — bottom left */}
        {streamData && (
          <div
            className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md z-10"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Play size={10} style={{ color: 'rgba(255,255,255,0.8)' }} />
            <span style={{ fontFamily: "'Inter', monospace", fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>
              {formatStreamCount(streamData.count)}
            </span>
          </div>
        )}

        {/* Play / pause button — bottom right */}
        <button
          onClick={handlePlay}
          className="absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90 z-10"
          style={{
            background: isThisSong && isPlaying
              ? 'rgba(0, 255, 65, 0.85)'
              : 'rgba(0,0,0,0.7)',
            border: `1px solid ${isThisSong && isPlaying ? 'rgba(0, 255, 65, 0.5)' : 'rgba(255,255,255,0.2)'}`,
            backdropFilter: 'blur(8px)',
            boxShadow: isThisSong && isPlaying ? '0 0 14px rgba(0, 255, 65, 0.4)' : 'none',
          }}
          title={isThisSong && isPlaying ? 'Pause' : 'Play'}
        >
          {isThisSong && isPlaying
            ? <Pause size={14} className="text-black" />
            : <Play size={14} className="text-white ml-0.5" />
          }
        </button>
      </div>

      {/* ── Card Body ─────────────────────────────────────── */}
      <div
        className="px-2.5 pt-2.5 pb-3 space-y-2"
        style={{
          background: '#111111',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >

        {/* Title + Artist */}
        <div className="cursor-pointer" onClick={handleCardClick}>
          <h3
            className="font-black leading-tight truncate transition-colors duration-150"
            style={{ color: '#ffffff', letterSpacing: '-0.01em', fontSize: '0.92rem', fontFamily: "'Archivo Black', sans-serif" }}
            title={title}
          >
            {title}
          </h3>
          <button
            onClick={handleArtistClick}
            className="flex items-center gap-1 mt-0.5 text-xs transition-colors duration-150 hover:text-[#00FF41] text-left truncate max-w-full"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <span className="truncate">{artist}</span>
            <VerifiedBadge isVerified={isArtistVerified} size="sm" />
          </button>
        </div>

        {/* Badge row */}
        {(song.hasSplToken || (song.assetType === 'spl' && song.mintStatus === 'cold' && song.beamUpEnabled) || song.assetType === 'streaming') && (
          <div className="flex flex-wrap items-center gap-1">
            {song.hasSplToken && (
              <span className="inline-flex items-center px-2 rounded-full text-[10px] font-bold leading-none bg-green-500/15 text-green-400" style={{ height: 28 }}>⚡ SPL</span>
            )}
            {song.assetType === 'spl' && song.mintStatus === 'cold' && song.beamUpEnabled && (
              <span className="inline-flex items-center px-2 rounded-full text-[10px] font-bold leading-none bg-cyan-500/15 text-cyan-400" style={{ height: 28 }}>🚀 BEAM</span>
            )}
            {song.assetType === 'streaming' && (
              <span className="inline-flex items-center px-2 rounded-full text-[10px] font-bold leading-none bg-gray-500/15 text-gray-400" style={{ height: 28 }}>🎵 Streaming Only</span>
            )}
          </div>
        )}

        {/* ── Token info row: ticker + ATH ── */}
        <div className="flex items-center justify-between gap-1">
          {/* Ticker + price */}
          {symbol && (
            <div className="min-w-0">
              <p
                className="font-black tracking-widest uppercase leading-none mb-0.5"
                style={{
                  fontFamily: orbitronFont,
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  color: '#00FF41',
                  textShadow: '0 0 6px rgba(0, 255, 65, 0.25)',
                }}
              >
                {symbol}
              </p>
              <p
                className="font-bold leading-none"
                style={{
                  fontFamily: orbitronFont,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  color: '#00FF41',
                  textShadow: '0 0 6px rgba(0, 255, 65, 0.25)',
                }}
              >
                {priceDisplay}
              </p>
              {bondingProgressVal !== null && (
                <p className="text-[8px] font-bold leading-none mt-0.5" style={{ color: 'rgba(0, 255, 65, 0.55)', fontFamily: orbitronFont, fontSize: '0.55rem' }}>
                  {bondingProgressVal.toFixed(1)}% curve
                </p>
              )}
            </div>
          )}

          {/* ATH */}
          <div
            className="flex-shrink-0 px-2 py-1 rounded-md"
            style={{
              background: 'rgba(0, 255, 65, 0.06)',
              border: '1px solid rgba(0, 255, 65, 0.18)',
            }}
          >
            <p className="text-[8px] font-bold tracking-widest uppercase leading-none mb-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', monospace" }}>ATH</p>
            <p
              className="font-bold leading-none"
              style={{
                fontFamily: orbitronFont,
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#00FF41',
                textShadow: '0 0 8px rgba(0, 255, 65, 0.25)',
              }}
            >
              {athDisplay}
            </p>
          </div>
        </div>

        {/* ── CTA row: Playlist + BUY + CHART ── */}
        <div className="flex gap-1.5 w-full">
          {/* + Playlist */}
          <button
            onClick={handleAddToPlaylist}
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
            style={{
              background: 'rgba(0, 255, 65, 0.1)',
              border: '1px solid rgba(0, 255, 65, 0.25)',
              color: '#00FF41',
            }}
            title="Add to playlist"
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(0, 255, 65, 0.2)';
              el.style.borderColor = 'rgba(0, 255, 65, 0.5)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.background = 'rgba(0, 255, 65, 0.1)';
              el.style.borderColor = 'rgba(0, 255, 65, 0.25)';
            }}
          >
            <ListPlus size={13} />
          </button>

          {/* BUY */}
          <button
            onClick={handleBuy}
            className="flex-1 min-w-0 py-2 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all duration-200 flex items-center justify-center gap-1 active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #00FF41 0%, #2cb842 100%)',
              color: '#000',
              boxShadow: '0 0 14px rgba(0, 255, 65, 0.35), 0 0 28px rgba(0, 255, 65, 0.12), inset 0 1px 0 rgba(255,255,255,0.25)',
              border: '1px solid rgba(0, 255, 65, 0.5)',
              fontFamily: "'Archivo Black', sans-serif",
              letterSpacing: '0.06em',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = '0 0 22px rgba(0, 255, 65, 0.50), 0 0 44px rgba(0, 255, 65, 0.18), inset 0 1px 0 rgba(255,255,255,0.3)';
              el.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement;
              el.style.boxShadow = '0 0 14px rgba(0, 255, 65, 0.35), 0 0 28px rgba(0, 255, 65, 0.12), inset 0 1px 0 rgba(255,255,255,0.25)';
              el.style.transform = 'translateY(0)';
            }}
          >
            BUY
          </button>

          {/* SWAP */}
          {song.mintAddress && (
            <button
              onClick={handleSwap}
              className="flex-shrink-0 px-2.5 py-2 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-1 active:scale-[0.97]"
              style={{
                background: 'rgba(0, 255, 65, 0.06)',
                border: '1.5px solid rgba(0, 255, 65, 0.35)',
                color: '#00FF41',
                fontFamily: "'Archivo Black', monospace",
                boxShadow: '0 0 10px rgba(0, 255, 65, 0.12)',
                letterSpacing: '0.04em',
              }}
              title="Swap tokens"
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(0, 255, 65, 0.14)';
                el.style.boxShadow = '0 0 16px rgba(0, 255, 65, 0.30)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(0, 255, 65, 0.06)';
                el.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.12)';
              }}
            >
              <ArrowUpDown size={12} />
            </button>
          )}

          {song.mintAddress && (
            <button
              onClick={handleChart}
              className="flex-shrink-0 px-2.5 py-2 rounded-lg text-[10px] font-black tracking-wide uppercase transition-all duration-200 flex items-center justify-center gap-1 active:scale-[0.97]"
              style={{
                background: 'rgba(0, 255, 65, 0.06)',
                border: '1.5px solid rgba(0, 255, 65, 0.35)',
                color: '#00FF41',
                fontFamily: "'Archivo Black', monospace",
                boxShadow: '0 0 10px rgba(0, 255, 65, 0.12)',
                letterSpacing: '0.04em',
              }}
              title="View chart"
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(0, 255, 65, 0.14)';
                el.style.boxShadow = '0 0 16px rgba(0, 255, 65, 0.30)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(0, 255, 65, 0.06)';
                el.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.12)';
              }}
            >
              <BarChart2 size={12} />
            </button>
          )}

          <RepostButton songId={song.id} size="sm" showCount={true} />
        </div>

      </div>

      {showPlaylistModal && (
        <AddToPlaylistModal
          songId={songId}
          title={title ?? ''}
          artist={artist}
          coverImage={coverImage}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
      <QuickBuyModal
        song={showQuickBuy ? song : null}
        details={details}
        presets={[0.01, 0.1, 0.5]}
        unit="◎"
        onClose={() => setShowQuickBuy(false)}
        onConfirm={handleQuickBuyConfirm}
      />
      <SwapBottomSheet
        open={showSwapSheet}
        onClose={() => setShowSwapSheet(false)}
        defaultOutputMint={song.mintAddress ?? undefined}
      />
      <ViralSongCardModal
        song={song}
        details={details}
        repostCount={repostCount}
        bondingProgress={_bondingProgress ?? undefined}
        isOpen={showViralCard}
        onClose={() => setShowViralCard(false)}
      />
    </motion.div>
  );
};

export default SongCard;
