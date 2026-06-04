import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-privy-auth';
import { toast } from 'sonner';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import {
  subscribeManyPlaylistSongsSongs,
  setPlaylistSongsSongs,
  deletePlaylistSongsSongs,
} from '@/lib/collections/playlistSongs';
import type { PlaylistSongsSongsResponse } from '@/lib/collections/playlistSongs';
import { Address, Time } from '@/lib/db-client';

export type { PlaylistSongsSongsResponse as PlaylistSongEntry };

export function useMyPlaylist() {
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;

  const { data: entries, loading } = useRealtimeData<PlaylistSongsSongsResponse[]>(
    subscribeManyPlaylistSongsSongs,
    !!walletAddress,
    walletAddress ?? '',
    'order by addedAt desc'
  );

  const songEntries: PlaylistSongsSongsResponse[] = entries ?? [];

  const songIds: string[] = useMemo(() => songEntries.map((e) => e.songId), [songEntries]);

  const isInPlaylist = useCallback(
    (songId: string): boolean => {
      return songEntries.some((e) => e.songId === songId);
    },
    [songEntries]
  );

  const addToPlaylist = useCallback(
    async (songId: string): Promise<boolean> => {
      if (!walletAddress) {
        toast.error('Sign in to add songs to your playlist');
        return false;
      }
      if (isInPlaylist(songId)) {
        toast('Already in your playlist');
        return true;
      }
      const success = await setPlaylistSongsSongs(walletAddress, songId, {
        userAddress: Address.publicKey(walletAddress),
        songId,
        addedAt: Time.Now,
        position: songEntries.length,
      });
      if (success) {
        toast.success('Added to your playlist');
      } else {
        toast.error('Failed to add to playlist');
      }
      return success;
    },
    [walletAddress, isInPlaylist, songEntries]
  );

  const removeFromPlaylist = useCallback(
    async (songId: string): Promise<boolean> => {
      if (!walletAddress) return false;
      const success = await deletePlaylistSongsSongs(walletAddress, songId);
      if (!success) toast.error('Failed to remove from playlist');
      return success;
    },
    [walletAddress]
  );

  const toggleInPlaylist = useCallback(
    async (songId: string): Promise<boolean> => {
      if (isInPlaylist(songId)) {
        return removeFromPlaylist(songId);
      } else {
        return addToPlaylist(songId);
      }
    },
    [isInPlaylist, addToPlaylist, removeFromPlaylist]
  );

  return {
    songEntries,
    songIds,
    loading,
    isInPlaylist,
    addToPlaylist,
    removeFromPlaylist,
    toggleInPlaylist,
  };
}
