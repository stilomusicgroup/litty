import React, { useEffect, useState, useCallback } from 'react';
import { Heart, Play, Pause, Music, Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-privy-auth';
import { usePlayer } from '@/contexts/PlayerContext';
import { triggerHapticFeedback } from '@/utils/haptic';
import { getAllSongsLikes } from '@/lib/collections/songs';
import { getSongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';

interface LikedSong {
  songId: string;
  likedAt: number;
  details: SongDetailsResponse | null;
}

interface LikedSongsDrawerProps {
  open: boolean;
  onClose: () => void;
}

const LikedSongsDrawer: React.FC<LikedSongsDrawerProps> = ({ open, onClose }) => {
  const { user, login } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const [likedSongs, setLikedSongs] = useState<LikedSong[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLikedSongs = useCallback(async () => {
    if (!user?.address) return;
    setLoading(true);
    try {
      // getAllSongsLikes queries songs/*/likes — filter by user address as document id
      // The filter is a natural language prompt; items where id matches user's wallet
      const userAddr = user.address;
      // First arg (songId) is ignored by getAllSongsLikes — it always queries songs/*/likes
      const allLikes = await getAllSongsLikes('*', `where id = "${userAddr}"`);

      // Each item's 'id' is the $userAddress (last path segment).
      // The songId needs to be extracted from the parent path context.
      // Poof items from wildcard queries may include _path, tarobase_path, or parentId metadata.
      const songIdSet: Array<{ songId: string; likedAt: number }> = [];

      for (const like of allLikes) {
        const raw = like as unknown as Record<string, unknown>;
        let songId: string | null = null;

        // Poof may expose the full document path as tarobase_path or _path
        const pathField =
          (raw['tarobase_path'] as string | undefined) ??
          (raw['_path'] as string | undefined) ??
          (raw['path'] as string | undefined);

        if (pathField) {
          // Expected format: songs/$songId/likes/$userAddress
          const match = pathField.match(/^songs\/([^/]+)\/likes/);
          if (match) songId = match[1];
        }

        // Fallback: if a parentId or songId field is present
        if (!songId && raw['parentId']) songId = raw['parentId'] as string;
        if (!songId && raw['songId']) songId = raw['songId'] as string;

        if (songId && songId !== userAddr) {
          songIdSet.push({ songId, likedAt: like.likedAt ?? 0 });
        }
      }

      // Fetch song details for each liked song
      const results = await Promise.all(
        songIdSet.map(async ({ songId, likedAt }) => {
          const details = await getSongDetails(songId).catch(() => null);
          return { songId, likedAt, details };
        })
      );

      // Sort by most recently liked
      results.sort((a, b) => (b.likedAt ?? 0) - (a.likedAt ?? 0));
      setLikedSongs(results);
    } catch (err) {
      console.error('Failed to fetch liked songs', err);
      setLikedSongs([]);
    } finally {
      setLoading(false);
    }
  }, [user?.address]);

  useEffect(() => {
    if (open && user?.address) {
      fetchLikedSongs();
    }
  }, [open, user?.address, fetchLikedSongs]);

  const handlePlay = (song: LikedSong, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    triggerHapticFeedback();
    if (!song.details) return;

    const isThisSong = currentSong?.songId === song.songId;
    if (isThisSong) {
      togglePlay();
    } else {
      playSong({
        songId: song.songId,
        title: song.details.title,
        artist: song.details.artist,
        coverImage: song.details.coverImage,
        audioUrl: song.details.audioUrl,
        audiusStreamUrl: song.details.audiusStreamUrl,
        duration: song.details.duration,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="left"
        className="w-full max-w-sm p-0 border-r-0 overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(8,3,22,0.98) 0%, rgba(4,9,18,0.99) 100%)',
          borderRight: '1px solid rgba(0, 255, 65, 0.15)',
          boxShadow: '4px 0 40px rgba(0,0,0,0.8), 4px 0 80px rgba(0, 255, 65, 0.05)',
        }}
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-6 pb-4 border-b" style={{ borderColor: 'rgba(0, 255, 65, 0.1)' }}>
          <SheetTitle className="flex items-center gap-2.5">
            <span
              className="flex items-center justify-center w-8 h-8 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))',
                border: '1px solid rgba(239,68,68,0.4)',
                boxShadow: '0 0 12px rgba(239,68,68,0.2)',
              }}
            >
              <Heart size={15} fill="#EF4444" style={{ color: '#EF4444', filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.6))' }} />
            </span>
            <span
              className="text-base font-black tracking-widest uppercase"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                background: 'linear-gradient(90deg, #EF4444, #EC4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Liked Songs
            </span>
          </SheetTitle>
        </SheetHeader>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-80px)]">
          {!user ? (
            /* Not logged in */
            <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center py-16">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                }}
              >
                <Heart size={28} style={{ color: 'rgba(239,68,68,0.5)' }} />
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'rgba(220,214,240,0.6)', fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                Connect your wallet to see your liked songs
              </p>
              <button
                onClick={() => login()}
                className="px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.2), rgba(0, 255, 65, 0.1))',
                  border: '1px solid rgba(0, 255, 65, 0.4)',
                  color: '#00FF41',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  boxShadow: '0 0 12px rgba(0, 255, 65, 0.15)',
                }}
              >
                Sign in
              </button>
            </div>
          ) : loading ? (
            /* Loading */
            <div className="flex items-center justify-center py-16 gap-2">
              <Loader2 size={20} className="animate-spin" style={{ color: '#00FF41' }} />
              <span className="text-sm" style={{ color: 'rgba(220,214,240,0.5)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Loading liked songs...
              </span>
            </div>
          ) : likedSongs.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center py-16">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <Heart size={28} strokeWidth={1.5} style={{ color: 'rgba(239,68,68,0.35)' }} />
              </div>
              <p
                className="text-sm font-semibold"
                style={{ color: 'rgba(220,214,240,0.5)', fontFamily: "'Inter', system-ui, sans-serif" }}
              >
                No liked songs yet
              </p>
              <p className="text-xs" style={{ color: 'rgba(220,214,240,0.3)', fontFamily: "'Inter', system-ui, sans-serif" }}>
                Tap the heart on any song to save it here
              </p>
            </div>
          ) : (
            /* Song list */
            <ul className="py-3 px-3 space-y-1">
              {likedSongs.map((song) => {
                const isThisSong = currentSong?.songId === song.songId;
                const isActive = isThisSong && isPlaying;
                const title = song.details?.title ?? song.songId;
                const artist = song.details?.artist ?? 'Unknown Artist';
                const cover = song.details?.coverImage;

                return (
                  <li
                    key={song.songId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group cursor-pointer"
                    style={{
                      background: isThisSong
                        ? 'rgba(0, 255, 65, 0.07)'
                        : 'transparent',
                      border: isThisSong
                        ? '1px solid rgba(0, 255, 65, 0.2)'
                        : '1px solid transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isThisSong) {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isThisSong) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                      }
                    }}
                    onClick={(e) => handlePlay(song, e)}
                  >
                    {/* Cover */}
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center"
                      style={{
                        background: 'rgba(30,15,60,0.8)',
                        border: '1px solid rgba(147,51,234,0.2)',
                      }}
                    >
                      {cover ? (
                        <img src={cover} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <Music size={16} style={{ color: 'rgba(167,139,250,0.4)' }} />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-bold truncate leading-tight"
                        style={{
                          color: isThisSong ? '#00FF41' : 'rgba(240,235,255,0.9)',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          textShadow: isThisSong ? '0 0 8px rgba(0, 255, 65, 0.4)' : 'none',
                        }}
                      >
                        {title}
                      </p>
                      <p
                        className="text-xs truncate leading-tight mt-0.5"
                        style={{ color: 'rgba(167,139,250,0.55)', fontFamily: "'Inter', system-ui, sans-serif" }}
                      >
                        {artist}
                      </p>
                    </div>

                    {/* Play/Pause button */}
                    <button
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90"
                      style={{
                        background: isActive
                          ? 'rgba(0, 255, 65, 0.85)'
                          : 'rgba(255,255,255,0.06)',
                        border: isActive
                          ? '1px solid rgba(0, 255, 65, 0.5)'
                          : '1px solid rgba(255,255,255,0.1)',
                        boxShadow: isActive ? '0 0 12px rgba(0, 255, 65, 0.4)' : 'none',
                      }}
                      onClick={(e) => handlePlay(song, e)}
                      aria-label={isActive ? 'Pause' : 'Play'}
                    >
                      {isActive ? (
                        <Pause size={12} className="text-black" />
                      ) : (
                        <Play size={12} className="ml-0.5" style={{ color: isThisSong ? '#00FF41' : 'rgba(255,255,255,0.7)' }} />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default LikedSongsDrawer;
