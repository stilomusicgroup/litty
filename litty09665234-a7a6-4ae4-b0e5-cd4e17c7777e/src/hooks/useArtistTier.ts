import { useCallback, useEffect, useRef, useState } from 'react';
import { getManySongDetails } from '@/lib/collections/songDetails';
import { getManyNftMints } from '@/lib/collections/nftMints';
import { runGetTokenBalanceQueryForSongs } from '@/lib/collections/songs';
import { getTierFromBalance, type ChatTier } from '@/utils/chatUtils';

interface ArtistTierEntry {
  tier: ChatTier;
  fetchedAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const tierCache = new Map<string, ArtistTierEntry>();

/**
 * Hook to compute a user's tier for a specific artist based on:
 * - SPL token balances across all of the artist's songs
 * - NFT ownership for any of the artist's songs
 * Returns the highest tier across all songs.
 */
export function useArtistTier(artistAddress: string, userAddress?: string) {
  const [tier, setTier] = useState<ChatTier>('none');
  const [loading, setLoading] = useState(true);
  const fetchRef = useRef<string>('');

  const fetchTier = useCallback(async () => {
    if (!userAddress || !artistAddress) {
      setTier('none');
      setLoading(false);
      return;
    }

    const cacheKey = `${artistAddress}:${userAddress}`;

    // Check cache
    const cached = tierCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setTier(cached.tier);
      setLoading(false);
      return;
    }

    const runId = cacheKey + Date.now();
    fetchRef.current = runId;

    setLoading(true);
    try {
      // Fetch all songs by this artist
      const songDetails = await getManySongDetails(
        `where artistAddress = '${artistAddress}'`
      );

      if (fetchRef.current !== runId) return;

      let highestBalance = 0;
      let nftCount = 0;

      // Check SPL token balance for each song
      for (const song of songDetails) {
        try {
          const bal = await runGetTokenBalanceQueryForSongs(song.id, {
            walletAddress: userAddress,
          });
          if (bal > highestBalance) highestBalance = bal;
          // Short-circuit if platinum
          if (highestBalance >= 10_000_000) break;
        } catch {
          // ignore per-song errors
        }
      }

      if (fetchRef.current !== runId) return;

      // Check NFT ownership for any song by this artist
      if (highestBalance < 1_000_000 && songDetails.length > 0) {
        try {
          const nfts = await getManyNftMints(
            `where owner = '${userAddress}' limit 10`
          );
          // Match NFTs against songs by this artist
          const artistSongIds = new Set(songDetails.map((s) => s.id));
          nftCount = nfts.filter((nft) => artistSongIds.has(nft.songId)).length;
        } catch {
          // ignore NFT errors
        }
      }

      if (fetchRef.current !== runId) return;

      // Compute tier: SPL balance drives most tiers; NFT boosts (1+ NFT = diamond)
      let computedTier = getTierFromBalance(highestBalance);
      if (nftCount >= 5 && computedTier !== 'legend') computedTier = 'legend';
      else if (nftCount >= 1 && (computedTier === 'none'))
        computedTier = 'studio';

      tierCache.set(cacheKey, { tier: computedTier, fetchedAt: Date.now() });
      setTier(computedTier);
    } catch {
      setTier('none');
    } finally {
      if (fetchRef.current === runId) setLoading(false);
    }
  }, [artistAddress, userAddress]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  return { tier, loading };
}
