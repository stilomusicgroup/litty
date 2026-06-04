/**
 * useTickerSongs — fetches songs and derives REAL bonding curve progress + new releases.
 * All data sourced from live collection reads and on-chain queries.
 * NO fake/hardcoded prices, percentages, or names.
 */
import { useState, useEffect, useMemo } from 'react';
import { subscribeManySongs, runGetBondingCurveProgressQueryForSongs, type SongsResponse } from '@/lib/collections/songs';

export interface TickerSong {
  id: string;
  name: string;
  symbol: string;
  /** Real bonding curve progress 0–100, or null if unavailable */
  bondingProgress: number | null;
  /** Unix seconds timestamp when song was created */
  createdAt: number;
  /** True = recently added (new release), False = bonding curve mover */
  isNewRelease: boolean;
}

/**
 * Fetches songs from the collection, then batch-fetches real bonding curve
 * progress for up to 12 songs. Returns:
 *  - Top bonding curve movers (sorted by progress desc)
 *  - New releases (sorted by createdAt desc)
 * interleaved for variety in the ticker.
 */
export function useTickerSongs(): { songs: TickerSong[]; loading: boolean } {
  const [rawSongs, setRawSongs] = useState<SongsResponse[]>([]);
  const [loadingCollection, setLoadingCollection] = useState(true);
  const [bondingData, setBondingData] = useState<Record<string, number | null>>({});
  const [loadingBonding, setLoadingBonding] = useState(false);

  // Subscribe to songs collection
  useEffect(() => {
    let unsubscribe: (() => Promise<void>) | null = null;

    subscribeManySongs((data) => {
      setRawSongs(data);
      setLoadingCollection(false);
    }).then((unsub) => {
      unsubscribe = unsub;
    }).catch(() => {
      setLoadingCollection(false);
    });

    return () => {
      if (unsubscribe) unsubscribe().catch(() => {});
    };
  }, []);

  // Once songs are loaded, fetch real bonding curve progress
  useEffect(() => {
    if (loadingCollection || rawSongs.length === 0) return;

    // Take up to 15 songs for bonding curve queries to limit API calls
    const candidates = rawSongs.slice(0, 15);
    setLoadingBonding(true);

    let mounted = true;
    const results: Record<string, number | null> = {};

    Promise.allSettled(
      candidates.map(async (song) => {
        try {
          const progress = await runGetBondingCurveProgressQueryForSongs(song.id);
          results[song.id] = typeof progress === 'number' ? progress : null;
        } catch {
          results[song.id] = null;
        }
      })
    ).then(() => {
      if (mounted) {
        setBondingData(results);
        setLoadingBonding(false);
      }
    });

    return () => { mounted = false; };
  }, [loadingCollection, rawSongs.map((s) => s.id).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const songs = useMemo<TickerSong[]>(() => {
    if (rawSongs.length === 0) return [];

    // Build enriched list with real bonding progress
    const enriched: TickerSong[] = rawSongs.slice(0, 15).map((s) => ({
      id: s.id,
      name: s.name ?? '',
      symbol: s.symbol ? (s.symbol.startsWith('$') ? s.symbol : `$${s.symbol}`) : '$TOKEN',
      bondingProgress: bondingData[s.id] ?? null,
      createdAt: s.tarobase_created_at ?? 0,
      isNewRelease: false,
    }));

    // Bonding curve movers: songs with real progress data, sorted descending
    const movers = enriched
      .filter((s) => s.bondingProgress !== null)
      .sort((a, b) => (b.bondingProgress ?? 0) - (a.bondingProgress ?? 0))
      .slice(0, 6)
      .map((s) => ({ ...s, isNewRelease: false }));

    // New releases: songs sorted by createdAt desc, skip ones already in movers
    const moverIds = new Set(movers.map((s) => s.id));
    const newReleases = enriched
      .filter((s) => !moverIds.has(s.id))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6)
      .map((s) => ({ ...s, isNewRelease: true }));

    // If no movers have real progress yet (still loading bonding data), show as new releases
    if (movers.length === 0) {
      return enriched
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 10)
        .map((s) => ({ ...s, isNewRelease: true }));
    }

    // Interleave: mover, new, mover, new…
    const interleaved: TickerSong[] = [];
    const maxLen = Math.max(movers.length, newReleases.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < movers.length) interleaved.push(movers[i]);
      if (i < newReleases.length) interleaved.push(newReleases[i]);
    }

    return interleaved;
  }, [rawSongs, bondingData]);

  const loading = loadingCollection || loadingBonding;

  return { songs, loading };
}
