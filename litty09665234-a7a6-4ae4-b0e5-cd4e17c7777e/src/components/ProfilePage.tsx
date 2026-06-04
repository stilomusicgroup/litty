/**
 * ProfilePage — Unified premium profile (self + public)
 * WalletPage aesthetic: big text, round panels, black bg, green accents
 */

import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { Time, Address } from '@/lib/db-client';
import { usePlayer } from '@/contexts/PlayerContext';
import { useListLiveData } from '@/hooks/use-list-live-data';
import { toast } from 'sonner';
import { orbitronFont } from '@/theme';
import SocialLinksCard from '@/components/SocialLinksCard';
import SongCard from '@/components/SongCard';
import NewDropCard from '@/components/NewDropCard';
import ArtistEarningsTab from '@/components/ArtistEarningsTab';
import CommentWall from '@/components/CommentWall';
import { useArtistTier } from '@/hooks/useArtistTier';
import { getIdToken } from '@pooflabs/web';
import { api, createAuthenticatedApiClient } from '@/lib/api-client';
import { uploadAppFiles, getAppFiles } from '@/lib/collections/appFiles';
import { updateArtists, setArtists } from '@/lib/collections/artists';
import { updateUsers } from '@/lib/collections/users';

// Collections
import { subscribeArtists, type ArtistsResponse, type ArtistsRequestUpdate } from '@/lib/collections/artists';
import { subscribeUsers, type UsersResponse } from '@/lib/collections/users';
import { subscribeManySongs, type SongsResponse, countSongsLikes } from '@/lib/collections/songs';
import { subscribeManySongDetails, type SongDetailsResponse } from '@/lib/collections/songDetails';
import {
  subscribeManyFollows,
  type FollowsResponse,
  setFollows,
  deleteFollows,
} from '@/lib/collections/follows';
import { subscribeManySongStreams, type SongStreamsResponse } from '@/lib/collections/songStreams';
import { subscribeManyComments, type CommentsResponse } from '@/lib/collections/comments';
import { subscribeManyReposts, type RepostsResponse } from '@/lib/collections/reposts';
import { subscribeManyAlbums, type AlbumsResponse } from '@/lib/collections/albums';
import {
  subscribeManyPlaylistSongsSongs,
  type PlaylistSongsSongsResponse,
} from '@/lib/collections/playlistSongs';
import { subscribeManyPackPurchases, type PackPurchasesResponse } from '@/lib/collections/packPurchases';
import { subscribeManyPriceHistory, type PriceHistoryResponse } from '@/lib/collections/priceHistory';

// Icons
import {
  Music,
  Play,
  Pause,
  ArrowLeft,
  Edit3,
  Share2,
  MapPin,
  Calendar,
  Heart,
  Repeat2,
  MessageCircle,
  BarChart3,
  Headphones,
  Clock,
  MoreVertical,
  BadgeCheck,
  ListMusic,
  UserPlus,
  UserMinus,
  TrendingUp,
  Check,
  X,
  Grid3X3,
  List,
  Filter,
  Camera,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react';

import {
  FaXTwitter,
  FaInstagram,
  FaSpotify,
  FaTiktok,
  FaYoutube,
  FaTwitch,
  FaSoundcloud,
  FaFacebook,
  FaLinkedin,
  FaTelegram,
  FaGlobe,
} from 'react-icons/fa6';
import { SiKick } from 'react-icons/si';

// ─── Design System ────────────────────────────────────────────────────────────
const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';
const BG = '#000000';
const CARD_BG = '#111111';
const CARD_BORDER = '1px solid rgba(255,255,255,0.06)';

const PANEL_STYLE: React.CSSProperties = {
  background: CARD_BG,
  border: CARD_BORDER,
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
};

const FLOATING_PARTICLES = [
  { size: 2, left: 12, top: 55, duration: 7, delay: 0, opacity: 0.35 },
  { size: 3, left: 28, top: 65, duration: 9, delay: 1.2, opacity: 0.45 },
  { size: 2, left: 45, top: 50, duration: 8, delay: 2.1, opacity: 0.3 },
  { size: 4, left: 62, top: 70, duration: 6, delay: 0.5, opacity: 0.5 },
  { size: 2, left: 78, top: 60, duration: 10, delay: 3.0, opacity: 0.25 },
  { size: 3, left: 18, top: 75, duration: 7, delay: 1.8, opacity: 0.4 },
  { size: 2, left: 35, top: 45, duration: 9, delay: 0.3, opacity: 0.3 },
  { size: 3, left: 55, top: 80, duration: 8, delay: 2.5, opacity: 0.45 },
  { size: 2, left: 72, top: 58, duration: 6, delay: 4.0, opacity: 0.35 },
  { size: 4, left: 88, top: 68, duration: 11, delay: 1.0, opacity: 0.4 },
  { size: 2, left: 8, top: 52, duration: 8, delay: 3.5, opacity: 0.3 },
  { size: 3, left: 42, top: 72, duration: 7, delay: 0.8, opacity: 0.5 },
  { size: 2, left: 58, top: 48, duration: 9, delay: 2.8, opacity: 0.25 },
  { size: 3, left: 82, top: 62, duration: 10, delay: 1.5, opacity: 0.4 },
  { size: 2, left: 25, top: 78, duration: 6, delay: 4.2, opacity: 0.35 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function extractFeat(title: string): string | null {
  const match = title.match(/\((?:feat\.?|ft\.?)\s+([^)]+)\)/i);
  if (match) return match[1];
  const match2 = title.match(/(?:feat\.?|ft\.?)\s+(.+)$/i);
  if (match2) return match2[1];
  return null;
}

// ─── Genre Pill ───────────────────────────────────────────────────────────────
const GenrePill: React.FC<{
  genre: string;
  active: boolean;
  onClick: () => void;
}> = ({ genre, active, onClick }) => (
  <button
    onClick={onClick}
    className="px-3 py-1 rounded-full text-xs font-bold tracking-wide transition-all duration-200 whitespace-nowrap"
    style={{
      background: active
        ? 'rgba(0, 255, 65, 0.15)'
        : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid rgba(0, 255, 65, 0.4)' : '1px solid rgba(255,255,255,0.08)',
      color: active ? PRIMARY_GREEN : 'rgba(255,255,255,0.4)',
    }}
  >
    {genre}
  </button>
);

// ─── Stat Column ──────────────────────────────────────────────────────────────
const StatColumn: React.FC<{ value: string | number; label: string }> = ({ value, label }) => (
  <div className="flex-1 text-center relative">
    <div
      className="text-lg md:text-xl font-black"
      style={{ color: HEADLINE_GREEN, fontFamily: orbitronFont }}
    >
      {value}
    </div>
    <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
      {label}
    </div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative overflow-hidden rounded-[28px] mb-3 px-5 py-3" style={PANEL_STYLE}>
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'radial-gradient(ellipse at 30% 50%, rgba(0, 255, 65, 0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(139,92,246,0.06) 0%, transparent 50%)',
      }}
    />
    <h3
      className="relative text-sm font-black text-white"
      style={{
        fontFamily: orbitronFont,
        textShadow: '0 0 30px rgba(0, 255, 65, 0.3)',
      }}
    >
      {children}
    </h3>
  </div>
);

// ─── Glass Stat Card ──────────────────────────────────────────────────────────
const GlassStatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  glowColor: string;
}> = ({ icon, label, value, glowColor }) => (
  <motion.div
    className="p-4 text-center rounded-[28px] relative overflow-hidden"
    style={{
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      background: 'rgba(255,255,255,0.02)',
      boxShadow: `0 0 0 1px ${glowColor}33, 0 0 20px ${glowColor}14`,
    }}
    whileHover={{
      scale: 1.03,
      boxShadow: `0 0 0 1px ${glowColor}66, 0 0 30px ${glowColor}29`,
      transition: { duration: 0.2 },
    }}
  >
    <div className="mx-auto mb-2" style={{ color: glowColor }}>
      {icon}
    </div>
    <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
      {label}
    </p>
    <p className="text-xl font-black mt-0.5" style={{ color: HEADLINE_GREEN, fontFamily: orbitronFont }}>
      {value}
    </p>
  </motion.div>
);

// ─── Achievements Section ─────────────────────────────────────────────────────
const BADGE_IMAGE_URL =
  'https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f4b9c71ddca6ecef64a51';

const AchievementsSection: React.FC<{
  artistSongsLength: number;
  totalStreams: number;
  isVerified: boolean;
}> = ({ artistSongsLength, totalStreams, isVerified }) => {
  const extraBadges = [
    ...(totalStreams >= 100 ? [{ label: 'Rising Star', icon: <TrendingUp size={12} /> }] : []),
    ...(isVerified ? [{ label: 'Verified', icon: <BadgeCheck size={12} /> }] : []),
  ];

  return (
    <div className="relative overflow-hidden rounded-[28px] p-5 mt-4" style={PANEL_STYLE}>
      {/* Blurred background panel with full badge image */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${BADGE_IMAGE_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.2,
          filter: 'blur(12px)',
        }}
      />

      <div className="flex flex-col items-center relative">
        {/* Green radial glow behind badge */}
        <div
          className="absolute w-40 h-40 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(0, 255, 65, 0.30) 0%, transparent 70%)',
            filter: 'blur(10px)',
            top: '10px',
          }}
        />

        {/* Badge image — cropped to left trophy only */}
        <img
          src={BADGE_IMAGE_URL}
          alt="Early Adopter"
          className="relative rounded-full"
          style={{
            width: 140,
            height: 140,
            objectFit: 'cover',
            objectPosition: 'left center',
            boxShadow: '0 0 30px rgba(0, 255, 65, 0.25), 0 0 60px rgba(0, 255, 65, 0.10)',
          }}
        />

        {/* Label */}
        <p
          className="relative mt-3 text-xs font-bold"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          Early Adopter
        </p>

        {/* Extra badge pills */}
        {extraBadges.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            {extraBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(0, 255, 65, 0.3)',
                  color: HEADLINE_GREEN,
                }}
              >
                {badge.icon}
                {badge.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Song Row ─────────────────────────────────────────────────────────────────
const SongRow: React.FC<{
  rank: number;
  detail: SongDetailsResponse;
  song?: SongsResponse;
  priceUsd: number | null;
  gain: number | null;
  isPlaying: boolean;
  onPlay: () => void;
  onNavigate: () => void;
}> = ({ rank, detail, song, priceUsd, gain, isPlaying, onPlay, onNavigate }) => {
  const feat = extractFeat(detail.title);
  const displayTitle = detail.title.replace(/\s*\((?:feat\.?|ft\.?)\s+[^)]+\)/i, '').trim();

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank - 1, 8) * 0.03 }}
      className="flex items-center gap-3 rounded-[20px] p-2.5 cursor-pointer group"
      style={PANEL_STYLE}
      onClick={onNavigate}
      whileTap={{ scale: 0.995 }}
    >
      <span
        className="w-6 text-center text-[11px] font-black flex-shrink-0"
        style={{
          color: rank <= 3 ? HEADLINE_GREEN : 'rgba(255,255,255,0.2)',
          fontFamily: orbitronFont,
        }}
      >
        {String(rank).padStart(2, '0')}
      </span>

      <div className="w-11 h-11 rounded-[14px] overflow-hidden flex-shrink-0 bg-[#1a1a1a]/60">
        {detail.coverImage ? (
          <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <Music size={16} className="m-auto mt-2.5" style={{ color: 'rgba(255,255,255,0.15)' }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-white truncate" style={{ fontFamily: orbitronFont }}>
          {displayTitle}
        </p>
        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {feat ? `feat. ${feat}` : detail.artist}
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        {priceUsd != null && (
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-black border"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderColor: 'rgba(255,255,255,0.1)',
              color: HEADLINE_GREEN,
            }}
          >
            ${priceUsd.toFixed(6)}
          </span>
        )}
        {gain != null && (
          <span className={`text-[10px] font-black ${gain >= 0 ? 'text-[#00FF41]' : 'text-red-500'}`}>
            {gain >= 0 ? '+' : ''}
            {gain.toFixed(1)}%
          </span>
        )}
      </div>

      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onPlay();
        }}
        whileTap={{ scale: 0.9 }}
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
        style={{
          background: isPlaying ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,255,255,0.04)',
          border: isPlaying ? '1px solid rgba(0, 255, 65, 0.35)' : '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {isPlaying ? (
          <div className="flex items-end gap-[2px] h-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-[2px] rounded-full"
                style={{
                  background: HEADLINE_GREEN,
                  height: `${[60, 100, 70][i - 1]}%`,
                  animation: `waveBar ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                }}
              />
            ))}
          </div>
        ) : (
          <Play size={12} style={{ color: HEADLINE_GREEN, marginLeft: 1 }} />
        )}
      </motion.button>

      <button
        onClick={(e) => e.stopPropagation()}
        className="w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-white transition-colors flex-shrink-0"
      >
        <MoreVertical size={13} />
      </button>
    </motion.div>
  );
};

// ─── Tab Buttons ──────────────────────────────────────────────────────────────
type TabKey = 'songs' | 'playlists' | 'collections' | 'reposts';

const BASE_TABS: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
  { key: 'songs', label: 'Songs' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'collections', label: 'Collections' },
  { key: 'reposts', label: 'Reposts' },
];

// ─── Main Component ───────────────────────────────────────────────────────────
interface ProfilePageProps {
  resolvedAddress?: string;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ resolvedAddress }) => {
  const navigate = useNavigate();
  const { address: paramAddress } = useParams<{ address?: string }>();
  const { user } = useAuth();
  const profileWallet = resolvedAddress ?? paramAddress ?? user?.address ?? null;
  const isOwn = !!user && user.address === profileWallet;

  const { setQueue, currentSong, isPlaying, playSong } = usePlayer();
  const [activeTab, setActiveTab] = useState<TabKey>('songs');
  const [followHover, setFollowHover] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);

  // View toggle: grid vs list for songs
  const [songViewMode, setSongViewMode] = useState<'grid' | 'list'>('grid');

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [pfpUploading, setPfpUploading] = useState(false);

  // Optimistic preview URLs for banner / avatar uploads
  const [optimisticBanner, setOptimisticBanner] = useState<string | null>(null);
  const [optimisticAvatar, setOptimisticAvatar] = useState<string | null>(null);
  const bannerObjUrl = useRef<string | null>(null);
  const avatarObjUrl = useRef<string | null>(null);

  // Genre filter
  const [activeGenre, setActiveGenre] = useState<string>('All');

  // Bio expand
  const [showFullBio, setShowFullBio] = useState(false);

  // External on-chain tokens
  const [externalTokens, setExternalTokens] = useState<Array<{ mint: string; amount: number; rawAmount: string; decimals: number }>>([]);

  // Share card overlay
  const [showShareCard, setShowShareCard] = useState(false);

  // ─── Data Subscriptions ───────────────────────────────────────────────────
  const { data: artist } = useRealtimeData<ArtistsResponse | null>(
    subscribeArtists,
    !!profileWallet,
    profileWallet!
  );

  const { data: userProfile } = useRealtimeData<UsersResponse | null>(
    subscribeUsers,
    !!profileWallet,
    profileWallet!
  );

  const { data: allSongDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    !!profileWallet,
    ''
  );

  const { data: allSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    !!profileWallet,
    ''
  );

  const { data: followers } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    !!profileWallet,
    `where artistAddress = '${profileWallet}'`
  );

  const { data: following } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    !!profileWallet,
    `where followerAddress = '${profileWallet}'`
  );

  const { data: allSongStreams } = useRealtimeData<SongStreamsResponse[]>(
    subscribeManySongStreams,
    !!profileWallet,
    ''
  );

  const { data: allComments } = useRealtimeData<CommentsResponse[]>(
    subscribeManyComments,
    !!profileWallet,
    `where artistAddress = '${profileWallet}'`
  );

  const { data: allReposts } = useRealtimeData<RepostsResponse[]>(
    subscribeManyReposts,
    !!profileWallet,
    ''
  );

  const { data: allAlbums } = useRealtimeData<AlbumsResponse[]>(
    subscribeManyAlbums,
    !!profileWallet,
    `where creator = '${profileWallet}'`
  );

  const { data: playlistEntries } = useRealtimeData<PlaylistSongsSongsResponse[]>(
    subscribeManyPlaylistSongsSongs,
    !!profileWallet,
    profileWallet ?? ''
  );

  const { data: allPurchases } = useRealtimeData<PackPurchasesResponse[]>(
    subscribeManyPackPurchases,
    !!profileWallet,
    `order by createdAt desc limit 200`
  );

  const { data: allPriceHistory } = useRealtimeData<PriceHistoryResponse[]>(
    subscribeManyPriceHistory,
    !!profileWallet,
    ''
  );

  // ─── Derived Data ─────────────────────────────────────────────────────────
  const songsMap = useMemo(() => {
    const m: Record<string, SongsResponse> = {};
    (allSongs ?? []).forEach((s) => {
      m[s.id] = s;
    });
    return m;
  }, [allSongs]);

  const detailsMap = useMemo(() => {
    const m: Record<string, SongDetailsResponse> = {};
    (allSongDetails ?? []).forEach((d) => {
      m[d.id] = d;
    });
    return m;
  }, [allSongDetails]);

  const artistSongs = useMemo(() => {
    return (allSongDetails ?? []).filter(
      (d) => d.artistAddress === profileWallet && d.approved !== false
    );
  }, [allSongDetails, profileWallet]);

  const songIds = useMemo(() => artistSongs.map((d) => d.id), [artistSongs]);
  const songIdSet = useMemo(() => new Set(songIds), [songIds]);

  const songsForLive = useMemo(
    () => artistSongs.map((d) => songsMap[d.id]).filter(Boolean) as SongsResponse[],
    [artistSongs, songsMap]
  );

  const { liveData } = useListLiveData(songsForLive);

  // Total streams
  const totalStreams = useMemo(() => {
    return (allSongStreams ?? []).reduce((sum, s) => {
      if (songIdSet.has(s.id)) return sum + (s.count ?? 0);
      return sum;
    }, 0);
  }, [allSongStreams, songIdSet]);

  // Reposts on artist's songs
  const totalReposts = useMemo(() => {
    return (allReposts ?? []).filter((r) => songIdSet.has(r.songId)).length;
  }, [allReposts, songIdSet]);

  // Comments on artist profile
  const totalComments = useMemo(() => allComments?.length ?? 0, [allComments]);

  // Follow state
  const followId = user?.address && profileWallet ? `${user.address}_${profileWallet}` : null;
  const isFollowing = useMemo(() => {
    if (!user || isOwn) return false;
    return (followers ?? []).some((f) => f.followerAddress === user.address);
  }, [followers, user, isOwn]);

  // Earnings
  const totalEarnedSol = useMemo(() => {
    return (
      (allPurchases ?? [])
        .filter((p) => songIdSet.has(p.songId ?? '') && p.artistPayoutStatus === 'paid')
        .reduce((sum, p) => sum + (p.artistPayoutSOL ?? 0), 0) / 1e9
    );
  }, [allPurchases, songIdSet]);

  // Price changes (% gain)
  const priceChangeMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!allPriceHistory) return map;
    songIds.forEach((id) => {
      const history = allPriceHistory
        .filter((p) => p.songId === id && p.price != null)
        .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
      if (history.length >= 2) {
        const oldest = history[0].price ?? 0;
        const newest = history[history.length - 1].price ?? 0;
        if (oldest > 0) {
          map[id] = ((newest - oldest) / oldest) * 100;
        }
      }
    });
    return map;
  }, [allPriceHistory, songIds]);

  // Average duration
  const avgDuration = useMemo(() => {
    const durations = artistSongs.map((d) => d.duration).filter(Boolean) as number[];
    if (durations.length === 0) return '—';
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return formatDuration(avg);
  }, [artistSongs]);

  // Display name / handle / bio
  const displayName = artist?.name ?? userProfile?.displayName ?? 'Unknown Artist';
  const handle = userProfile?.username
    ? `@${userProfile.username}`
    : artist?.name
      ? `@${artist.name.toLowerCase().replace(/\s+/g, '')}`
      : `@${profileWallet?.slice(0, 8) ?? 'unknown'}`;
  const bio = artist?.bio ?? '';
  const avatarUrl = artist?.profileImage ?? userProfile?.profileImage;
  const bannerUrl = artist?.bannerImage;
  const isVerified = artist?.isVerified ?? false;
  const joinDate = artist?.tarobase_created_at
    ? formatDate(artist.tarobase_created_at)
    : userProfile?.tarobase_created_at
      ? formatDate(userProfile.tarobase_created_at)
      : 'Recently';

  // Social links
  const socials = {
    twitter: (userProfile as any)?.twitter || '',
    instagram: (userProfile as any)?.instagram || '',
    spotify: (userProfile as any)?.spotify || '',
    tiktok: (userProfile as any)?.tiktok || '',
    youtube: (userProfile as any)?.youtube || '',
    twitch: (userProfile as any)?.twitch || '',
    kick: (userProfile as any)?.kick || '',
    soundcloud: (userProfile as any)?.soundcloud || '',
    facebook: (userProfile as any)?.facebook || '',
    linkedin: (userProfile as any)?.linkedin || '',
    telegram: (userProfile as any)?.telegram || '',
    website: (userProfile as any)?.website || '',
  };
  const hasSocialLinks = Object.values(socials).some((v) => Boolean(v));

  // Genre list
  const genres = useMemo(() => {
    const seen = new Set<string>();
    artistSongs.forEach((d) => { if (d.genre) seen.add(d.genre); });
    return ['All', ...Array.from(seen).sort()];
  }, [artistSongs]);

  const filteredDetails = useMemo(() => {
    if (activeGenre === 'All') return artistSongs;
    return artistSongs.filter((d) => d.genre === activeGenre);
  }, [artistSongs, activeGenre]);

  // Reposted songs (for reposts tab)
  const profileReposts = useMemo(() => {
    return (allReposts ?? []).filter((r) => r.reposterAddress === profileWallet);
  }, [allReposts, profileWallet]);

  const repostedSongs = useMemo(() => {
    if (!profileReposts.length || !allSongs) return [];
    return profileReposts
      .map((r) => {
        const song = songsMap[r.songId];
        const detail = detailsMap[r.songId];
        if (!song) return null;
        return { song, detail: detail ?? null, repost: r };
      })
      .filter(Boolean) as { song: SongsResponse; detail: SongDetailsResponse | null; repost: RepostsResponse }[];
  }, [profileReposts, songsMap, detailsMap, allSongs]);

  // Comment wall tier
  const { tier: myTier } = useArtistTier(profileWallet ?? '', user?.address ?? undefined);
  const canComment = !!user && myTier !== 'none';

  // ─── Fetch Like Counts ────────────────────────────────────────────────────
  useEffect(() => {
    if (songIds.length === 0) {
      setTotalLikes(0);
      return;
    }
    let cancelled = false;
    Promise.all(
      songIds.map(async (id) => {
        try {
          const result = await countSongsLikes(id);
          return result.value ?? 0;
        } catch {
          return 0;
        }
      })
    ).then((counts) => {
      if (cancelled) return;
      setTotalLikes(counts.reduce((a, b) => a + b, 0));
    });
    return () => {
      cancelled = true;
    };
  }, [songIds.join(',')]);

  // ─── Clear optimistic previews when server data changes ────────────────────
  useEffect(() => {
    if (optimisticBanner && artist?.bannerImage) {
      setOptimisticBanner(null);
      if (bannerObjUrl.current) {
        URL.revokeObjectURL(bannerObjUrl.current);
        bannerObjUrl.current = null;
      }
    }
  }, [artist?.bannerImage]);

  useEffect(() => {
    if (optimisticAvatar && (artist?.profileImage || userProfile?.profileImage)) {
      setOptimisticAvatar(null);
      if (avatarObjUrl.current) {
        URL.revokeObjectURL(avatarObjUrl.current);
        avatarObjUrl.current = null;
      }
    }
  }, [artist?.profileImage, userProfile?.profileImage]);

  useEffect(() => {
    return () => {
      if (bannerObjUrl.current) URL.revokeObjectURL(bannerObjUrl.current);
      if (avatarObjUrl.current) URL.revokeObjectURL(avatarObjUrl.current);
    };
  }, []);

  // Fetch externally held SPL tokens
  useEffect(() => {
    if (!profileWallet) return;
    let cancelled = false;
    const fetchExternal = async () => {
      try {
        const res = await api.get<{ tokens: Array<{ mint: string; amount: number; rawAmount: string; decimals: number }> }>(
          `/api/wallet/${profileWallet}/tokens`
        );
        if (cancelled) return;
        setExternalTokens(res?.tokens ?? []);
      } catch (e) {
        console.error('Failed to fetch external tokens:', e);
      }
    };
    fetchExternal();
    return () => {
      cancelled = true;
    };
  }, [profileWallet]);

  // ─── Edit Handlers ─────────────────────────────────────────────────────────
  const startEdit = () => {
    setEditName(artist?.name ?? '');
    setEditBio(artist?.bio ?? '');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName(artist?.name ?? '');
    setEditBio(artist?.bio ?? '');
  };

  const saveProfile = async () => {
    if (!profileWallet || !isOwn) return;
    if (!editName.trim()) { toast.error('Name is required'); return; }

    setIsSaving(true);
    try {
      let artistSuccess: boolean;
      if (artist) {
        artistSuccess = await updateArtists(profileWallet, {
          ...artist,
          name: editName.trim(),
          bio: editBio.trim() || undefined,
          walletAddress: Address.publicKey(artist.walletAddress),
        } as ArtistsRequestUpdate);
      } else {
        artistSuccess = await setArtists(profileWallet, {
          name: editName.trim(),
          bio: editBio.trim() || undefined,
          walletAddress: Address.publicKey(profileWallet),
          isVerified: false,
        });
      }
      if (artistSuccess) {
        toast.success('Profile updated!');
        setIsEditing(false);
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      toast.error('Error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const validateImageFile = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed.');
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB.');
      return false;
    }
    return true;
  };

  const setOptimisticImage = (file: File, type: 'banner' | 'pfp') => {
    const url = URL.createObjectURL(file);
    if (type === 'banner') {
      if (bannerObjUrl.current) URL.revokeObjectURL(bannerObjUrl.current);
      bannerObjUrl.current = url;
      setOptimisticBanner(url);
    } else {
      if (avatarObjUrl.current) URL.revokeObjectURL(avatarObjUrl.current);
      avatarObjUrl.current = url;
      setOptimisticAvatar(url);
    }
  };

  const handleImageUpload = async (
    file: File,
    type: 'banner' | 'pfp'
  ) => {
    if (!profileWallet || !isOwn) return;
    const setUploading = type === 'banner' ? setBannerUploading : setPfpUploading;
    setUploading(true);
    try {
      const fileId = `${type}_${profileWallet}_${Date.now()}`;
      const success = await uploadAppFiles(fileId, file);
      if (!success) {
        toast.error(`Failed to upload ${type}`);
        setUploading(false);
        return;
      }
      const item = await getAppFiles(fileId);
      if (!item?.url) {
        toast.error(`Failed to get ${type} URL`);
        setUploading(false);
        return;
      }
      let updateSuccess: boolean;
      if (artist) {
        updateSuccess = await updateArtists(profileWallet, {
          ...artist,
          [type === 'banner' ? 'bannerImage' : 'profileImage']: item.url,
          walletAddress: Address.publicKey(artist.walletAddress),
        } as ArtistsRequestUpdate);
      } else {
        updateSuccess = await setArtists(profileWallet, {
          name: editName.trim() || 'Artist',
          [type === 'banner' ? 'bannerImage' : 'profileImage']: item.url,
          walletAddress: Address.publicKey(profileWallet),
          isVerified: false,
        });
      }
      if (updateSuccess) {
        toast.success(`${type === 'banner' ? 'Banner' : 'Profile picture'} updated!`);
      } else {
        toast.error(`Failed to save ${type}`);
      }
    } catch {
      toast.error(`Error uploading ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const bannerInputRef = useRef<HTMLInputElement>(null);
  const pfpInputRef = useRef<HTMLInputElement>(null);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handlePlayAll = useCallback(() => {
    const queue = artistSongs
      .map((d) => {
        const song = songsMap[d.id];
        if (!d.audioUrl && !d.audiusStreamUrl && !song?.audiusStreamUrl) return null;
        return {
          songId: d.id,
          title: d.title,
          artist: d.artist,
          coverImage: d.coverImage,
          audioUrl: d.audioUrl,
          audiusStreamUrl: d.audiusStreamUrl ?? song?.audiusStreamUrl,
          duration: d.duration ? d.duration / 1000 : undefined,
          symbol: d.tokenSymbol ?? song?.symbol,
          genre: d.genre,
        };
      })
      .filter(Boolean) as Parameters<typeof setQueue>[0];

    if (queue.length === 0) {
      toast.error('No playable songs found');
      return;
    }
    setQueue(queue, 0, true);
    toast.success(`Playing ${queue.length} song${queue.length > 1 ? 's' : ''}`);
  }, [artistSongs, songsMap, setQueue]);

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error('Connect your wallet to follow');
      return;
    }
    if (!followId || isOwn) return;
    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const success = await deleteFollows(followId);
        if (success) toast.success('Unfollowed');
        else toast.error('Failed to unfollow');
      } else {
        const success = await setFollows(followId, {
          followerAddress: Address.publicKey(user.address),
          artistAddress: Address.publicKey(profileWallet!),
          createdAt: Time.Now,
        });
        if (success) {
          toast.success('Now following!');
          sendNotification('/api/notifications/follow', { artistAddress: Address.publicKey(profileWallet!) });
        }
        else toast.error('Failed to follow');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsFollowLoading(false);
    }
  };

  async function sendNotification(path: string, body: object) {
    try {
      const token = await getIdToken();
      if (!token || !user?.address) return;
      const api = createAuthenticatedApiClient(token, user.address);
      await api.post(path, body);
    } catch (e) {
      console.error('Failed to create notification:', e);
    }
  }

  const handleShare = () => {
    setShowShareCard(true);
  };

  const handlePlaySong = useCallback(
    (detail: SongDetailsResponse) => {
      const song = songsMap[detail.id];
      if (currentSong?.songId === detail.id && isPlaying) {
        return;
      }
      playSong({
        songId: detail.id,
        title: detail.title,
        artist: detail.artist,
        coverImage: detail.coverImage,
        audioUrl: detail.audioUrl,
        audiusStreamUrl: detail.audiusStreamUrl ?? song?.audiusStreamUrl,
        duration: detail.duration ? detail.duration / 1000 : undefined,
        symbol: detail.tokenSymbol ?? song?.symbol,
        genre: detail.genre,
      });
    },
    [songsMap, currentSong, isPlaying, playSong]
  );

  const isThisPlaying = useCallback(
    (songId: string) => currentSong?.songId === songId && isPlaying,
    [currentSong, isPlaying]
  );

  // ─── Tab Content Renderers ────────────────────────────────────────────────
  const renderSongsTab = () => {
    if (artistSongs.length === 0) {
      return (
        <div className="py-12 text-center rounded-[28px]" style={PANEL_STYLE}>
          <Music size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No songs yet.
          </p>
          {isOwn && (
            <motion.button
              onClick={() => navigate('/create')}
              className="mt-4 px-5 py-2 rounded-full text-xs font-black"
              style={{
                background: PRIMARY_GREEN,
                color: '#000',
                fontFamily: orbitronFont,
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
            >
              + Create First Song
            </motion.button>
          )}
        </div>
      );
    }

    const songsToShow = filteredDetails;

    return (
      <div className="space-y-4">
        {/* Genre pills + view toggle */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {genres.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {genres.map((g) => (
                <GenrePill
                  key={g}
                  genre={g}
                  active={activeGenre === g}
                  onClick={() => setActiveGenre(g)}
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={() => setSongViewMode('grid')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: songViewMode === 'grid' ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
                border: songViewMode === 'grid' ? '1px solid rgba(0, 255, 65, 0.3)' : '1px solid transparent',
                color: songViewMode === 'grid' ? PRIMARY_GREEN : 'rgba(255,255,255,0.3)',
              }}
            >
              <Grid3X3 size={14} />
            </button>
            <button
              onClick={() => setSongViewMode('list')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: songViewMode === 'list' ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
                border: songViewMode === 'list' ? '1px solid rgba(0, 255, 65, 0.3)' : '1px solid transparent',
                color: songViewMode === 'list' ? PRIMARY_GREEN : 'rgba(255,255,255,0.3)',
              }}
            >
              <List size={14} />
            </button>
          </div>
        </div>

        {songsToShow.length === 0 ? (
          <div className="py-12 text-center rounded-[28px]" style={PANEL_STYLE}>
            <Filter size={28} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              No {activeGenre} songs yet.
            </p>
          </div>
        ) : songViewMode === 'grid' ? (
          <div className="flex flex-wrap gap-4 justify-start">
            {songsToShow.map((detail, i) => {
              const song = songsMap[detail.id];
              if (!song) return null;
              return (
                <motion.div
                  key={detail.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.04 }}
                  whileHover={{
                    y: -6,
                    boxShadow: '0 12px 40px rgba(0, 255, 65, 0.15), 0 0 60px rgba(0, 255, 65, 0.05)',
                    transition: { duration: 0.25 },
                  }}
                  style={{ borderRadius: '20px' }}
                >
                  <NewDropCard
                    song={song}
                    details={detail}
                  />
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {songsToShow.map((detail, i) => {
              const song = songsMap[detail.id];
              const priceSol = liveData[detail.id]?.priceSol ?? null;
              const priceUsd = priceSol != null && priceSol > 0 ? priceSol : null;
              const gain = priceChangeMap[detail.id] ?? null;
              return (
                <SongRow
                  key={detail.id}
                  rank={i + 1}
                  detail={detail}
                  song={song}
                  priceUsd={priceUsd}
                  gain={gain}
                  isPlaying={isThisPlaying(detail.id)}
                  onPlay={() => handlePlaySong(detail)}
                  onNavigate={() => navigate(`/song/${detail.id}`)}
                />
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderPlaylistsTab = () => {
    const entries = (playlistEntries ?? []).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    if (entries.length === 0) {
      return (
        <div className="py-12 text-center rounded-[28px]" style={PANEL_STYLE}>
          <ListMusic size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No playlist entries yet.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {entries.map((entry) => {
          const detail = detailsMap[entry.songId];
          return (
            <div
              key={entry.songId}
              className="flex items-center gap-3 rounded-[20px] p-2.5 cursor-pointer"
              style={PANEL_STYLE}
              onClick={() => navigate(`/song/${entry.songId}`)}
            >
              <div className="w-11 h-11 rounded-[14px] overflow-hidden bg-[#1a1a1a]/60 flex-shrink-0">
                {detail?.coverImage ? (
                  <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={16} className="m-auto mt-2.5" style={{ color: 'rgba(255,255,255,0.15)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">{detail?.title ?? entry.songId}</p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {detail?.artist ?? 'Unknown Artist'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderCollectionsTab = () => {
    const collection = (allPurchases ?? []).filter((p) => p.buyerAddress === profileWallet);

    // Build mint -> songId map from allSongs
    const mintToSongId: Record<string, string> = {};
    (allSongs ?? []).forEach((s) => {
      if (s.mintAddress) mintToSongId[s.mintAddress] = s.id;
    });

    const purchasedSongIds = new Set(collection.map((p) => p.songId).filter(Boolean));

    const externalSongs = externalTokens
      .map((t) => {
        const songId = mintToSongId[t.mint];
        if (!songId || purchasedSongIds.has(songId)) return null;
        const detail = detailsMap[songId];
        const song = songsMap[songId];
        return {
          songId,
          detail,
          song,
          mint: t.mint,
          amount: Number(t.rawAmount) / Math.pow(10, t.decimals),
        };
      })
      .filter(Boolean) as Array<{
        songId: string;
        detail: SongDetailsResponse | undefined;
        song: SongsResponse | undefined;
        mint: string;
        amount: number;
      }>;

    const hasItems = collection.length > 0 || externalSongs.length > 0;
    if (!hasItems) {
      return (
        <div className="py-12 text-center rounded-[28px]" style={PANEL_STYLE}>
          <TrendingUp size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No collected tokens yet.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {collection.map((purchase) => {
          const detail = detailsMap[purchase.songId ?? ''];
          return (
            <div
              key={purchase.id}
              className="flex items-center gap-3 rounded-[20px] p-2.5 cursor-pointer"
              style={PANEL_STYLE}
              onClick={() => purchase.songId && navigate(`/song/${purchase.songId}`)}
            >
              <div className="w-11 h-11 rounded-[14px] overflow-hidden bg-[#1a1a1a]/60 flex-shrink-0">
                {detail?.coverImage ? (
                  <img src={detail.coverImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Music size={16} className="m-auto mt-2.5" style={{ color: 'rgba(255,255,255,0.15)' }} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {detail?.title ?? purchase.packName}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {purchase.tokenAmount?.toLocaleString() ?? '—'} tokens
                </p>
              </div>
              {purchase.artistPayoutUSD != null && (
                <p className="text-xs font-black" style={{ color: HEADLINE_GREEN, fontFamily: orbitronFont }}>
                  ${(purchase.artistPayoutUSD / 100).toFixed(2)}
                </p>
              )}
            </div>
          );
        })}
        {externalSongs.map((ext) => (
          <div
            key={ext.songId}
            className="flex items-center gap-3 rounded-[20px] p-2.5 cursor-pointer"
            style={PANEL_STYLE}
            onClick={() => navigate(`/song/${ext.songId}`)}
          >
            <div className="w-11 h-11 rounded-[14px] overflow-hidden bg-[#1a1a1a]/60 flex-shrink-0">
              {ext.detail?.coverImage ? (
                <img src={ext.detail.coverImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <Music size={16} className="m-auto mt-2.5" style={{ color: 'rgba(255,255,255,0.15)' }} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate">
                  {ext.detail?.title ?? ext.song?.symbol ?? 'Unknown'}
                </p>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: 'rgba(0, 255, 65, 0.12)',
                    color: '#00FF41',
                    border: '1px solid rgba(0, 255, 65, 0.2)',
                  }}
                >
                  Held Externally
                </span>
              </div>
              <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {ext.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })} tokens
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderRepostsTab = () => {
    if (repostedSongs.length === 0) {
      return (
        <div className="py-12 text-center rounded-[28px]" style={PANEL_STYLE}>
          <Repeat2 size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            No reposts yet.
          </p>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-4 justify-start">
        {repostedSongs.map(({ song, detail }, i) => (
          <motion.div
            key={song.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.04 }}
            whileHover={{
              y: -6,
              boxShadow: '0 12px 40px rgba(0, 255, 65, 0.15), 0 0 60px rgba(0, 255, 65, 0.05)',
              transition: { duration: 0.25 },
            }}
            style={{ borderRadius: '20px' }}
          >
            <NewDropCard
              song={song}
              details={detail}
            />
          </motion.div>
        ))}
      </div>
    );
  };

  const renderAboutTab = () => (
    <div className="space-y-4">
      {hasSocialLinks && (
        <div className="p-5 rounded-[28px]" style={PANEL_STYLE}>
          <h4 className="text-sm font-bold text-white mb-3" style={{ fontFamily: orbitronFont }}>
            Socials
          </h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(socials)
              .filter(([, url]) => Boolean(url))
              .map(([platform, url]) => (
                <a
                  key={platform}
                  href={url as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-opacity hover:opacity-100"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                    opacity: 0.85,
                  }}
                >
                  {platform === 'twitter' && <FaXTwitter size={11} />}
                  {platform === 'instagram' && <FaInstagram size={11} />}
                  {platform === 'spotify' && <FaSpotify size={11} />}
                  {platform === 'tiktok' && <FaTiktok size={11} />}
                  {platform === 'youtube' && <FaYoutube size={11} />}
                  {platform === 'twitch' && <FaTwitch size={11} />}
                  {platform === 'kick' && <SiKick size={11} />}
                  {platform === 'soundcloud' && <FaSoundcloud size={11} />}
                  {platform === 'facebook' && <FaFacebook size={11} />}
                  {platform === 'linkedin' && <FaLinkedin size={11} />}
                  {platform === 'telegram' && <FaTelegram size={11} />}
                  {platform === 'website' && <FaGlobe size={11} />}
                  <span className="capitalize">{platform}</span>
                </a>
              ))}
          </div>
        </div>
      )}
      <div className="p-5 rounded-[28px]" style={PANEL_STYLE}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <Calendar size={14} style={{ color: HEADLINE_GREEN }} />
            Joined {joinDate}
          </div>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            <BadgeCheck size={14} style={{ color: HEADLINE_GREEN }} />
            {isVerified ? 'Verified Artist' : 'Unverified Artist'}
          </div>
          {profileWallet && (
            <div className="flex items-center gap-2 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <MapPin size={14} />
              {profileWallet.slice(0, 6)}...{profileWallet.slice(-4)}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────
  if (!profileWallet) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: BG }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-xs"
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{
              background: CARD_BG,
              border: `2px solid ${HEADLINE_GREEN}`,
            }}
          >
            <Music size={32} style={{ color: PRIMARY_GREEN }} />
          </div>
          <h1
            className="text-2xl font-black mb-2 text-white"
            style={{ fontFamily: orbitronFont }}
          >
            Connect Wallet
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Sign in to view your profile.
          </p>
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-8 py-3 rounded-full font-bold text-sm"
            style={{
              background: PRIMARY_GREEN,
              color: '#000',
              fontFamily: orbitronFont,
            }}
          >
            Sign In
          </motion.button>
        </motion.div>
      </div>
    );
  }

  const BIO_THRESHOLD = 160;
  const bioTruncated = bio.length > BIO_THRESHOLD && !showFullBio
    ? bio.slice(0, BIO_THRESHOLD) + '…'
    : bio;

  const tabs = BASE_TABS;

  return (
    <div className="min-h-screen pb-28" style={{ background: BG, color: '#ffffff' }}>
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
        @keyframes floatParticle {
          0% { transform: translateY(0); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateY(-120px); opacity: 0; }
        }
      `}</style>

      {/* ── Banner ── */}
      <div className="relative w-full h-48 md:h-64 overflow-hidden">
        {(() => {
          const src = optimisticBanner || bannerUrl;
          const hasCustomBanner = Boolean(src && String(src).trim().length > 0);
          return hasCustomBanner ? (
            <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <img
              src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f3b121a25fa0767365b33"
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          );
        })()}
        <div className="absolute inset-0 bg-gradient-to-t from-[#000000] via-[#000000]/60 to-transparent" />

        {/* Banner upload overlay (edit mode) */}
        {isOwn && isEditing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              ref={bannerInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!validateImageFile(file)) return;
                setOptimisticImage(file, 'banner');
                handleImageUpload(file, 'banner');
              }}
            />
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={bannerUploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all"
              style={{
                background: 'rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                backdropFilter: 'blur(12px)',
              }}
            >
              {bannerUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Camera size={16} />
              )}
              {bannerUploading ? 'Uploading…' : 'Change Banner'}
            </button>
          </div>
        )}

        {/* Back button */}
        <motion.button
          onClick={() => navigate(-1)}
          whileTap={{ scale: 0.9 }}
          className="absolute top-4 left-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ArrowLeft size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
        </motion.button>
      </div>

      {/* ── Profile Info ── */}
      <div className="relative z-10 px-4 max-w-3xl mx-auto -mt-16">
        {/* Floating particles */}
        <div className="absolute inset-x-0 pointer-events-none overflow-hidden" style={{ top: '-40px', bottom: '-40px' }}>
          {FLOATING_PARTICLES.map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: p.size,
                height: p.size,
                background: 'rgba(255,255,255,0.55)',
                left: `${p.left}%`,
                top: `${p.top}%`,
                animation: `floatParticle ${p.duration}s linear infinite`,
                animationDelay: `${p.delay}s`,
                opacity: p.opacity,
              }}
            />
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-6 relative">
          {/* Avatar */}
          <div className="relative flex-shrink-0 self-center md:self-auto">
            {/* Radial glow behind avatar */}
            <div
              className="absolute inset-0 -m-10 rounded-full pointer-events-none"
              style={{
                background: 'radial-gradient(circle at center, rgba(0, 255, 65, 0.25) 0%, rgba(139,92,246,0.15) 40%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
            <div
              className="relative w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-[#111111] flex-shrink-0"
              style={{
                boxShadow: '0 0 0 2px #00FF41, 0 0 40px rgba(0, 255, 65, 0.3), 0 0 80px rgba(0, 255, 65, 0.1)',
              }}
            >
              {(optimisticAvatar ?? avatarUrl) ? (
                <img src={optimisticAvatar ?? avatarUrl} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-black text-white" style={{ fontFamily: orbitronFont }}>
                  {displayName[0]?.toUpperCase() ?? '?'}
                </div>
              )}
            </div>

            {/* PFP upload overlay (edit mode) */}
            {isOwn && isEditing && (
              <>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  ref={pfpInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (!validateImageFile(file)) return;
                    setOptimisticImage(file, 'pfp');
                    handleImageUpload(file, 'pfp');
                  }}
                />
                <button
                  onClick={() => pfpInputRef.current?.click()}
                  disabled={pfpUploading}
                  className="absolute bottom-1 right-1 w-9 h-9 rounded-full flex items-center justify-center"
                  style={{
                    background: 'rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                  }}
                >
                  {pfpUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
              </>
            )}
          </div>

          {/* Name + bio + actions */}
          <div className="flex-1 min-w-0 text-center md:text-left relative">
            {/* Blurred spotlight behind name */}
            <div
              className="absolute inset-x-0 -top-4 h-28 -z-10 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0, 255, 65, 0.12) 0%, transparent 70%)',
                filter: 'blur(20px)',
              }}
            />
            {isEditing ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Your artist name"
                  className="w-full px-4 py-2.5 rounded-xl text-base font-bold outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                    fontFamily: orbitronFont,
                  }}
                />
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a short bio…"
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#fff',
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold"
                    style={{ background: PRIMARY_GREEN, color: '#000' }}
                  >
                    <Check size={14} />
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                  <h1
                    className="text-2xl md:text-3xl font-black text-white"
                    style={{ fontFamily: orbitronFont }}
                  >
                    {displayName}
                  </h1>
                  <span
                    className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border"
                    style={{
                      background: `${PRIMARY_GREEN}15`,
                      borderColor: `${PRIMARY_GREEN}40`,
                      color: PRIMARY_GREEN,
                    }}
                  >
                    Artist
                  </span>
                </div>

                <div className="flex items-center justify-center md:justify-start gap-1.5 mt-1">
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {handle}
                  </p>
                  {isVerified && <BadgeCheck size={15} style={{ color: PRIMARY_GREEN }} />}
                </div>

                <div className="flex items-center justify-center md:justify-start gap-4 mt-3 flex-wrap">
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Calendar size={12} /> {joinDate}
                  </span>
                  {hasSocialLinks && (
                    <div className="flex items-center gap-3">
                      {socials.twitter && (
                        <motion.a
                          href={socials.twitter}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaXTwitter size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.instagram && (
                        <motion.a
                          href={socials.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaInstagram size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.spotify && (
                        <motion.a
                          href={socials.spotify}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaSpotify size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.tiktok && (
                        <motion.a
                          href={socials.tiktok}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaTiktok size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.youtube && (
                        <motion.a
                          href={socials.youtube}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaYoutube size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.twitch && (
                        <motion.a
                          href={socials.twitch}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaTwitch size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.kick && (
                        <motion.a
                          href={socials.kick}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <SiKick size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.soundcloud && (
                        <motion.a
                          href={socials.soundcloud}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaSoundcloud size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.facebook && (
                        <motion.a
                          href={socials.facebook}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaFacebook size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.linkedin && (
                        <motion.a
                          href={socials.linkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaLinkedin size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.telegram && (
                        <motion.a
                          href={socials.telegram}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaTelegram size={12} color="#fff" />
                        </motion.a>
                      )}
                      {socials.website && (
                        <motion.a
                          href={socials.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          whileHover={{ scale: 1.15, opacity: 1 }}
                          whileTap={{ scale: 0.92 }}
                          className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', opacity: 0.85 }}
                        >
                          <FaGlobe size={12} color="#fff" />
                        </motion.a>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Edit button (own profile, not editing) */}
          {isOwn && !isEditing && (
            <motion.button
              onClick={startEdit}
              whileTap={{ scale: 0.95 }}
              className="self-center md:self-end flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
              }}
            >
              <Edit3 size={12} />
              Edit Profile
            </motion.button>
          )}
        </div>

        {/* ── Bio ── */}
        {bio && (
          <div className="mt-3 px-4">
            <p className="text-sm max-w-2xl mx-auto md:mx-0 text-center md:text-left" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {bioTruncated}
            </p>
            {bio.length > BIO_THRESHOLD && (
              <button
                onClick={() => setShowFullBio((v) => !v)}
                className="text-xs font-semibold mt-1 block mx-auto md:mx-0"
                style={{ color: PRIMARY_GREEN }}
              >
                {showFullBio ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* ── Stats Bar ── */}
        <div
          className="flex items-center py-4 mt-5 rounded-[28px]"
          style={PANEL_STYLE}
        >
          <StatColumn value={formatNumber(followers?.length ?? 0)} label="Followers" />
          <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <StatColumn value={formatNumber(following?.length ?? 0)} label="Following" />
          <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <StatColumn value={formatNumber(artistSongs.length)} label="Songs" />
          <div className="w-px h-8" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <StatColumn value={formatNumber(totalStreams)} label="Streams" />
          <div className="w-px h-8 hidden sm:block" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <div className="hidden sm:block flex-1 text-center">
            <div className="text-lg md:text-xl font-black" style={{ color: HEADLINE_GREEN, fontFamily: orbitronFont }}>
              {totalEarnedSol.toFixed(3)} SOL
            </div>
            <div className="text-[9px] font-bold uppercase tracking-widest mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Earnings
            </div>
          </div>
        </div>

        {/* ── Action Row ── */}
        <div className="flex gap-2 mt-4">
          {artistSongs.length > 0 && (
            <motion.button
              onClick={handlePlayAll}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 font-black text-sm"
              style={{
                background: PRIMARY_GREEN,
                color: '#000',
                fontFamily: orbitronFont,
                letterSpacing: '0.04em',
              }}
            >
              <Play size={15} fill="#000" />
              PLAY ALL
            </motion.button>
          )}

          {!isOwn ? (
            <motion.button
              onClick={handleFollowToggle}
              disabled={isFollowLoading}
              onMouseEnter={() => setFollowHover(true)}
              onMouseLeave={() => setFollowHover(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 font-black text-sm"
              style={{
                background: isFollowing && followHover
                  ? 'rgba(239,68,68,0.12)'
                  : 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                border: isFollowing && followHover
                  ? '1px solid rgba(239,68,68,0.35)'
                  : '1px solid rgba(255,255,255,0.1)',
                color: isFollowing && followHover ? '#f87171' : '#fff',
                fontFamily: orbitronFont,
                letterSpacing: '0.04em',
              }}
            >
              {isFollowLoading ? (
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : isFollowing ? (
                followHover ? (
                  <>
                    <UserMinus size={14} /> UNFOLLOW
                  </>
                ) : (
                  <>
                    <UserPlus size={14} /> FOLLOWING
                  </>
                )
              ) : (
                <>
                  <UserPlus size={14} /> FOLLOW
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              onClick={startEdit}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 font-black text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontFamily: orbitronFont,
                letterSpacing: '0.04em',
              }}
            >
              <Edit3 size={14} /> EDIT PROFILE
            </motion.button>
          )}

          <motion.button
            onClick={handleShare}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 h-12 rounded-full flex items-center justify-center gap-2 font-black text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              fontFamily: orbitronFont,
              letterSpacing: '0.04em',
            }}
          >
            <Share2 size={14} /> SHARE
          </motion.button>
        </div>

        {/* ── Social Links ── */}
        {profileWallet && (
          <SocialLinksCard
            userProfile={userProfile}
            isOwn={isOwn}
            userAddress={profileWallet}
          />
        )}

        {/* ── Tab Navigation ── */}
        <div className="flex gap-1 mt-6 overflow-x-auto scrollbar-hide pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative px-4 py-2.5 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all rounded-full flex-shrink-0"
                style={{
                  color: isActive ? PRIMARY_GREEN : '#ffffff',
                  fontFamily: orbitronFont,
                  background: isActive ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                  border: isActive ? '1px solid rgba(0, 255, 65, 0.3)' : '1px solid transparent',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="mt-4">
          <AnimatePresence mode="wait">
            {activeTab === 'songs' && (
              <motion.div
                key="songs"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderSongsTab()}
              </motion.div>
            )}
            {activeTab === 'playlists' && (
              <motion.div
                key="playlists"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SectionHeader>Playlist</SectionHeader>
                {renderPlaylistsTab()}
              </motion.div>
            )}
            {activeTab === 'collections' && (
              <motion.div
                key="collections"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SectionHeader>Collections</SectionHeader>
                {renderCollectionsTab()}
              </motion.div>
            )}
            {activeTab === 'reposts' && (
              <motion.div
                key="reposts"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <SectionHeader>Reposts</SectionHeader>
                {renderRepostsTab()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Earnings Section (own profile only) ── */}
        {isOwn && (
          <div className="mt-8">
            <SectionHeader>Earnings</SectionHeader>
            <ArtistEarningsTab
              artistAddress={profileWallet}
              songIds={songIds}
            />
          </div>
        )}

        {/* ── About Section (always visible) ── */}
        <div className="mt-8">
          <SectionHeader>About</SectionHeader>
          {renderAboutTab()}
        </div>

        {/* ── Engagement Panel ── */}
        <div className="mt-8">
          <SectionHeader>Engagement</SectionHeader>
          <div className="grid grid-cols-3 gap-3">
            <GlassStatCard
              icon={<Heart size={18} />}
              label="Likes"
              value={formatNumber(totalLikes)}
              glowColor="#ef4444"
            />
            <GlassStatCard
              icon={<Repeat2 size={18} />}
              label="Reposts"
              value={formatNumber(totalReposts)}
              glowColor="#00FF41"
            />
            <GlassStatCard
              icon={<MessageCircle size={18} />}
              label="Comments"
              value={formatNumber(totalComments)}
              glowColor="#3b82f6"
            />
          </div>
        </div>

        {/* ── Analytics Panel ── */}
        <div className="mt-6">
          <SectionHeader>Analytics</SectionHeader>
          <div className="grid grid-cols-3 gap-3">
            <GlassStatCard
              icon={<Headphones size={18} />}
              label="Streams"
              value={formatNumber(totalStreams)}
              glowColor="#a855f7"
            />
            <GlassStatCard
              icon={<BarChart3 size={18} />}
              label="Listeners"
              value={formatNumber(totalStreams)}
              glowColor="#f97316"
            />
            <GlassStatCard
              icon={<Clock size={18} />}
              label="Avg. Time"
              value={avgDuration}
              glowColor="#14b8a6"
            />
          </div>
        </div>

        {/* ── Comment Wall ── */}
        <div className="mt-8 mb-4">
          <CommentWall
            artistAddress={profileWallet}
            artistName={displayName}
            canPost={canComment}
          />
        </div>

        {/* ── Share Card Overlay ── */}
        {showShareCard && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(12px)',
              padding: '20px',
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowShareCard(false); }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '420px', width: '100%' }}>
              {/* Preview label */}
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter', monospace" }}>
                Share Preview
              </div>

              {/* The share card */}
              <div
                style={{
                  width: '360px',
                  height: '360px',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  background: 'linear-gradient(135deg, #0d0820 0%, #150c30 50%, #0a0618 100%)',
                  border: '2px solid rgba(0, 255, 65, 0.35)',
                  boxShadow: '0 0 40px rgba(0, 255, 65, 0.15), 0 20px 60px rgba(0,0,0,0.8)',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '28px',
                  gap: '16px',
                }}
              >
                {/* Decorative glow blob */}
                <div style={{
                  position: 'absolute',
                  top: '-40px',
                  right: '-40px',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(0, 255, 65, 0.3) 0%, transparent 70%)',
                  opacity: 0.4,
                  pointerEvents: 'none',
                }} />

                {/* Profile info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', position: 'relative', flex: 1, justifyContent: 'center' }}>
                  {/* Avatar */}
                  <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid rgba(0, 255, 65, 0.4)',
                    boxShadow: '0 0 20px rgba(0, 255, 65, 0.2)',
                  }}>
                    {(optimisticAvatar ?? avatarUrl) ? (
                      <img src={optimisticAvatar ?? avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #4c1d95, #1e1b4b)', fontSize: '36px', color: '#fff', fontFamily: orbitronFont }}>
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                  </div>

                  {/* Name + handle */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: '#fff', fontFamily: orbitronFont, lineHeight: 1.2, marginBottom: '4px' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '13px', color: '#a78bfa', fontFamily: "'Inter', sans-serif", marginBottom: '8px' }}>
                      {handle}
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: 'rgba(0, 255, 65, 0.12)',
                      border: '1px solid rgba(0, 255, 65, 0.3)',
                      color: '#00FF41',
                      fontSize: '11px',
                      fontWeight: 700,
                      fontFamily: "'Inter', monospace",
                      textTransform: 'uppercase',
                    }}>
                      Artist
                    </div>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', monospace", marginBottom: '2px', textTransform: 'uppercase' }}>Followers</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#00FF41', fontFamily: orbitronFont }}>
                      {formatNumber(followers?.length ?? 0)}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', monospace", marginBottom: '2px', textTransform: 'uppercase' }}>Songs</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#00FF41', fontFamily: orbitronFont }}>
                      {formatNumber(artistSongs.length)}
                    </div>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', monospace", marginBottom: '2px', textTransform: 'uppercase' }}>Streams</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#00FF41', fontFamily: orbitronFont }}>
                      {formatNumber(totalStreams)}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div style={{
                  marginTop: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                    Follow on <span style={{ color: '#a78bfa', fontWeight: 600 }}>Lit Studio</span>
                  </div>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', monospace" }}>
                    litstudio.online
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                <motion.button
                  onClick={async () => {
                    const shareUrl = userProfile?.username
                      ? `${window.location.origin}/u/${userProfile.username}`
                      : window.location.href;
                    const shareText = `Check out ${displayName} on Lit Studio`;
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
                      } else {
                        await navigator.clipboard.writeText(shareUrl);
                        toast.success('Link copied');
                      }
                    } catch {
                      toast.error('Could not share');
                    }
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #00FF41, #00cc33)',
                    border: 'none',
                    color: '#000',
                    fontSize: '14px',
                    fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(0, 255, 65, 0.4)',
                  }}
                >
                  Share Profile
                </motion.button>
                <motion.button
                  onClick={() => setShowShareCard(false)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '12px 20px',
                    borderRadius: '12px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '14px',
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Close
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
