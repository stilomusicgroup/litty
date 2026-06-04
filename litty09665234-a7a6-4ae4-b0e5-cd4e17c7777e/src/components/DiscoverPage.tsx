import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribeManySongs, runGetBondingCurveProgressQueryForSongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManyFollows } from '@/lib/collections/follows';
import type { FollowsResponse } from '@/lib/collections/follows';
import { subscribeManyListeningHistoryGenres } from '@/lib/collections/listeningHistory';
import type { ListeningHistoryGenresResponse } from '@/lib/collections/listeningHistory';
import { usePlayer } from '@/contexts/PlayerContext';
import type { PlayerSong } from '@/contexts/PlayerContext';
import { triggerHapticFeedback } from '@/utils/haptic';
import { isSeedSong } from '@/utils/songFilters';
import { deduplicateSongs } from '@/utils/deduplicateSongs';
import {
  Play, Pause, TrendingUp, Sparkles, Music, ChevronRight,
  RefreshCw, Flame, Clock, Heart, Plus, Search, X, Star,
  Radio, Gem,
} from 'lucide-react';
import SongCard from '@/components/SongCard';
import QuickBuyModal from '@/components/QuickBuyModal';
import { setSongsBuys } from '@/lib/collections/songs';

// ─── Theme constants ──────────────────────────────────────────────────────────

const BG = '#000000';
const CARD_BG = '#111111';
const CARD_SOLID = '#111111';
const NEON = '#00FF41';
const NEON_DIM = 'rgba(0, 255, 65, 0.55)';
const NEON_FAINT = 'rgba(0, 255, 65, 0.2)';
const NEON_GHOST = 'rgba(0, 255, 65, 0.1)';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_BRIGHT = 'rgba(255,255,255,0.12)';
const GLOW = '0 0 18px rgba(0,0,0,0.4)';
const GLOW_STRONG = '0 0 28px rgba(0,0,0,0.5)';
const ORBITRON = "'Archivo Black', sans-serif";
const MUTED = 'rgba(255,255,255,0.45)';
const SUBMUTED = 'rgba(255,255,255,0.3)';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SongEntry {
  song: SongsResponse;
  details: SongDetailsResponse | null;
  bondingProgress?: number;
}

interface RecentEntry { songId: string; title: string; artist: string; coverImage?: string; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPlayerSong(entry: SongEntry): PlayerSong {
  return {
    songId: entry.song.id,
    title: entry.details?.title ?? entry.song.name,
    artist: entry.details?.artist ?? 'Unknown Artist',
    coverImage: entry.details?.coverImage,
    audioUrl: entry.details?.audioUrl,
    audiusStreamUrl: entry.details?.audiusStreamUrl ?? entry.song.audiusStreamUrl,
    duration: entry.details?.duration,
    symbol: entry.song.symbol,
    genre: entry.details?.genre,
  };
}

const ALL_GENRES = [
  'All', 'Hip-Hop', 'R&B', 'Pop', 'Electronic', 'Rock', 'Afrobeats',
  'Latin', 'Gospel', 'Jazz', 'Soul', 'Trap', 'Drill', 'Indie',
];

// ─── Playing bars animation ───────────────────────────────────────────────────

function PlayingBars() {
  return (
    <div
      className="flex items-end gap-[2px] px-1.5 py-1 rounded-full"
      style={{ background: 'rgba(0, 255, 65, 0.75)', backdropFilter: 'blur(4px)' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full"
          style={{ background: '#060A06' }}
          animate={{ height: ['3px', '8px', '3px'] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </div>
  );
}

// ─── Mini Song Card (carousel) ───────────────────────────────────────────────

interface MiniCardProps {
  entry: SongEntry;
  isPlaying: boolean;
  onPlay: () => void;
  onAddToQueue?: () => void;
  onBuy?: (entry: SongEntry) => void;
}

function MiniCard({ entry, isPlaying, onPlay, onAddToQueue, onBuy }: MiniCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const title = entry.details?.title ?? entry.song.name;
  const artist = entry.details?.artist ?? 'Unknown Artist';
  const cover = entry.details?.coverImage;

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="flex-shrink-0 cursor-pointer"
      style={{ touchAction: 'pan-x', width: 'clamp(140px, 40vw, 160px)' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Art — click navigates to song detail */}
      <div
        className="relative rounded-2xl overflow-hidden mb-2"
        style={{
          width: '100%',
          aspectRatio: '1/1',
          boxShadow: isPlaying
            ? `0 4px 20px rgba(0,0,0,0.5), ${GLOW_STRONG}`
            : '0 4px 20px rgba(0,0,0,0.5)',
          border: isPlaying ? `1px solid ${NEON_DIM}` : `1px solid ${NEON_FAINT}`,
          transition: 'box-shadow 0.3s, border-color 0.3s',
        }}
        onClick={() => {
          triggerHapticFeedback();
          navigate(`/song/${entry.song.id}`);
        }}
      >
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `#111111` }}
          >
            <Music size={36} style={{ color: NEON_FAINT }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Playing bars animation */}
        {isPlaying && (
          <div className="absolute top-2 left-2">
            <PlayingBars />
          </div>
        )}

        {/* Play/pause button overlay */}
        <button
          className="absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: isPlaying ? NEON : 'rgba(0,0,0,0.78)',
            border: `1px solid ${isPlaying ? NEON : BORDER}`,
            backdropFilter: 'blur(8px)',
            boxShadow: isPlaying ? GLOW_STRONG : 'none',
            opacity: isPlaying || isHovered ? 1 : 0.85,
          }}
          onClick={(e) => {
            e.stopPropagation();
            triggerHapticFeedback();
            onPlay();
          }}
        >
          {isPlaying
            ? <Pause size={14} style={{ color: '#060A06' }} />
            : <Play size={14} className="text-white ml-0.5" />
          }
        </button>
      </div>

      <div
        className="flex items-center justify-between mt-2 px-1.5 py-1 rounded-lg"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
        }}
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold truncate leading-tight text-white">{title}</p>
          <p className="text-[10px] truncate" style={{ color: MUTED }}>{artist}</p>
          {entry.song.symbol && (
            <span className="text-[9px] font-bold" style={{ fontFamily: ORBITRON, color: NEON_DIM }}>
              ${entry.song.symbol}
            </span>
          )}
        </div>
        {onBuy && (
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(entry); }}
            className="text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all active:scale-90"
            style={{
              background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
              color: '#000',
              fontFamily: "'Archivo Black', sans-serif",
              border: 'none',
              letterSpacing: '0.08em',
            }}
          >
            BUY
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onAddToQueue?.(); }}
          className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center ml-1 transition-colors"
          style={{ background: NEON_GHOST, border: `1px solid ${NEON_FAINT}` }}
          title="Add to queue"
        >
          <Plus size={10} style={{ color: NEON }} />
        </button>
      </div>
    </motion.div>
  );
}

// ─── Recently Played Card ────────────────────────────────────────────────────

interface RecentlyPlayedCardProps {
  entry: RecentEntry;
}

function RecentlyPlayedCard({ entry }: RecentlyPlayedCardProps) {
  const navigate = useNavigate();

  return (
    <motion.div
      whileTap={{ scale: 0.96 }}
      className="flex-shrink-0 w-32 cursor-pointer"
      onClick={() => {
        triggerHapticFeedback();
        navigate(`/song/${entry.songId}`);
      }}
    >
      <div
        className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 mb-1.5"
        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.4)', border: `1px solid ${BORDER}` }}
      >
        {entry.coverImage ? (
          <img src={entry.coverImage} alt={entry.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: '#111111' }}>
            <Music size={14} style={{ color: NEON_FAINT }} />
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-white truncate leading-tight">{entry.title}</p>
      <p className="text-[10px] truncate" style={{ color: MUTED }}>{entry.artist}</p>
    </motion.div>
  );
}

// ─── Made For You Card ───────────────────────────────────────────────────────

interface MadeForYouCardProps {
  entry: SongEntry;
  title: string;
  artist: string;
  cover?: string;
  index: number;
  isPlaying: boolean;
  onBuy?: (entry: SongEntry) => void;
}

function MadeForYouCard({ entry, title, artist, cover, index, isPlaying, onBuy }: MadeForYouCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const bgStyle = cover
    ? { backgroundImage: `url(${cover})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: `#111111` };

  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="h-44 rounded-2xl relative overflow-hidden cursor-pointer"
      style={{
        boxShadow: isPlaying ? `0 4px 24px rgba(0,0,0,0.5), ${GLOW_STRONG}` : '0 4px 24px rgba(0,0,0,0.5)',
        border: isPlaying ? `1px solid ${NEON_DIM}` : `1px solid ${BORDER}`,
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => {
        triggerHapticFeedback();
        navigate(`/song/${entry.song.id}`);
      }}
    >
      <div className="absolute inset-0" style={bgStyle} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {isHovered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.3)' }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{
              background: isPlaying ? NEON : 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${isPlaying ? NEON : BORDER_BRIGHT}`,
              boxShadow: isPlaying ? GLOW_STRONG : GLOW,
            }}
          >
            {isPlaying
              ? <Pause size={18} style={{ color: '#060A06' }} />
              : <Play size={18} className="text-white ml-1" />}
          </div>
        </motion.div>
      )}

      {isPlaying && !isHovered && (
        <div className="absolute top-2 left-2">
          <PlayingBars />
        </div>
      )}

      <div
        className="absolute bottom-0 left-0 right-0 p-3"
        style={{ backdropFilter: 'blur(8px)', background: 'rgba(6,10,6,0.6)' }}
      >
        <p className="text-sm font-bold text-white truncate">{title}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: MUTED }}>{artist}</p>
        {onBuy && (
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(entry); }}
            className="mt-1 w-full py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
              color: '#000',
              fontFamily: "'Archivo Black', sans-serif",
              border: 'none',
            }}
          >
            BUY
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Featured Card (large carousel) ─────────────────────────────────────────

interface FeaturedCardProps {
  entry: SongEntry;
  isPlaying: boolean;
  onPlay: () => void;
  onBuy?: (entry: SongEntry) => void;
}

function FeaturedCard({ entry, isPlaying, onPlay, onBuy }: FeaturedCardProps) {
  const navigate = useNavigate();
  const title = entry.details?.title ?? entry.song.name;
  const artist = entry.details?.artist ?? 'Unknown Artist';
  const cover = entry.details?.coverImage;
  const genre = entry.details?.genre;

  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      className="flex-shrink-0 cursor-pointer relative overflow-hidden rounded-2xl"
      style={{
        width: 'clamp(220px, 60vw, 280px)',
        height: '180px',
        boxShadow: isPlaying
          ? `0 8px 32px rgba(0,0,0,0.6), ${GLOW_STRONG}`
          : '0 8px 32px rgba(0,0,0,0.6)',
        border: isPlaying ? `1px solid ${NEON_DIM}` : `1px solid ${BORDER}`,
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
      onClick={() => { triggerHapticFeedback(); navigate(`/song/${entry.song.id}`); }}
    >
      {/* Background art */}
      <div className="absolute inset-0">
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: '#111111' }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      </div>

      {/* "Featured" badge */}
      <div className="absolute top-3 left-3">
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{
            background: NEON,
            color: '#060A06',
            fontFamily: ORBITRON,
          }}
        >
          <Star size={7} fill="#060A06" />
          Featured
        </div>
      </div>

      {/* Play button */}
      <button
        className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={{
          background: isPlaying ? NEON : 'rgba(0,0,0,0.7)',
          border: `1px solid ${isPlaying ? NEON : BORDER_BRIGHT}`,
          backdropFilter: 'blur(8px)',
          boxShadow: isPlaying ? GLOW_STRONG : GLOW,
        }}
        onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); onPlay(); }}
      >
        {isPlaying
          ? <Pause size={14} style={{ color: '#060A06' }} />
          : <Play size={14} className="text-white ml-0.5" />}
      </button>

      {/* Playing bars */}
      {isPlaying && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2">
          <PlayingBars />
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        {genre && (
          <span
            className="inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded mb-1"
            style={{ background: NEON_GHOST, color: NEON, fontFamily: ORBITRON, border: `1px solid ${NEON_FAINT}` }}
          >
            {genre}
          </span>
        )}
        <p className="text-base font-black text-white truncate leading-tight">{title}</p>
        <p className="text-xs truncate mt-0.5" style={{ color: MUTED }}>{artist}</p>
        {onBuy && (
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(entry); }}
            className="mt-2 w-full py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00FF41 0%, #00D4FF 100%)',
              color: '#000',
              fontFamily: "'Archivo Black', sans-serif",
              boxShadow: '0 0 16px rgba(0,255,65,0.35)',
              border: 'none',
            }}
          >
            BUY
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  subtitle?: string;
  onSeeAll?: () => void;
}

function SectionHeader({ title, icon, subtitle, onSeeAll }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-2 px-2">
      <div>
        <div className="flex items-center gap-1.5 mb-0.5">
          {icon}
          <h2
            className="text-sm font-black text-white"
            style={{ fontFamily: ORBITRON, letterSpacing: '0.05em' }}
          >
            {title}
          </h2>
        </div>
        {subtitle && <p className="text-[11px]" style={{ color: MUTED }}>{subtitle}</p>}
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="flex items-center gap-1 text-xs font-semibold transition-colors"
          style={{ color: NEON, marginTop: '2px' }}
        >
          See all <ChevronRight size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Horizontal Carousel ─────────────────────────────────────────────────────

interface CarouselProps {
  entries: SongEntry[];
  currentSongId?: string;
  isCurrentPlaying: boolean;
  onPlay: (entry: SongEntry, index: number) => void;
  onAddToQueue: (entry: SongEntry) => void;
  onBuy?: (entry: SongEntry) => void;
}

function HorizontalCarousel({ entries, currentSongId, isCurrentPlaying, onPlay, onAddToQueue, onBuy }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2.5 overflow-x-auto pb-2 px-2"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
    >
      {entries.map((entry, i) => (
        <MiniCard
          key={entry.song.id}
          entry={entry}
          isPlaying={entry.song.id === currentSongId && isCurrentPlaying}
          onPlay={() => onPlay(entry, i)}
          onAddToQueue={() => onAddToQueue(entry)}
          onBuy={onBuy}
        />
      ))}
    </div>
  );
}

// ─── New Arrivals Grid Card ──────────────────────────────────────────────────

interface GridCardProps {
  entry: SongEntry;
  isPlaying: boolean;
  onPlay: () => void;
  onBuy?: (entry: SongEntry) => void;
}

function GridCard({ entry, isPlaying, onPlay, onBuy }: GridCardProps) {
  const navigate = useNavigate();
  const title = entry.details?.title ?? entry.song.name;
  const artist = entry.details?.artist ?? 'Unknown Artist';
  const cover = entry.details?.coverImage;

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="cursor-pointer"
      onClick={() => { triggerHapticFeedback(); navigate(`/song/${entry.song.id}`); }}
    >
      <div
        className="relative rounded-xl overflow-hidden mb-1.5"
        style={{
          aspectRatio: '1/1',
          boxShadow: isPlaying ? `0 4px 16px rgba(0,0,0,0.5), ${GLOW}` : '0 4px 16px rgba(0,0,0,0.5)',
          border: `1px solid ${isPlaying ? NEON_DIM : BORDER}`,
          transition: 'box-shadow 0.3s, border-color 0.3s',
        }}
      >
        {cover ? (
          <img src={cover} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: '#111111' }}
          >
            <Music size={24} style={{ color: NEON_FAINT }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        {isPlaying && (
          <div className="absolute top-1.5 left-1.5">
            <PlayingBars />
          </div>
        )}

        {onBuy && (
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(entry); }}
            className="absolute bottom-7 left-1 right-1 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
              color: '#000',
              fontFamily: "'Archivo Black', sans-serif",
              border: 'none',
            }}
          >
            BUY
          </button>
        )}

        <button
          className="absolute bottom-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: isPlaying ? NEON : 'rgba(0,0,0,0.7)',
            border: `1px solid ${isPlaying ? NEON : BORDER}`,
            backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); onPlay(); }}
        >
          {isPlaying
            ? <Pause size={10} style={{ color: '#060A06' }} />
            : <Play size={10} className="text-white ml-px" />}
        </button>
      </div>
      <p className="text-xs font-bold text-white truncate leading-tight px-0.5">{title}</p>
      <p className="text-[10px] truncate px-0.5" style={{ color: MUTED }}>{artist}</p>
    </motion.div>
  );
}

// ─── Bonding progress fetcher ────────────────────────────────────────────────

function useBondingProgress(songIds: string[]) {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const mountedRef = useRef(true);
  const idsKey = songIds.join(',');

  useEffect(() => {
    mountedRef.current = true;
    if (songIds.length === 0) return;
    const fetchAll = async () => {
      const results: Record<string, number> = {};
      await Promise.allSettled(
        songIds.map(async (id) => {
          try {
            const p = await runGetBondingCurveProgressQueryForSongs(id);
            results[id] = p;
          } catch {
            results[id] = 0;
          }
        })
      );
      if (mountedRef.current) setProgress(results);
    };
    fetchAll();
    return () => { mountedRef.current = false; };
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return progress;
}

// ─── Pull-to-refresh ─────────────────────────────────────────────────────────

function PullToRefreshIndicator({ pulling }: { pulling: boolean }) {
  return (
    <AnimatePresence>
      {pulling && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-center py-4"
        >
          <RefreshCw size={16} className="animate-spin" style={{ color: NEON }} />
          <span className="ml-2 text-xs" style={{ color: NEON, fontFamily: ORBITRON }}>Release to refresh</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Search Bar ─────────────────────────────────────────────────────────────

interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
}

function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="px-2 mb-5">
      <div
        className="relative"
        style={{
          background: '#111111',
          border: `1px solid ${BORDER}`,
          borderRadius: '14px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: `0 4px 24px rgba(0,0,0,0.6), ${GLOW}`,
        }}
      >
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: NEON_DIM }}
        />
        <input
          type="text"
          placeholder="Search songs and artists..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-sm py-2.5 pl-8 pr-8 outline-none"
          style={{ fontFamily: 'inherit', color: 'rgba(255,255,255,0.65)' }}
          onFocus={(e) => {
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.border = `1px solid ${BORDER_BRIGHT}`;
              parent.style.boxShadow = `0 0 20px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.6)`;
            }
          }}
          onBlur={(e) => {
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.border = `1px solid ${BORDER}`;
              parent.style.boxShadow = `0 4px 24px rgba(0,0,0,0.6), ${GLOW}`;
            }
          }}
        />
        {value && (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2"
            onClick={() => onChange('')}
          >
            <X size={13} style={{ color: NEON_DIM }} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Discover Page ───────────────────────────────────────────────────────

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentSong, isPlaying, setQueue, addToQueue } = usePlayer();

  const [refreshKey, setRefreshKey] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [buyEntry, setBuyEntry] = useState<SongEntry | null>(null);

  // Pre-select genre from query param (e.g. /discover?genre=Hip-Hop)
  const initialGenre = (() => {
    const param = searchParams.get('genre') ?? 'All';
    return ALL_GENRES.includes(param) ? param : 'All';
  })();
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const touchStartY = useRef(0);
  const [recentlyPlayed] = useState<RecentEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentlyPlayed') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch all approved song details
  const { data: allDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    true,
    'where approved = true'
  );

  // Fetch all songs
  const { data: allSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
  );

  // Fetch follows for the logged-in user (to drive "Made For You")
  const { data: userFollows } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    !!user,
    user ? `where followerAddress = '${user.address}'` : ''
  );

  // Fetch per-genre listening history for the logged-in user
  const { data: genreHistory } = useRealtimeData<ListeningHistoryGenresResponse[]>(
    subscribeManyListeningHistoryGenres,
    !!user,
    user?.address ?? ''
  );

  // Build merged entries (deduplicated by title+artist)
  const allEntries: SongEntry[] = React.useMemo(() => {
    if (!allSongs || !allDetails) return [];
    const cleanDetails = (allDetails ?? []).filter((d) => !isSeedSong(d as any));
    const cleanSongs = deduplicateSongs((allSongs ?? []).filter((s) => !isSeedSong(s as any) && !s.hidden));
    const detailsMap = new Map(cleanDetails.map((d) => [d.id, d]));
    return cleanSongs.map((song) => ({
      song,
      details: detailsMap.get(song.id) ?? null,
    })).filter((e) => e.details !== null);
  }, [allSongs, allDetails]);

  // Bonding progress for all entries
  const songIds = React.useMemo(() => allEntries.map((e) => e.song.id), [allEntries]);
  const progress = useBondingProgress(songIds);

  const entriesWithProgress: SongEntry[] = React.useMemo(
    () => allEntries.map((e) => ({ ...e, bondingProgress: progress[e.song.id] ?? 0 })),
    [allEntries, progress]
  );

  // ── Search filtering ─────────────────────────────────────────────────────

  const searchResults: SongEntry[] = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return entriesWithProgress.filter((e) => {
      const title = (e.details?.title ?? e.song.name).toLowerCase();
      const artist = (e.details?.artist ?? '').toLowerCase();
      return title.includes(q) || artist.includes(q);
    });
  }, [entriesWithProgress, searchQuery]);

  // ── Sections ──────────────────────────────────────────────────────────────

  // Featured: 8 most recently approved songs
  const featuredEntries = React.useMemo(
    () =>
      [...entriesWithProgress]
        .sort((a, b) => {
          const ta = a.details?.tarobase_created_at ?? a.song.tarobase_created_at ?? 0;
          const tb = b.details?.tarobase_created_at ?? b.song.tarobase_created_at ?? 0;
          return tb - ta;
        })
        .slice(0, 8),
    [entriesWithProgress]
  );

  // Trending: sorted by bonding curve progress descending
  const trendingEntries = React.useMemo(
    () =>
      [...entriesWithProgress]
        .sort((a, b) => (b.bondingProgress ?? 0) - (a.bondingProgress ?? 0))
        .slice(0, 15),
    [entriesWithProgress]
  );

  // Made For You: blend of followed artists + genre affinity; fallback to trending
  const followedArtistAddresses = React.useMemo(() => {
    if (!userFollows || userFollows.length === 0) return new Set<string>();
    return new Set(userFollows.map((f) => f.artistAddress.toLowerCase()));
  }, [userFollows]);

  // Compute top 3 genres by weighted score
  const topGenres = React.useMemo((): string[] => {
    if (!genreHistory || genreHistory.length === 0) return [];
    const fourteenDaysAgo = Math.floor(Date.now() / 1000) - 14 * 24 * 60 * 60;
    const scored = genreHistory
      .filter((g) => (g.playCount ?? 0) > 0)
      .map((g) => {
        const recencyBoost = (g.lastPlayedAt ?? 0) >= fourteenDaysAgo ? 2 : 0;
        return { genre: g.genre, score: (g.playCount ?? 0) * 1.0 + recencyBoost };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    return scored.map((s) => s.genre.toLowerCase());
  }, [genreHistory]);

  const madeForYouEntries = React.useMemo(() => {
    const CAP = 8;
    if (!user) return trendingEntries.slice(0, CAP);

    const followedSlice = entriesWithProgress.filter(
      (e) => followedArtistAddresses.has((e.details?.artistAddress ?? '').toLowerCase())
    );
    const genreSlice = topGenres.length > 0
      ? entriesWithProgress.filter(
          (e) =>
            e.details?.genre &&
            topGenres.includes(e.details.genre.toLowerCase()) &&
            !followedSlice.some((f) => f.song.id === e.song.id)
        )
      : [];

    const hasFollowed = followedSlice.length > 0;
    const hasGenre = genreSlice.length > 0;
    if (!hasFollowed && !hasGenre) return trendingEntries.slice(0, CAP);
    if (!hasFollowed) return genreSlice.slice(0, CAP);
    if (!hasGenre) return followedSlice.slice(0, CAP);

    const halfCap = Math.ceil(CAP / 2);
    const followed = followedSlice.slice(0, halfCap);
    const genre = genreSlice.slice(0, CAP - followed.length);
    const blended: SongEntry[] = [];
    const maxLen = Math.max(followed.length, genre.length);
    for (let i = 0; i < maxLen && blended.length < CAP; i++) {
      if (i < followed.length) blended.push(followed[i]);
      if (i < genre.length && blended.length < CAP) blended.push(genre[i]);
    }
    return blended;
  }, [user, entriesWithProgress, followedArtistAddresses, topGenres, trendingEntries]);

  // Genesis Collection: oldest songs first (the platform's first drops)
  const genesisEntries = React.useMemo(() => {
    return [...entriesWithProgress]
      .sort((a, b) => {
        const ta = a.details?.tarobase_created_at ?? a.song.tarobase_created_at ?? 0;
        const tb = b.details?.tarobase_created_at ?? b.song.tarobase_created_at ?? 0;
        return ta - tb; // oldest first
      })
      .slice(0, 15);
  }, [entriesWithProgress]);

  // Visible genres: only show genres that actually have songs
  const visibleGenres = React.useMemo(() => {
    const present = new Set(
      entriesWithProgress
        .map((e) => e.details?.genre?.trim())
        .filter((g): g is string => !!g)
        .map((g) => g.toLowerCase())
    );
    return ['All', ...ALL_GENRES.slice(1).filter((g) => present.has(g.toLowerCase()))];
  }, [entriesWithProgress]);

  // New Arrivals: most recent uploads, genre-filtered
  const newArrivalEntries = React.useMemo(() => {
    let entries = [...entriesWithProgress].sort((a, b) => {
      const ta = a.details?.tarobase_created_at ?? a.song.tarobase_created_at ?? 0;
      const tb = b.details?.tarobase_created_at ?? b.song.tarobase_created_at ?? 0;
      return tb - ta;
    });
    if (selectedGenre !== 'All') {
      entries = entries.filter(
        (e) => e.details?.genre?.toLowerCase() === selectedGenre.toLowerCase()
      );
    }
    return entries.slice(0, 24);
  }, [entriesWithProgress, selectedGenre]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const playSection = useCallback(
    (entries: SongEntry[], index: number) => {
      const songs = entries.map(toPlayerSong);
      setQueue(songs, index);
    },
    [setQueue]
  );

  const handleBuyClick = useCallback((entry: SongEntry) => {
    triggerHapticFeedback();
    setBuyEntry(entry);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const scrollEl = document.getElementById('app-main');
    const scrollTop = scrollEl ? scrollEl.scrollTop : window.scrollY;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (scrollTop <= 0 && delta > 50) setPulling(true);
  };

  const handleTouchEnd = () => {
    if (pulling) {
      setRefreshKey((k) => k + 1);
      setPulling(false);
    }
  };

  const isSearching = searchQuery.trim().length > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen pb-40"
      style={{ background: 'transparent' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
            <PullToRefreshIndicator pulling={pulling} />

      <div className="pt-12">
        {/* Hero header */}
        <div className="px-2 pt-2 pb-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-[0.2em] mb-1"
              style={{ color: NEON_DIM, fontFamily: ORBITRON }}
            >
              Lit Studios
            </p>
            <h1
              className="text-2xl font-black leading-tight"
              style={{ fontFamily: ORBITRON, letterSpacing: '0.04em' }}
            >
              <span className="text-white">Discover</span>
              <br />
              <span style={{ color: NEON, textShadow: `0 0 20px rgba(0,0,0,0.5)` }}>
                New Music
              </span>
            </h1>
          </motion.div>
        </div>

        {/* ── Search Bar ── */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* ── Top Charts CTA ── */}
        <section className="px-2 mb-6">
          <motion.div
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            onClick={() => navigate('/hot100')}
            className="p-4 rounded-2xl cursor-pointer relative overflow-hidden"
            style={{
              background: '#111111',
              border: `1px solid ${BORDER}`,
              boxShadow: GLOW,
            }}
          >
            <div
              className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-25 pointer-events-none"
              style={{ background: `radial-gradient(circle, ${NEON}, transparent)` }}
            />
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={16} style={{ color: NEON }} />
                  <span
                    className="text-xs font-bold uppercase tracking-[0.12em]"
                    style={{ color: NEON, fontFamily: ORBITRON }}
                  >
                    Hot 100
                  </span>
                </div>
                <h3
                  className="text-lg font-black text-white leading-tight"
                  style={{ fontFamily: ORBITRON }}
                >
                  Top Charts
                </h3>
                <p className="text-xs mt-0.5" style={{ color: MUTED }}>The biggest songs on Lit Studios</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold" style={{ color: NEON }}>View all</span>
                <ChevronRight size={14} style={{ color: NEON }} />
              </div>
            </div>
          </motion.div>
        </section>

        {/* ── Search Results ── */}
        {isSearching ? (
          <section className="px-2 mb-6">
            <p className="text-xs mb-3" style={{ color: MUTED }}>
              {searchResults.length > 0
                ? `${searchResults.length} result${searchResults.length !== 1 ? 's' : ''} for "${searchQuery}"`
                : `No results for "${searchQuery}"`}
            </p>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {searchResults.map((entry, i) => (
                  <GridCard
                    key={entry.song.id}
                    entry={entry}
                    isPlaying={entry.song.id === currentSong?.songId && isPlaying}
                    onPlay={() => playSection(searchResults, i)}
                    onBuy={(e) => handleBuyClick(e)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center py-12 text-center">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: NEON_GHOST, border: `1px solid ${BORDER}` }}
                >
                  <Search size={24} style={{ color: NEON_DIM }} />
                </div>
                <p className="text-sm text-white font-bold" style={{ fontFamily: ORBITRON }}>No songs found</p>
                <p className="text-xs mt-1" style={{ color: MUTED }}>Try a different search term</p>
              </div>
            )}
          </section>
        ) : (
          <>
            {/* ── Genesis Collection ── */}
            {genesisEntries.length > 0 && (
              <section className="mb-6">
                <div className="px-2 mb-2 flex items-center gap-2">
                  <Gem size={14} style={{ color: '#00FF41' }} />
                  <h2
                    className="text-sm font-black"
                    style={{ fontFamily: ORBITRON, letterSpacing: '0.05em', color: '#00FF41', textShadow: '0 0 10px rgba(0, 255, 65, 0.25)' }}
                  >
                    Genesis Collection
                  </h2>
                  <span
                    className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                    style={{
                      background: 'rgba(0, 255, 65, 0.12)',
                      color: '#00FF41',
                      border: '1px solid rgba(0, 255, 65, 0.3)',
                      fontFamily: ORBITRON,
                    }}
                  >
                    Genesis
                  </span>
                </div>
                <p className="text-[11px] px-2 mb-2.5" style={{ color: MUTED }}>
                  The earliest drops that started it all
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 px-2">
                  {genesisEntries.map((entry) => (
                    <SongCard
                      key={entry.song.id}
                      song={entry.song}
                      details={entry.details}
                      bondingProgress={entry.bondingProgress ?? null}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Featured on Lit Studio ── */}
            {featuredEntries.length > 0 && (
              <section className="mb-5">
                <div className="px-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <Star size={13} style={{ color: NEON }} fill={NEON} />
                    <h2
                      className="text-sm font-black text-white"
                      style={{ fontFamily: ORBITRON, letterSpacing: '0.05em' }}
                    >
                      Featured on Lit Studio
                    </h2>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    Freshest approved songs from our artists
                  </p>
                </div>
                <div
                  className="flex gap-3 overflow-x-auto pb-2 px-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                  {featuredEntries.map((entry, i) => (
                    <FeaturedCard
                      key={entry.song.id}
                      entry={entry}
                      isPlaying={entry.song.id === currentSong?.songId && isPlaying}
                      onPlay={() => playSection(featuredEntries, i)}
                      onBuy={(e) => handleBuyClick(e)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Recently Played ── */}
            {recentlyPlayed.length > 0 && (
              <section className="mb-5">
                <h2
                  className="text-sm font-black text-white px-2 mb-2"
                  style={{ fontFamily: ORBITRON, letterSpacing: '0.05em' }}
                >
                  Recently Played
                </h2>
                <div
                  className="flex gap-2.5 overflow-x-auto pb-2 px-2"
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
                >
                  {recentlyPlayed.map((entry) => (
                    <RecentlyPlayedCard key={entry.songId} entry={entry} />
                  ))}
                </div>
              </section>
            )}

            {/* ── Trending Now ── */}
            {trendingEntries.length > 0 && (
              <section className="mb-6">
                <SectionHeader
                  title="Trending Now"
                  icon={<Flame size={16} style={{ color: NEON }} />}
                  subtitle="Hottest bonding curves right now"
                  onSeeAll={() => navigate('/hot100')}
                />
                <HorizontalCarousel
                  entries={trendingEntries}
                  currentSongId={currentSong?.songId}
                  isCurrentPlaying={isPlaying}
                  onPlay={(entry, i) => playSection(trendingEntries, i)}
                  onAddToQueue={(entry) => addToQueue(toPlayerSong(entry))}
                  onBuy={(entry) => handleBuyClick(entry)}
                />
              </section>
            )}

            {/* ── Made For You ── */}
            {entriesWithProgress.length > 0 && (
              <section className="mb-6">
                <div className="px-3 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    {user ? (
                      <Heart size={13} style={{ color: NEON }} />
                    ) : (
                      <Radio size={13} style={{ color: NEON }} />
                    )}
                    <h2
                      className="text-sm font-black text-white"
                      style={{ fontFamily: ORBITRON, letterSpacing: '0.05em' }}
                    >
                      {user ? (followedArtistAddresses.size > 0 || topGenres.length > 0 ? 'Made For You' : 'You Might Like') : 'You Might Like'}
                    </h2>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: MUTED }}>
                    {user
                      ? (followedArtistAddresses.size > 0 && topGenres.length > 0
                          ? 'Artists you follow · your top genres'
                          : followedArtistAddresses.size > 0
                          ? 'Songs from artists you follow'
                          : topGenres.length > 0
                          ? 'Based on your listening history'
                          : 'Connect wallet to personalize')
                      : 'Connect wallet to personalize'}
                  </p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 px-1.5">
                  {madeForYouEntries.slice(0, 4).map((entry, index) => {
                    const title = entry.details?.title ?? entry.song.name;
                    const artist = entry.details?.artist ?? 'Unknown Artist';
                    const cover = entry.details?.coverImage;
                    return (
                      <MadeForYouCard
                        key={entry.song.id}
                        entry={entry}
                        title={title}
                        artist={artist}
                        cover={cover}
                        index={index}
                        isPlaying={entry.song.id === currentSong?.songId && isPlaying}
                        onBuy={(e) => handleBuyClick(e)}
                      />
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── New Arrivals + Browse by Genre ── */}
            <section className="mb-6">
              <SectionHeader
                title="New Arrivals"
                icon={<Clock size={16} style={{ color: NEON }} />}
                subtitle="Freshest uploads from Lit Studio artists"
              />

              {/* Genre filter pills */}
              <div
                className="flex gap-2 overflow-x-auto pb-2 px-2 mb-3"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
              >
                {visibleGenres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(genre)}
                    className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all"
                    style={
                      selectedGenre === genre
                        ? {
                            background: NEON,
                            color: '#060A06',
                            border: `1px solid ${NEON}`,
                            fontFamily: ORBITRON,
                            fontSize: '10px',
                            boxShadow: GLOW,
                          }
                        : {
                            background: NEON_GHOST,
                            color: MUTED,
                            border: `1px solid ${BORDER}`,
                            fontFamily: ORBITRON,
                            fontSize: '10px',
                          }
                    }
                  >
                    {genre}
                  </button>
                ))}
              </div>

              {newArrivalEntries.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 px-2">
                  {newArrivalEntries.map((entry, i) => (
                    <GridCard
                      key={entry.song.id}
                      entry={entry}
                      isPlaying={entry.song.id === currentSong?.songId && isPlaying}
                      onPlay={() => playSection(newArrivalEntries, i)}
                      onBuy={(e) => handleBuyClick(e)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center py-10 px-4 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: NEON_GHOST, border: `1px solid ${BORDER}` }}
                  >
                    <Music size={24} style={{ color: NEON_DIM }} />
                  </div>
                  <p
                    className="text-sm text-white font-bold"
                    style={{ fontFamily: ORBITRON }}
                  >
                    No {selectedGenre !== 'All' ? selectedGenre : ''} songs yet
                  </p>
                  {selectedGenre !== 'All' && (
                    <button
                      onClick={() => setSelectedGenre('All')}
                      className="text-xs mt-2 font-semibold"
                      style={{ color: NEON }}
                    >
                      Show all genres
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Empty state */}
            {allEntries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{ background: NEON_GHOST, border: `1px solid ${BORDER}`, boxShadow: GLOW }}
                >
                  <Sparkles size={28} style={{ color: NEON }} />
                </div>
                <h3
                  className="text-base font-black text-white mb-2"
                  style={{ fontFamily: ORBITRON }}
                >
                  Songs loading...
                </h3>
                <p className="text-sm" style={{ color: MUTED }}>New drops appear here as artists launch their songs.</p>
              </div>
            )}
          </>
        )}
      </div>

      <QuickBuyModal
        song={buyEntry ? buyEntry.song : null}
        details={buyEntry?.details}
        presets={[0.01, 0.1, 0.5]}
        unit="◎"
        onClose={() => setBuyEntry(null)}
        onConfirm={async (_song, solAmount, slipBps) => {
          setBuyEntry(null);
          if (!user) { return; }
          const lamports = Math.round(solAmount * 1_000_000_000);
          const buyId = crypto.randomUUID().replace(/-/g, '');
          await setSongsBuys(_song.id, buyId, { solAmt: lamports, slip: slipBps ?? 500 });
        }}
      />
    </div>
  );
}
