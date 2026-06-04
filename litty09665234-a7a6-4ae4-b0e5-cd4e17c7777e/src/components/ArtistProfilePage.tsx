import React, { useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeArtists, setArtists, updateArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import {
  subscribeFollows,
  subscribeManyFollows,
  setFollows,
  deleteFollows,
} from '@/lib/collections/follows';
import type { FollowsResponse } from '@/lib/collections/follows';
import { subscribeManyReposts } from '@/lib/collections/reposts';
import type { RepostsResponse } from '@/lib/collections/reposts';
import { subscribeManySongStreams, SongStreamsResponse } from '@/lib/collections/songStreams';
import { Address, Time } from '@/lib/db-client';
import { formatStreamCount } from '@/utils/formatCount';
import SongCard from '@/components/SongCard';
import { useListLiveData } from '@/hooks/use-list-live-data';
import { isSeedSong } from '@/utils/songFilters';
import VerifiedBadge from '@/components/VerifiedBadge';
import ArtistEarningsTab from '@/components/ArtistEarningsTab';
import { usePlayer } from '@/contexts/PlayerContext';
import { useArtistTier } from '@/hooks/useArtistTier';
import CommentWall from '@/components/CommentWall';
import {
  Music,
  Edit3,
  Check,
  X,
  BadgeCheck,
  ExternalLink,
  Play,
  ListMusic,
  Heart,
  Disc3,
  Filter,
  ArrowLeft,
  ChevronDown,
  UserPlus,
  UserMinus,
  Users,
  TrendingUp,
  Repeat2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getIdToken } from '@pooflabs/web';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { BlurFade } from '@/components/effects';
import { useTheme } from '@/hooks/use-theme';

// ─── Genre Pill ──────────────────────────────────────────────────────────────

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
        ? 'linear-gradient(135deg, rgba(0, 255, 65, 0.25), rgba(0, 255, 65, 0.12))'
        : 'rgba(255,255,255,0.04)',
      border: active ? '1px solid rgba(0, 255, 65, 0.5)' : '1px solid rgba(255,255,255,0.08)',
      color: active ? '#00FF41' : 'rgba(220,214,240,0.5)',
      boxShadow: active ? '0 0 10px rgba(0, 255, 65, 0.15)' : 'none',
    }}
  >
    {genre}
  </button>
);

// ─── Stat Item ────────────────────────────────────────────────────────────────

const StatItem: React.FC<{
  value: string | number;
  label: string;
  accent?: string;
}> = ({ value, label, accent = '#00FF41' }) => (
  <div className="text-center sm:text-left">
    <div
      className="text-xl sm:text-2xl font-black leading-none"
      style={{ fontFamily: "'Archivo Black', 'Inter', monospace", color: accent }}
    >
      {value}
    </div>
    <div className="text-xs mt-0.5" style={{ color: 'rgba(220,214,240,0.4)' }}>
      {label}
    </div>
  </div>
);

// ─── Waveform Animation ───────────────────────────────────────────────────────

const WaveformIcon: React.FC<{ playing: boolean }> = ({ playing }) => (
  <div className="flex items-end gap-[2px] h-4">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="w-[3px] rounded-full"
        style={{
          background: '#00FF41',
          height: playing ? `${[60, 100, 70, 85][i - 1]}%` : '40%',
          animation: playing ? `waveBar ${0.6 + i * 0.1}s ease-in-out infinite alternate` : 'none',
          boxShadow: playing ? '0 0 4px rgba(0, 255, 65, 0.6)' : 'none',
          transition: 'height 0.3s ease',
        }}
      />
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ArtistProfilePage: React.FC = () => {
  const { address } = useParams<{ address: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const walletAddress = user?.address ?? null;
  const { setQueue, currentSong, isPlaying } = usePlayer();

  const isOwn = walletAddress === address;

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [showFullBio, setShowFullBio] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followHover, setFollowHover] = useState(false);
  const [activeTab, setActiveTab] = useState<'discography' | 'earnings' | 'reposts'>('discography');

  // ─── Data ─────────────────────────────────────────────────────────────────

  const { data: artist, loading: artistLoading, error: artistError } = useRealtimeData<ArtistsResponse | null>(
    subscribeArtists,
    !!address,
    address!,
  );

  // All onchain songs (for joining)
  const { data: allSongs, loading: songsLoading, error: songsError } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
  );

  // All song details filtered by this artist
  const { data: allDetails, loading: detailsLoading, error: detailsError } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    !!address,
    `where artistAddress = '${address}'`,
  );

  // Current user's follow record for this artist
  const followId = walletAddress && address ? `${walletAddress}_${address}` : null;
  const { data: currentFollow } = useRealtimeData<FollowsResponse | null>(
    subscribeFollows,
    !!followId && !isOwn,
    followId ?? '',
  );

  // All followers of this artist (for count)
  const { data: artistFollowers } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    !!address,
    `where artistAddress = '${address}'`,
  );

  const isFollowing = !!currentFollow;
  const followerCount = artistFollowers?.length ?? 0;

  // Reposts by this artist
  const { data: profileReposts } = useRealtimeData<RepostsResponse[]>(
    subscribeManyReposts,
    !!address,
    `where reposterAddress = '${address}' order by createdAt desc`,
  );

  // All song streams for total plays calculation
  const { data: allSongStreams } = useRealtimeData<SongStreamsResponse[]>(
    subscribeManySongStreams,
    !!address,
    '',
  );

  // All song details (unfiltered) for reposts tab — only load when reposts tab active
  const { data: allDetailsUnfiltered } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    activeTab === 'reposts',
    '',
  );

  // Compute reposted songs list
  const repostedSongs = useMemo(() => {
    if (!profileReposts || !allSongs) return [];
    const songsMapLocal: Record<string, SongsResponse> = {};
    allSongs.forEach(s => { songsMapLocal[s.id] = s; });
    const detailsMapLocal: Record<string, SongDetailsResponse> = {};
    (allDetailsUnfiltered ?? []).forEach(d => { detailsMapLocal[d.id] = d; });

    return profileReposts
      .map(r => {
        const song = songsMapLocal[r.songId];
        const detail = detailsMapLocal[r.songId];
        if (!song) return null;
        return { song, detail: detail ?? null, repost: r };
      })
      .filter(Boolean) as { song: SongsResponse; detail: SongDetailsResponse | null; repost: RepostsResponse }[];
  }, [profileReposts, allSongs, allDetailsUnfiltered]);

  // Token tier for Comment Wall access
  const { tier: myTier } = useArtistTier(address ?? '', walletAddress ?? undefined);
  const canComment = !!user && myTier !== 'none';

  // Map song IDs to onchain song data (seed/filler songs excluded)
  const songsMap = useMemo(() => {
    const map: Record<string, SongsResponse> = {};
    (allSongs ?? []).filter(s => !isSeedSong(s as any)).forEach(s => { map[s.id] = s; });
    return map;
  }, [allSongs]);

  // Artist's song details (already filtered by artistAddress subscription; drop seeds)
  const artistDetails = useMemo(() => {
    return (allDetails ?? []).filter(d => d.artistAddress === address && !isSeedSong(d as any));
  }, [allDetails, address]);

  // Genres from the artist's songs
  const genres = useMemo(() => {
    const seen = new Set<string>();
    artistDetails.forEach(d => { if (d.genre) seen.add(d.genre); });
    return ['All', ...Array.from(seen).sort()];
  }, [artistDetails]);

  // Genre-filtered songs
  const filteredDetails = useMemo(() => {
    if (activeGenre === 'All') return artistDetails;
    return artistDetails.filter(d => d.genre === activeGenre);
  }, [artistDetails, activeGenre]);

  // Song IDs for earnings tab
  const artistSongIds = useMemo(() => artistDetails.map(d => d.id), [artistDetails]);

  // All songs needing live data (artist songs + reposted songs)
  const allLiveSongs = useMemo(() => {
    const byId: Record<string, SongsResponse> = {};
    filteredDetails.forEach(d => { const s = songsMap[d.id]; if (s) byId[s.id] = s; });
    repostedSongs.forEach(({ song }) => { byId[song.id] = song; });
    return Object.values(byId);
  }, [filteredDetails, songsMap, repostedSongs]);

  const { liveData: artistLiveData } = useListLiveData(allLiveSongs);

  // Total likes across all songs (approximate via count of like docs)
  const totalLikes = useMemo(() => {
    // We don't have like counts per-song in this view; show song count as proxy
    return artistDetails.length;
  }, [artistDetails]);

  // Total streams across all of this artist's songs
  const artistSongIdsSet = useMemo(() => new Set(artistDetails.map(d => d.id)), [artistDetails]);
  const totalStreams = useMemo(() => {
    return (allSongStreams ?? []).reduce((sum, s) => {
      if (artistSongIdsSet.has(s.id)) return sum + (s.count ?? 0);
      return sum;
    }, 0);
  }, [allSongStreams, artistSongIdsSet]);

  // Is any of this artist's songs currently playing?
  const isArtistPlaying = useMemo(() => {
    if (!currentSong || !isPlaying) return false;
    return artistDetails.some(d => d.id === currentSong.songId);
  }, [currentSong, isPlaying, artistDetails]);

  const isLoading = artistLoading || songsLoading || detailsLoading;
  const hasError = !!artistError || !!songsError || !!detailsError;

  // Redirect to unified /profile when viewing your own wallet
  React.useEffect(() => {
    if (address && user?.address && address === user.address) {
      navigate('/profile', { replace: true });
    }
  }, [address, user?.address, navigate]);

  // ─── Derived Display ──────────────────────────────────────────────────────

  const displayName = artist?.name ?? (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Unknown Artist');
  const avatarLetter = displayName[0]?.toUpperCase() ?? '?';
  const hue = address ? (address.charCodeAt(2) * 7) % 360 : 270;
  const hue2 = (hue + 90) % 360;

  const bioText = artist?.bio ?? '';
  const BIO_THRESHOLD = 160;
  const bioTruncated = bioText.length > BIO_THRESHOLD && !showFullBio
    ? bioText.slice(0, BIO_THRESHOLD) + '…'
    : bioText;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const startEdit = () => {
    setEditName(artist?.name ?? '');
    setEditBio(artist?.bio ?? '');
    setIsEditing(true);
  };

  const cancelEdit = () => setIsEditing(false);

  const saveProfile = async () => {
    if (!walletAddress || !address) return;
    if (!isOwn) return;
    if (!editName.trim()) { toast.error('Name is required'); return; }

    setIsSaving(true);
    try {
      let success: boolean;
      if (artist) {
        success = await updateArtists(address, { name: editName, bio: editBio || undefined });
      } else {
        success = await setArtists(address, {
          name: editName,
          bio: editBio || undefined,
          walletAddress: Address.publicKey(address),
          isVerified: false,
        });
      }
      if (success) {
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

  async function sendNotification(path: string, body: object) {
    try {
      const token = await getIdToken();
      if (!token || !walletAddress) return;
      const api = createAuthenticatedApiClient(token, walletAddress);
      await api.post(path, body);
    } catch (e) {
      console.error('Failed to create notification:', e);
    }
  }

  const handleFollowToggle = async () => {
    if (!user) {
      toast.error('Connect your wallet to follow artists');
      return;
    }
    if (!walletAddress || !address || !followId) return;

    setIsFollowLoading(true);
    try {
      if (isFollowing) {
        const success = await deleteFollows(followId);
        if (success) {
          toast.success(`Unfollowed ${displayName}`);
        } else {
          toast.error('Failed to unfollow');
        }
      } else {
        const success = await setFollows(followId, {
          followerAddress: Address.publicKey(walletAddress),
          artistAddress: Address.publicKey(address),
          createdAt: Time.Now,
        });
        if (success) {
          toast.success(`Now following ${displayName}!`);
          sendNotification('/api/notifications/follow', { artistAddress: Address.publicKey(address) });
        } else {
          toast.error('Failed to follow');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handlePlayAll = useCallback(() => {
    const queue = filteredDetails
      .map(d => {
        const song = songsMap[d.id];
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

    if (queue.length === 0) {
      toast.error('No playable songs found');
      return;
    }
    setQueue(queue, 0, true);
    toast.success(`Playing ${queue.length} song${queue.length > 1 ? 's' : ''} by ${displayName}`);
  }, [filteredDetails, songsMap, setQueue, displayName]);

  // ─── Render ───────────────────────────────────────────────────────────────

  const SKY_BG = 'linear-gradient(160deg, #a8d8ea 0%, #b8e4f5 40%, #cceeff 70%, #e0f5ff 100%)';
  const GLASS = 'rgba(255,255,255,0.3)';
  const GLASS_BORDER = 'rgba(255,255,255,0.6)';
  const NAVY = '#1a2744';
  const NAVY_MUTED = 'rgba(26,39,68,0.55)';
  const GREEN_BTN = 'linear-gradient(135deg, #00FF41 0%, #06d6a0 100%)';
  const GREEN_BORDER = '#00FF41';
  const GREEN_TEXT = '#00FF41';

  return (
    <div className="min-h-screen" style={{ background: isDark ? 'transparent' : SKY_BG }}>
      <style>{`
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to { transform: scaleY(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes scanlines {
          0% { background-position: 0 0; }
          100% { background-position: 0 4px; }
        }
      `}</style>

      
      <div className="pt-4 pb-28 max-w-5xl mx-auto px-2 sm:px-4">

        {/* ── Loading State ── */}
        {isLoading && (
          <div className="pt-8 pb-28">
            <div className="rounded-2xl sm:rounded-3xl overflow-hidden mb-5 p-4 sm:p-8" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-end">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="h-8 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: '40%' }} />
                  <div className="h-4 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', width: '60%' }} />
                </div>
              </div>
              <div className="mt-5 pt-4 flex flex-wrap gap-5 sm:gap-8" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                {[1,2,3,4].map(i => (
                  <div key={i} className="text-center">
                    <div className="h-6 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)', width: 60, margin: '0 auto 6px' }} />
                    <div className="h-3 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.04)', width: 50, margin: '0 auto' }} />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="aspect-square" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-4 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
                    <div className="h-3 w-20 rounded" style={{ background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Error State ── */}
        {hasError && !isLoading && (
          <div className="pt-20 pb-28 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <Music size={28} style={{ color: 'rgba(239,68,68,0.5)' }} />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Failed to load profile</h3>
            <p className="text-sm mb-5" style={{ color: 'rgba(220,214,240,0.38)' }}>Something went wrong while loading this artist.</p>
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg, #00FF41, #00FF41)', color: 'white' }}>
              Retry
            </button>
          </div>
        )}

        {!isLoading && !hasError && (
          <>

        {/* ── Back Navigation ── */}
        <BlurFade delay={0.02}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 mb-4 text-sm transition-colors"
            style={{ color: 'rgba(0, 255, 65, 0.5)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#00FF41')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(0, 255, 65, 0.5)')}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </button>
        </BlurFade>

        {/* ── Hero Banner ── */}
        <BlurFade delay={0.04}>
          <div
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden mb-5"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
              boxShadow: `0 0 60px hsla(${hue}, 60%, 20%, 0.25), 0 0 120px hsla(${hue2}, 60%, 15%, 0.15)`,
            }}
          >
            {/* Animated gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(ellipse at 15% 30%, hsla(${hue}, 70%, 25%, 0.5) 0%, transparent 55%),
                  radial-gradient(ellipse at 85% 70%, hsla(${hue2}, 70%, 20%, 0.4) 0%, transparent 55%),
                  #111111
                `,
              }}
            />

            {/* Scanline texture overlay */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
              }}
            />

            {/* Content */}
            <div className="relative p-4 sm:p-8">
              {/* Top row: avatar + info + actions */}
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-end">

                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl sm:rounded-3xl flex items-center justify-center text-3xl sm:text-4xl font-black overflow-hidden"
                    style={{
                      background: `linear-gradient(135deg, hsl(${hue}, 70%, 28%), hsl(${hue2}, 80%, 18%))`,
                      boxShadow: `0 0 30px hsla(${hue}, 70%, 40%, 0.35), 0 0 60px hsla(${hue}, 70%, 40%, 0.15), inset 0 1px 0 rgba(255,255,255,0.15)`,
                      border: `1px solid hsla(${hue}, 60%, 50%, 0.35)`,
                      color: 'white',
                    }}
                  >
                    {artist?.profileImage ? (
                      <img
                        src={artist.profileImage}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span style={{ textShadow: `0 0 20px hsla(${hue}, 80%, 70%, 0.6)` }}>
                        {avatarLetter}
                      </span>
                    )}
                  </div>

                  {/* Waveform indicator on avatar */}
                  {isArtistPlaying && (
                    <div
                      className="absolute -bottom-2 -right-2 px-2 py-1 rounded-lg flex items-center gap-1.5"
                      style={{
                        background: 'rgba(0,0,0,0.85)',
                        border: '1px solid rgba(0, 255, 65, 0.4)',
                        backdropFilter: 'blur(8px)',
                      }}
                    >
                      <WaveformIcon playing={true} />
                    </div>
                  )}
                </div>

                {/* Name + bio */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Your artist name"
                        className="w-full px-4 py-2.5 rounded-xl text-base font-bold outline-none"
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(0, 255, 65, 0.3)',
                          color: '#e0d7ff',
                        }}
                      />
                      <textarea
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        placeholder="Write a short bio…"
                        rows={3}
                        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                        style={{
                          background: 'rgba(0,0,0,0.4)',
                          border: '1px solid rgba(0, 255, 65, 0.3)',
                          color: '#e0d7ff',
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={saveProfile}
                          disabled={isSaving}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold"
                          style={{ background: 'rgba(0, 255, 65, 0.2)', color: '#00FF41', border: '1px solid rgba(0, 255, 65, 0.35)' }}
                        >
                          <Check size={14} />
                          {isSaving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold"
                          style={{ background: 'rgba(0,0,0,0.3)', color: 'rgba(220,214,240,0.5)', border: '1px solid rgba(0, 255, 65, 0.1)' }}
                        >
                          <X size={14} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h1
                          className="font-black text-white leading-tight"
                          style={{
                            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
                            fontFamily: "'Archivo Black', 'Inter', monospace",
                            letterSpacing: '-0.02em',
                            textShadow: `0 0 30px hsla(${hue}, 70%, 60%, 0.3)`,
                          }}
                        >
                          {displayName}
                        </h1>
                        <VerifiedBadge isVerified={artist?.isVerified ?? false} size="lg" />
                      </div>

                      {bioText && (
                        <div>
                          <p
                            className="text-sm leading-relaxed"
                            style={{ color: 'rgba(220,214,240,0.62)' }}
                          >
                            {bioTruncated}
                          </p>
                          {bioText.length > BIO_THRESHOLD && (
                            <button
                              onClick={() => setShowFullBio(v => !v)}
                              className="flex items-center gap-0.5 mt-1 text-xs font-semibold transition-colors"
                              style={{ color: 'rgba(0, 255, 65, 0.6)' }}
                            >
                              {showFullBio ? 'Show less' : 'Read more'}
                              <ChevronDown
                                size={13}
                                style={{
                                  transform: showFullBio ? 'rotate(180deg)' : 'none',
                                  transition: 'transform 0.2s',
                                }}
                              />
                            </button>
                          )}
                        </div>
                      )}

                      <div
                        className="text-xs mt-2 font-mono truncate"
                        style={{ color: 'rgba(220,214,240,0.28)', fontFamily: "'Inter', monospace" }}
                      >
                        {address}
                      </div>
                    </>
                  )}
                </div>

                {/* Edit button */}
                {isOwn && !isEditing && (
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all self-start sm:self-end flex-shrink-0"
                    style={{
                      background: 'rgba(0, 255, 65, 0.1)',
                      color: '#00FF41',
                      border: '1px solid rgba(0, 255, 65, 0.2)',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'rgba(0, 255, 65, 0.2)';
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = 'rgba(0, 255, 65, 0.1)';
                    }}
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}

                {/* Follow / Unfollow button — only show for other artists */}
                {!isOwn && !isEditing && (
                  <button
                    onClick={handleFollowToggle}
                    disabled={isFollowLoading}
                    onMouseEnter={() => setFollowHover(true)}
                    onMouseLeave={() => setFollowHover(false)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all self-start sm:self-end flex-shrink-0"
                    style={
                      isFollowing
                        ? followHover
                          ? {
                              background: 'rgba(239,68,68,0.12)',
                              color: '#f87171',
                              border: '1px solid rgba(239,68,68,0.35)',
                              boxShadow: '0 0 16px rgba(239,68,68,0.12)',
                              fontFamily: "'Archivo Black', monospace",
                              letterSpacing: '0.04em',
                            }
                          : {
                              background: 'rgba(244,114,182,0.08)',
                              color: '#f472b6',
                              border: '1px solid rgba(244,114,182,0.25)',
                              fontFamily: "'Archivo Black', monospace",
                              letterSpacing: '0.04em',
                            }
                        : {
                            background: 'linear-gradient(135deg, rgba(244,114,182,0.22), rgba(167,139,250,0.15))',
                            color: '#fff',
                            border: '1px solid rgba(244,114,182,0.45)',
                            boxShadow: followHover
                              ? '0 0 28px rgba(244,114,182,0.45), 0 0 60px rgba(244,114,182,0.15)'
                              : '0 0 16px rgba(244,114,182,0.25)',
                            fontFamily: "'Archivo Black', monospace",
                            letterSpacing: '0.04em',
                          }
                    }
                  >
                    {isFollowLoading ? (
                      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : isFollowing ? (
                      followHover ? (
                        <>
                          <UserMinus size={14} />
                          UNFOLLOW
                        </>
                      ) : (
                        <>
                          <Users size={14} />
                          FOLLOWING
                        </>
                      )
                    ) : (
                      <>
                        <UserPlus size={14} />
                        FOLLOW
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* ── Stats Row ── */}
              <div
                className="mt-5 pt-4 flex flex-wrap gap-5 sm:gap-8"
                style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
              >
                <StatItem value={artistDetails.length} label="Songs" accent="#00FF41" />
                <StatItem value={formatStreamCount(totalStreams)} label="Total Plays" accent="#00FF41" />
                <StatItem value={followerCount} label="Followers" accent="#f472b6" />
                <StatItem
                  value={genres.length > 1 ? genres.slice(1).join(' / ') : 'Various'}
                  label="Genres"
                  accent="#60a5fa"
                />
              </div>
            </div>
          </div>
        </BlurFade>

        {/* ── Action Buttons Row ── */}
        <BlurFade delay={0.07}>
          <div className="flex flex-wrap gap-2 mb-5">
            {/* Play All */}
            {artistDetails.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, #00FF41 0%, #00e013 100%)',
                  color: '#000',
                  boxShadow: '0 0 20px rgba(0, 255, 65, 0.35), 0 0 40px rgba(0, 255, 65, 0.1)',
                  border: '1px solid rgba(0, 255, 65, 0.6)',
                  fontFamily: "'Archivo Black', monospace",
                  letterSpacing: '0.04em',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.55), 0 0 60px rgba(0, 255, 65, 0.2)';
                  el.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.35), 0 0 40px rgba(0, 255, 65, 0.1)';
                  el.style.transform = 'translateY(0)';
                }}
              >
                <Play size={15} className="fill-black" />
                PLAY ALL
              </button>
            )}

            {/* Discography count badge */}
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                color: 'rgba(220,214,240,0.45)',
              }}
            >
              <ListMusic size={14} />
              <span>{artistDetails.length} {artistDetails.length === 1 ? 'track' : 'tracks'}</span>
            </div>
          </div>
        </BlurFade>

        {/* ── Verification CTA (own profile, unverified) ── */}
        {isOwn && artist && !artist.isVerified && (
          <BlurFade delay={0.09}>
            <div
              className="mb-5 rounded-2xl overflow-hidden"
              style={{
                background: '#111111',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <BadgeCheck size={17} style={{ color: '#00FF41' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Get Verified</h3>
                    <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>
                      Show fans your profile is authentic with a verified badge
                    </p>
                  </div>
                </div>
                <a
                  href={`mailto:verify@litstudio.online?subject=${encodeURIComponent('Verification Request — ' + (artist?.name ?? displayName))}&body=${encodeURIComponent(
                    `Hi Lit Studio team,\n\nI'd like to apply for artist verification.\n\nArtist Name: ${artist?.name ?? displayName}\nWallet Address: ${address ?? ''}\nSocial / Streaming Links: \n\nThanks!`
                  )}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all flex-shrink-0"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={13} />
                  Apply via Email
                </a>
              </div>
            </div>
          </BlurFade>
        )}

        {/* ── Tabs: Discography + Earnings (own profile only) ── */}
        <div>
          {/* Tab bar */}
          <BlurFade delay={0.1}>
            <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-hide">
              {/* Discography tab */}
              <button
                onClick={() => setActiveTab('discography')}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={
                  activeTab === 'discography'
                    ? {
                        background: 'rgba(0, 255, 65, 0.2)',
                        color: '#00FF41',
                        border: '1px solid rgba(0, 255, 65, 0.4)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(220,214,240,0.45)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                <Disc3 size={14} />
                Discography
              </button>

              {/* Reposts tab */}
              <button
                onClick={() => setActiveTab('reposts')}
                className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={
                  activeTab === 'reposts'
                    ? {
                        background: 'rgba(0, 255, 65, 0.12)',
                        color: '#00FF41',
                        border: '1px solid rgba(0, 255, 65, 0.35)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.03)',
                        color: 'rgba(220,214,240,0.45)',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }
                }
              >
                <Repeat2 size={14} />
                Reposts
                {(profileReposts?.length ?? 0) > 0 && (
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black"
                    style={{
                      background: activeTab === 'reposts' ? 'rgba(0, 255, 65, 0.25)' : 'rgba(255,255,255,0.08)',
                      color: activeTab === 'reposts' ? '#00FF41' : 'rgba(220,214,240,0.4)',
                    }}
                  >
                    {profileReposts?.length}
                  </span>
                )}
              </button>

              {/* Earnings tab — only for own profile */}
              {isOwn && (
                <button
                  onClick={() => setActiveTab('earnings')}
                  className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                  style={
                    activeTab === 'earnings'
                      ? {
                          background: 'rgba(0, 255, 65, 0.12)',
                          color: '#00FF41',
                          border: '1px solid rgba(0, 255, 65, 0.35)',
                        }
                      : {
                          background: 'rgba(255,255,255,0.03)',
                          color: 'rgba(220,214,240,0.45)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }
                  }
                >
                  <TrendingUp size={14} />
                  Earnings
                </button>
              )}
            </div>
          </BlurFade>

          {/* ── Discography tab content ── */}
          {activeTab === 'discography' && (
            <div>
              <BlurFade delay={0.1}>
                {/* Genre filter pills (desktop) */}
                {genres.length > 2 && (
                  <div className="hidden sm:flex items-center justify-end gap-1.5 flex-wrap mb-4">
                    {genres.map(g => (
                      <GenrePill
                        key={g}
                        genre={g}
                        active={activeGenre === g}
                        onClick={() => setActiveGenre(g)}
                      />
                    ))}
                  </div>
                )}

                {/* Mobile genre pills row */}
                {genres.length > 2 && (
                  <div className="sm:hidden flex gap-1.5 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                    {genres.map(g => (
                      <GenrePill
                        key={g}
                        genre={g}
                        active={activeGenre === g}
                        onClick={() => setActiveGenre(g)}
                      />
                    ))}
                  </div>
                )}
              </BlurFade>

              {filteredDetails.length === 0 ? (
                <BlurFade delay={0.12}>
                  <div
                    className="py-16 rounded-2xl text-center"
                    style={{
                      background: '#111111',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <Music size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      {activeGenre !== 'All' ? `No ${activeGenre} songs yet` : 'No songs yet'}
                    </h3>
                    <p className="text-sm mb-5" style={{ color: 'rgba(220,214,240,0.38)' }}>
                      {activeGenre !== 'All'
                        ? 'Try a different genre filter'
                        : "This artist hasn't launched any song tokens yet."}
                    </p>
                    {isOwn && activeGenre === 'All' && (
                      <Link
                        to="/create"
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm"
                        style={{
                          background: '#00FF41',
                          color: '#000',
                          boxShadow: 'none',
                        }}
                      >
                        Launch Your First Song
                      </Link>
                    )}
                  </div>
                </BlurFade>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
                  {filteredDetails.map((detail, i) => {
                    const song = songsMap[detail.id];
                    if (!song) return null;
                    return (
                      <BlurFade key={detail.id} delay={0.04 * Math.min(i, 8)}>
                        <SongCard
                          song={song}
                          details={detail}
                          bondingProgress={artistLiveData[song.id]?.bondingProgress ?? null}
                          priceSol={artistLiveData[song.id]?.priceSol ?? null}
                        />
                      </BlurFade>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Reposts tab content ── */}
          {activeTab === 'reposts' && (
            <BlurFade delay={0.08}>
              {repostedSongs.length === 0 ? (
                <div
                  className="py-16 rounded-2xl text-center"
                  style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Repeat2 size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                  <p className="text-base font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>No reposts yet</p>
                  <p className="text-sm" style={{ color: 'rgba(220,214,240,0.35)' }}>
                    Songs reposted by {displayName} will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 sm:gap-3">
                  {repostedSongs.map(({ song, detail }, i) => (
                    <BlurFade key={song.id} delay={0.04 * Math.min(i, 8)}>
                      <SongCard
                      song={song}
                      details={detail}
                      bondingProgress={artistLiveData[song.id]?.bondingProgress ?? null}
                      priceSol={artistLiveData[song.id]?.priceSol ?? null}
                    />
                    </BlurFade>
                  ))}
                </div>
              )}
            </BlurFade>
          )}

          {/* ── Earnings tab content (own profile only) ── */}
          {activeTab === 'earnings' && isOwn && (
            <BlurFade delay={0.08}>
              <ArtistEarningsTab
                artistAddress={address ?? ''}
                songIds={artistSongIds}
              />
            </BlurFade>
          )}
        </div>

        {/* ── Comment Wall ── */}
        <BlurFade delay={0.15}>
          <div id="comment-wall-section" className="mt-8 mb-4">
            <CommentWall
              artistAddress={address ?? ''}
              artistName={displayName}
              canPost={canComment}
            />
          </div>
        </BlurFade>

        {/* ── Bottom padding for NowPlayingBar ── */}
        <div className="h-8" />
          </>
        )}
      </div>
    </div>
  );
};

export default ArtistProfilePage;
