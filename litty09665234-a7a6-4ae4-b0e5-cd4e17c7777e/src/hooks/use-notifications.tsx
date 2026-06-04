import { useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { useAuth } from '@/hooks/use-privy-auth';
import {
  subscribeManyNotifications,
  updateNotifications,
  buildUpdateNotifications,
  type NotificationsResponse,
} from '@/lib/collections/notifications';
import { setMany } from '@/lib/db-client';

const TOAST_MESSAGES: Record<string, (n: NotificationsResponse) => string> = {
  like: (n) => `❤️ ${n.actorName} liked ${n.referenceTitle}`,
  follow: (n) => `👤 ${n.actorName} started following you`,
  repost: (n) => `🔁 ${n.actorName} reposted ${n.referenceTitle}`,
  stream_milestone: (n) => `🎵 ${n.referenceTitle} hit a stream milestone!`,
};

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp * 1000) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp * 1000).toLocaleDateString();
}

export interface UseNotificationsReturn {
  notifications: NotificationsResponse[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const { user } = useAuth();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const { data, loading } = useRealtimeData<NotificationsResponse[]>(
    subscribeManyNotifications,
    !!user?.address,
    'order by createdAt desc'
  );

  const notifications = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.createdAt - a.createdAt);
  }, [data]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  // Toast new notifications that arrive after initial load
  useEffect(() => {
    if (!notifications.length) return;

    if (!initialLoadDoneRef.current) {
      // First load: populate seen IDs, no toasts
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      initialLoadDoneRef.current = true;
      return;
    }

    const newNotifications = notifications.filter(
      (n) => !seenIdsRef.current.has(n.id)
    );

    for (const n of newNotifications) {
      seenIdsRef.current.add(n.id);
      const formatter = TOAST_MESSAGES[n.type] ?? ((n) => n.message);
      toast(formatter(n), {
        style: {
          background: 'rgba(5,12,8,0.97)',
          border: '1px solid rgba(0, 255, 65, 0.25)',
          color: '#fff',
          fontFamily: "'Inter', sans-serif",
        },
      });
    }
  }, [notifications]);

  // Reset when user changes
  useEffect(() => {
    if (!user?.address) {
      seenIdsRef.current.clear();
      initialLoadDoneRef.current = false;
    }
  }, [user?.address]);

  const markAsRead = useCallback(async (id: string) => {
    await updateNotifications(id, { isRead: true });
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.isRead);
    if (unread.length === 0) return;
    const ops = unread.map((n) =>
      buildUpdateNotifications(n.id, { isRead: true })
    );
    await setMany(ops);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllRead,
  };
}

export { formatTimeAgo };
