import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MessageCircle, TrendingUp, TrendingDown, Music, Wallet } from 'lucide-react';
import { LitHubPage } from './LitHubPage';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs, type SongsResponse } from '@/lib/collections/songs';
import { subscribeManyPurchases, type PurchasesResponse } from '@/lib/collections/purchases';
import { shortAddress } from '@/utils/chatUtils';

// Desktop sidebar width
const SIDEBAR_W = 220;
const NAV_BAR_H = 56;

// --- Neon notification row ---
interface NotificationItem {
  id: string;
  time: number;
  emoji: string;
  text: React.ReactNode;
  accent: 'green' | 'purple' | 'red' | 'cyan';
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ACCENT_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  green: {
    bg: 'rgba(0, 255, 65, 0.06)',
    border: 'rgba(0, 255, 65, 0.25)',
    text: '#00FF41',
    glow: 'rgba(0, 255, 65, 0.3)',
  },
  purple: {
    bg: 'rgba(147,51,234,0.08)',
    border: 'rgba(147,51,234,0.25)',
    text: '#c084fc',
    glow: 'rgba(147,51,234,0.3)',
  },
  red: {
    bg: 'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.25)',
    text: '#f87171',
    glow: 'rgba(239,68,68,0.3)',
  },
  cyan: {
    bg: 'rgba(0,212,255,0.06)',
    border: 'rgba(0,212,255,0.25)',
    text: '#22d3ee',
    glow: 'rgba(0,212,255,0.3)',
  },
};

function NotificationRow({ item }: { item: NotificationItem }) {
  const accent = ACCENT_COLORS[item.accent];
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        padding: '10px 14px',
        margin: '0 12px',
        borderRadius: 12,
        background: accent.bg,
        border: `1px solid ${accent.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: 'rgba(220,240,220,0.85)',
            margin: 0,
            lineHeight: 1.4,
          }}
        >
          {item.text}
        </p>
      </div>
      <span
        style={{
          fontFamily: "'Inter', monospace",
          fontSize: 10,
          color: accent.text,
          flexShrink: 0,
          textShadow: `0 0 6px ${accent.glow}`,
        }}
      >
        {item.time > 0 ? timeAgo(item.time) : ''}
      </span>
    </motion.div>
  );
}

// --- Alerts Feed ---
function AlertsFeed() {
  const { data: songsRaw } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
    'order by tarobase_created_at desc limit 50'
  );

  const { data: purchasesRaw } = useRealtimeData<PurchasesResponse[]>(
    subscribeManyPurchases,
    true,
    'order by createdAt desc limit 50'
  );

  const notifications: NotificationItem[] = useMemo(() => {
    const items: NotificationItem[] = [];

    // New releases from songs
    if (songsRaw) {
      const recent = songsRaw
        .filter((s) => Date.now() / 1000 - s.tarobase_created_at < 7 * 86400)
        .slice(0, 10);
      for (const s of recent) {
        items.push({
          id: `song-${s.id}`,
          time: s.tarobase_created_at,
          emoji: '\u{1F3B5}',
          text: (
            <>
              <strong style={{ color: '#00FF41' }}>{s.name}</strong>
              {' '}just dropped!
              {s.symbol && (
                <span style={{ color: '#c084fc', marginLeft: 6 }}>
                  ${s.symbol}
                </span>
              )}
            </>
          ),
          accent: 'green' as const,
        });
      }
    }

    // Token trades from purchases
    if (purchasesRaw) {
      const recent = purchasesRaw
        .filter((p) => p.status === 'completed' && p.songId && p.walletAddress)
        .slice(0, 15);
      for (const p of recent) {
        const isBuy = (p.tokenAmount ?? 0) > 0;
        const formatted = p.tokenAmount ? formatNumber(p.tokenAmount) : '';
        const songLabel = p.songId ? p.songId.slice(0, 8) : 'token';

        items.push({
          id: `trade-${p.orderId}`,
          time: p.createdAt,
          emoji: isBuy ? '\u{1F7E2}' : '\u{1F534}',
          text: (
            <>
              <span style={{ color: isBuy ? '#00FF41' : '#f87171' }}>
                {isBuy ? 'bought' : 'sold'}
              </span>
              {' '}
              {formatted || 'some'}
              {' '}
              <span style={{ color: '#22d3ee', fontFamily: "'Inter', monospace" }}>
                {shortAddress(p.walletAddress!)}
              </span>
              {' '}
              <span style={{ color: 'rgba(255,255,255,0.5)' }}>${songLabel}</span>
            </>
          ),
          accent: isBuy ? 'green' : 'red',
        });
      }
    }

    // Sort by time descending (newest first)
    items.sort((a, b) => b.time - a.time);
    return items;
  }, [songsRaw, purchasesRaw]);

  if (notifications.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '0 24px',
          textAlign: 'center',
        }}
      >
        <Bell size={40} style={{ color: 'rgba(0, 255, 65, 0.25)', filter: 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.15))' }} />
        <p
          style={{
            fontFamily: "'Inter', monospace",
            fontSize: 12,
            color: 'rgba(0, 255, 65, 0.35)',
            margin: 0,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          No alerts yet. New releases and trades will appear here.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        paddingTop: 12,
        paddingBottom: 12,
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(0, 255, 65, 0.2) transparent',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {notifications.map((item) => (
          <NotificationRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// --- Tab type ---
type SocialTab = 'lit' | 'alerts';

export function SocialPage() {
  const [isDesktop, setIsDesktop] = useState(false);
  const [activeTab, setActiveTab] = useState<SocialTab>('lit');

  // Detect desktop breakpoint (md = 768px)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // On desktop: account for sidebar (left offset) and no BottomTabBar
  const leftOffset = isDesktop ? SIDEBAR_W : 0;
  // bottomOffset: mobile tab bar is 72px + env(safe-area-inset-bottom) — use 72 to prevent gap
  const bottomOffset = isDesktop ? 0 : 72;

  return (
    <div
      style={{
        position: 'fixed',
        top: NAV_BAR_H,
        left: leftOffset,
        right: 0,
        bottom: bottomOffset,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(6,10,6,0.92)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Tab bar header */}
      <div
        style={{
          position: 'relative',
          zIndex: 100,
          padding: '10px 16px 8px',
          background: 'rgba(6,10,6,0.92)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 255, 65, 0.12)',
          flexShrink: 0,
        }}
      >
        {/* Neon accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #00FF41 20%, #00FF41 50%, #BF00FF 80%, transparent)',
            boxShadow: '0 0 12px rgba(0, 255, 65, 0.6), 0 0 24px rgba(0, 255, 65, 0.3)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Page title */}
          <h1
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontWeight: 900,
              fontSize: 14,
              color: '#00FF41',
              margin: 0,
              letterSpacing: '0.08em',
              textShadow: '0 0 8px rgba(0, 255, 65, 0.8)',
              textTransform: 'uppercase',
            }}
          >
            Social
          </h1>

          {/* Pill tab toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(6,10,6,0.6)',
              borderRadius: 10,
              padding: 2,
              border: '1px solid rgba(0, 255, 65, 0.12)',
            }}
          >
            {([
              { key: 'lit' as SocialTab, label: 'Lit', icon: MessageCircle },
              { key: 'alerts' as SocialTab, label: 'Alerts', icon: Bell },
            ]).map(({ key, label, icon: Icon }) => {
              const isActive = activeTab === key;
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    transition: 'all 0.2s ease',
                    background: isActive
                      ? 'rgba(0, 255, 65, 0.12)'
                      : 'transparent',
                    color: isActive ? '#00FF41' : 'rgba(255,255,255,0.4)',
                    textShadow: isActive ? '0 0 6px rgba(0, 255, 65, 0.6)' : 'none',
                    boxShadow: isActive
                      ? '0 0 12px rgba(0, 255, 65, 0.15)'
                      : 'none',
                  }}
                >
                  <Icon size={13} style={{ color: isActive ? '#00FF41' : 'rgba(255,255,255,0.4)' }} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {activeTab === 'lit' ? (
            <motion.div
              key="lit"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <LitHubPage insetTop={isDesktop ? NAV_BAR_H : 0} insetLeft={leftOffset} />
            </motion.div>
          ) : (
            <motion.div
              key="alerts"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
            >
              {/* Dark neon grid background — matches homepage aesthetic */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  overflow: 'hidden',
                  pointerEvents: 'none',
                }}
              >
                {/* Deep dark base — same as homepage NeonGridBackground */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `radial-gradient(ellipse 80% 70% at 50% 30%, rgba(0, 255, 65, 0.06) 0%, transparent 60%),
                                 radial-gradient(ellipse 50% 40% at 30% 70%, rgba(0,212,255,0.05) 0%, transparent 50%),
                                 radial-gradient(ellipse 60% 50% at 80% 60%, rgba(0, 255, 65, 0.05) 0%, transparent 45%),
                                 #060A06`,
                  }}
                />
                {/* Vertical neon grid lines */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(rgba(0, 255, 65, 0.04) 1px, transparent 1px)',
                    backgroundSize: '60px 100%',
                    backgroundPosition: 'center',
                  }}
                />
                {/* Horizontal neon grid lines */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'linear-gradient(0deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
                    backgroundSize: '100% 60px',
                    backgroundPosition: 'center',
                  }}
                />
                {/* Diagonal neon accent lines */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `
                      linear-gradient(135deg, rgba(0,212,255,0.03) 1px, transparent 1px),
                      linear-gradient(225deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                  }}
                />
                {/* Top center ambient glow */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'radial-gradient(ellipse at 50% 0%, rgba(0, 255, 65, 0.08) 0%, rgba(0,212,255,0.03) 30%, transparent 70%)',
                  }}
                />
                {/* Bottom cyan glow */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: '20%',
                    width: 300,
                    height: 180,
                    background: 'radial-gradient(ellipse at center, rgba(0,212,255,0.08) 0%, transparent 70%)',
                    filter: 'blur(25px)',
                  }}
                />
              </div>

              {/* Alerts header */}
              <div style={{ padding: '12px 16px 8px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <motion.div
                    animate={{
                      boxShadow: [
                        '0 0 8px rgba(0, 255, 65, 0.3), 0 0 16px rgba(0, 255, 65, 0.15)',
                        '0 0 16px rgba(0, 255, 65, 0.6), 0 0 32px rgba(0, 255, 65, 0.3)',
                        '0 0 8px rgba(0, 255, 65, 0.3), 0 0 16px rgba(0, 255, 65, 0.15)',
                      ],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'rgba(0, 255, 65, 0.08)',
                      border: '1.5px solid rgba(0, 255, 65, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Bell size={14} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.8))' }} />
                  </motion.div>
                  <div>
                    <h2
                      style={{
                        fontFamily: "'Archivo Black', sans-serif",
                        fontWeight: 900,
                        fontSize: 13,
                        color: '#00FF41',
                        margin: 0,
                        letterSpacing: '0.08em',
                        textShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Activity Feed
                    </h2>
                    <p
                      style={{
                        fontFamily: "'Inter', monospace",
                        fontSize: 9,
                        color: 'rgba(0, 255, 65, 0.4)',
                        margin: 0,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Releases & trades
                    </p>
                  </div>
                </div>
              </div>

              {/* Feed */}
              <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                <AlertsFeed />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default SocialPage;
