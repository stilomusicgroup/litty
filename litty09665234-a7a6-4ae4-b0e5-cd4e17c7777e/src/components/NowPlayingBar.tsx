import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Play, Pause, SkipForward, SkipBack, Volume2,
  Shuffle, Repeat, Repeat1, ChevronDown, ChevronUp, Music, Heart,
  ExternalLink, Share2, TrendingUp, TrendingDown,
  ListMusic, Plus, GripVertical, ListPlus, Check, X,
} from 'lucide-react';
import { usePlayer, PlayerSong } from '@/contexts/PlayerContext';
import { triggerHapticFeedback } from '@/utils/haptic';
import { useAuth } from '@/hooks/use-privy-auth';
import EqualizerBars from '@/components/EqualizerBars';
import PayWhatYouWantModal from '@/components/PayWhatYouWantModal';
import { useMyPlaylist } from '@/hooks/useMyPlaylist';
import { toast } from 'sonner';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useSongArtistVerified } from '@/hooks/use-song-artist-verified';
import { getSongDetails } from '@/lib/collections/songDetails';
import { ADMIN_ADDRESS } from '@/lib/constants';

// CSS keyframes for album art breathing animation
const BREATHING_KEYFRAMES = `
  @keyframes breathe {
    0%, 100% { transform: scale(1.0); }
    50% { transform: scale(1.03); }
  }
`;

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('breathing-keyframes')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'breathing-keyframes';
  styleEl.textContent = BREATHING_KEYFRAMES;
  document.head.appendChild(styleEl);
}


// Routes where the player bar is hidden
const HIDDEN_ROUTES = [/^\/create$/, /^\/terms/, /^\/onboarding/];

function isHiddenRoute(pathname: string) {
  return HIDDEN_ROUTES.some((r) => r.test(pathname));
}

function formatTime(s: number): string {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── Token Price Hook ─────────────────────────────────────────────────────────
// Fetches real bonding curve price for a song token via the bonding-curve progress query.
// Shows "~" while loading. The buy price is not yet available as a policy query;
// this hook will be updated when getBuyPrice/getSellPrice queries are added to the songs policy.

function useTokenPriceDisplay(_songId: string | undefined) {
  // Price display is intentionally "~" until real getBuyPrice policy query is available.
  // Never show hash-derived fake prices — the old approach caused the "$5 → $1" visual bug.
  return { price: null as string | null, change: null as number | null };
}

// ─── Collapsed Bar ───────────────────────────────────────────────────────────

interface CollapsedBarProps {
  onExpand: () => void;
  onHide: () => void;
}

function CollapsedBar({ onExpand, onHide }: CollapsedBarProps) {
  const { currentSong, isPlaying, currentTime, duration, seek, togglePlay, isLoading, skipPrev, skipNext } = usePlayer();
  const { user } = useAuth();
  const { isInPlaylist, toggleInPlaylist } = useMyPlaylist();
  const [prevTitle, setPrevTitle] = useState(currentSong?.title ?? '');
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Detect song change
  useEffect(() => {
    if (!currentSong) return;
    if (currentSong.title !== prevTitle) {
      setPrevTitle(currentSong.title);
    }
  }, [currentSong?.title, prevTitle]);

  // Scrub helpers
  function getSeekFromPointer(e: React.PointerEvent | React.MouseEvent) {
    const el = progressBarRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(('clientX' in e ? e.clientX : 0) - rect.left, rect.width));
    return (x / rect.width) * duration;
  }

  const handleProgressPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsScrubbing(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seek(getSeekFromPointer(e));
  };
  const handleProgressPointerMove = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    seek(getSeekFromPointer(e));
  };
  const handleProgressPointerUp = (e: React.PointerEvent) => {
    if (!isScrubbing) return;
    setIsScrubbing(false);
    seek(getSeekFromPointer(e));
  };

  if (!currentSong) return null;

  return (
    <>
      {/* Bar content — horizontal groups with generous gaps */}
      <div className="flex items-center px-4 py-3 gap-3 md:gap-4 relative" style={{ minHeight: '76px' }}>
        {/* Ambient glow */}
        {isPlaying && (
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 10% 50%, rgba(0, 255, 65, 0.5) 0%, transparent 55%)',
              filter: 'blur(20px)',
            }}
          />
        )}

        {/* ── Group 1: Album art + title + artist ── */}
        <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={onExpand}>
          {/* Album art */}
          <motion.div
            className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden relative"
            animate={isPlaying ? {
              boxShadow: [
                '0 0 6px rgba(0, 255, 65, 0.25), 0 0 12px rgba(0, 255, 65, 0.1)',
                '0 0 14px rgba(0, 255, 65, 0.55), 0 0 28px rgba(0, 255, 65, 0.25)',
                '0 0 6px rgba(0, 255, 65, 0.25), 0 0 12px rgba(0, 255, 65, 0.1)',
              ],
            } : { boxShadow: '0 0 5px rgba(0, 255, 65, 0.12)' }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              border: isPlaying ? '1.5px solid rgba(0, 255, 65, 0.5)' : '1px solid rgba(0, 255, 65, 0.18)',
            }}
          >
            {currentSong.coverImage ? (
              <img src={currentSong.coverImage} alt={currentSong.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #071a07, #0c0318)' }}>
                <Music size={18} style={{ color: '#00FF41', opacity: 0.55 }} />
              </div>
            )}
            {isPlaying && (
              <motion.div
                className="absolute inset-0 rounded-xl"
                style={{ border: '2px solid rgba(0, 255, 65, 0.5)' }}
                animate={{ opacity: [0.8, 0, 0.8] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
            )}
          </motion.div>

          {/* Song info */}
          <div className="min-w-0 flex-1">
            <p
              className="text-[13px] font-bold leading-tight truncate"
              style={{
                color: isPlaying ? '#00FF41' : 'rgba(255,255,255,0.92)',
                letterSpacing: '-0.01em',
                textShadow: isPlaying ? '0 0 10px rgba(0, 255, 65, 0.45)' : 'none',
                transition: 'color 0.3s, text-shadow 0.3s',
                fontFamily: "'Archivo Black', sans-serif",
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              {currentSong.title}
            </p>
            <p
              className="text-[11px] leading-tight truncate"
              style={{
                color: 'rgba(255,255,255,0.45)',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 400,
              }}
            >
              {currentSong.artist}
            </p>
          </div>
        </div>

        {/* ── Waveform visualizer — desktop only ── */}
        <div className="hidden md:flex items-end gap-[2px] flex-shrink-0" style={{ height: 28, width: 'auto' }}>
          {Array.from({ length: 24 }).map((_, i) => {
            // Varied durations & delays so bars never pulse in lockstep
            const duration = 0.55 + (i % 7) * 0.09;
            const delay = (i * 0.07) % 0.9;
            return isPlaying ? (
              <div
                key={i}
                className="waveform-bar"
                style={{
                  height: 28,
                  animationDuration: `${duration}s`,
                  animationDelay: `-${delay}s`,
                  opacity: 0.72 + (i % 3) * 0.09,
                  boxShadow: '0 0 4px rgba(0, 255, 65, 0.55)',
                }}
              />
            ) : (
              <div
                key={i}
                className="waveform-bar-idle"
                style={{ height: 28 }}
              />
            );
          })}
        </div>

        {/* ── Group 2: Buy pill ── */}
        <div className="flex items-center flex-shrink-0">
          {currentSong?.songId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticFeedback();
                window.location.href = `/song/${currentSong.songId}`;
              }}
              className="flex items-center gap-1.5 rounded-full transition-all active:scale-95 flex-shrink-0"
              style={{
                background: 'rgba(0, 255, 65, 0.12)',
                border: '1.5px solid rgba(0, 255, 65, 0.35)',
                padding: '5px 10px',
                minHeight: '24px',
              }}
            >
              {/* Apple Pay SVG mark */}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 0 174 106" height={12} width={Math.round(12 * (174 / 106))} aria-label="Apple Pay" role="img" style={{ flexShrink: 0, overflow: 'visible' }}>
                <g fill="#fff">
                  <path d="M40.58 12.3c2.63-3.3 4.42-7.9 3.93-12.3-3.82.16-8.44 2.54-11.18 5.74-2.45 2.82-4.6 7.53-4.02 11.97 4.26.33 8.61-2.16 11.27-5.41z" />
                  <path d="M44.46 18.07c-6.23-.37-11.53 3.54-14.5 3.54-2.97 0-7.56-3.35-12.43-3.26-6.4.09-12.3 3.72-15.6 9.46-6.65 11.53-1.7 28.63 4.78 38.01 3.17 4.6 6.95 9.74 11.92 9.56 4.78-.18 6.58-3.08 12.35-3.08 5.77 0 7.38 3.08 12.35 2.99 5.14-.09 8.44-4.69 11.61-9.3 3.63-5.31 5.12-10.46 5.21-10.73-.09-.09-10.01-3.82-10.1-15.24-.09-9.56 7.81-14.14 8.17-14.42-4.46-6.58-11.4-7.31-13.87-7.53z" />
                  <path d="M88.64 4.15c10.86 0 18.42 7.49 18.42 18.39S99.63 41 88.51 41H76.77v20.93h-8.63V4.15zm-11.87 30h9.74c7.56 0 11.87-4.08 11.87-10.58s-4.31-10.55-11.83-10.55h-9.78z" />
                  <path d="M109.63 49.04c0-7.11 5.45-11.47 15.11-12.04l11.13-.66v-3.08c0-4.52-3.04-7.23-8.12-7.23-4.82 0-7.87 2.41-8.6 6.11h-7.87c.47-7.56 6.48-13.17 16.76-13.17 9.84 0 16.17 5.24 16.17 13.38v28.01h-7.99v-6.68h-.18c-2.38 4.52-7.56 7.36-12.97 7.36-8.06 0-13.44-4.96-13.44-12.0zm26.24-3.63v-3.15l-10.01.63c-4.99.33-7.83 2.5-7.83 5.99 0 3.58 2.97 5.93 7.49 5.93 5.89 0 10.35-4.05 10.35-9.4z" />
                  <path d="M150.83 76.82v-6.77c.57.14 1.83.14 2.47.14 3.54 0 5.45-1.49 6.62-5.31l.71-2.28-14.42-40.8h9.04l9.98 32.88h.14l9.98-32.88h8.83L169.2 65.5c-3.26 9.23-7.01 12.2-14.86 12.2-.64 0-2.94-.09-3.51-.23v-.65z" />
                </g>
              </svg>
              <span
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '0.55rem',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#00FF41',
                }}
              >
                Buy
              </span>
            </button>
          )}
        </div>

        {/* ── Group 3: Transport controls ── */}
        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); skipPrev(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0, 255, 65, 0.07)', border: '1px solid rgba(0, 255, 65, 0.18)' }}
          >
            <SkipBack size={13} style={{ color: 'rgba(255,255,255,0.65)' }} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); togglePlay(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{
              background: isLoading ? 'rgba(0, 255, 65, 0.12)' : '#00FF41',
              boxShadow: isPlaying
                ? '0 0 18px rgba(0, 255, 65, 0.75), 0 0 36px rgba(0, 255, 65, 0.32)'
                : '0 0 10px rgba(0, 255, 65, 0.35)',
            }}
          >
            {isLoading ? (
              <motion.div className="w-3.5 h-3.5 rounded-full border-2 border-green-900 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
            ) : isPlaying ? (
              <Pause size={14} style={{ color: '#050a05' }} />
            ) : (
              <Play size={14} style={{ color: '#050a05', marginLeft: 1 }} />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); skipNext(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: 'rgba(0, 255, 65, 0.07)', border: '1px solid rgba(0, 255, 65, 0.18)' }}
          >
            <SkipForward size={13} style={{ color: 'rgba(255,255,255,0.65)' }} />
          </button>
        </div>

        {/* ── Group 4: Close × ── */}
        <button
          onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); onHide(); }}
          className="flex-shrink-0 flex items-center justify-center rounded-full transition-all active:scale-90 hover:scale-110"
          style={{
            width: 28,
            height: 28,
            background: 'rgba(0, 255, 65, 0.09)',
            border: '1.5px solid rgba(0, 255, 65, 0.35)',
            boxShadow: '0 0 8px rgba(0, 255, 65, 0.15)',
          }}
          aria-label="Hide mini player"
        >
          <X size={12} style={{ color: 'rgba(0, 255, 65, 0.75)' }} />
        </button>
      </div>

      {/* ── Progress bar row ── */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2.5">
          {/* Current time */}
          <span
            className="text-[10px] tabular-nums flex-shrink-0"
            style={{ fontFamily: "'Inter', monospace", color: 'rgba(0, 255, 65, 0.45)', minWidth: '2.8rem', textAlign: 'right' }}
          >
            {formatTime(currentTime)}
          </span>

          {/* Scrubable track */}
          <div
            ref={progressBarRef}
            className="flex-1 relative flex items-center cursor-pointer group"
            style={{ height: '20px' }}
            onPointerDown={handleProgressPointerDown}
            onPointerMove={handleProgressPointerMove}
            onPointerUp={handleProgressPointerUp}
          >
            {/* Track background */}
            <div
              className="w-full rounded-full overflow-visible"
              style={{ height: isScrubbing ? '5px' : '3px', background: 'rgba(0, 255, 65, 0.12)', transition: 'height 150ms ease', position: 'relative' }}
            >
              {/* Fill */}
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #00FF41, #00D4FF)',
                  boxShadow: '0 0 6px rgba(0, 255, 65, 0.55)',
                  transition: isScrubbing ? 'none' : 'width 0.25s linear',
                }}
              />
            </div>
            {/* Thumb — visible on scrub */}
            <div
              className="absolute w-3 h-3 rounded-full pointer-events-none"
              style={{
                left: `calc(${progressPct}% - 6px)`,
                background: 'white',
                boxShadow: '0 0 8px rgba(0, 255, 65, 0.9), 0 1px 4px rgba(0,0,0,0.5)',
                opacity: isScrubbing ? 1 : 0,
                transition: isScrubbing ? 'none' : 'left 0.25s linear, opacity 150ms ease',
              }}
            />
          </div>

          {/* Total duration */}
          <span
            className="text-[10px] tabular-nums flex-shrink-0"
            style={{ fontFamily: "'Inter', monospace", color: 'rgba(0, 255, 65, 0.3)', minWidth: '2.8rem' }}
          >
            {formatTime(duration)}
          </span>
        </div>
      </div>

    </>
  );
}

// ─── Inline queue row (visual-only drag) ──────────────────────────────────────

function QueueRow({ song, isCurrent, onClick }: { song: PlayerSong; isCurrent: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-xl text-left transition-colors"
      style={{
        background: isCurrent ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255,255,255,0.02)',
        border: isCurrent ? '1px solid rgba(0, 255, 65, 0.25)' : '1px solid transparent',
      }}
    >
      <GripVertical size={14} className="flex-shrink-0 opacity-40 md:hidden" style={{ color: '#00FF41' }} />
      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0a1f0a, #0f0520)' }}>
        {song.coverImage
          ? <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Music size={14} style={{ color: 'rgba(0, 255, 65, 0.3)' }} /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate" style={{ color: isCurrent ? '#00FF41' : 'white' }}>{song.title}</p>
        <p className="text-xs truncate" style={{ color: 'rgba(0, 255, 65, 0.5)' }}>{song.artist}</p>
      </div>
    </button>
  );
}

// ─── Expanded Player ─────────────────────────────────────────────────────────

interface ExpandedPlayerProps {
  onCollapse: () => void;
}

function ExpandedPlayer({ onCollapse }: ExpandedPlayerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentSong, isPlaying, currentTime, duration, volume,
    repeatMode, shuffleMode, isLoading, queue, queueIndex,
    togglePlay, seek, setVolume, skipNext, skipPrev, setRepeatMode, toggleShuffle, jumpToQueueIndex,
  } = usePlayer();

  const { price: tokenPrice, change: tokenChange } = useTokenPriceDisplay(currentSong?.songId);
  const isArtistVerified = useSongArtistVerified(currentSong?.songId);
  const { isInPlaylist: isInMyPlaylist, toggleInPlaylist: toggleMyPlaylist } = useMyPlaylist();
  const [addingToPlaylist, setAddingToPlaylist] = useState(false);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const liked = currentSong ? isInMyPlaylist(currentSong.songId) : false;
  const [lyrics, setLyrics] = useState<string | undefined>(undefined);
  const progressRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);

  // Fetch lyrics for current song
  useEffect(() => {
    const songId = currentSong?.songId;
    if (!songId) return;
    let cancelled = false;
    getSongDetails(songId).then(details => {
      if (!cancelled && details?.lyrics) {
        setLyrics(details.lyrics);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [currentSong?.songId]);

  // Queue: next 3 songs after current
  const nextThreeSongs = queue.slice(queueIndex + 1, queueIndex + 4);

  if (!currentSong) return null;

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function getSeekFromPointer(e: React.PointerEvent) {
    const el = progressRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    seek(getSeekFromPointer(e));
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    seek(getSeekFromPointer(e));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setIsDragging(false);
    seek(getSeekFromPointer(e));
  };

  const handleShare = async () => {
    const text = `Listen to "${currentSong.title}" by ${currentSong.artist} on Lit Studios`;
    const url = `${window.location.origin}/song/${currentSong.songId}`;
    if (navigator.share) {
      try { await navigator.share({ title: currentSong.title, text, url }); } catch { /* dismissed */ }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', stiffness: 380, damping: 38, mass: 0.9 }}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
      style={{ background: 'rgba(6,3,16,0.97)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)' }}
    >
      {/* Blurred album art background layer */}
      {currentSong.coverImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${currentSong.coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(80px)',
            transform: 'scale(1.5)',
            opacity: 0.4,
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(to bottom, rgba(6,3,16,0.3) 0%, rgba(6,3,16,0.7) 50%, rgba(6,3,16,0.95) 100%)' }}
      />

      <div className="relative flex flex-col h-full z-10 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-12 pb-4">
          <button
            onClick={() => { triggerHapticFeedback(); onCollapse(); }}
            className="w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(0, 255, 65, 0.2)', backdropFilter: 'blur(8px)' }}
          >
            <ChevronDown size={20} style={{ color: '#00FF41' }} />
          </button>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'rgba(0, 255, 65, 0.45)' }}>
            Now Playing
          </p>
          <div className="w-11 h-11" /> {/* Spacer for center alignment */}
        </div>

        {/* Album art — 80vw max, CSS breathing animation */}
        <div className="flex justify-center px-4 py-4">
          <div
            className="w-full aspect-square overflow-hidden rounded-2xl relative"
            style={{
              maxWidth: '80vw',
              boxShadow: isPlaying
                ? '0 8px 40px rgba(0, 255, 65, 0.3), 0 24px 80px rgba(0,0,0,0.7)'
                : '0 24px 80px rgba(0,0,0,0.6)',
              animation: isPlaying ? 'breathe 3s ease-in-out infinite' : 'none',
            }}
          >
            {currentSong.coverImage ? (
              <img src={currentSong.coverImage} alt={currentSong.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a1f0a, #0f0520)' }}>
                <Music size={72} style={{ color: '#00FF41', opacity: 0.4 }} />
              </div>
            )}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
                <motion.div className="w-12 h-12 rounded-full border-2 border-green-400 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              </div>
            )}
          </div>
        </div>

        {/* Song info */}
        <div className="px-6 mb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-black text-white leading-tight mb-1" style={{ letterSpacing: '-0.02em' }}>
                {currentSong.title}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { onCollapse(); navigate(`/artist/${currentSong.songId}`); }}
                  className="text-sm font-semibold hover:text-white transition-colors"
                  style={{ color: '#00FF41' }}
                >
                  {currentSong.artist}
                </button>
                <VerifiedBadge isVerified={isArtistVerified} size="sm" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              {currentSong.symbol && (
                <span
                  className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(0, 255, 65, 0.15)', color: '#00FF41', border: '1px solid rgba(0, 255, 65, 0.25)', fontFamily: "'Inter', monospace" }}
                >
                  ${currentSong.symbol}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Removed token-gated preview section */}

        {/* Progress bar — taller on hover, thumb appears on hover */}
        <div
          className="px-6 mb-2"
          onMouseEnter={() => setIsHoveringProgress(true)}
          onMouseLeave={() => setIsHoveringProgress(false)}
          onTouchStart={() => setIsHoveringProgress(true)}
          onTouchEnd={() => setIsHoveringProgress(false)}
        >
          <div
            ref={progressRef}
            className="relative cursor-pointer"
            style={{
              height: isHoveringProgress ? '24px' : '24px',
              display: 'flex',
              alignItems: 'center',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            <div
              className="w-full rounded-full overflow-hidden"
              style={{
                height: isHoveringProgress ? '6px' : '4px',
                background: 'rgba(0, 255, 65, 0.15)',
                transition: 'height 200ms ease',
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: 'linear-gradient(90deg, #00FF41, #00D4FF)',
                  boxShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
                  transition: isDragging ? 'none' : 'width 0.3s linear',
                }}
              />
            </div>
            {/* Thumb handle — appears on hover/touch */}
            <div
              className="absolute w-[14px] h-[14px] rounded-full"
              style={{
                left: `calc(${progressPct}% - 7px)`,
                background: 'white',
                boxShadow: '0 0 10px rgba(0, 255, 65, 0.8), 0 2px 6px rgba(0,0,0,0.4)',
                transition: isDragging ? 'none' : 'left 0.3s linear, opacity 200ms ease',
                opacity: isHoveringProgress ? 1 : 0,
                pointerEvents: 'none',
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs" style={{ fontFamily: "'Inter', monospace", color: 'rgba(0, 255, 65, 0.4)' }}>{formatTime(currentTime)}</span>
            <span className="text-xs" style={{ fontFamily: "'Inter', monospace", color: 'rgba(0, 255, 65, 0.4)' }}>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls row: [Like] [Shuffle] [Prev] [Play/Pause 64px] [Next] [Repeat] [Share] */}
        <div className="px-6 mb-5">
          <div className="flex items-center justify-center gap-3">
            {/* Like button */}
            <button
              onClick={async () => {
                triggerHapticFeedback();
                if (currentSong?.songId) {
                  setAddingToPlaylist(true);
                  await toggleMyPlaylist(currentSong.songId);
                  setAddingToPlaylist(false);
                }
              }}
              disabled={addingToPlaylist}
              className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
              style={{
                background: liked ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                color: liked ? '#ef4444' : 'rgba(220,214,240,0.5)',
                border: liked ? '1px solid rgba(239,68,68,0.3)' : '1px solid transparent',
              }}
            >
              <Heart size={20} fill={liked ? '#ef4444' : 'none'} />
            </button>

            {/* Shuffle */}
            <button
              onClick={() => { triggerHapticFeedback(); toggleShuffle(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
              style={{
                color: shuffleMode ? '#00FF41' : 'rgba(220,214,240,0.5)',
                background: shuffleMode ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,255,255,0.05)',
                border: shuffleMode ? '1px solid rgba(0, 255, 65, 0.3)' : '1px solid transparent',
              }}
            >
              <Shuffle size={18} />
            </button>

            {/* Skip prev */}
            <button
              onClick={() => { triggerHapticFeedback(); skipPrev(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ color: 'rgba(0, 255, 65, 0.85)' }}
            >
              <SkipBack size={22} />
            </button>

            {/* Play/Pause — 64px white circle with dark icon */}
            <button
              onClick={() => { triggerHapticFeedback(); togglePlay(); }}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95"
              style={{
                background: 'white',
                boxShadow: '0 4px 24px rgba(255,255,255,0.25), 0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {isLoading ? (
                <motion.div className="w-6 h-6 rounded-full border-2 border-green-400 border-t-transparent" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
              ) : (
                <>
                  {isPlaying ? <Pause size={28} className="text-gray-900" /> : <Play size={28} className="text-gray-900 ml-1" />}
                </>
              )}
            </button>

            {/* Skip next */}
            <button
              onClick={() => { triggerHapticFeedback(); skipNext(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full transition-all active:scale-90"
              style={{ color: 'rgba(0, 255, 65, 0.85)' }}
            >
              <SkipForward size={22} />
            </button>

            {/* Repeat */}
            <button
              onClick={() => {
                triggerHapticFeedback();
                const next: Record<string, 'off' | 'one' | 'all'> = { off: 'all', all: 'one', one: 'off' };
                setRepeatMode(next[repeatMode]);
              }}
              className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
              style={{
                color: repeatMode !== 'off' ? '#00FF41' : 'rgba(0, 255, 65, 0.5)',
                background: repeatMode !== 'off' ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,255,255,0.05)',
                border: repeatMode !== 'off' ? '1px solid rgba(0, 255, 65, 0.3)' : '1px solid transparent',
              }}
            >
              {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>

            {/* Share button */}
            <button
              onClick={() => { triggerHapticFeedback(); handleShare(); }}
              className="w-10 h-10 flex items-center justify-center rounded-full active:scale-90 transition-all"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(0, 255, 65, 0.5)',
                border: '1px solid transparent',
              }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </div>

        {/* Volume */}
        <div className="px-8 mb-5 flex items-center gap-3">
          <Volume2 size={16} style={{ color: 'rgba(0, 255, 65, 0.35)', flexShrink: 0 }} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="flex-1 h-1.5 rounded-full cursor-pointer"
            style={{ accentColor: '#00FF41' }}
          />
        </div>

        {/* Queue section — next 3 songs */}
        {queue.length > 0 && nextThreeSongs.length > 0 && (
          <div className="px-6 mb-4">
            <div className="flex items-center gap-2 mb-2 px-1">
              <ListMusic size={14} style={{ color: '#00FF41' }} />
              <span className="text-sm font-bold" style={{ color: '#00FF41' }}>Up Next</span>
              <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0, 255, 65, 0.2)', color: '#00FF41' }}>
                {nextThreeSongs.length}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              {nextThreeSongs.map((song, i) => (
                <QueueRow
                  key={`${song.songId}-${i}`}
                  song={song}
                  isCurrent={false}
                  onClick={() => jumpToQueueIndex(queueIndex + 1 + i)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Lyrics section — conditional */}
        {lyrics && (
          <div className="px-6 mb-4">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Music size={14} style={{ color: '#00FF41' }} />
              <span className="text-sm font-bold" style={{ color: '#00FF41' }}>Lyrics</span>
            </div>
            <div className="space-y-1">
              {lyrics.split('\n').map((line, i) => (
                <p
                  key={i}
                  className="text-sm leading-relaxed px-3 py-1.5 rounded-lg transition-colors"
                  style={{
                    color: i === 0 ? '#00FF41' : 'rgba(0, 255, 65, 0.6)',
                    fontWeight: i === 0 ? 700 : 400,
                    background: i === 0 ? 'rgba(0, 255, 65, 0.08)' : 'transparent',
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 mb-4 flex gap-3">
          <button
            onClick={() => { onCollapse(); navigate(`/song/${currentSong.songId}`); }}
            className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{ background: 'rgba(0, 255, 65, 0.12)', border: '1px solid rgba(0, 255, 65, 0.22)', color: '#00FF41' }}
          >
            <ExternalLink size={14} />
            View Song
          </button>
          {user && currentSong.songId && (
            <button
              onClick={async () => {
                triggerHapticFeedback();
                setAddingToPlaylist(true);
                await toggleMyPlaylist(currentSong.songId!);
                setAddingToPlaylist(false);
              }}
              disabled={addingToPlaylist}
              className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: isInMyPlaylist(currentSong.songId)
                  ? 'rgba(0, 255, 65, 0.2)'
                  : 'rgba(0, 255, 65, 0.12)',
                border: isInMyPlaylist(currentSong.songId)
                  ? '1px solid rgba(0, 255, 65, 0.5)'
                  : '1px solid rgba(0, 255, 65, 0.22)',
                color: '#00FF41',
                opacity: addingToPlaylist ? 0.6 : 1,
              }}
            >
              {isInMyPlaylist(currentSong.songId) ? <Check size={14} /> : <Plus size={14} />}
              {isInMyPlaylist(currentSong.songId) ? 'In Playlist' : 'Add to Playlist'}
            </button>
          )}
        </div>

        {/* Removed token-gated collect CTA */}

        {/* Token price ticker — bottom */}
        {tokenPrice && (
          <div className="px-6 mb-2">
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xs font-bold" style={{ fontFamily: "'Inter', monospace", color: 'white' }}>
                {tokenPrice}
              </span>
              {tokenChange !== null && (
                <span
                  className="text-xs font-bold flex items-center gap-1"
                  style={{ color: tokenChange >= 0 ? '#10b981' : '#ef4444' }}
                >
                  {tokenChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {tokenChange >= 0 ? '+' : ''}{tokenChange}%
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>

      {/* Modals */}
      {currentSong && (
        <PayWhatYouWantModal
          open={showCollectModal}
          onClose={() => setShowCollectModal(false)}
          songId={currentSong.songId}
          songTitle={currentSong.title}
          artist={currentSong.artist}
          coverImage={currentSong.coverImage}
        />
      )}
    </motion.div>
  );
}

// ─── Main NowPlayingBar ───────────────────────────────────────────────────────

const HIDDEN_STORAGE_KEY = 'nowplaying_hidden';

export default function NowPlayingBar() {
  const { currentSong, hasPlayed } = usePlayer();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  // isPlayerHidden: persisted via localStorage
  const [isPlayerHidden, setIsPlayerHiddenState] = useState<boolean>(() => {
    try { return localStorage.getItem(HIDDEN_STORAGE_KEY) === 'true'; } catch { return false; }
  });
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  const setIsPlayerHidden = (hidden: boolean) => {
    setIsPlayerHiddenState(hidden);
    try { localStorage.setItem(HIDDEN_STORAGE_KEY, String(hidden)); } catch { /* ignore */ }
  };

  useEffect(() => {
    const el = document.getElementById('app-main') || window;
    const onScroll = () => {
      const scrollY = el === window ? window.scrollY : (el as HTMLElement).scrollTop;
      const delta = scrollY - lastScrollY.current;
      if (delta > 8) setIsVisible(false);
      else if (delta < -8) setIsVisible(true);
      lastScrollY.current = scrollY;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setIsVisible(true); }, [location.pathname]);

  if (!currentSong || !hasPlayed) return null;
  if (isHiddenRoute(location.pathname)) return null;

  // The search bar sits at calc(88px + safe-area + 10px) from bottom.
  // We position the player 12px above the search bar top edge.
  // Search bar height is approx 44px, so its top is at calc(88+10+44)=142px.
  // Player bottom = calc(142px + 12px gap) = 154px + safe-area.
  const PLAYER_BOTTOM = 'calc(154px + env(safe-area-inset-bottom, 0px))';

  return (
    <>
      <AnimatePresence mode="wait">
        {!isExpanded && !isPlayerHidden && (
          <motion.div
            key="collapsed-bar"
            initial={{ y: 120, opacity: 0, scale: 0.6 }}
            animate={{
              y: isVisible ? 0 : 120,
              opacity: isVisible ? 1 : 0,
              scale: isVisible ? 1 : 0.6,
            }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, mass: 0.7 }}
            className="fixed left-4 right-4 md:left-[236px] z-40 rounded-2xl"
            style={{
              bottom: PLAYER_BOTTOM,
              background: 'linear-gradient(135deg, rgba(10,15,10,0.98), rgba(5,10,5,0.98))',
              backdropFilter: 'blur(36px)',
              WebkitBackdropFilter: 'blur(36px)',
              border: '1px solid rgba(0, 255, 65, 0.18)',
              boxShadow: '0 4px 40px rgba(0,0,0,0.8), 0 0 16px rgba(0, 255, 65, 0.06), 0 0 32px rgba(0, 255, 65, 0.03)',
              pointerEvents: isVisible ? 'auto' : 'none',
            }}
          >
            <CollapsedBar
              onExpand={() => setIsExpanded(true)}
              onHide={() => setIsPlayerHidden(true)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating restore button — bottom-right corner when player is hidden */}
      <AnimatePresence>
        {!isExpanded && isPlayerHidden && (
          <motion.button
            key="restore-fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 24 }}
            onClick={() => { triggerHapticFeedback(); setIsPlayerHidden(false); }}
            className="fixed z-50 flex items-center justify-center rounded-full"
            style={{
              bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
              right: '16px',
              width: 52,
              height: 52,
              background: 'linear-gradient(135deg, hsla(260,90%,6%,0.97), hsla(260,90%,4%,0.97))',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(0, 255, 65, 0.55)',
              boxShadow: '0 0 18px rgba(0, 255, 65, 0.35), 0 0 36px rgba(0, 255, 65, 0.15), 0 4px 20px rgba(0,0,0,0.6)',
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Show mini player"
          >
            <Music size={20} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 6px rgba(0, 255, 65, 0.8))' }} />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isExpanded && <ExpandedPlayer onCollapse={() => setIsExpanded(false)} />}
      </AnimatePresence>
    </>
  );
}
