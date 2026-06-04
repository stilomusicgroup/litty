import { useEffect, useState } from 'react';
import { getSongDetails } from '@/lib/collections/songDetails';
import { useArtistVerified } from '@/hooks/use-artist-verified';

/**
 * Given a songId, fetches the song's artistAddress and returns isVerified.
 * Uses a one-time get (not a subscription) since this is a secondary detail.
 */
export function useSongArtistVerified(songId: string | null | undefined): boolean {
  const [artistAddress, setArtistAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!songId) return;
    let cancelled = false;
    getSongDetails(songId).then(d => {
      if (!cancelled && d?.artistAddress) {
        setArtistAddress(d.artistAddress);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [songId]);

  return useArtistVerified(artistAddress);
}
