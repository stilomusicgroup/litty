/**
 * useTrendingSongs — returns an ordered list of song IDs sorted by bonding
 * curve progress descending. This mirrors exactly the "Trending Now" sort used
 * on DiscoverPage so navigation order feels consistent with what the user sees
 * in the main trending view.
 */
import { useState, useEffect, useMemo, useRef } from 'react';
import { subscribeManySongs, runGetBondingCurveProgressQueryForSongs, type SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails, type SongDetailsResponse } from '@/lib/collections/songDetails';
import { isSeedSong } from '@/utils/songFilters';
import { deduplicateSongs } from '@/utils/deduplicateSongs';

export function useTrendingSongs(): { songIds: string[]; loading: boolean } {
  const [allSongs, setAllSongs] = useState<SongsResponse[]>([]);
  const [allDetails, setAllDetails] = useState<SongDetailsResponse[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // Subscribe to songs
  useEffect(() => {
    mountedRef.current = true;
    let cleanup: (() => Promise<void>) | null = null;

    subscribeManySongs((data) => {
      if (!mountedRef.current) return;
      setAllSongs(data);
    })
      .then((unsub) => { cleanup = unsub; })
      .catch(() => {});

    return () => {
      mountedRef.current = false;
      cleanup?.();
    };
  }, []);

  // Subscribe to song details (approved only)
  useEffect(() => {
    mountedRef.current = true;
    let cleanup: (() => Promise<void>) | null = null;

    subscribeManySongDetails((data) => {
      if (!mountedRef.current) return;
      setAllDetails(data);
      setLoading(false);
    }, 'where approved = true')
      .then((unsub) => { cleanup = unsub; })
      .catch(() => setLoading(false));

    return () => {
      cleanup?.();
    };
  }, []);

  // Build clean entry list
  const cleanEntries = useMemo(() => {
    if (!allSongs.length || !allDetails.length) return [];
    const cleanDetails = allDetails.filter((d) => !isSeedSong(d as any));
    const cleanSongs = deduplicateSongs(allSongs.filter((s) => !isSeedSong(s as any)));
    const detailsSet = new Set(cleanDetails.map((d) => d.id));
    return cleanSongs.filter((s) => detailsSet.has(s.id));
  }, [allSongs, allDetails]);

  // Fetch bonding progress for all entries
  const idsKey = cleanEntries.map((e) => e.id).join(',');
  useEffect(() => {
    if (cleanEntries.length === 0) return;
    let cancelled = false;

    const fetchAll = async () => {
      const results: Record<string, number> = {};
      await Promise.allSettled(
        cleanEntries.map(async (s) => {
          try {
            const p = await runGetBondingCurveProgressQueryForSongs(s.id);
            results[s.id] = p;
          } catch {
            results[s.id] = 0;
          }
        })
      );
      if (!cancelled) setProgress(results);
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sort by bonding progress descending
  const songIds = useMemo(() => {
    return [...cleanEntries]
      .sort((a, b) => (progress[b.id] ?? 0) - (progress[a.id] ?? 0))
      .slice(0, 50)
      .map((e) => e.id);
  }, [cleanEntries, progress]);

  return { songIds, loading };
}
