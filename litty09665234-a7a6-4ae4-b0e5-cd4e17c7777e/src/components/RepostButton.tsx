import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/use-privy-auth';
import { Repeat2 } from 'lucide-react';
import { toast } from 'sonner';
import { Time, Address } from '@/lib/db-client';
import { getIdToken } from '@pooflabs/web';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { triggerHapticFeedback } from '@/utils/haptic';
import {
  setReposts,
  deleteReposts,
  subscribeReposts,
  subscribeManyReposts,
} from '@/lib/collections/reposts';
import type { RepostsResponse } from '@/lib/collections/reposts';

interface RepostButtonProps {
  songId: string;
  size?: 'sm' | 'md' | 'lg';
  showCount?: boolean;
  className?: string;
  variant?: 'default' | 'green';
}

const RepostButton: React.FC<RepostButtonProps> = ({
  songId,
  size = 'md',
  showCount = true,
  className = '',
  variant = 'default',
}) => {
  const { user, login } = useAuth();
  const [reposted, setReposted] = useState(false);
  const [repostCount, setRepostCount] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [processing, setProcessing] = useState(false);

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

  // Subscribe to user's repost status
  useEffect(() => {
    if (!songId || !user?.address) {
      setReposted(false);
      return;
    }
    let mounted = true;
    let unsub: (() => Promise<void>) | undefined;

    const repostId = `${songId}_${user.address}`;
    subscribeReposts(
      (data: RepostsResponse | null) => {
        if (mounted) setReposted(!!data);
      },
      repostId,
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

  // Subscribe to repost count
  useEffect(() => {
    if (!songId) return;
    let mounted = true;
    let unsub: (() => Promise<void>) | undefined;

    subscribeManyReposts(
      (data: RepostsResponse[]) => {
        if (mounted) setRepostCount(data?.length ?? 0);
      },
      `where songId = '${songId}'`,
    )
      .then((fn) => {
        unsub = fn;
      })
      .catch(() => {});

    return () => {
      mounted = false;
      if (unsub) unsub();
    };
  }, [songId]);

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
        if (reposted) {
          const repostId = `${songId}_${user.address}`;
          const success = await deleteReposts(repostId);
          if (success) {
            setReposted(false);
            setRepostCount((c) => Math.max(0, c - 1));
          } else {
            toast.error('Could not remove repost');
          }
        } else {
          const repostId = `${songId}_${user.address}`;
          const success = await setReposts(repostId, {
            songId,
            reposterAddress: Address.publicKey(user.address),
            createdAt: Time.Now as any,
          });
          if (success) {
            setReposted(true);
            setRepostCount((c) => c + 1);
            sendNotification('/api/notifications/repost', { songId });
          } else {
            toast.error('Could not repost');
          }
        }
      } catch {
        toast.error('Something went wrong');
      } finally {
        setProcessing(false);
      }
    },
    [reposted, songId, user?.address, processing, login],
  );

  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 22 : 18;
  const activeColor = variant === 'green' ? '#00FF41' : '#4db8ff';
  const inactiveColor = variant === 'green' ? 'rgba(255,255,255,0.45)' : 'rgba(220,214,240,0.45)';
  const inactiveCountColor = variant === 'green' ? 'rgba(255,255,255,0.4)' : 'rgba(220,214,240,0.4)';

  return (
    <motion.button
      onClick={handleToggle}
      className={`inline-flex items-center gap-1.5 transition-all inline-touch p-1 ${className}`}
      style={{
        color: reposted ? activeColor : inactiveColor,
        transform: animating ? 'scale(1.25)' : 'scale(1)',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s',
      }}
      title={reposted ? 'Remove repost' : 'Repost'}
      whileTap={{ scale: 0.85 }}
    >
      <Repeat2
        size={iconSize}
        style={{
          filter: reposted ? `drop-shadow(0 0 6px ${activeColor}80)` : 'none',
        }}
      />
      {showCount && (
        <span
          className="text-xs font-bold tabular-nums"
          style={{
            fontFamily: "'Inter', monospace",
            color: reposted ? activeColor : inactiveCountColor,
          }}
        >
          {repostCount > 0 ? repostCount : ''}
        </span>
      )}
    </motion.button>
  );
};

export default RepostButton;
