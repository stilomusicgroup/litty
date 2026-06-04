import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';

/**
 * Lightweight hook that subscribes to an artist document and returns isVerified.
 * Returns false while loading or if the artist doesn't exist.
 */
export function useArtistVerified(artistAddress: string | null | undefined): boolean {
  const { data: artist } = useRealtimeData<ArtistsResponse | null>(
    subscribeArtists,
    !!artistAddress,
    artistAddress ?? '',
  );
  return artist?.isVerified === true;
}
