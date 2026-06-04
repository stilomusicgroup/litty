/**
 * AlbumVaultPage — Private album vault at /album/:albumId/vault
 * Holder view: full tracklist with audio player per song
 * Non-holder view: 30-second preview of slot 0 + BUY CTA
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import {
  subscribeAlbums,
  runGetTokenBalanceQueryForAlbums,
  runGetBondingCurveProgressQueryForAlbums,
  runGetTokenMintAddressQueryForAlbums,
} from '@/lib/collections/albums';
import type { AlbumsResponse } from '@/lib/collections/albums';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribeArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';
import { usePlayer } from '@/contexts/PlayerContext';
import PayWhatYouWantModal from '@/components/PayWhatYouWantModal';
import {
  Lock, Play, Pause, ArrowLeft, Music, Users, Disc3,
  TrendingUp, ShieldCheck, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { triggerHapticFeedback } from '@/utils/haptic';

const BG = 'transparent';
const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const PURPLE = '#8B5CF6';

// ─── Slot Tile ───────────────────────────────────────────────────────────────

interface SlotTileProps {
  slotNumber: number;
  song: SongsResponse | null;
  details: SongDetailsResponse | null;
  isHolder: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const SlotTile: React.FC<SlotTileProps> = ({ slotNumber, song, details, isHolder, isPlaying, onTogglePlay }) => {
  const navigate = useNavigate();
  const hasContent = !!song;
  const hasAudio = !!(details?.audioUrl || details?.audiusStreamUrl || song?.audiusStreamUrl);
  const coverImage = details?.coverImage;
  const title = details?.title ?? song?.name ?? `Track ${slotNumber + 1}`;
  const teaserUrl = song?.teaserImageUrl;

  return (
    <div
      className="flex items-center gap-4 rounded-xl px-4 py-3 transition-all"
      style={{
        background: 'rgba(20,12,40,0.8)',
        border: '1px solid rgba(139,92,246,0.15)',
      }}
    >
      {/* Slot number */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
        style={{
          background: hasContent ? 'linear-gradient(135deg, rgba(139,92,246,0.4), rgba(0, 255, 65, 0.2))' : 'rgba(0,0,0,0.4)',
          border: `1px solid ${hasContent ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.08)'}`,
          color: hasContent ? '#c4b5fd' : 'rgba(255,255,255,0.2)',
          fontFamily: "'Inter', monospace",
        }}
      >
        {slotNumber + 1}
      </div>

      {/* Cover / teaser */}
      <div
        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, rgba(30,20,60,0.9), rgba(10,6,20,0.9))',
          border: '1px solid rgba(139,92,246,0.15)',
        }}
      >
        {hasContent && isHolder && coverImage ? (
          <img src={coverImage} alt={title} className="w-full h-full object-cover" />
        ) : teaserUrl ? (
          <img src={teaserUrl} alt="Coming soon" className="w-full h-full object-cover opacity-50" />
        ) : (
          <Lock size={16} style={{ color: 'rgba(139,92,246,0.4)' }} />
        )}
      </div>

      {/* Title & info */}
      <div className="flex-1 min-w-0">
        {hasContent && isHolder ? (
          <>
            <p
              className="text-sm font-bold truncate cursor-pointer hover:text-purple-300 transition-colors"
              style={{ color: '#e0d7ff' }}
              onClick={() => song && navigate(`/song/${song.id}`)}
            >
              {title}
            </p>
            {details?.genre && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(220,214,240,0.4)' }}>{details.genre}</p>
            )}
          </>
        ) : hasContent && !isHolder ? (
          <>
            <p className="text-sm font-bold" style={{ color: 'rgba(220,214,240,0.5)' }}>
              {title}
            </p>
            <p className="text-xs" style={{ color: 'rgba(139,92,246,0.5)' }}>Unlock with album coin</p>
          </>
        ) : (
          <>
            <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.2)' }}>Coming Soon</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.12)' }}>Track {slotNumber + 1}</p>
          </>
        )}
      </div>

      {/* Play button */}
      {hasContent && isHolder && hasAudio && (
        <button
          onClick={(e) => { e.stopPropagation(); triggerHapticFeedback(); onTogglePlay(); }}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{
            background: isPlaying
              ? 'linear-gradient(135deg, #00FF41, #00D4FF)'
              : 'rgba(139,92,246,0.2)',
            border: `1px solid ${isPlaying ? 'transparent' : 'rgba(139,92,246,0.35)'}`,
            boxShadow: isPlaying ? '0 0 16px rgba(0, 255, 65, 0.4)' : 'none',
          }}
        >
          {isPlaying
            ? <Pause size={14} style={{ color: '#000' }} />
            : <Play size={14} style={{ color: '#a78bfa' }} />
          }
        </button>
      )}

      {/* Status badge for non-holder */}
      {hasContent && !isHolder && (
        <div
          className="flex-shrink-0 p-2 rounded-full"
          style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <Lock size={13} style={{ color: 'rgba(139,92,246,0.6)' }} />
        </div>
      )}
    </div>
  );
};

// ─── 30s Preview Player ──────────────────────────────────────────────────────

interface PreviewPlayerProps {
  audioSrc: string;
  coverImage?: string;
  title: string;
}

const PreviewPlayer: React.FC<PreviewPlayerProps> = ({ audioSrc, coverImage, title }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const MAX_PREVIEW = 30;

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onUpdate = () => {
      setTime(el.currentTime);
      if (el.currentTime >= MAX_PREVIEW) {
        el.pause();
        el.currentTime = 0;
        setPlaying(false);
        toast.info('Preview ended — buy the album coin to hear the full track!');
      }
    };
    const onEnded = () => { setPlaying(false); setTime(0); };
    el.addEventListener('timeupdate', onUpdate);
    el.addEventListener('ended', onEnded);
    return () => {
      el.removeEventListener('timeupdate', onUpdate);
      el.removeEventListener('ended', onEnded);
    };
  }, []);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(() => setPlaying(true)).catch(() => toast.error('Playback failed'));
    }
  };

  const pct = Math.min((time / MAX_PREVIEW) * 100, 100);

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(30,20,60,0.95), rgba(10,6,20,0.98))',
        border: '1px solid rgba(0, 255, 65, 0.2)',
        boxShadow: '0 0 30px rgba(0, 255, 65, 0.06)',
      }}
    >
      <audio ref={audioRef} src={audioSrc} preload="metadata" />

      <div className="flex items-center gap-4 p-5">
        {/* Cover */}
        <div
          className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4c1d95, #1e1b4b)' }}
        >
          {coverImage
            ? <img src={coverImage} alt={title} className="w-full h-full object-cover" />
            : <Music size={24} style={{ color: 'rgba(167,139,250,0.4)' }} />
          }
        </div>

        {/* Info + progress */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold mb-0.5 truncate" style={{ color: '#e0d7ff' }}>{title}</p>
          <p className="text-xs mb-2" style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}>
            30-second preview
          </p>
          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #00FF41, #00D4FF)',
                boxShadow: '0 0 8px rgba(0, 255, 65, 0.5)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px]" style={{ fontFamily: "'Inter', monospace", color: 'rgba(220,214,240,0.35)' }}>
            <span>{Math.floor(time)}s</span>
            <span>0:30</span>
          </div>
        </div>

        {/* Play/Pause */}
        <button
          onClick={() => { triggerHapticFeedback(); toggle(); }}
          className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{
            background: playing ? 'linear-gradient(135deg, #00FF41, #00D4FF)' : 'rgba(0, 255, 65, 0.12)',
            border: `1px solid ${playing ? 'transparent' : 'rgba(0, 255, 65, 0.3)'}`,
            boxShadow: playing ? '0 0 20px rgba(0, 255, 65, 0.4)' : 'none',
          }}
        >
          {playing
            ? <Pause size={18} style={{ color: '#000' }} />
            : <Play size={18} style={{ color: NEON_GREEN }} />
          }
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────

const AlbumVaultPage: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong, currentSong, isPlaying } = usePlayer();

  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [bondingProgress, setBondingProgress] = useState<number | null>(null);
  const [showBuyModal, setShowBuyModal] = useState(false);

  // Album data
  const { data: album } = useRealtimeData<AlbumsResponse | null>(
    subscribeAlbums,
    !!albumId,
    albumId!
  );

  // Artist profile
  const { data: artist } = useRealtimeData<ArtistsResponse | null>(
    subscribeArtists,
    !!album?.creator,
    album?.creator ?? ''
  );

  // Songs in this album
  const { data: albumSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    !!albumId,
    `where albumId = '${albumId}'`
  );

  // Song details for album tracks
  const visibleAlbumSongs = (albumSongs ?? []).filter(s => !s.hidden);
  const albumSongIds = visibleAlbumSongs.map(s => s.id);
  const { data: albumDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    albumSongIds.length > 0,
    albumSongIds.length > 0 ? `where id in (${albumSongIds.map(id => `'${id}'`).join(',')})` : ''
  );

  // Queries: balance, mint, bonding
  useEffect(() => {
    if (!albumId) return;
    runGetTokenMintAddressQueryForAlbums(albumId).then(m => setMintAddress(m)).catch(() => {});
    runGetBondingCurveProgressQueryForAlbums(albumId).then(p => setBondingProgress(p)).catch(() => {});
  }, [albumId]);

  useEffect(() => {
    if (!albumId || !user?.address) return;
    runGetTokenBalanceQueryForAlbums(albumId, { walletAddress: user.address })
      .then(b => setTokenBalance(b))
      .catch(() => setTokenBalance(0));
  }, [albumId, user?.address]);

  const isHolder = tokenBalance !== null && tokenBalance > 0;
  const slotCount = album?.slotCount ?? 8;

  // Build slot map
  const detailsMap = Object.fromEntries((albumDetails ?? []).map(d => [d.id, d]));
  const songsBySlot: Record<number, SongsResponse> = {};
  visibleAlbumSongs.forEach(s => {
    if (s.slotNumber !== undefined && s.slotNumber !== null) {
      songsBySlot[s.slotNumber] = s;
    }
  });

  // Slot 0 for preview
  const slot0Song = songsBySlot[0] ?? null;
  const slot0Details = slot0Song ? (detailsMap[slot0Song.id] ?? null) : null;
  const slot0AudioSrc = slot0Details?.audioUrl ?? slot0Details?.audiusStreamUrl ?? slot0Song?.audiusStreamUrl ?? null;

  const artistName = artist?.name ?? (album?.creator ? `${album.creator.slice(0, 6)}...${album.creator.slice(-4)}` : 'Unknown Artist');
  const coverArtUrl = album?.coverArtUrl;

  // Filled slot count
  const filledSlots = Object.keys(songsBySlot).length;

  if (!album) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: BG }}>
                <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <Disc3 size={20} style={{ color: PURPLE }} />
            </div>
            <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>Loading vault...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-24" style={{ background: BG }}>
        
        <div className="pt-12 px-4 sm:px-6 max-w-3xl mx-auto">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-6 text-sm py-2"
            style={{ color: 'rgba(220,214,240,0.45)' }}
          >
            <ArrowLeft size={16} /> Back
          </button>

          {/* ── Hero ── */}
          <div
            className="relative rounded-2xl overflow-hidden mb-6"
            style={{
              background: 'linear-gradient(145deg, rgba(20,10,40,0.95), rgba(8,5,18,0.98))',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            {/* Cover art banner */}
            <div className="relative w-full" style={{ paddingBottom: '33%', minHeight: '160px' }}>
              {coverArtUrl ? (
                <img
                  src={coverArtUrl}
                  alt={album.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #1e0a3c, #0a1e3c)' }}
                >
                  <Disc3 size={48} style={{ color: 'rgba(139,92,246,0.3)' }} />
                </div>
              )}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to bottom, rgba(8,5,18,0) 40%, rgba(8,5,18,0.98) 100%)' }}
              />
            </div>

            <div className="px-5 pb-5 -mt-8 relative">
              {/* Album info */}
              <div className="flex items-end justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  {album.symbol && (
                    <span
                      className="inline-block text-xs font-bold px-2.5 py-1 rounded-full mb-2"
                      style={{
                        background: 'rgba(139,92,246,0.15)',
                        border: '1px solid rgba(139,92,246,0.3)',
                        color: '#c4b5fd',
                        fontFamily: "'Inter', monospace",
                      }}
                    >
                      ${album.symbol}
                    </span>
                  )}
                  <h1 className="text-2xl font-black text-white leading-tight">{album.name}</h1>
                  <p className="text-sm mt-0.5" style={{ color: PURPLE }}>by {artistName}</p>
                </div>

                {/* Holder badge */}
                {isHolder && (
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0,212,255,0.1))',
                      border: '1px solid rgba(0, 255, 65, 0.3)',
                    }}
                  >
                    <ShieldCheck size={14} style={{ color: NEON_GREEN }} />
                    <span className="text-xs font-bold" style={{ color: NEON_GREEN }}>HOLDER</span>
                  </div>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-5 flex-wrap mb-4">
                <div className="flex items-center gap-1.5">
                  <Music size={13} style={{ color: 'rgba(220,214,240,0.4)' }} />
                  <span className="text-xs" style={{ color: 'rgba(220,214,240,0.55)', fontFamily: "'Inter', monospace" }}>
                    {filledSlots} / {slotCount} songs
                  </span>
                </div>
                {bondingProgress !== null && (
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={13} style={{ color: 'rgba(220,214,240,0.4)' }} />
                    <span className="text-xs" style={{ color: 'rgba(220,214,240,0.55)', fontFamily: "'Inter', monospace" }}>
                      {bondingProgress.toFixed(1)}% bonded
                    </span>
                  </div>
                )}
                {tokenBalance !== null && tokenBalance > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Users size={13} style={{ color: 'rgba(0, 255, 65, 0.6)' }} />
                    <span className="text-xs font-bold" style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}>
                      {tokenBalance.toLocaleString()} held
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {album.description && (
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(220,214,240,0.55)' }}>
                  {album.description}
                </p>
              )}

              {/* Price chart */}
              {mintAddress && (
                <div
                  className="rounded-xl overflow-hidden mb-4"
                  style={{ border: '1px solid rgba(139,92,246,0.15)' }}
                >
                  <iframe
                    src={`https://www.geckoterminal.com/solana/tokens/${mintAddress}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0`}
                    title={`${album.symbol ?? 'Album'} chart`}
                    width="100%"
                    height="300"
                    frameBorder="0"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin"
                    style={{ display: 'block', border: 'none' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Non-holder: 30s preview ── */}
          {!isHolder && (
            <div className="mb-6 space-y-4">
              {slot0AudioSrc ? (
                <>
                  <div
                    className="px-4 py-2.5 rounded-xl text-sm font-medium"
                    style={{
                      background: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      color: 'rgba(220,214,240,0.65)',
                    }}
                  >
                    You're hearing a 30-second preview of track 1. Hold the album coin to unlock the full vault.
                  </div>
                  <PreviewPlayer
                    audioSrc={slot0AudioSrc}
                    coverImage={slot0Details?.coverImage}
                    title={slot0Details?.title ?? slot0Song?.name ?? 'Track 1'}
                  />
                </>
              ) : (
                <div
                  className="rounded-2xl flex items-center gap-4 px-5 py-6"
                  style={{
                    background: 'rgba(20,12,40,0.8)',
                    border: '1px solid rgba(139,92,246,0.15)',
                  }}
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
                  >
                    <Disc3 size={22} style={{ color: 'rgba(139,92,246,0.5)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'rgba(220,214,240,0.7)' }}>Drop incoming</p>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(220,214,240,0.4)' }}>
                      The first track hasn't been released yet. Buy the album coin to get notified.
                    </p>
                  </div>
                </div>
              )}

              {/* BUY CTA */}
              <button
                onClick={() => { triggerHapticFeedback(); setShowBuyModal(true); }}
                className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
                  color: '#000',
                  boxShadow: '0 0 30px rgba(0, 255, 65, 0.35)',
                }}
              >
                <Zap size={20} />
                Buy {album.symbol ? `$${album.symbol}` : 'Album Coin'} to Unlock
              </button>
            </div>
          )}

          {/* ── Tracklist (both views) ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h2
                className="text-sm font-black tracking-[0.15em] uppercase"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  color: NEON_GREEN,
                  textShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
                }}
              >
                Tracklist
              </h2>
              <span className="text-xs" style={{ color: 'rgba(220,214,240,0.35)', fontFamily: "'Inter', monospace" }}>
                {filledSlots} of {slotCount} released
              </span>
            </div>

            {Array.from({ length: slotCount }, (_, i) => {
              const song = songsBySlot[i] ?? null;
              const details = song ? (detailsMap[song.id] ?? null) : null;
              const isThisPlaying = !!(currentSong?.songId === song?.id && isPlaying);

              return (
                <SlotTile
                  key={i}
                  slotNumber={i}
                  song={song}
                  details={details}
                  isHolder={isHolder}
                  isPlaying={isThisPlaying}
                  onTogglePlay={() => {
                    if (!song || !details) return;
                    const audioSrc = details.audioUrl ?? details.audiusStreamUrl ?? song.audiusStreamUrl;
                    if (!audioSrc) { toast.info('Audio not available'); return; }
                    playSong({
                      songId: song.id,
                      title: details.title ?? song.name,
                      artist: details.artist ?? '',
                      coverImage: details.coverImage,
                      audioUrl: details.audioUrl,
                      audiusStreamUrl: details.audiusStreamUrl ?? song.audiusStreamUrl,
                      duration: details.duration,
                      symbol: song.symbol,
                    });
                  }}
                />
              );
            })}
          </div>

          {/* For holder view, also show BUY CTA to get more */}
          {isHolder && (
            <button
              onClick={() => { triggerHapticFeedback(); setShowBuyModal(true); }}
              className="w-full mt-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'rgba(0, 255, 65, 0.08)',
                border: '1px solid rgba(0, 255, 65, 0.2)',
                color: NEON_GREEN,
              }}
            >
              <Zap size={16} />
              Buy More {album.symbol ? `$${album.symbol}` : 'Coins'}
            </button>
          )}
        </div>
      </div>

      {/* Buy Modal — open-amount, no tiers */}
      {showBuyModal && albumId && (
        <PayWhatYouWantModal
          open={showBuyModal}
          onClose={() => setShowBuyModal(false)}
          songId={albumId}
          songTitle={album.name}
          coverImage={album.coverArtUrl}
        />
      )}
    </>
  );
};

export default AlbumVaultPage;
