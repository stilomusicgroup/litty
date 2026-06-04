import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { usePlayer, PlayerSong } from '@/contexts/PlayerContext';
import { useAuth } from '@/hooks/use-privy-auth';
import { useMyPlaylist } from '@/hooks/useMyPlaylist';
import { useIsMobile } from '@/hooks/use-mobile';
import { isSeedSong } from '@/utils/songFilters';
import { triggerHapticFeedback } from '@/utils/haptic';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import {
  Play, Pause, SkipForward, SkipBack, Shuffle, Repeat, Repeat1,
  Volume2, Heart, MoreHorizontal, Plus, Upload, Search, Music,
  ListMusic, Maximize2, Share2, TrendingUp, ChevronLeft, ChevronRight,
  GripVertical, X,
} from 'lucide-react';
import { usePumpFunPrice } from '@/hooks/usePumpFunPrice';
import { useSongCandles } from '@/hooks/useSongCandles';
import EqualizerBars from '@/components/EqualizerBars';
import { PlayerWaveform } from '@/components/PlayerWaveform';
import { PlayerLeftSidebar } from '@/components/PlayerLeftSidebar';
import { PlayerRightSidebar } from '@/components/PlayerRightSidebar';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import DiscoverPage from '@/components/DiscoverPage';
import LikeButton from '@/components/LikeButton';
import RepostButton from '@/components/RepostButton';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG = '#000000';
const SURFACE = '#111111';
const CARD = '#111111';
const BORDER = 'rgba(255,255,255,0.06)';
const GREEN = '#00FF41';
const GREEN_ACCENT = '#00FF41';
const GREEN_GLOW = '#00FF41';
const TEXT_PRIMARY = '#FFFFFF';
const TEXT_SECONDARY = '#A1A1A1';
const TEXT_TERTIARY = '#6B6B6B';
const DANGER = '#FF3B3B';

// ─── Inject keyframes once ────────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('stream-page-keyframes')) {
  const el = document.createElement('style');
  el.id = 'stream-page-keyframes';
  el.textContent = `
    @keyframes playPulse { 0%,100%{box-shadow:0 0 20px #00FF41} 50%{box-shadow:0 0 40px #00FF41} }
    @keyframes waveBar1 { 0%,100%{height:20%} 50%{height:100%} }
    @keyframes waveBar2 { 0%,100%{height:100%} 50%{height:20%} }
    @keyframes waveBar3 { 0%,100%{height:60%} 50%{height:100%} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes trackGlow { 0%{background:rgba(0, 255, 65, 0.08)} 100%{background:transparent} }
  `;
  document.head.appendChild(el);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(s: number): string {
  if (!isFinite(s) || s <= 0) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// ─── TokenChip ────────────────────────────────────────────────────────────────
function TokenChip({ symbol, color }: { symbol: string; color?: string }) {
  const c = color ?? GREEN;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 20,
        padding: '0 8px',
        borderRadius: 8,
        background: `${c}1a`,
        border: `1px solid ${c}4d`,
        color: c,
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      ${symbol}
    </span>
  );
}

// ─── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div
      style={{
        height: 72,
        borderRadius: 12,
        background: CARD,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.03), transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
      />
    </div>
  );
}

// ─── Cover art placeholder ────────────────────────────────────────────────────
function CoverPlaceholder({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size === 48 ? 8 : 12,
        background: CARD,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Music size={size === 48 ? 20 : 24} style={{ color: BORDER }} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NOW PLAYING CARD (shared mobile + desktop)
// ═══════════════════════════════════════════════════════════════════════════════
interface NowPlayingCardProps {
  horizontal?: boolean;
}

function NowPlayingCard({ horizontal }: NowPlayingCardProps) {
  const {
    currentSong, isPlaying, isLoading, currentTime, duration,
    volume, repeatMode, shuffleMode,
    togglePlay, seek, setVolume, skipNext, skipPrev,
    setRepeatMode, toggleShuffle,
  } = usePlayer();
  const { isInPlaylist, addToPlaylist, removeFromPlaylist } = useMyPlaylist();

  const progressRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  // ─── Swipe gesture state ────────────────────────────────────────────────────
  const SWIPE_THRESHOLD = 60;
  const MAX_SWIPE_VISUAL = 80;
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null);
  const [isSwiping, setIsSwiping] = useState(false);
  const swipeStartX = useRef(0);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  function getSeekFromPointer(e: React.PointerEvent) {
    const el = progressRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * duration;
  }

  const inPlaylist = currentSong ? isInPlaylist(currentSong.songId) : false;

  // Empty state
  if (!currentSong) {
    return (
      <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '24px 16px', textAlign: 'center' }}>
          <motion.div
            animate={{ boxShadow: ['0 0 16px rgba(0, 255, 65, 0.1)', '0 0 32px rgba(0, 255, 65, 0.25)', '0 0 16px rgba(0, 255, 65, 0.1)'] }}
            transition={{ duration: 3, repeat: Infinity }}
            style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(0, 255, 65, 0.04)',
              border: '1.5px solid rgba(0, 255, 65, 0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 10px',
            }}
          >
            <Music size={24} style={{ color: 'rgba(0, 255, 65, 0.5)' }} />
          </motion.div>
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>
            Select a track to start playing
          </p>
        </div>
      </div>
    );
  }

  // ─── Swipe handlers ─────────────────────────────────────────────────────────
  function onSwipeStart(clientX: number) {
    swipeStartX.current = clientX;
    setIsSwiping(true);
    setSwipeOffset(0);
    setSwipeDir(null);
  }
  function onSwipeMove(clientX: number) {
    if (!isSwiping) return;
    const delta = clientX - swipeStartX.current;
    const clamped = Math.max(-MAX_SWIPE_VISUAL, Math.min(MAX_SWIPE_VISUAL, delta));
    setSwipeOffset(clamped);
    if (Math.abs(clamped) > SWIPE_THRESHOLD * 0.5) {
      setSwipeDir(clamped < 0 ? 'left' : 'right');
    } else {
      setSwipeDir(null);
    }
  }
  function onSwipeEnd() {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (swipeOffset < -SWIPE_THRESHOLD) {
      triggerHapticFeedback();
      skipNext();
    } else if (swipeOffset > SWIPE_THRESHOLD) {
      triggerHapticFeedback();
      skipPrev();
    }
    setSwipeOffset(0);
    setSwipeDir(null);
  }

  const coverBlock = (
    <div
      style={{
        position: 'relative',
        width: horizontal ? 180 : 120,
        margin: horizontal ? undefined : '0 auto',
        flexShrink: 0,
        userSelect: 'none',
        touchAction: 'pan-y',
        cursor: 'grab',
      }}
      onPointerDown={(e) => { onSwipeStart(e.clientX); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => onSwipeMove(e.clientX)}
      onPointerUp={() => onSwipeEnd()}
      onPointerCancel={() => onSwipeEnd()}
    >
      {/* Left chevron indicator */}
      <div
        style={{
          position: 'absolute',
          left: -28,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: swipeDir === 'right' ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <ChevronLeft size={28} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 6px rgba(0, 255, 65, 0.6))' }} />
      </div>
      {/* Right chevron indicator */}
      <div
        style={{
          position: 'absolute',
          right: -28,
          top: '50%',
          transform: 'translateY(-50%)',
          opacity: swipeDir === 'left' ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: 'none',
          zIndex: 2,
        }}
      >
        <ChevronRight size={28} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 6px rgba(0, 255, 65, 0.6))' }} />
      </div>

      <motion.div
        key={currentSong.songId + '-cover'}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{
          scale: 1,
          opacity: 1,
          x: swipeOffset,
          rotate: swipeOffset * 0.04,
        }}
        transition={{
          scale: { type: 'spring', stiffness: 280, damping: 26 },
          opacity: { type: 'spring', stiffness: 280, damping: 26 },
          x: isSwiping ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 },
          rotate: isSwiping ? { type: 'tween', duration: 0 } : { type: 'spring', stiffness: 400, damping: 30 },
        }}
        style={{
          aspectRatio: '1',
          borderRadius: 12,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: isPlaying
            ? '0 0 24px rgba(0, 255, 65, 0.25), 0 0 48px rgba(0, 255, 65, 0.08), 0 12px 32px rgba(0,0,0,0.7)'
            : '0 12px 32px rgba(0,0,0,0.6)',
          border: isPlaying ? `2px solid ${GREEN}66` : `2px solid #ffffff0f`,
          transition: 'box-shadow 0.5s ease, border-color 0.5s ease',
        }}
      >
        {currentSong.coverImage ? (
          <motion.img
            src={currentSong.coverImage}
            alt={currentSong.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
            animate={isPlaying && !isSwiping ? { scale: [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0,0,0,0.8))', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Music size={36} style={{ color: 'rgba(0, 255, 65, 0.5)' }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, textAlign: 'center', padding: '0 12px' }}>
              {currentSong.title}
            </p>
          </div>
        )}
        {/* Cover overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 10px 10px', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            {currentSong.artist}
          </p>
        </div>
      </motion.div>
    </div>
  );

  const infoBlock = (
    <div style={{ flex: 1 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSong.songId + '-info'}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          <h2 style={{ margin: '0 0 2px', fontWeight: 800, fontSize: horizontal ? 28 : 20, color: '#00FF41', letterSpacing: '-0.02em', textTransform: 'uppercase', lineHeight: 1.1, fontFamily: "'Archivo Black', 'Archivo Black', sans-serif" }}>
            {currentSong.title}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: horizontal ? 16 : 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif" }}>
              {currentSong.artist}
            </span>
            {currentSong.symbol && <TokenChip symbol={currentSong.symbol} />}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Like + Repost row */}
      {!horizontal && currentSong?.songId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6, marginTop: 2 }}>
          <LikeButton songId={currentSong.songId} size="md" showCount variant="green" />
          <RepostButton songId={currentSong.songId} size="md" showCount variant="green" />
        </div>
      )}

      {/* Waveform */}
      <PlayerWaveform progress={progressPct} />

      {/* Time display */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, marginBottom: horizontal ? 16 : 2 }}>
        <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_TERTIARY, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(currentTime)}
        </span>
        <span style={{ fontSize: 11, fontWeight: 400, color: TEXT_TERTIARY, fontVariantNumeric: 'tabular-nums' }}>
          {formatTime(duration)}
        </span>
      </div>

      {/* Progress bar */}
      <div
        ref={progressRef}
        style={{ position: 'relative', height: 20, display: 'flex', alignItems: 'center', cursor: 'pointer', marginBottom: horizontal ? 16 : 6 }}
        onPointerDown={(e) => { isDraggingRef.current = true; setIsDragging(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); seek(getSeekFromPointer(e)); }}
        onPointerMove={(e) => { if (isDraggingRef.current) seek(getSeekFromPointer(e)); }}
        onPointerUp={(e) => { isDraggingRef.current = false; setIsDragging(false); seek(getSeekFromPointer(e)); }}
      >
        <div style={{ width: '100%', height: 4, borderRadius: 4, background: `${GREEN}1a`, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPct}%`, background: GREEN, boxShadow: '0 0 8px rgba(0, 255, 65, 0.7)', transition: isDragging ? 'none' : 'width 0.3s linear' }} />
        </div>
        <div style={{ position: 'absolute', left: `calc(${progressPct}% - 5px)`, width: 10, height: 10, borderRadius: '50%', background: GREEN, boxShadow: '0 0 8px rgba(0, 255, 65, 0.8)', pointerEvents: 'none', transition: isDragging ? 'none' : 'left 0.3s linear' }} />
      </div>

      {/* Transport controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: horizontal ? 12 : 20, marginBottom: horizontal ? 14 : 6 }}>
        <button onClick={() => { triggerHapticFeedback(); toggleShuffle(); }} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: shuffleMode ? `${GREEN}1a` : 'transparent', border: shuffleMode ? `1px solid ${GREEN}4d` : '1px solid transparent', color: shuffleMode ? GREEN : TEXT_TERTIARY, cursor: 'pointer', transition: 'all 0.15s' }}>
          <Shuffle size={20} />
        </button>
        <button onClick={() => { triggerHapticFeedback(); skipPrev(); }} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#ffffff0d', border: '1px solid #ffffff14', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', transition: 'all 0.15s' }}>
          <SkipBack size={22} />
        </button>
        <motion.button onClick={() => { triggerHapticFeedback(); togglePlay(); }} whileTap={{ scale: 0.92 }} style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: GREEN, border: 'none', cursor: 'pointer', boxShadow: isPlaying ? '0 0 30px #00FF41' : '0 0 16px #00FF41', transition: 'box-shadow 0.4s ease', flexShrink: 0, animation: isPlaying ? 'playPulse 2s ease-in-out infinite' : 'none', color: '#000' }}>
          {isLoading ? (
            <motion.div style={{ width: 22, height: 22, borderRadius: '50%', border: '2.5px solid rgba(0,0,0,0.3)', borderTopColor: '#000' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
          ) : isPlaying ? (
            <Pause size={22} />
          ) : (
            <Play size={22} style={{ marginLeft: 2 }} />
          )}
        </motion.button>
        <button onClick={() => { triggerHapticFeedback(); skipNext(); }} style={{ width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#ffffff0d', border: '1px solid #ffffff14', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', transition: 'all 0.15s' }}>
          <SkipForward size={22} />
        </button>
        <button onClick={() => { triggerHapticFeedback(); const next: Record<string, 'off' | 'one' | 'all'> = { off: 'all', all: 'one', one: 'off' }; setRepeatMode(next[repeatMode]); }} style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: repeatMode !== 'off' ? `${GREEN}1a` : 'transparent', border: repeatMode !== 'off' ? `1px solid ${GREEN}4d` : '1px solid transparent', color: repeatMode !== 'off' ? GREEN : TEXT_TERTIARY, cursor: 'pointer', transition: 'all 0.15s' }}>
          {repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
        </button>
      </div>

      {/* Volume (desktop only) */}
      {horizontal && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 0 }}>
          <Volume2 size={14} style={{ color: TEXT_TERTIARY, flexShrink: 0 }} />
          <div style={{ flex: 1, height: 3, background: BORDER, borderRadius: 2, position: 'relative', cursor: 'pointer' }} onClick={(e) => { const rect = (e.currentTarget as HTMLElement).getBoundingClientRect(); setVolume(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))); }}>
            <div style={{ height: '100%', width: `${volume * 100}%`, background: GREEN, borderRadius: 2 }} />
            <div style={{ position: 'absolute', left: `calc(${volume * 100}% - 5px)`, top: -3.5, width: 10, height: 10, borderRadius: '50%', background: TEXT_PRIMARY }} />
          </div>
        </div>
      )}

      {/* Action buttons (mobile only) */}
      {!horizontal && currentSong?.songId && (
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginTop: 4 }}>
          <button onClick={() => { triggerHapticFeedback(); toast('Playlist feature coming soon'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <ListMusic size={18} style={{ color: TEXT_SECONDARY }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: TEXT_SECONDARY }}>Playlist</span>
          </button>
          <LikeButton songId={currentSong.songId} size="sm" showCount variant="green" />
          <RepostButton songId={currentSong.songId} size="sm" showCount variant="green" />
          <button onClick={() => { triggerHapticFeedback(); toast('Share feature coming soon'); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <Share2 size={18} style={{ color: TEXT_SECONDARY }} />
            <span style={{ fontSize: 11, fontWeight: 500, color: TEXT_SECONDARY }}>Share</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0, 255, 65, 0.08)' }}>
      <div style={{ padding: horizontal ? '0 20px 20px' : '0 12px 12px', display: horizontal ? 'flex' : 'block', gap: horizontal ? 20 : 0, alignItems: horizontal ? 'flex-start' : 'normal' }}>
        {coverBlock}
        {infoBlock}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Track list row (mobile)
// ═══════════════════════════════════════════════════════════════════════════════
interface MobileTrackRowProps {
  index: number;
  song: PlayerSong;
  isActive: boolean;
  isPlayingThis: boolean;
  onPlay: () => void;
  showDragHandle?: boolean;
}

function MobileTrackRow({ index, song, isActive, isPlayingThis, onPlay, showDragHandle }: MobileTrackRowProps) {
  return (
    <div
      onClick={onPlay}
      style={{
        display: 'flex',
        alignItems: 'center',
        height: 72,
        borderRadius: 12,
        background: isActive ? 'rgba(0, 255, 65, 0.05)' : 'transparent',
        border: isActive ? `1px solid ${GREEN}26` : '1px solid transparent',
        marginBottom: 0,
        cursor: 'pointer',
        padding: '0 12px',
        transition: 'all 0.15s ease',
      }}
    >
      {/* Number / Equalizer / Drag handle */}
      <div style={{ width: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {showDragHandle ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="4" y="4" width="12" height="1.5" rx="0.75" fill={TEXT_TERTIARY} />
            <rect x="4" y="9" width="12" height="1.5" rx="0.75" fill={TEXT_TERTIARY} />
            <rect x="4" y="14" width="12" height="1.5" rx="0.75" fill={TEXT_TERTIARY} />
          </svg>
        ) : isPlayingThis ? (
          <EqualizerBars isPlaying size="sm" color={GREEN} />
        ) : (
          <span style={{ fontSize: 13, color: isActive ? GREEN : TEXT_TERTIARY, fontWeight: 500 }}>{index + 1}</span>
        )}
      </div>

      {/* Cover art */}
      {song.coverImage ? (
        <img src={song.coverImage} alt={song.title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0, marginLeft: 12, border: `1px solid ${isActive ? `${GREEN}59` : BORDER}` }} />
      ) : (
        <div style={{ width: 48, height: 48, borderRadius: 8, background: CARD, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: 12, border: `1px solid ${isActive ? `${GREEN}59` : BORDER}` }}>
          <Music size={18} style={{ color: isActive ? GREEN : `${TEXT_TERTIARY}66` }} />
        </div>
      )}

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0, marginLeft: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 500, color: TEXT_PRIMARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1, fontFamily: "'Archivo Black', sans-serif" }}>
            {song.title}
          </p>
          {song.symbol && <TokenChip symbol={song.symbol} />}
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 400, color: TEXT_SECONDARY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {song.artist}
          <span style={{ marginLeft: 4, color: GREEN, fontSize: 11 }}>✓</span>
        </p>
      </div>

      {/* Duration */}
      <span style={{ fontSize: 13, color: TEXT_TERTIARY, flexShrink: 0, fontVariantNumeric: 'tabular-nums', marginRight: 8 }}>
        {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '--'}
      </span>

      {/* More */}
      <button onClick={(e) => e.stopPropagation()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_TERTIARY, padding: 4 }}>
        <MoreHorizontal size={20} />
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MY HITS Tab
// ═══════════════════════════════════════════════════════════════════════════════
function MyHitsTab({ songs, currentSong, isPlaying, onPlay, onCreatePlaylist }: { songs: PlayerSong[]; currentSong: PlayerSong | null; isPlaying: boolean; onPlay: (i: number) => void; onCreatePlaylist?: () => void }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return songs;
    const q = search.toLowerCase();
    return songs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }, [songs, search]);

  return (
    <div style={{ padding: '12px 16px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 12 }}>
        <button onClick={() => { /* handled by parent */ }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, padding: 4 }}>
          <ChevronLeft size={24} />
        </button>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_PRIMARY, fontFamily: "'Archivo Black', sans-serif" }}>MY HITS</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onCreatePlaylist} style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, padding: 4 }}>
            <Plus size={20} />
          </button>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, padding: 4 }}>
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div style={{ display: 'flex', alignItems: 'center', height: 44, borderRadius: 12, background: CARD, border: `1px solid ${BORDER}`, padding: '0 12px', gap: 8, marginBottom: 12 }}>
        <Search size={16} style={{ color: TEXT_TERTIARY, flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search in playlist"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: TEXT_PRIMARY, fontSize: 13, fontFamily: 'inherit' }}
        />
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ height: 32, padding: '0 14px', background: CARD, borderRadius: 8, fontSize: 12, color: TEXT_SECONDARY, display: 'flex', alignItems: 'center' }}>
            Recently added
          </span>
        </div>
        <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>{songs.length} tracks</span>
      </div>

      {/* Track list */}
      {filtered.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>
            {search ? 'No matches found' : 'Browse songs below to add to your playlist'}
          </p>
          {!search && (
            <Link to="/stream" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 18px', borderRadius: 10, background: `${GREEN}14`, border: `1px solid ${GREEN}4d`, color: GREEN, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
              <Music size={13} />
              Browse Songs
            </Link>
          )}
        </div>
      ) : (
        <div>
          {filtered.map((song, i) => {
            const isActive = currentSong?.songId === song.songId;
            const isPlayingThis = isActive && isPlaying;
            return (
              <React.Fragment key={song.songId}>
                <MobileTrackRow
                  index={i}
                  song={song}
                  isActive={isActive}
                  isPlayingThis={isPlayingThis}
                  onPlay={() => onPlay(i)}
                />
                {i < filtered.length - 1 && (
                  <div style={{ height: 1, background: CARD, marginLeft: 72, marginRight: 12 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UP NEXT Tab
// ═══════════════════════════════════════════════════════════════════════════════
function UpNextTab({ songs, currentSong, isPlaying, queue, onPlay }: { songs: PlayerSong[]; currentSong: PlayerSong | null; isPlaying: boolean; queue: PlayerSong[]; onPlay: (i: number) => void }) {
  const queueSongs = queue.length > 0 ? queue : songs.slice(0, 6);

  return (
    <div style={{ padding: '12px 16px 16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: TEXT_PRIMARY, fontFamily: "'Archivo Black', sans-serif" }}>UP NEXT</p>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_SECONDARY, fontSize: 12 }}>Clear</button>
      </div>

      {/* UP NEXT section */}
      <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: GREEN, fontFamily: "'Archivo Black', sans-serif" }}>UP NEXT</p>
      <div>
        {queueSongs.map((song, i) => {
          const isActive = currentSong?.songId === song.songId;
          const isPlayingThis = isActive && isPlaying;
          return (
            <React.Fragment key={song.songId}>
              <MobileTrackRow
                index={i}
                song={song}
                isActive={isActive}
                isPlayingThis={isPlayingThis}
                onPlay={() => onPlay(i)}
                showDragHandle
              />
              {i < queueSongs.length - 1 && (
                <div style={{ height: 1, background: CARD, marginLeft: 72, marginRight: 12 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* RELATED TRACKS section */}
      <p style={{ margin: '24px 0 12px', fontSize: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: GREEN, fontFamily: "'Archivo Black', sans-serif" }}>RELATED TRACKS</p>
      <div>
        {songs.slice(0, 5).map((song, i) => {
          const isActive = currentSong?.songId === song.songId;
          const isPlayingThis = isActive && isPlaying;
          return (
            <React.Fragment key={song.songId}>
              <MobileTrackRow
                index={i}
                song={song}
                isActive={isActive}
                isPlayingThis={isPlayingThis}
                onPlay={() => onPlay(i)}
              />
              {i < Math.min(songs.length, 5) - 1 && (
                <div style={{ height: 1, background: CARD, marginLeft: 72, marginRight: 12 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLAYLISTS Bottom Sheet
// ═══════════════════════════════════════════════════════════════════════════════
function PlaylistsSheet({
  open,
  onClose,
  onCreatePlaylist,
}: {
  open: boolean;
  onClose: () => void;
  onCreatePlaylist: () => void;
}) {
  const { songEntries } = useMyPlaylist();
  const { queue, queueIndex, currentSong, isPlaying, setQueue } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const navigate = useNavigate();

  const nextSongs = queue.slice(queueIndex + 1, queueIndex + 7);

  const handlePlayQueueSong = (i: number) => {
    const actualIndex = queueIndex + 1 + i;
    if (actualIndex < queue.length) {
      setQueue(queue, actualIndex, true);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="h-[85vh] rounded-t-3xl border-t p-0 overflow-hidden [&>button]:hidden"
        style={{
          background: '#000000',
          borderColor: 'rgba(255,255,255,0.06)',
        }}
      >
        {/* Drag handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header: X (left) | Title (center) | Create (right) */}
        <div className="px-5 pt-2 pb-4 flex items-center justify-between">
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.85 }}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </motion.button>

          <h2
            className="text-sm font-black uppercase tracking-[0.15em]"
            style={{
              color: '#FFFFFF',
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            Your Library
          </h2>

          <motion.button
            onClick={() => {
              onClose();
              onCreatePlaylist();
            }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              background: 'rgba(0, 255, 65, 0.1)',
              border: '1px solid rgba(0, 255, 65, 0.25)',
              color: '#00FF41',
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            <Plus size={13} />
            Create
          </motion.button>
        </div>

        {/* Queue toggle chip */}
        <div className="px-5 pb-4">
          <motion.button
            onClick={() => setShowQueue(!showQueue)}
            whileTap={{ scale: 0.92 }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              background: showQueue
                ? 'rgba(0, 255, 65, 0.12)'
                : 'rgba(255,255,255,0.04)',
              border: showQueue
                ? '1px solid rgba(0, 255, 65, 0.3)'
                : '1px solid rgba(255,255,255,0.08)',
              color: showQueue ? '#00FF41' : 'rgba(255,255,255,0.45)',
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            <ListMusic size={13} />
            Queue ({nextSongs.length})
          </motion.button>
        </div>

        {/* Content */}
        <div
          className="px-4 pb-24 overflow-y-auto"
          style={{ height: 'calc(85vh - 164px)' }}
        >
          <AnimatePresence mode="wait">
            {showQueue ? (
              <motion.div
                key="queue"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-col gap-1"
              >
                {nextSongs.length === 0 ? (
                  <div className="flex flex-col items-center py-12">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: 'rgba(0, 255, 65, 0.06)',
                        border: '1px solid rgba(0, 255, 65, 0.12)',
                      }}
                    >
                      <ListMusic
                        size={28}
                        style={{ color: 'rgba(0, 255, 65, 0.4)' }}
                      />
                    </div>
                    <p
                      className="text-sm font-medium mb-1"
                      style={{ color: '#FFFFFF', fontFamily: "'Inter', sans-serif" }}
                    >
                      Queue is empty
                    </p>
                    <p
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Songs you queue will appear here
                    </p>
                  </div>
                ) : (
                  nextSongs.map((song, i) => {
                    const isActive = currentSong?.songId === song.songId;
                    const isPlayingThis = isActive && isPlaying;
                    return (
                      <React.Fragment key={`${song.songId}-${i}`}>
                        <MobileTrackRow
                          index={i}
                          song={song}
                          isActive={isActive}
                          isPlayingThis={isPlayingThis}
                          onPlay={() => handlePlayQueueSong(i)}
                          showDragHandle
                        />
                        {i < nextSongs.length - 1 && (
                          <div
                            style={{
                              height: 1,
                              background: CARD,
                              marginLeft: 72,
                              marginRight: 12,
                            }}
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </motion.div>
            ) : (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="flex flex-col gap-3"
              >
                {/* My Playlist row — premium card */}
                <motion.button
                  onClick={() => {
                    onClose();
                    navigate('/stream');
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center gap-4 p-3.5 rounded-2xl text-left transition-all"
                  style={{
                    background: 'linear-gradient(145deg, #0f0f0f, #0a0a0a)',
                    border: '1px solid #1a1a1a',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    className="w-[60px] h-[60px] rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(0, 255, 65, 0.12), rgba(0, 255, 65, 0.03))',
                      border: '1px solid rgba(0, 255, 65, 0.15)',
                    }}
                  >
                    <ListMusic
                      size={26}
                      style={{ color: 'rgba(0, 255, 65, 0.7)' }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[15px] font-bold text-white truncate"
                      style={{ fontFamily: "'Inter', sans-serif" }}
                    >
                      My Playlist
                    </p>
                    <p
                      className="text-xs mt-0.5 truncate"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {songEntries.length}{' '}
                      {songEntries.length === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>

                  {/* Play chevron */}
                  <ChevronRight
                    size={20}
                    style={{ color: '#00FF41', flexShrink: 0 }}
                  />
                </motion.button>

                {/* Empty state when no tracks */}
                {songEntries.length === 0 && (
                  <div className="flex flex-col items-center py-10 px-6 text-center">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                      style={{
                        background: 'rgba(0, 255, 65, 0.05)',
                        border: '1px solid rgba(0, 255, 65, 0.1)',
                      }}
                    >
                      <Music
                        size={28}
                        style={{ color: 'rgba(0, 255, 65, 0.35)' }}
                      />
                    </div>
                    <p
                      className="text-sm font-medium mb-1.5"
                      style={{
                        color: '#FFFFFF',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Your library is empty
                    </p>
                    <p
                      className="text-xs leading-relaxed mb-5"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Add your favorite tracks to build your personal collection
                    </p>
                    <Link
                      to="/stream"
                      onClick={onClose}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
                      style={{
                        background: 'rgba(0, 255, 65, 0.12)',
                        border: '1px solid rgba(0, 255, 65, 0.3)',
                        color: '#00FF41',
                        fontFamily: "'Archivo Black', sans-serif",
                        textDecoration: 'none',
                      }}
                    >
                      <Music size={14} />
                      Browse Songs
                    </Link>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sparkline chart (SVG)
// ═══════════════════════════════════════════════════════════════════════════════
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 120;
  const height = 36;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
      />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN PREVIEW section — price stats card (no player controls)
// ═══════════════════════════════════════════════════════════════════════════════
function TokenPreviewSection({ song, mintAddress }: { song: PlayerSong | null; mintAddress?: string | null }) {
  const navigate = useNavigate();
  const symbol = song?.symbol ?? 'NOTHIN';

  const { priceUsdStr, loading: priceLoading } = usePumpFunPrice(mintAddress ?? null);
  const { candles, loading: candlesLoading } = useSongCandles(mintAddress ?? null, '1h');

  const sparkData = candles.length >= 2 ? candles.map(c => c.c) : [];
  const firstPrice = sparkData.length > 0 ? sparkData[0] : null;
  const lastPrice = sparkData.length > 0 ? sparkData[sparkData.length - 1] : null;
  const changePct = firstPrice != null && lastPrice != null && firstPrice > 0
    ? ((lastPrice - firstPrice) / firstPrice) * 100
    : null;
  const isPositive = changePct != null ? changePct >= 0 : true;
  const price = priceLoading ? '—' : (priceUsdStr ?? '—');

  if (!song?.songId) return null;

  return (
    <div
      onClick={() => navigate(`/song/${song.songId}`)}
      style={{
        marginTop: 12,
        padding: 16,
        borderRadius: 16,
        background: CARD,
        border: `1px solid ${BORDER}`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${GREEN}4d`; (e.currentTarget as HTMLElement).style.background = '#161616'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = BORDER; (e.currentTarget as HTMLElement).style.background = CARD; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, fontFamily: "'Archivo Black', sans-serif" }}>TOKEN PREVIEW</p>
        <span style={{ height: 18, padding: '0 7px', background: `${GREEN}1a`, border: `1px solid ${GREEN}`, color: GREEN, fontSize: 9, fontWeight: 700, borderRadius: 6, display: 'flex', alignItems: 'center' }}>
          LIVE
        </span>
      </div>

      {/* Price + change row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: TEXT_PRIMARY, fontVariantNumeric: 'tabular-nums', fontFamily: "'Inter', monospace" }}>
            {price}
          </span>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: isPositive ? GREEN : DANGER,
              fontFamily: "'Inter', monospace",
            }}
          >
            {changePct != null ? `${isPositive ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
          </span>
        </div>
        <Sparkline data={sparkData} color={isPositive ? GREEN : DANGER} />
      </div>

      {/* Subtle CTA hint */}
      <p style={{ margin: '8px 0 0', fontSize: 10, color: TEXT_TERTIARY, letterSpacing: '0.05em' }}>
        Tap to view trading page
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main StreamPage
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Banner header ────────────────────────────────────────────────────────────
const BANNER_URL = 'https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f2b391a25fa0767365b2a';

function StreamBanner({ children, isMobile }: { children?: React.ReactNode; isMobile?: boolean }) {
  return (
    <div style={{ position: 'relative', width: '100%', height: isMobile ? 160 : 110, overflow: 'hidden' }}>
      <img
        src={BANNER_URL}
        alt="Music banner"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
        }}
      />
      {/* Full gradient overlay — dark top + full fade to black at bottom */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0.85) 75%, #000000 100%)',
        }}
      />
      {children && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2 }}>
          {children}
        </div>
      )}
    </div>
  );
}

const MOBILE_TABS = ['NOW PLAYING', 'MY HITS', 'PLAYLISTS'] as const;
type MobileTab = (typeof MOBILE_TABS)[number];

export default function StreamPage() {
  const isMobile = useIsMobile();
  const { currentSong, isPlaying, setQueue, queue, queueIndex } = usePlayer();
  const { songEntries, removeFromPlaylist: removeFromMyPlaylist } = useMyPlaylist();
  const { user } = useAuth();

  const { data: songs } = useRealtimeData<SongsResponse[]>(subscribeManySongs, true, '');
  const { data: songDetails } = useRealtimeData<SongDetailsResponse[]>(subscribeManySongDetails, true);

  const [search, setSearch] = useState('');
  const [activePlaylist, setActivePlaylist] = useState('my-hits');
  const [activeTab, setActiveTab] = useState<MobileTab>('NOW PLAYING');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [playlistsSheetOpen, setPlaylistsSheetOpen] = useState(false);

  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    (songDetails ?? []).filter((d) => !isSeedSong(d)).forEach((d) => { map[d.id] = d; });
    return map;
  }, [songDetails]);

  const songsMap = useMemo(() => {
    const map: Record<string, SongsResponse> = {};
    (songs ?? []).filter((s) => !isSeedSong(s) && !s.hidden).forEach((s) => { map[s.id] = s; });
    return map;
  }, [songs]);

  // Merge playlist songs
  const playlistSongs = useMemo((): PlayerSong[] => {
    const result: PlayerSong[] = [];
    for (const entry of songEntries) {
      const id = entry.songId;
      const song = songsMap[id];
      const details = detailsMap[id];
      if (!details) continue;
      result.push({
        songId: id,
        title: details.title ?? song?.name ?? 'Unknown',
        artist: details.artist ?? 'Unknown',
        coverImage: details.coverImage,
        audioUrl: details.audioUrl,
        audiusStreamUrl: details.audiusStreamUrl,
        duration: details.duration ? details.duration / 1000 : undefined,
        genre: details.genre,
        symbol: song?.symbol,
      });
    }
    return result;
  }, [songEntries, songsMap, detailsMap]);

  // Total duration
  const totalDuration = useMemo(() => {
    const secs = playlistSongs.reduce((acc, s) => acc + (s.duration ?? 0), 0);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }, [playlistSongs]);

  const handlePlaySong = useCallback((index: number, songList?: PlayerSong[]) => {
    const list = songList ?? playlistSongs;
    if (list.length === 0) return;
    setQueue(list, index, true);
  }, [playlistSongs, setQueue]);

  // Up next: songs after current in queue
  const upNext = useMemo((): PlayerSong[] => {
    if (!queue.length) return playlistSongs.slice(0, 6);
    const nextIndex = queueIndex + 1;
    if (nextIndex >= queue.length) return queue.slice(0, 5);
    return queue.slice(nextIndex, nextIndex + 6);
  }, [queue, queueIndex, playlistSongs]);

  return (
    <div style={{ minHeight: '100vh', background: BG, position: 'relative', paddingBottom: isMobile ? 160 : 140 }}>
      {/* Decorative green glow */}
      <div aria-hidden style={{ position: 'fixed', top: -80, left: '50%', transform: 'translateX(-50%)', width: 600, height: 300, background: 'radial-gradient(ellipse at center, rgba(0, 255, 65, 0.06) 0%, transparent 65%)', filter: 'blur(40px)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>
        {/* Safe-area spacer for iOS PWA */}
        <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

        {/* MOBILE LAYOUT */}
        {isMobile ? (
          <div>
            {/* Banner with tabs overlaid */}
            <StreamBanner isMobile={isMobile}>
              <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}` }}>
                {MOBILE_TABS.map((tab) => {
                  const active = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        if (tab === 'PLAYLISTS') {
                          setPlaylistsSheetOpen(true);
                        }
                      }}
                      style={{
                        flex: 1,
                        minHeight: 48,
                        padding: '12px 4px',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: active ? '#00FF41' : TEXT_TERTIARY,
                        borderBottom: `2px solid ${active ? '#00FF41' : 'transparent'}`,
                        background: 'none',
                        border: 'none',
                        borderLeft: 'none',
                        borderRight: 'none',
                        borderTop: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontFamily: "'Archivo Black', sans-serif",
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </StreamBanner>

            {/* Tab content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                {activeTab === 'NOW PLAYING' && (
                  <div style={{ padding: '8px 16px 4px' }}>
                    <NowPlayingCard />
                    <TokenPreviewSection song={currentSong} mintAddress={currentSong ? songsMap[currentSong.songId]?.mintAddress : null} />
                  </div>
                )}
                {activeTab === 'MY HITS' && (
                  <MyHitsTab
                    songs={playlistSongs}
                    currentSong={currentSong}
                    isPlaying={isPlaying}
                    onPlay={handlePlaySong}
                    onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
                  />
                )}
                {activeTab === 'PLAYLISTS' && (
                  <div style={{ padding: '16px' }}>
                    <NowPlayingCard />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Playlists bottom sheet */}
            <PlaylistsSheet
              open={playlistsSheetOpen}
              onClose={() => setPlaylistsSheetOpen(false)}
              onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
            />
          </div>
        ) : (
          /* DESKTOP 3-COLUMN LAYOUT */
          <div>
            <StreamBanner isMobile={isMobile} />
            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 20, padding: '0 24px', alignItems: 'start' }}>
            {/* LEFT: Library sidebar */}
            <div style={{ position: 'sticky', top: 80, padding: '20px', borderRadius: 20, border: '1px solid #ffffff14', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
              <PlayerLeftSidebar activePlaylist={activePlaylist} onSelectPlaylist={setActivePlaylist} />
            </div>

            {/* CENTER: Now Playing + Track Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <NowPlayingCard horizontal />
              <TrackTableDesktop
                songs={playlistSongs}
                currentSong={currentSong}
                isPlaying={isPlaying}
                search={search}
                onSearch={setSearch}
                onPlay={handlePlaySong}
                totalDuration={totalDuration}
              />
            </div>

            {/* RIGHT: Up Next + Friends */}
            <div style={{ position: 'sticky', top: 80 }}>
              <PlayerRightSidebar
                upNext={upNext}
                onPlaySong={(i) => {
                  const nextStart = queueIndex + 1;
                  const actualIndex = queue.length ? nextStart + i : i;
                  if (queue.length && actualIndex < queue.length) {
                    setQueue(queue, actualIndex, true);
                  } else {
                    handlePlaySong(i);
                  }
                }}
              />
            </div>
          </div>
        </div>
        )}
      </div>

      <CreatePlaylistModal
        isOpen={showCreatePlaylistModal}
        onClose={() => setShowCreatePlaylistModal(false)}
        onCreated={(playlistId, name) => {
          setActivePlaylist(playlistId);
          setShowCreatePlaylistModal(false);
        }}
      />

      {/* Discover content embedded below the music player */}
      <DiscoverPage />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Desktop Track Table
// ═══════════════════════════════════════════════════════════════════════════════
function TrackTableDesktop({ songs, currentSong, isPlaying, search, onSearch, onPlay, totalDuration }: { songs: PlayerSong[]; currentSong: PlayerSong | null; isPlaying: boolean; search: string; onSearch: (q: string) => void; onPlay: (index: number, all: PlayerSong[]) => void; totalDuration: string }) {
  const filtered = useMemo(() => {
    if (!search.trim()) return songs;
    const q = search.toLowerCase();
    return songs.filter((s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q));
  }, [songs, search]);

  return (
    <div style={{ borderRadius: 20, border: '1px solid #ffffff14', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontWeight: 900, fontSize: 20, color: '#fff', textTransform: 'uppercase', letterSpacing: '-0.01em', fontFamily: "'Archivo Black', sans-serif" }}>
            My Playlist
          </h3>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            {songs.length} tracks · {totalDuration}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `${GREEN}66`, pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search in playlist"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 34,
                paddingRight: 12,
                paddingTop: 9,
                paddingBottom: 9,
                borderRadius: 10,
                background: `${GREEN}08`,
                border: `1px solid ${GREEN}26`,
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = `${GREEN}66`; }}
              onBlur={(e) => { (e.currentTarget as HTMLInputElement).style.borderColor = `${GREEN}26`; }}
            />
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap' }}>
            Recently added
          </span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, margin: 0 }}>
            {search ? 'No matches found' : 'Browse songs below to add to your playlist'}
          </p>
          {!search && (
            <Link to="/stream" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, padding: '8px 18px', borderRadius: 10, background: `${GREEN}14`, border: `1px solid ${GREEN}4d`, color: GREEN, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
              <Music size={13} />
              Browse Songs
            </Link>
          )}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ffffff0d' }}>
                <th style={{ width: 40, padding: '6px 8px 6px 14px', textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>#</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400, letterSpacing: '0.1em' }}>TITLE</th>
                <th style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400, letterSpacing: '0.1em' }}>ARTIST</th>
                <th style={{ padding: '6px 8px', textAlign: 'right', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400, letterSpacing: '0.1em' }}>TIME</th>
                <th style={{ width: 40, padding: '6px 12px 6px 8px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((song, i) => {
                const isActive = currentSong?.songId === song.songId;
                const isPlayingThis = isActive && isPlaying;
                return (
                  <tr
                    key={song.songId}
                    onClick={() => onPlay(i, filtered)}
                    style={{ cursor: 'pointer', background: isActive ? `${GREEN}0d` : 'transparent', borderLeft: isActive ? `2px solid ${GREEN}` : '2px solid transparent', transition: 'all 0.15s ease' }}
                  >
                    <td style={{ width: 40, padding: '10px 8px 10px 14px', textAlign: 'center' }}>
                      {isPlayingThis ? (
                        <EqualizerBars isPlaying size="sm" color={GREEN} />
                      ) : (
                        <span style={{ fontSize: 12, color: isActive ? GREEN : 'rgba(255,255,255,0.3)' }}>
                          {i + 1}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: '#ffffff0d', border: `1px solid ${isActive ? `${GREEN}59` : '#ffffff0f'}` }}>
                          {song.coverImage ? (
                            <img src={song.coverImage} alt={song.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Music size={14} style={{ color: isActive ? GREEN : '#ffffff33' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: isActive ? GREEN : '#fff', textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, flex: 1, fontFamily: "'Archivo Black', sans-serif" }}>
                            {song.title}
                          </p>
                          {song.symbol && <TokenChip symbol={song.symbol} />}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                        {song.artist}
                        <span style={{ marginLeft: 4, color: GREEN, fontSize: 10 }}>✓</span>
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        {song.duration ? `${Math.floor(song.duration / 60)}:${String(Math.floor(song.duration % 60)).padStart(2, '0')}` : '--'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px 10px 8px', textAlign: 'right' }}>
                      <button onClick={(e) => e.stopPropagation()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 2 }}>
                        <MoreHorizontal size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
