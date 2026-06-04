/**
 * useListLiveData — batch-fetches bonding curve progress + SOL price
 * for a list of songs. Used by card/row list views to show live data
 * without individual per-card fetches.
 *
 * Pattern mirrors ChartsSection.tsx's internal useListLiveData.
 */
import { useState, useEffect } from 'react';
import {
  runGetBondingCurveProgressQueryForSongs,
  runGetTokenMintAddressQueryForSongs,
} from '@/lib/collections/songs';
import { fetchPumpFunPrice } from '@/hooks/usePumpFunPrice';
import type { SongsResponse } from '@/lib/collections/songs';

export interface SongLiveData {
  bondingProgress: number | null;
  priceSol: number | null;
}

export function useListLiveData(songs: SongsResponse[]): {
  liveData: Record<string, SongLiveData>;
  loading: boolean;
} {
  const [liveData, setLiveData] = useState<Record<string, SongLiveData>>({});
  const [loading, setLoading] = useState(true);

  const idsKey = songs.map((s) => s.id).join(',');

  useEffect(() => {
    if (songs.length === 0) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchAll() {
      const results: Record<string, SongLiveData> = {};

      await Promise.allSettled(
        songs.map(async (song) => {
          try {
            const [progress, mintAddress] = await Promise.all([
              runGetBondingCurveProgressQueryForSongs(song.id).catch(() => null),
              runGetTokenMintAddressQueryForSongs(song.id).catch(() => null),
            ]);

            let priceSol: number | null = null;
            if (mintAddress) {
              try {
                const pf = await fetchPumpFunPrice(mintAddress);
                if (pf) {
                  priceSol = pf.priceSol;
                }
              } catch {
                // price unavailable
              }
            }

            results[song.id] = { bondingProgress: progress, priceSol };
          } catch {
            results[song.id] = { bondingProgress: null, priceSol: null };
          }
        })
      );

      if (mounted) {
        setLiveData(results);
        setLoading(false);
      }
    }

    fetchAll();
    return () => { mounted = false; };
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { liveData, loading };
}
