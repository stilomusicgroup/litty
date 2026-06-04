import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { UserPlus, ShoppingBag } from 'lucide-react';
import type { FollowsResponse } from '@/lib/collections/follows';
import type { PackPurchasesResponse } from '@/lib/collections/packPurchases';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';

type FeedItem =
  | { type: 'follow'; id: string; address: string; timestamp: number }
  | { type: 'purchase'; id: string; address: string; packName: string; timestamp: number };

export const FanFeedSection: React.FC<{
  followers: FollowsResponse[];
  purchases: PackPurchasesResponse[];
}> = ({ followers, purchases }) => {
  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...followers.map(f => ({
        type: 'follow' as const,
        id: f.id,
        address: f.followerAddress,
        timestamp: f.createdAt ?? 0,
      })),
      ...purchases
        .filter(p => !!p.buyerAddress)
        .map(p => ({
          type: 'purchase' as const,
          id: p.id,
          address: p.buyerAddress!,
          packName: p.packName ?? 'a pack',
          timestamp: p.createdAt ?? 0,
        })),
    ];
    items.sort((a, b) => b.timestamp - a.timestamp);
    return items.slice(0, 20);
  }, [followers, purchases]);

  if (feed.length === 0) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts * 1000);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const displayAddr = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-2 mb-3 pl-1"
        style={{ borderLeft: `3px solid ${NEON_GREEN}` }}
      >
        <h2
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
        >
          Fan Feed
        </h2>
      </div>

      <div className="space-y-2">
        {feed.map((item, i) => (
          <motion.div
            key={`${item.type}-${item.id}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.02 + i * 0.03 }}
            className="flex items-center gap-3 rounded-xl p-3"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(0, 255, 65, 0.12)',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 0 20px rgba(0, 255, 65, 0.05)',
              transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
            }}
            whileHover={{
              borderColor: 'rgba(0, 255, 65, 0.3)',
              boxShadow: '0 0 20px rgba(0, 255, 65, 0.08)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
              style={{
                background: item.type === 'follow' ? `${NEON_GREEN}15` : `${CYAN}15`,
                border: `1px solid ${item.type === 'follow' ? NEON_GREEN : CYAN}30`,
                color: item.type === 'follow' ? NEON_GREEN : CYAN,
              }}
            >
              {item.type === 'follow' ? (
                <UserPlus size={14} />
              ) : (
                <ShoppingBag size={14} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: '#fff' }}>
                {displayAddr(item.address)}
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                {item.type === 'follow'
                  ? 'started following you'
                  : `purchased ${item.type === 'purchase' ? (item as any).packName : ''}`}
              </p>
            </div>
            <span className="text-[9px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {formatTime(item.timestamp)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default FanFeedSection;
