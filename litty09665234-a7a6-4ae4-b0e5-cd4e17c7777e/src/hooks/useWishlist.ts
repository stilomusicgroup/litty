import { useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/use-privy-auth';
import { toast } from 'sonner';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeWishlists, setWishlists } from '@/lib/collections/wishlists';
import type { WishlistsResponse } from '@/lib/collections/wishlists';
import { Time } from '@/lib/db-client';

export function useWishlist() {
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;

  const { data: wishlistData } = useRealtimeData<WishlistsResponse | null>(
    subscribeWishlists,
    !!walletAddress,
    walletAddress ?? ''
  );

  const wishlist: string[] = useMemo(() => {
    if (!wishlistData?.songIds) return [];
    try {
      return JSON.parse(wishlistData.songIds);
    } catch {
      return [];
    }
  }, [wishlistData]);

  const isWishlisted = useCallback(
    (songId: string): boolean => wishlist.includes(songId),
    [wishlist]
  );

  const toggleWishlist = useCallback(
    async (songId: string) => {
      if (!walletAddress) {
        toast.error('Sign in to wishlist songs');
        return;
      }

      const updated = isWishlisted(songId)
        ? wishlist.filter((id) => id !== songId)
        : [...wishlist, songId];

      const success = await setWishlists(walletAddress, {
        songIds: JSON.stringify(updated),
        updatedAt: Time.Now,
      });

      if (success) {
        if (isWishlisted(songId)) {
          toast('Removed from wishlist');
        } else {
          toast.success('Added to wishlist');
        }
      } else {
        toast.error('Failed to update wishlist');
      }
    },
    [walletAddress, wishlist, isWishlisted]
  );

  return { wishlist, isWishlisted, toggleWishlist };
}
