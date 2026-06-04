import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Heart,
  UserPlus,
  Repeat2,
  TrendingUp,
  Ghost,
  CheckCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications, formatTimeAgo } from '@/hooks/use-notifications';
import type { NotificationsResponse } from '@/lib/collections/notifications';

const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; label: string }
> = {
  like: { icon: Heart, color: '#ff4db8', label: 'Like' },
  follow: { icon: UserPlus, color: '#00ff9d', label: 'Follow' },
  repost: { icon: Repeat2, color: '#4db8ff', label: 'Repost' },
  stream_milestone: { icon: TrendingUp, color: '#ffd700', label: 'Milestone' },
};

const NEON_GREEN = '#00FF41';
const BG_DEEP = 'rgba(5,12,8,0.97)';
const BORDER_GREEN = 'rgba(0, 255, 65, 0.22)';

function NotificationItem({
  notification,
  onRead,
}: {
  notification: NotificationsResponse;
  onRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const config = TYPE_CONFIG[notification.type] ?? {
    icon: Bell,
    color: '#a1a1aa',
    label: 'Notification',
  };
  const Icon = config.icon;
  const isUnread = !notification.isRead;

  const handleClick = useCallback(() => {
    onRead(notification.id);
    if (notification.type === 'follow') {
      navigate(`/artist/${notification.actorAddress}`);
    } else if (
      notification.type === 'like' ||
      notification.type === 'repost' ||
      notification.type === 'stream_milestone'
    ) {
      navigate(`/song/${notification.referenceId}`);
    }
  }, [notification, navigate, onRead]);

  return (
    <button
      onClick={handleClick}
      className="w-full text-left relative flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5"
      style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
    >
      {/* Unread dot */}
      {isUnread && (
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: NEON_GREEN,
            boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
          }}
        />
      )}

      {/* Icon */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: `${config.color}15`,
          border: `1px solid ${config.color}30`,
        }}
      >
        <Icon size={16} color={config.color} strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm leading-snug"
          style={{
            fontWeight: isUnread ? 600 : 400,
            color: '#ffffff',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {notification.message}
        </p>
        {notification.referenceTitle && (
          <p
            className="text-xs mt-0.5 truncate"
            style={{
              color: 'rgba(255,255,255,0.45)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {notification.referenceTitle}
          </p>
        )}
        <p
          className="text-[11px] mt-1"
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontFamily: "'Inter', monospace",
          }}
        >
          {notification.actorName} · {formatTimeAgo(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, loading, markAsRead, markAllRead } =
    useNotifications();

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
    toast.success('All notifications marked as read', {
      style: {
        background: 'rgba(5,12,8,0.97)',
        border: '1px solid rgba(0, 255, 65, 0.25)',
        color: '#fff',
      },
    });
  }, [markAllRead]);

  const hasUnread = unreadCount > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.12)',
            background: 'rgba(5,15,10,0.8)',
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 255, 65, 0.4)';
            e.currentTarget.style.background = 'rgba(0, 255, 65, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.background = 'rgba(5,15,10,0.8)';
          }}
        >
          <Bell
            size={17}
            color={hasUnread ? NEON_GREEN : 'rgba(255,255,255,0.6)'}
            strokeWidth={hasUnread ? 2.2 : 1.8}
            style={{
              filter: hasUnread
                ? 'drop-shadow(0 0 6px rgba(0, 255, 65, 0.8))'
                : 'none',
              transition: 'filter 0.2s',
            }}
          />
          <AnimatePresence>
            {hasUnread && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  background: NEON_GREEN,
                  color: '#000',
                  fontFamily: "'Archivo Black', sans-serif",
                  boxShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0 overflow-hidden"
        style={{
          width: 360,
          maxWidth: 'calc(100vw - 24px)',
          background: BG_DEEP,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1px solid ${BORDER_GREEN}`,
          borderRadius: 12,
          boxShadow:
            '0 20px 50px rgba(0,0,0,0.7), 0 0 30px rgba(0, 255, 65, 0.08)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            borderBottom: '1px solid rgba(0, 255, 65, 0.1)',
          }}
        >
          <h3
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.12em',
              color: '#ffffff',
              textTransform: 'uppercase',
            }}
          >
            Notifications
          </h3>
          {hasUnread && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 text-xs"
              style={{
                background: 'transparent',
                border: 'none',
                color: NEON_GREEN,
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.opacity = '0.75')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.opacity = '1')
              }
            >
              <CheckCheck size={13} strokeWidth={2} />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        {notifications.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 px-4"
            style={{ paddingTop: 40, paddingBottom: 40 }}
          >
            <Ghost
              size={36}
              color="rgba(255,255,255,0.15)"
              strokeWidth={1.5}
            />
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              No notifications yet
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="py-1">
              {notifications.map((n, i) => (
                <div key={n.id}>
                  <NotificationItem
                    notification={n}
                    onRead={(id) => {
                      markAsRead(id);
                    }}
                  />
                  {i < notifications.length - 1 && (
                    <div
                      style={{
                        height: 1,
                        background:
                          'linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.08), transparent)',
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationBell;
