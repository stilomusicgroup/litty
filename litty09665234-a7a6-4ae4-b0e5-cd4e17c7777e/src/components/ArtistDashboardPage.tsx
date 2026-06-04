/**
 * ArtistDashboardPage — Profile page routed from /profile (bottom nav)
 * Two views: Artist (has artist profile) | Listener (no artist profile)
 * Also handles unauthenticated state with sign-in CTA.
 *
 * PREMIUM UI/UX REFACTOR — all logic, data hooks, and backend connections preserved.
 */

import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribeManyFollows } from '@/lib/collections/follows';
import type { FollowsResponse } from '@/lib/collections/follows';
import { subscribeManyPackPurchases } from '@/lib/collections/packPurchases';
import type { PackPurchasesResponse } from '@/lib/collections/packPurchases';
import { subscribeManySongStreams, SongStreamsResponse } from '@/lib/collections/songStreams';
import { useMyPlaylist } from '@/hooks/useMyPlaylist';
import ArtistEarningsTab from '@/components/ArtistEarningsTab';
import ArtistAlbumSection from '@/components/ArtistAlbumSection';
import MyTokensSection from '@/components/MyTokensSection';
import { BlurFade } from '@/components/effects';
import { toast } from 'sonner';
import {
  Music, TrendingUp, Disc3, Play, Pause, ArrowLeft, Menu,
  Edit3, LogOut, ListMusic, ChevronRight, Package, Mic2,
  X, Download, Share2, Heart, MoreHorizontal, Verified, Users,
  Globe, Calendar, Zap, Trophy, Flame, Clock,
} from 'lucide-react';
import { ArtistHeroSection } from './dashboard/ArtistHeroSection';
import { CyberStatsBar } from './dashboard/CyberStatsBar';
import { OverviewTab } from './dashboard/OverviewTab';
import { RecentReleasesCarousel } from './dashboard/RecentReleasesCarousel';
import { FanFeedSection } from './dashboard/FanFeedSection';
import { usePlayer } from '@/contexts/PlayerContext';
import { useListLiveData } from '@/hooks/use-list-live-data';

// ─── Colors ───────────────────────────────────────────────────────────────────
const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const ACCENT_GREEN = '#00FF88';
const PURPLE = '#A855F7';

// ─── Keyframes ────────────────────────────────────────────────────────────────
const KeyframesStyle = () => (
  <style>{`
    @keyframes floatGlow {
      0%, 100% { box-shadow: 0 0 30px rgba(0, 255, 65, 0.3), 0 0 60px rgba(0, 255, 65, 0.1); }
      50% { box-shadow: 0 0 40px rgba(0, 255, 65, 0.5), 0 0 80px rgba(0, 255, 65, 0.2); }
    }
    @keyframes scanline {
      0% { transform: translateY(0); }
      100% { transform: translateY(4px); }
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes pulseGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.8; }
    }
  `}</style>
);

// ─── Glass Card Style ─────────────────────────────────────────────────────────
const GLASS_CARD: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.03)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(0, 255, 65, 0.22)',
  boxShadow: '0 0 20px rgba(0, 255, 65, 0.05)',
};

const GLASS_CARD_HOVER = {
  borderColor: 'rgba(0, 255, 65, 0.4)',
  boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)',
};

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{
  title: string;
  action?: { label: string; onClick: () => void };
  delay?: number;
}> = ({ title, action, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
    className="flex items-center justify-between mb-3"
  >
    <h2
      className="text-[10px] font-black uppercase tracking-widest"
      style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', monospace" }}
    >
      {title}
    </h2>
    {action && (
      <button
        onClick={action.onClick}
        className="text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 transition-colors"
        style={{ color: `${NEON_GREEN}99` }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = NEON_GREEN)}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = `${NEON_GREEN}99`)}
      >
        {action.label}
        <ChevronRight size={10} />
      </button>
    )}
  </motion.div>
);

// ─── Top Header ───────────────────────────────────────────────────────────────
const TopHeader: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between mb-4 pt-2"
    >
      <motion.button
        onClick={onBack ?? (() => navigate(-1))}
        whileTap={{ scale: 0.9 }}
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <ArrowLeft size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
      </motion.button>

      <div className="flex flex-col items-center">
        <h1
          className="text-sm font-black uppercase tracking-[0.2em]"
          style={{
            fontFamily: "'Archivo Black', monospace",
            color: NEON_GREEN,
            textShadow: `0 0 12px ${NEON_GREEN}60, 0 0 24px ${NEON_GREEN}30`,
          }}
        >
          PROFILE
        </h1>
        <span className="text-[9px] font-medium tracking-widest" style={{ color: 'rgba(255,255,255,0.25)' }}>
          litstudio.online
        </span>
      </div>

      <motion.button
        whileTap={{ scale: 0.9 }}
        className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <Menu size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
      </motion.button>
    </motion.div>
  );
};

// ─── Community Bar ──────────────────────────────────────────────────────────────
const CommunityBar: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const navigate = useNavigate();
  const displayAddr = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="flex items-center justify-between mb-5"
    >
      {/* Logo stack */}
      <div className="flex items-center">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black"
            style={{
              background: i === 0 ? `${NEON_GREEN}15` : i === 1 ? `${CYAN}15` : `${PURPLE}15`,
              border: `1px solid ${i === 0 ? `${NEON_GREEN}30` : i === 1 ? `${CYAN}30` : `${PURPLE}30`}`,
              color: i === 0 ? NEON_GREEN : i === 1 ? CYAN : PURPLE,
              marginLeft: i > 0 ? -8 : 0,
              zIndex: 3 - i,
            }}
          >
            {i === 0 ? 'L' : i === 1 ? 'S' : 'T'}
          </div>
        ))}
      </div>

      {/* FUN HUB */}
      <motion.button
        onClick={() => navigate('/hub')}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
        style={{
          background: 'rgba(0, 255, 65, 0.08)',
          border: `1px solid ${NEON_GREEN}30`,
          color: NEON_GREEN,
          fontFamily: "'Archivo Black', monospace",
        }}
      >
        <Zap size={11} />
        FUN HUB
      </motion.button>

      {/* Wallet pill */}
      <div
        className="px-3 py-1.5 rounded-full text-[10px] font-mono font-bold"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        {displayAddr}
      </div>
    </motion.div>
  );
};

// ─── Profile Hero ───────────────────────────────────────────────────────────────
const ProfileHero: React.FC<{
  artist: ArtistsResponse;
  walletAddress: string;
  isOwn: boolean;
  onEdit: () => void;
  followerCount: number;
}> = ({ artist, walletAddress, isOwn, onEdit, followerCount }) => {
  const avatarLetter = (artist.name?.[0] ?? '?').toUpperCase();
  const hue = walletAddress ? (walletAddress.charCodeAt(2) * 7) % 360 : 270;
  const hue2 = (hue + 90) % 360;
  const joinedDate = artist.tarobase_created_at
    ? new Date(artist.tarobase_created_at * 1000).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recently';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 }}
      className="relative rounded-3xl overflow-hidden mb-6"
      style={{
        border: '1px solid rgba(0, 255, 65, 0.18)',
        boxShadow: `0 0 60px hsla(${hue}, 60%, 20%, 0.15), 0 0 120px hsla(${hue2}, 60%, 15%, 0.08)`,
      }}
    >
      {/* Cinematic background */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 20% 30%, rgba(0, 255, 65, 0.12) 0%, transparent 55%),
            radial-gradient(ellipse at 80% 70%, rgba(168,85,247,0.08) 0%, transparent 55%),
            linear-gradient(170deg, #0a0a0a 0%, #050505 60%, #080510 100%)
          `,
        }}
      />
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.04) 2px, rgba(0, 255, 65, 0.04) 4px)',
        }}
      />
      {/* Ambient glow orb */}
      <div
        className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0, 255, 65, 0.08), transparent 70%)' }}
      />
      <div
        className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.06), transparent 70%)' }}
      />

      {/* Content */}
      <div className="relative p-5">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          {/* Avatar */}
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <div
              className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-black overflow-hidden"
              style={{
                background: `linear-gradient(135deg, hsl(${hue}, 70%, 28%), hsl(${hue2}, 80%, 18%))`,
                border: `2px solid ${NEON_GREEN}`,
                boxShadow: `0 0 30px rgba(0, 255, 65, 0.4), 0 0 60px rgba(0, 255, 65, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)`,
                color: '#fff',
              }}
            >
              {artist.profileImage ? (
                <img src={artist.profileImage} alt={artist.name} className="w-full h-full object-cover" />
              ) : (
                <span style={{ textShadow: `0 0 20px hsla(${hue}, 80%, 70%, 0.6)` }}>{avatarLetter}</span>
              )}
            </div>
            {artist.isVerified && (
              <div
                className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: '#050505', border: `2px solid ${NEON_GREEN}` }}
              >
                <Verified size={14} style={{ color: NEON_GREEN }} />
              </div>
            )}
          </motion.div>

          {/* Right side: ARTIST badge + edit */}
          <div className="flex flex-col items-end gap-2">
            <span
              className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
              style={{
                background: `${NEON_GREEN}12`,
                border: `1px solid ${NEON_GREEN}35`,
                color: NEON_GREEN,
                fontFamily: "'Archivo Black', monospace",
              }}
            >
              ARTIST
            </span>
            {isOwn && (
              <motion.button
                onClick={onEdit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-bold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <Edit3 size={11} />
                Edit
              </motion.button>
            )}
          </div>
        </div>

        {/* Name + handle */}
        <h1
          className="text-xl font-black leading-tight mb-1"
          style={{
            fontFamily: "'Archivo Black', monospace",
            color: '#fff',
            textShadow: `0 0 20px ${NEON_GREEN}40`,
          }}
        >
          {artist.name}
        </h1>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
            @{artist.name?.toLowerCase().replace(/\s+/g, '') ?? 'artist'}
          </span>
          {artist.isVerified && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold" style={{ color: NEON_GREEN }}>
              <Verified size={10} />
              Verified
            </span>
          )}
        </div>

        {/* Bio */}
        {artist.bio && (
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
            {artist.bio}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Globe size={10} />
            WORLDWIDE
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Calendar size={10} />
            Joined {joinedDate}
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Users size={10} />
            {followerCount.toLocaleString()} followers
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─── Action Buttons ─────────────────────────────────────────────────────────────
const ActionButtons: React.FC<{
  isOwn: boolean;
  hasSongs: boolean;
  onPlayAll: () => void;
  onFollow?: () => void;
  following?: boolean;
}> = ({ isOwn, hasSongs, onPlayAll, onFollow, following }) => {
  const [shareHover, setShareHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="flex items-center gap-2 mb-6"
    >
      {hasSongs && (
        <motion.button
          onClick={onPlayAll}
          whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${NEON_GREEN}50` }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-2 font-black text-sm"
          style={{
            height: 58,
            borderRadius: 18,
            background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
            color: '#000',
            fontFamily: "'Archivo Black', monospace",
            letterSpacing: '0.06em',
            boxShadow: `0 0 20px ${NEON_GREEN}35`,
          }}
        >
          <Play size={16} fill="#000" />
          PLAY ALL
        </motion.button>
      )}

      {!isOwn && onFollow && (
        <motion.button
          onClick={onFollow}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-2 font-black text-sm"
          style={{
            height: 58,
            borderRadius: 18,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(0, 255, 65, 0.22)',
            color: following ? '#ef4444' : NEON_GREEN,
            fontFamily: "'Archivo Black', monospace",
            letterSpacing: '0.06em',
          }}
        >
          <Heart size={16} fill={following ? '#ef4444' : 'none'} />
          {following ? 'FOLLOWING' : 'FOLLOW'}
        </motion.button>
      )}

      <motion.button
        onClick={() => {
          if (navigator.share) {
            navigator.share({ title: 'Lit Studio Profile', url: window.location.href });
          } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard');
          }
        }}
        onMouseEnter={() => setShareHover(true)}
        onMouseLeave={() => setShareHover(false)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-[58px] rounded-[18px] flex items-center justify-center"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(0, 255, 65, 0.22)',
          color: shareHover ? NEON_GREEN : 'rgba(255,255,255,0.6)',
        }}
      >
        <Share2 size={18} />
      </motion.button>
    </motion.div>
  );
};

// ─── Main Tabs ──────────────────────────────────────────────────────────────────
type MainTab = 'songs' | 'albums' | 'playlists' | 'collections' | 'about';

const TAB_LIST: { key: MainTab; label: string }[] = [
  { key: 'songs', label: 'Songs' },
  { key: 'albums', label: 'Albums' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'collections', label: 'Collections' },
  { key: 'about', label: 'About' },
];

const MainTabs: React.FC<{
  active: MainTab;
  onChange: (tab: MainTab) => void;
}> = ({ active, onChange }) => (
  <div className="flex gap-1 mb-6 p-1 rounded-xl overflow-x-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
    {TAB_LIST.map((tab) => {
      const isActive = active === tab.key;
      return (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className="flex-1 min-w-[60px] py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all relative whitespace-nowrap"
          style={{
            background: isActive ? `${NEON_GREEN}12` : 'transparent',
            border: isActive ? `1px solid ${NEON_GREEN}35` : '1px solid transparent',
            color: isActive ? '#fff' : '#555555',
            fontFamily: "'Archivo Black', monospace",
          }}
        >
          {isActive && (
            <motion.div
              layoutId="profile-tab-underline"
              className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
              style={{ background: NEON_GREEN, boxShadow: `0 0 8px ${NEON_GREEN}` }}
            />
          )}
          {tab.label}
        </button>
      );
    })}
  </div>
);

// ─── Song List Row ──────────────────────────────────────────────────────────────
const SongListRow: React.FC<{
  rank: number;
  songId: string;
  detail: SongDetailsResponse;
  song?: SongsResponse;
  liveData?: { bondingProgress: number | null; priceSol: number | null };
  onPlay: () => void;
  onNavigate: () => void;
  isPlaying?: boolean;
}> = ({ rank, detail, song, liveData, onPlay, onNavigate, isPlaying }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const priceSol = liveData?.priceSol;
  const bonding = liveData?.bondingProgress;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-3 rounded-xl p-2.5 cursor-pointer group"
      style={{
        ...GLASS_CARD,
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
      onClick={onNavigate}
      whileHover={GLASS_CARD_HOVER}
      whileTap={{ scale: 0.99 }}
    >
      {/* Rank */}
      <div
        className="w-6 text-center text-[11px] font-black flex-shrink-0"
        style={{
          color: rank <= 3 ? NEON_GREEN : 'rgba(255,255,255,0.25)',
          fontFamily: "'Archivo Black', monospace",
        }}
      >
        {rank}
      </div>

      {/* Cover */}
      <div
        className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${NEON_GREEN}20, ${CYAN}10)`,
          border: '1px solid rgba(0, 255, 65, 0.15)',
        }}
      >
        {detail.coverImage ? (
          <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={14} style={{ color: `${NEON_GREEN}50` }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate" style={{ color: '#fff', fontFamily: "'Archivo Black', monospace" }}>
          {detail.title}
        </p>
        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {detail.artist ?? 'Unknown Artist'} {song?.symbol ? `• $${song.symbol}` : ''}
        </p>
      </div>

      {/* Price / Gain */}
      <div className="text-right flex-shrink-0 hidden sm:block">
        <p className="text-[11px] font-black" style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}>
          {priceSol != null ? `${priceSol.toFixed(6)} SOL` : '—'}
        </p>
        <p className="text-[9px]" style={{ color: bonding != null ? ACCENT_GREEN : 'rgba(255,255,255,0.3)' }}>
          {bonding != null ? `${bonding.toFixed(1)}% curve` : '—'}
        </p>
      </div>

      {/* Play */}
      <motion.button
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        whileTap={{ scale: 0.9 }}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          background: isPlaying ? `${NEON_GREEN}20` : 'rgba(255,255,255,0.04)',
          border: isPlaying ? `1px solid ${NEON_GREEN}40` : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {isPlaying ? (
          <div className="flex items-end gap-[2px] h-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  background: NEON_GREEN,
                  height: `${[60, 100, 70][i - 1]}%`,
                  animation: `waveBar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        ) : (
          <Play size={12} style={{ color: NEON_GREEN, marginLeft: 1 }} />
        )}
      </motion.button>

      {/* Menu */}
      <div className="relative">
        <motion.button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: 'transparent' }}
        >
          <MoreHorizontal size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        </motion.button>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute right-0 top-8 z-20 rounded-xl py-1 min-w-[140px]"
              style={{
                background: 'rgba(8,8,8,0.95)',
                border: '1px solid rgba(0, 255, 65, 0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onNavigate(); }}
                className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-white/5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                View Song
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPlay(); }}
                className="w-full text-left px-3 py-2 text-[11px] font-bold hover:bg-white/5 transition-colors"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                Play
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ─── Insight Panel ──────────────────────────────────────────────────────────────
const InsightPanel: React.FC<{
  followers: FollowsResponse[];
  purchases: PackPurchasesResponse[];
  mySongDetails: SongDetailsResponse[];
  songMap: Record<string, SongsResponse>;
}> = ({ followers, purchases, mySongDetails, songMap }) => {
  // Top listener = follower with most purchases
  const topListener = useMemo(() => {
    const counts: Record<string, number> = {};
    purchases.forEach(p => {
      if (p.buyerAddress) {
        counts[p.buyerAddress] = (counts[p.buyerAddress] ?? 0) + 1;
      }
    });
    followers.forEach(f => {
      counts[f.followerAddress] = (counts[f.followerAddress] ?? 0) + 0;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ?? null;
  }, [followers, purchases]);

  // Latest drop
  const latestDrop = useMemo(() => {
    return [...mySongDetails].sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0))[0] ?? null;
  }, [mySongDetails]);

  // Fan score (0-100)
  const fanScore = useMemo(() => {
    const s = Math.min(100, Math.floor(
      (followers.length * 2) +
      (purchases.length * 3) +
      (mySongDetails.length * 5)
    ));
    return s;
  }, [followers, purchases, mySongDetails]);

  const scoreLabel = fanScore >= 80 ? 'LEGENDARY' : fanScore >= 60 ? 'PLATINUM' : fanScore >= 40 ? 'GOLD' : fanScore >= 20 ? 'SILVER' : 'BRONZE';

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Top Listener */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-3 flex flex-col items-center text-center"
        style={GLASS_CARD}
        whileHover={GLASS_CARD_HOVER}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
          style={{ background: `${NEON_GREEN}12`, border: `1px solid ${NEON_GREEN}25` }}
        >
          <Trophy size={16} style={{ color: NEON_GREEN }} />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', monospace" }}>
          Top Listener
        </p>
        {topListener ? (
          <>
            <p className="text-[10px] font-bold truncate w-full" style={{ color: '#fff' }}>
              {topListener[0].slice(0, 6)}...{topListener[0].slice(-4)}
            </p>
            <p className="text-[9px]" style={{ color: NEON_GREEN }}>
              {topListener[1]} plays
            </p>
          </>
        ) : (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No listeners yet</p>
        )}
      </motion.div>

      {/* Latest Drop */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl p-3 flex flex-col items-center text-center"
        style={GLASS_CARD}
        whileHover={GLASS_CARD_HOVER}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
          style={{ background: `${CYAN}12`, border: `1px solid ${CYAN}25` }}
        >
          <Flame size={16} style={{ color: CYAN }} />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', monospace" }}>
          Latest Drop
        </p>
        {latestDrop ? (
          <>
            <div
              className="w-8 h-8 rounded-lg overflow-hidden mb-1"
              style={{ background: `linear-gradient(135deg, ${NEON_GREEN}20, ${CYAN}10)` }}
            >
              {latestDrop.coverImage ? (
                <img src={latestDrop.coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music size={12} className="mx-auto mt-1.5" style={{ color: `${NEON_GREEN}50` }} />
              )}
            </div>
            <p className="text-[10px] font-bold truncate w-full" style={{ color: '#fff' }}>
              {latestDrop.title}
            </p>
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {latestDrop.tarobase_created_at ? new Date(latestDrop.tarobase_created_at * 1000).toLocaleDateString() : '—'}
            </p>
          </>
        ) : (
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>No drops yet</p>
        )}
      </motion.div>

      {/* Fan Score */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-2xl p-3 flex flex-col items-center text-center"
        style={GLASS_CARD}
        whileHover={GLASS_CARD_HOVER}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center mb-2"
          style={{ background: `${PURPLE}12`, border: `1px solid ${PURPLE}25` }}
        >
          <Zap size={16} style={{ color: PURPLE }} />
        </div>
        <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', monospace" }}>
          Fan Score
        </p>
        <p className="text-lg font-black" style={{ color: PURPLE, fontFamily: "'Archivo Black', monospace" }}>
          {fanScore}
        </p>
        <p className="text-[9px] font-bold" style={{ color: `${PURPLE}cc` }}>
          {scoreLabel}
        </p>
      </motion.div>
    </div>
  );
};

// ─── Not signed in ──────────────────────────────────────────────────────────────
const NotSignedIn: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 pb-24" style={{ background: 'transparent' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="text-center max-w-xs"
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{
            background: `linear-gradient(135deg, ${NEON_GREEN}20, ${CYAN}10)`,
            border: `1px solid ${NEON_GREEN}40`,
            boxShadow: `0 0 40px ${NEON_GREEN}20`,
          }}
        >
          <Mic2 size={32} style={{ color: NEON_GREEN }} />
        </div>
        <h1
          className="text-2xl font-black mb-2"
          style={{
            fontFamily: "'Archivo Black', monospace",
            background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Join Lit Studio
        </h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
          Connect your wallet to access your profile, track earnings, and discover music you own.
        </p>
        <motion.button
          onClick={() => navigate('/')}
          whileHover={{ scale: 1.05, boxShadow: `0 0 24px ${NEON_GREEN}40` }}
          whileTap={{ scale: 0.96 }}
          className="px-8 py-3 rounded-2xl font-bold text-sm"
          style={{
            background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
            color: '#000',
            fontFamily: "'Archivo Black', monospace",
            letterSpacing: '0.06em',
          }}
        >
          Sign in
        </motion.button>
      </motion.div>
    </div>
  );
};

// ─── Quick Actions ──────────────────────────────────────────────────────────────
const QuickActions: React.FC<{
  onCreateSong: () => void;
  onCreateAlbum: () => void;
  onViewEarnings: () => void;
}> = ({ onCreateSong, onCreateAlbum, onViewEarnings }) => {
  const actions = [
    { icon: <Music size={18} />, label: 'Create Song', color: NEON_GREEN, onClick: onCreateSong },
    { icon: <Disc3 size={18} />, label: 'Create Album', color: CYAN, onClick: onCreateAlbum },
    { icon: <TrendingUp size={18} />, label: 'View Earnings', color: NEON_GREEN, onClick: onViewEarnings },
  ];

  return (
    <BlurFade delay={0.15}>
      <div className="mb-6">
        <SectionHeader title="Quick Actions" delay={0.14} />
        <div className="grid grid-cols-3 gap-2">
          {actions.map((a, i) => (
            <motion.button
              key={a.label}
              onClick={a.onClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
              whileHover={{ y: -2, boxShadow: `0 8px 24px ${a.color}20` }}
              whileTap={{ scale: 0.96 }}
              className="flex flex-col items-center gap-2 py-4 rounded-xl"
              style={{
                background: `${a.color}08`,
                border: `1px solid ${a.color}25`,
              }}
            >
              <span style={{ color: a.color }}>{a.icon}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-wide"
                style={{ color: `${a.color}cc`, fontFamily: "'Archivo Black', monospace" }}
              >
                {a.label}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </BlurFade>
  );
};

// ─── Song Grid Card ──────────────────────────────────────────────────────────────
const SongGridCard: React.FC<{
  songId: string;
  name: string;
  symbol: string;
  detail?: SongDetailsResponse;
  onClick: () => void;
  onDownload?: () => void;
  delay?: number;
}> = ({ songId, name, symbol, detail, onClick, onDownload, delay = 0 }) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 280, damping: 22 }}
      className="rounded-xl overflow-hidden cursor-pointer group"
      style={GLASS_CARD}
      onClick={onClick}
      whileHover={GLASS_CARD_HOVER}
      whileTap={{ scale: 0.97 }}
    >
      {/* Cover art */}
      <div className="relative aspect-square overflow-hidden">
        {detail?.coverImage ? (
          <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${NEON_GREEN}25, ${CYAN}15)` }}
          >
            <Music size={24} style={{ color: `${NEON_GREEN}60` }} />
          </div>
        )}
        {/* Play overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: 'rgba(0,0,0,0.4)' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: NEON_GREEN, boxShadow: `0 0 16px ${NEON_GREEN}60` }}
          >
            <Play size={14} fill={NEON_GREEN} style={{ color: '#000', marginLeft: 2 }} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-bold truncate" style={{ color: '#fff', fontFamily: "'Archivo Black', monospace" }}>
          {detail?.title ?? name}
        </p>
        <p className="text-[9px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {symbol} &bull; {detail?.genre ?? 'Unknown'}
        </p>
        <div className="mt-2 flex gap-1.5">
          <motion.button
            onClick={e => { e.stopPropagation(); navigate(`/song/${songId}`); }}
            className="flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider"
            style={{
              background: `${NEON_GREEN}10`,
              border: `1px solid ${NEON_GREEN}30`,
              color: NEON_GREEN,
            }}
            whileHover={{ background: `${NEON_GREEN}20` }}
            whileTap={{ scale: 0.96 }}
          >
            Buy
          </motion.button>
          {onDownload && (
            <motion.button
              onClick={e => { e.stopPropagation(); onDownload(); }}
              className="flex items-center justify-center w-7 rounded-lg"
              style={{
                background: `${CYAN}10`,
                border: `1px solid ${CYAN}30`,
                color: CYAN,
              }}
              whileHover={{ background: `${CYAN}20` }}
              whileTap={{ scale: 0.96 }}
              title="Download audio"
            >
              <Download size={11} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ─── Listener Profile Header ────────────────────────────────────────────────────
const ListenerProfileHeader: React.FC<{
  address: string;
  followerCount: number;
  followingCount: number;
  onLogout: () => void;
}> = ({ address, followerCount, followingCount, onLogout }) => {
  const initials = address.slice(0, 2).toUpperCase();
  const displayAddr = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-4 pt-2">
        {/* Avatar */}
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black flex-shrink-0"
          style={{
            background: `linear-gradient(135deg, ${NEON_GREEN}40, ${CYAN}20)`,
            border: `2px solid ${NEON_GREEN}`,
            boxShadow: `0 0 24px ${NEON_GREEN}30`,
            color: '#fff',
            animation: 'floatGlow 3s ease-in-out infinite',
          }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          {initials}
        </motion.div>

        {/* Name + address */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black mb-0.5" style={{ fontFamily: "'Archivo Black', monospace", color: '#fff' }}>
            Listener
          </h1>
          <p className="text-[11px] font-mono" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {displayAddr}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
            }}
            whileTap={{ scale: 0.96 }}
          >
            <Edit3 size={12} />
            Edit
          </motion.button>
          <motion.button
            onClick={onLogout}
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: 'rgba(239,68,68,0.75)',
            }}
            whileTap={{ scale: 0.96 }}
          >
            <LogOut size={13} />
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5">
        <div className="text-center">
          <div className="text-base font-black" style={{ color: CYAN, fontFamily: "'Archivo Black', monospace" }}>
            {followerCount}
          </div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Followers</div>
        </div>
        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.08)' }} />
        <div className="text-center">
          <div className="text-base font-black" style={{ color: CYAN, fontFamily: "'Archivo Black', monospace" }}>
            {followingCount}
          </div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>Following</div>
        </div>

        {/* Become artist CTA */}
        <motion.button
          className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, ${NEON_GREEN}15, ${NEON_GREEN}05)`,
            border: `1px solid ${NEON_GREEN}35`,
            color: NEON_GREEN,
          }}
          whileHover={{ boxShadow: `0 0 16px ${NEON_GREEN}25` }}
          whileTap={{ scale: 0.96 }}
          onClick={() => window.location.href = '/artist-setup'}
        >
          <Mic2 size={11} />
          Become Artist
        </motion.button>
      </div>
    </div>
  );
};

// ─── Collection Card (listener tokens) ──────────────────────────────────────────
const CollectionCard: React.FC<{
  purchase: PackPurchasesResponse;
  detail?: SongDetailsResponse;
  onClick: () => void;
  delay?: number;
}> = ({ purchase, detail, onClick, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay, type: 'spring', stiffness: 300, damping: 22 }}
    className="flex items-center gap-3 rounded-xl p-3 cursor-pointer"
    style={GLASS_CARD}
    onClick={onClick}
    whileHover={GLASS_CARD_HOVER}
    whileTap={{ scale: 0.98 }}
  >
    <div
      className="w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        background: `linear-gradient(135deg, ${NEON_GREEN}30, ${CYAN}20)`,
        border: `1px solid ${NEON_GREEN}30`,
      }}
    >
      {detail?.coverImage ? (
        <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
      ) : (
        <Music size={16} style={{ color: `${NEON_GREEN}80` }} />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>
        {detail?.title ?? purchase.packName}
      </p>
      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {detail?.artist ?? 'Unknown Artist'} &bull; {purchase.tokenAmount?.toLocaleString() ?? '—'} tokens
      </p>
    </div>
    <div className="text-right flex-shrink-0">
      {purchase.artistPayoutUSD != null && (
        <p className="text-xs font-bold" style={{ color: NEON_GREEN, fontFamily: "'Archivo Black', monospace" }}>
          ${(purchase.artistPayoutUSD / 100).toFixed(2)}
        </p>
      )}
      <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>purchased</p>
    </div>
  </motion.div>
);

// ─── ARTIST VIEW ────────────────────────────────────────────────────────────────
const ArtistView: React.FC<{
  artist: ArtistsResponse;
  walletAddress: string;
  songs: SongsResponse[];
  songDetails: SongDetailsResponse[];
  followers: FollowsResponse[];
  following: FollowsResponse[];
  purchases: PackPurchasesResponse[];
  onLogout: () => void;
}> = ({ artist, walletAddress, songs, songDetails, followers, following, purchases, onLogout }) => {
  const navigate = useNavigate();
  const { setQueue, currentSong, isPlaying, playSong } = usePlayer();
  const [activeTab, setActiveTab] = useState<MainTab>('songs');
  const [songTab, setSongTab] = useState<'all' | 'singles' | 'albums'>('all');

  const handleDownload = async (detail: SongDetailsResponse) => {
    const audioUrl = detail.audioUrl;
    if (!audioUrl) { toast.error('No audio file available for this song'); return; }
    try {
      const response = await fetch(audioUrl);
      if (!response.ok) throw new Error('Failed to fetch audio');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = audioUrl.split('.').pop()?.split('?')[0] ?? 'mp3';
      a.download = `${detail.title ?? 'song'}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloading "${detail.title}"`);
    } catch {
      toast.error('Download failed. Please try again.');
    }
  };

  // Build maps
  const songMap = useMemo(() => {
    const m: Record<string, SongsResponse> = {};
    songs.forEach(s => { m[s.id] = s; });
    return m;
  }, [songs]);

  const detailMap = useMemo(() => {
    const m: Record<string, SongDetailsResponse> = {};
    songDetails.forEach(d => { m[d.id] = d; });
    return m;
  }, [songDetails]);

  // My songs with details
  const mySongDetails = useMemo(() => {
    return songDetails.filter(d => d.artistAddress === walletAddress);
  }, [songDetails, walletAddress]);

  // Filter by tab
  const filteredSongs = useMemo(() => {
    if (songTab === 'albums') return mySongDetails.filter(d => !!songMap[d.id]?.albumId);
    if (songTab === 'singles') return mySongDetails.filter(d => !songMap[d.id]?.albumId);
    return mySongDetails;
  }, [mySongDetails, songMap, songTab]);

  // Song IDs for earnings tab
  const songIds = useMemo(() => mySongDetails.map(d => d.id), [mySongDetails]);

  // Total plays from pack purchases as proxy
  const totalPlays = purchases.filter(p => songIds.includes(p.songId ?? '')).length * 50;

  // Total earned SOL
  const totalEarned = useMemo(() => {
    return purchases
      .filter(p => songIds.includes(p.songId ?? '') && p.artistPayoutStatus === 'paid')
      .reduce((sum, p) => sum + (p.artistPayoutSOL ?? 0), 0) / 1e9;
  }, [purchases, songIds]);

  // Live data for songs list
  const songsForLive = useMemo(() => {
    return filteredSongs.map(d => songMap[d.id]).filter(Boolean) as SongsResponse[];
  }, [filteredSongs, songMap]);

  const { liveData } = useListLiveData(songsForLive);

  // Playlist hook (for playlists tab)
  const { songEntries: playlistEntries, removeFromPlaylist } = useMyPlaylist();

  // Play all
  const handlePlayAll = useCallback(() => {
    const queue = mySongDetails
      .map(d => {
        const song = songMap[d.id];
        if (!song) return null;
        return {
          songId: d.id,
          title: d.title,
          artist: d.artist,
          coverImage: d.coverImage,
          audioUrl: d.audioUrl,
          audiusStreamUrl: d.audiusStreamUrl ?? song.audiusStreamUrl,
          duration: d.duration,
          symbol: d.tokenSymbol ?? song.symbol,
        };
      })
      .filter(Boolean) as Parameters<typeof setQueue>[0];

    if (queue.length === 0) { toast.error('No playable songs found'); return; }
    setQueue(queue, 0, true);
    toast.success(`Playing ${queue.length} song${queue.length > 1 ? 's' : ''}`);
  }, [mySongDetails, songMap, setQueue]);

  const isThisPlaying = (songId: string) => currentSong?.songId === songId && isPlaying;

  return (
    <div>
      <TopHeader />
      <CommunityBar walletAddress={walletAddress} />

      <ProfileHero
        artist={artist}
        walletAddress={walletAddress}
        isOwn={true}
        onEdit={() => navigate('/artist-setup')}
        followerCount={followers.length}
      />

      <CyberStatsBar
        totalPlays={totalPlays}
        followerCount={followers.length}
        totalEarned={totalEarned}
        songsReleased={mySongDetails.length}
      />

      <ActionButtons
        isOwn={true}
        hasSongs={mySongDetails.length > 0}
        onPlayAll={handlePlayAll}
      />

      <MainTabs active={activeTab} onChange={setActiveTab} />

      <AnimatePresence mode="wait">
        {/* ── SONGS TAB ── */}
        {activeTab === 'songs' && (
          <motion.div
            key="songs"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Song filter tabs */}
            <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {(['all', 'singles', 'albums'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setSongTab(tab)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
                  style={{
                    background: songTab === tab ? `${NEON_GREEN}20` : 'transparent',
                    border: songTab === tab ? `1px solid ${NEON_GREEN}40` : '1px solid transparent',
                    color: songTab === tab ? NEON_GREEN : 'rgba(255,255,255,0.4)',
                    fontFamily: "'Archivo Black', monospace",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {filteredSongs.length === 0 ? (
              <div
                className="rounded-2xl py-10 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <Music size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {songTab === 'all' ? 'No songs released yet.' : `No ${songTab} yet.`}
                </p>
                <motion.button
                  onClick={() => navigate('/create')}
                  className="mt-4 px-5 py-2 rounded-xl text-xs font-bold"
                  style={{ background: `${NEON_GREEN}10`, border: `1px solid ${NEON_GREEN}30`, color: NEON_GREEN }}
                  whileHover={{ background: `${NEON_GREEN}20` }}
                  whileTap={{ scale: 0.96 }}
                >
                  + Create First Song
                </motion.button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSongs.map((d, i) => {
                  const song = songMap[d.id];
                  return (
                    <SongListRow
                      key={d.id}
                      rank={i + 1}
                      songId={d.id}
                      detail={d}
                      song={song}
                      liveData={liveData[d.id]}
                      onPlay={() => {
                        if (isThisPlaying(d.id)) {
                          // toggle handled by player
                        } else {
                          playSong({
                            songId: d.id,
                            title: d.title,
                            artist: d.artist,
                            coverImage: d.coverImage,
                            audioUrl: d.audioUrl,
                            audiusStreamUrl: d.audiusStreamUrl ?? song?.audiusStreamUrl,
                            duration: d.duration,
                            symbol: d.tokenSymbol ?? song?.symbol,
                          });
                        }
                      }}
                      onNavigate={() => navigate(`/song/${d.id}`)}
                      isPlaying={isThisPlaying(d.id)}
                    />
                  );
                })}
              </div>
            )}

            {/* Insight Panel */}
            <div className="mt-6">
              <InsightPanel
                followers={followers}
                purchases={purchases.filter(p => songIds.includes(p.songId ?? ''))}
                mySongDetails={mySongDetails}
                songMap={songMap}
              />
            </div>

            {/* Fan Feed */}
            <div className="mt-4">
              <FanFeedSection
                followers={followers}
                purchases={purchases.filter(p => songIds.includes(p.songId ?? ''))}
              />
            </div>
          </motion.div>
        )}

        {/* ── ALBUMS TAB ── */}
        {activeTab === 'albums' && (
          <motion.div
            key="albums"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ArtistAlbumSection />
          </motion.div>
        )}

        {/* ── PLAYLISTS TAB ── */}
        {activeTab === 'playlists' && (
          <motion.div
            key="playlists"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {playlistEntries.length === 0 ? (
              <div
                className="rounded-2xl py-10 text-center"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <ListMusic size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  No playlists yet. Save songs to build your collection.
                </p>
                <motion.button
                  onClick={() => navigate('/discover')}
                  className="mt-4 px-5 py-2 rounded-xl text-xs font-bold"
                  style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30`, color: CYAN }}
                  whileHover={{ background: `${CYAN}20` }}
                  whileTap={{ scale: 0.96 }}
                >
                  Discover Music
                </motion.button>
              </div>
            ) : (
              <div className="space-y-2">
                {playlistEntries.map((entry, i) => {
                  const detail = detailMap[entry.songId];
                  const song = songMap[entry.songId];
                  return (
                    <motion.div
                      key={entry.songId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 22 }}
                      className="flex items-center gap-3 rounded-xl p-3 cursor-pointer group"
                      style={GLASS_CARD}
                      onClick={() => navigate(`/song/${entry.songId}`)}
                      whileHover={GLASS_CARD_HOVER}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(135deg, ${CYAN}25, ${NEON_GREEN}15)`,
                          border: `1px solid ${CYAN}25`,
                        }}
                      >
                        {detail?.coverImage ? (
                          <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Music size={14} style={{ color: `${CYAN}80` }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>
                          {detail?.title ?? song?.name ?? entry.songId}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          {detail?.artist ?? 'Unknown Artist'}
                        </p>
                      </div>
                      <motion.button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await removeFromPlaylist(entry.songId);
                        }}
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
                        style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                        whileTap={{ scale: 0.9 }}
                        title="Remove from playlist"
                      >
                        <X size={12} style={{ color: '#ef4444' }} />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* ── COLLECTIONS TAB ── */}
        {activeTab === 'collections' && (
          <motion.div
            key="collections"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <MyTokensSection
              walletAddress={walletAddress}
              purchases={purchases}
              songs={songs}
              songDetails={songDetails}
              delay={0.1}
            />
          </motion.div>
        )}

        {/* ── ABOUT TAB ── */}
        {activeTab === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <OverviewTab
              artist={artist}
              mySongDetails={mySongDetails}
              songMap={songMap}
              purchases={purchases}
              followers={followers}
              following={following}
              totalPlays={totalPlays}
              totalEarned={totalEarned}
              navigate={navigate}
              onDownload={handleDownload}
            />
            <div className="mt-6">
              <RecentReleasesCarousel
                songs={mySongDetails}
                songMap={songMap}
                onSongClick={(id) => navigate(`/song/${id}`)}
              />
            </div>
            <div className="mt-6">
              <FanFeedSection
                followers={followers}
                purchases={purchases.filter(p => songIds.includes(p.songId ?? ''))}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── LISTENER VIEW ──────────────────────────────────────────────────────────────
const ListenerView: React.FC<{
  walletAddress: string;
  purchases: PackPurchasesResponse[];
  songDetails: SongDetailsResponse[];
  songs: SongsResponse[];
  followers: FollowsResponse[];
  following: FollowsResponse[];
  onLogout: () => void;
}> = ({ walletAddress, purchases, songDetails, songs, followers, following, onLogout }) => {
  const navigate = useNavigate();
  const { songEntries, removeFromPlaylist } = useMyPlaylist();

  const detailMap = useMemo(() => {
    const m: Record<string, SongDetailsResponse> = {};
    songDetails.forEach(d => { m[d.id] = d; });
    return m;
  }, [songDetails]);

  const songMap = useMemo(() => {
    const m: Record<string, SongsResponse> = {};
    songs.forEach(s => { m[s.id] = s; });
    return m;
  }, [songs]);

  const myCollection = useMemo(() => {
    return purchases.filter(p => p.buyerAddress === walletAddress);
  }, [purchases, walletAddress]);

  const myFollowing = useMemo(() => {
    return following.filter(f => f.followerAddress === walletAddress);
  }, [following, walletAddress]);

  return (
    <div>
      <TopHeader />
      <CommunityBar walletAddress={walletAddress} />

      {/* Profile header */}
      <BlurFade>
        <ListenerProfileHeader
          address={walletAddress}
          followerCount={followers.filter(f => f.artistAddress === walletAddress).length}
          followingCount={myFollowing.length}
          onLogout={onLogout}
        />
      </BlurFade>

      {/* My Tokens */}
      <MyTokensSection
        walletAddress={walletAddress}
        purchases={purchases}
        songs={songs}
        songDetails={songDetails}
        delay={0.08}
      />

      {/* My Collection */}
      <BlurFade delay={0.1}>
        <div className="mb-6">
          <SectionHeader
            title="My Collection"
            action={myCollection.length > 5 ? { label: 'See All', onClick: () => navigate('/collection') } : undefined}
            delay={0.1}
          />
          {myCollection.length === 0 ? (
            <div
              className="rounded-2xl py-10 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Package size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                No tokens yet. Buy song packs to start your collection.
              </p>
              <motion.button
                onClick={() => navigate('/discover')}
                className="mt-4 px-5 py-2 rounded-xl text-xs font-bold"
                style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30`, color: CYAN }}
                whileHover={{ background: `${CYAN}20` }}
                whileTap={{ scale: 0.96 }}
              >
                Discover Music
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2">
              {myCollection.slice(0, 6).map((p, i) => (
                <CollectionCard
                  key={p.id}
                  purchase={p}
                  detail={p.songId ? detailMap[p.songId] : undefined}
                  onClick={() => p.songId && navigate(`/song/${p.songId}`)}
                  delay={0.12 + i * 0.04}
                />
              ))}
            </div>
          )}
        </div>
      </BlurFade>

      {/* My Playlist */}
      <BlurFade delay={0.2}>
        <div className="mb-6">
          <SectionHeader
            title="My Playlist"
            action={{ label: 'View All', onClick: () => navigate('/stream') }}
            delay={0.2}
          />
          {songEntries.length === 0 ? (
            <div
              className="rounded-2xl py-8 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <ListMusic size={24} className="mx-auto mb-2" style={{ color: 'rgba(255,255,255,0.2)' }} />
              <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                No songs saved yet. Hit + on any song to add it.
              </p>
              <motion.button
                onClick={() => navigate('/discover')}
                className="mt-1 px-5 py-2 rounded-xl text-xs font-bold"
                style={{ background: `${CYAN}10`, border: `1px solid ${CYAN}30`, color: CYAN }}
                whileHover={{ background: `${CYAN}20` }}
                whileTap={{ scale: 0.96 }}
              >
                Discover Music
              </motion.button>
            </div>
          ) : (
            <div className="space-y-2">
              {songEntries.slice(0, 5).map((entry, i) => {
                const detail = detailMap[entry.songId];
                const song = songMap[entry.songId];
                return (
                  <motion.div
                    key={entry.songId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + i * 0.04, type: 'spring', stiffness: 300, damping: 22 }}
                    className="flex items-center gap-3 rounded-xl p-3 cursor-pointer group"
                    style={GLASS_CARD}
                    onClick={() => navigate(`/song/${entry.songId}`)}
                    whileHover={GLASS_CARD_HOVER}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${CYAN}25, ${NEON_GREEN}15)`,
                        border: `1px solid ${CYAN}25`,
                      }}
                    >
                      {detail?.coverImage ? (
                        <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music size={14} style={{ color: `${CYAN}80` }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate" style={{ color: '#fff' }}>
                        {detail?.title ?? song?.name ?? entry.songId}
                      </p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {detail?.artist ?? 'Unknown Artist'}
                      </p>
                    </div>
                    <motion.button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await removeFromPlaylist(entry.songId);
                      }}
                      className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-opacity"
                      style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                      whileTap={{ scale: 0.9 }}
                      title="Remove from playlist"
                    >
                      <X size={12} style={{ color: '#ef4444' }} />
                    </motion.button>
                  </motion.div>
                );
              })}
              {songEntries.length > 5 && (
                <motion.button
                  onClick={() => navigate('/stream')}
                  className="w-full py-2.5 rounded-xl text-xs font-bold"
                  style={{
                    background: `${CYAN}08`,
                    border: `1px solid ${CYAN}20`,
                    color: `${CYAN}cc`,
                    fontFamily: "'Archivo Black', monospace",
                  }}
                  whileHover={{ background: `${CYAN}15` }}
                  whileTap={{ scale: 0.98 }}
                >
                  +{songEntries.length - 5} more — View All
                </motion.button>
              )}
            </div>
          )}
        </div>
      </BlurFade>

      {/* Following */}
      {myFollowing.length > 0 && (
        <BlurFade delay={0.3}>
          <div className="mb-6">
            <SectionHeader title="Following" delay={0.3} />
            <div className="flex flex-wrap gap-2">
              {myFollowing.slice(0, 12).map((f, i) => (
                <motion.button
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.32 + i * 0.03, type: 'spring', stiffness: 300, damping: 22 }}
                  onClick={() => navigate(`/artist/${f.artistAddress}`)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: `1px solid ${CYAN}20`,
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  whileHover={{ borderColor: `${CYAN}40`, color: '#fff' }}
                  whileTap={{ scale: 0.96 }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black"
                    style={{ background: `${CYAN}25`, color: CYAN }}
                  >
                    {f.artistAddress.slice(0, 1).toUpperCase()}
                  </div>
                  {f.artistAddress.slice(0, 6)}&hellip;
                </motion.button>
              ))}
            </div>
          </div>
        </BlurFade>
      )}

      {/* Become an artist CTA */}
      <BlurFade delay={0.35}>
        <motion.div
          className="rounded-2xl p-5 mb-6 flex items-center gap-4"
          style={{
            background: `linear-gradient(135deg, ${NEON_GREEN}08, ${CYAN}04)`,
            border: `1px solid ${NEON_GREEN}20`,
          }}
          whileHover={{ borderColor: `${NEON_GREEN}40`, boxShadow: `0 0 30px ${NEON_GREEN}08` }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `${NEON_GREEN}15`, border: `1px solid ${NEON_GREEN}35` }}
          >
            <Mic2 size={22} style={{ color: NEON_GREEN }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold mb-0.5" style={{ color: '#fff' }}>
              Become an Artist
            </h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Launch your music as tradable tokens and earn from every sale.
            </p>
          </div>
          <motion.button
            onClick={() => navigate('/artist-setup')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-4 py-2 rounded-xl text-xs font-bold flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
              color: '#000',
              fontFamily: "'Archivo Black', monospace",
              letterSpacing: '0.04em',
            }}
          >
            Setup
          </motion.button>
        </motion.div>
      </BlurFade>
    </div>
  );
};

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────────
const ArtistDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const walletAddress = user?.address ?? null;

  // ── Data fetching ──
  const { data: artist } = useRealtimeData<ArtistsResponse | null>(
    subscribeArtists,
    !!walletAddress,
    walletAddress!,
  );

  const { data: allSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    !!walletAddress,
  );

  const { data: allDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    !!walletAddress,
    `where artistAddress = '${walletAddress}'`,
  );

  const { data: followers } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    !!walletAddress,
    `where artistAddress = '${walletAddress}'`,
  );

  const { data: following } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    !!walletAddress,
    `where followerAddress = '${walletAddress}'`,
  );

  const { data: purchases } = useRealtimeData<PackPurchasesResponse[]>(
    subscribeManyPackPurchases,
    !!walletAddress,
    `order by createdAt desc limit 100`,
  );

  const handleLogout = () => {
    try {
      logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch {
      toast.error('Failed to log out');
    }
  };

  const hasArtistProfile = !!artist;

  // Not signed in
  if (!user) {
    return <NotSignedIn />;
  }

  return (
    <div className="min-h-screen pb-28" style={{ background: 'transparent' }}>
      <KeyframesStyle />

      {/* Background grid */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />
      {/* Top radial glow */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '50vh',
          pointerEvents: 'none',
          zIndex: 0,
          background: 'radial-gradient(circle at top, rgba(0, 255, 65, .08), transparent 45%)',
        }}
      />
      {/* Ambient glow orbs */}
      <div
        aria-hidden="true"
        className="fixed top-1/4 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0, 255, 65, 0.04), transparent 70%)', zIndex: 0 }}
      />
      <div
        aria-hidden="true"
        className="fixed bottom-1/4 left-0 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.04), transparent 70%)', zIndex: 0 }}
      />

      <div className="relative z-10 px-4 pt-4 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {hasArtistProfile ? (
            <motion.div
              key="artist"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ArtistView
                artist={artist}
                walletAddress={walletAddress!}
                songs={allSongs ?? []}
                songDetails={allDetails ?? []}
                followers={followers ?? []}
                following={following ?? []}
                purchases={purchases ?? []}
                onLogout={handleLogout}
              />
            </motion.div>
          ) : (
            <motion.div
              key="listener"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ListenerView
                walletAddress={walletAddress!}
                purchases={purchases ?? []}
                songDetails={allDetails ?? []}
                songs={allSongs ?? []}
                followers={followers ?? []}
                following={following ?? []}
                onLogout={handleLogout}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArtistDashboardPage;
