import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-privy-auth';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { Time } from '@/lib/db-client';
import { getIdToken } from '@pooflabs/web';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { triggerHapticFeedback } from '@/utils/haptic';
import {
  setSongsLikes,
  deleteSongsLikes,
  subscribeSongsLikes,
  countSongsLikes,
} from '@/lib/collections/songs';
import { getWishlists, setWishlists, updateWishlists } from '@/lib/collections/wishlists';
import { triggerSuccessHaptic } from '@/utils/haptic';
import type { SongsLikesResponse } from '@/lib/collections/songs';

interface LikeButtonProps {
  songId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  variant?: 'default' | 'green';
}

const LikeButton: React.FC<LikeButtonProps> = ({
  songId,
  size = 'md',
  showCount = true,
  className = '',
  variant = 'default',
}) => {
  const { user, login } = useAuth();
  const [liked, setLiked] = useState(false);

  async function sendNotification(path: string, body: object) {
    try {
      const token = await getIdToken();
      if (!token || !user?.address) return;
      const api = createAuthenticatedApiClient(token, user.address);
      await api.post(path, body);
    } catch (e) {
      console.error('Failed to create notification:', e);
    }
  }
  const [likeCount, setLikeCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Subscribe to user's like status
  useEffect(() => {
    if (!songId || !user?.address) {
      setLiked(false);
      return;
    }
    let mounted = true;
    let unsub: (() => Promise<void>) | undefined;

    subscribeSongsLikes(
      (data: SongsLikesResponse | null) => {
        if (mounted) setLiked(!!data);
      },
      songId,
      user.address,
    )
      .then((fn) => {
        unsub = fn;
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [songId, user?.address]);

  // Fetch like count
  useEffect(() => {
    if (!songId) return;
    countSongsLikes(songId)
      .then((res) => setLikeCount(res?.value ?? 0))
      .catch(() => {});
  }, [songId, liked]);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      triggerHapticFeedback();

      if (!user?.address) {
        login();
        return;
      }
      if (processing) return;

      setProcessing(true);
      setAnimating(true);
      setTimeout(() => setAnimating(false), 400);

      try {
        if (liked) {
          const success = await deleteSongsLikes(songId, user.address);
          if (success) {
            setLiked(false);
            setLikeCount((c) => Math.max(0, c - 1));
            // Sync: remove from wishlist
            try {
              const wishlist = await getWishlists(user.address);
              const currentIds = wishlist?.songIds
                ? JSON.parse(wishlist.songIds) as string[]
                : [];
              const filtered = currentIds.filter((id: string) => id !== songId);
              await updateWishlists(user.address, {
                songIds: JSON.stringify(filtered),
                updatedAt: Time.Now,
              });
            } catch {
              console.error('Failed to sync wishlist unlike');
            }
          } else {
            toast.error('Could not unlike');
          }
        } else {
          const success = await setSongsLikes(songId, user.address, {
            likedAt: Time.Now,
          });
          if (success) {
            setLiked(true);
            setLikeCount((c) => c + 1);
            triggerSuccessHaptic();
            sendNotification('/api/notifications/like', { songId });
            // Sync: add to wishlist
            try {
              const wishlist = await getWishlists(user.address);
              const currentIds = wishlist?.songIds
                ? JSON.parse(wishlist.songIds) as string[]
                : [];
              if (!currentIds.includes(songId)) {
                currentIds.push(songId);
              }
              await setWishlists(user.address, {
                songIds: JSON.stringify(currentIds),
                updatedAt: Time.Now,
              });
            } catch {
              console.error('Failed to sync wishlist like');
            }
          } else {
            toast.error('Could not like');
          }
        }
      } catch {
        toast.error('Something went wrong');
      } finally {
        setProcessing(false);
      }
    },
    [liked, songId, user?.address, processing, login],
  );

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const activeColor = variant === 'green' ? '#00FF41' : '#EF4444';
  const inactiveColor = variant === 'green' ? 'rgba(255,255,255,0.45)' : 'rgba(220,214,240,0.45)';
  const inactiveCountColor = variant === 'green' ? 'rgba(255,255,255,0.4)' : 'rgba(220,214,240,0.4)';

  return (
    <motion.button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 transition-all inline-touch p-1 ${className}`}
      style={{
        color: liked ? activeColor : inactiveColor,
        transform: animating ? 'scale(1.25)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s',
      }}
      title={liked ? 'Unlike' : 'Like'}
      whileTap={{ scale: 0.85 }}
    >
      <Heart
        size={iconSize}
        fill={liked ? activeColor : 'none'}
        strokeWidth={liked ? 0 : 2}
        style={{
          filter: liked ? `drop-shadow(0 0 6px ${activeColor}80)` : 'none',
        }}
      />
      {showCount && (
        <span
          className="text-xs font-bold tabular-nums"
          style={{
            fontFamily: "'Inter', monospace",
            color: liked ? activeColor : inactiveCountColor,
          }}
        >
          {likeCount > 0 ? likeCount : ''}
        </span>
      )}
    </motion.button>
  );
};

export default LikeButton;
