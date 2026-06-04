import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { ChevronDown, Hash, Users, Pin, MessageCircle, Zap } from 'lucide-react';

import { useAuth } from '@/hooks/use-privy-auth';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { useChatConnection } from '@/hooks/useChatConnection';

import {
  subscribeManyChatMessages,
  setChatMessages,
  type ChatMessagesResponse,
} from '@/lib/collections/chatMessages';
import {
  subscribeManyChatReactions,
  type ChatReactionsResponse,
} from '@/lib/collections/chatReactions';
import {
  getGmStreaks,
  setGmStreaks,
  updateGmStreaks,
} from '@/lib/collections/gmStreaks';
import {
  getManySongDetails,
} from '@/lib/collections/songDetails';
import { runGetTokenBalanceQueryForSongs } from '@/lib/collections/songs';
import {
  getManyUsers,
  type UsersResponse,
} from '@/lib/collections/users';
import type { MentionUser } from './chat/MentionDropdown';

import { Time, Address } from '@/lib/db-client';
import { isSeedSong } from '@/utils/songFilters';

import {
  getTierFromBalance,
  containsProfanity,
  isGmMessage,
  getUtcDateString,
  getYesterdayUtcDateString,
  shortAddress,
  type ChatTier,
} from '@/utils/chatUtils';

import { ChatMessage } from './chat/ChatMessage';
import { ChatInputBar } from './chat/ChatInputBar';
import { ChatTierBadge } from './chat/ChatTierBadge';

// --- Types ---
interface TierCacheEntry {
  tier: ChatTier;
  balance: number;
  fetchedAt: number;
}

const TIER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// --- Dark neon grid background — matches Alerts tab aesthetic ---
function NeonGridBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Deep dark base with radial neon glows */}
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
  );
}

// --- Animated floating particles ---
function NeonParticles() {
  const particles = useMemo(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 4,
      duration: Math.random() * 6 + 4,
      color: i % 3 === 0 ? '#00FF41' : i % 3 === 1 ? '#BF00FF' : '#00D4FF',
      opacity: Math.random() * 0.4 + 0.1,
    })), []);

  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1 }}
    >
      {particles.map(p => (
        <motion.div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [p.opacity, p.opacity * 0.3, p.opacity],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// --- Sign-in connect button ---
function ConnectWalletButton() {
  const { login, loading } = useAuth();
  const [connecting, setConnecting] = useState(false);

  const handleClick = () => {
    setConnecting(true);
    try {
      login();
    } catch {
      // handled internally
    } finally {
      setConnecting(false);
    }
  };

  return (
    <motion.button
      onClick={handleClick}
      disabled={connecting}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
      style={{
        padding: '14px 44px',
        background: 'rgba(0, 255, 65, 0.06)',
        border: '2px solid #00FF41',
        borderRadius: 14,
        color: '#00FF41',
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: 16,
        fontWeight: 900,
        letterSpacing: '0.12em',
        cursor: connecting ? 'wait' : 'pointer',
        opacity: connecting ? 0.6 : 1,
        boxShadow: '0 0 20px rgba(0, 255, 65, 0.4), 0 0 40px rgba(0, 255, 65, 0.2)',
        textShadow: '0 0 8px rgba(0, 255, 65, 0.8)',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <Zap size={18} />
      {connecting ? 'Connecting...' : loading ? 'Loading...' : 'Sign in'}
    </motion.button>
  );
}

// --- Main Component ---
export function LitHubPage({ insetTop = 0, insetLeft = 0 }: { insetTop?: number; insetLeft?: number } = {}) {
  const { walletAddress, isAuthenticated, displayName } = usePrivyAuth();

  // Real-time messages (global chat: songId is null)
  const { data: messagesRaw, loading, error } = useRealtimeData<ChatMessagesResponse[]>(
    subscribeManyChatMessages,
    true,
    'order by createdAt desc limit 50'
  );

  // Connection status via heartbeat hook
  const {
    isConnected,
    isConnecting,
    isReconnecting,
    heartbeat: connectionHeartbeat,
  } = useChatConnection(loading, messagesRaw !== null);

  // Heartbeat on new message batch
  useEffect(() => {
    connectionHeartbeat(messagesRaw?.length ?? 0);
  }, [messagesRaw, connectionHeartbeat]);

  const hasError = error !== null;

  // Real-time reactions
  const { data: allReactions } = useRealtimeData<ChatReactionsResponse[]>(
    subscribeManyChatReactions,
    true
  );

  // Sort messages ascending for display
  const messages: ChatMessagesResponse[] = useMemo(() => {
    if (!messagesRaw) return [];
    return [...messagesRaw]
      .filter((m) => !m.songId && !m.arenaId)
      .sort((a, b) => a.createdAt - b.createdAt);
  }, [messagesRaw]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages]
  );

  // Tier cache: walletAddress -> TierCacheEntry
  const tierCache = useRef<Map<string, TierCacheEntry>>(new Map());
  const [tierMap, setTierMap] = useState<Map<string, ChatTier>>(new Map());

  // GM streak map: walletAddress -> streak count for GM messages
  const [gmStreakMap, setGmStreakMap] = useState<Map<string, number>>(new Map());

  // My own tier
  const myTier: ChatTier = walletAddress ? (tierMap.get(walletAddress) ?? 'none') : 'none';
  const canPost = isAuthenticated;
  const canReact = myTier !== 'none';

  // User profile images lookup map: walletAddress -> profileImage
  const [profileImageMap, setProfileImageMap] = useState<Map<string, string>>(new Map());

  // Mention users list and map: displayName/handle -> walletAddress
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionUserMap, setMentionUserMap] = useState<Map<string, string>>(new Map());

  // Fetch user profiles once on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const users = await getManyUsers('limit 200');
        const imgMap = new Map<string, string>();
        const mentionList: MentionUser[] = [];
        const mMap = new Map<string, string>();
        users.forEach((u: UsersResponse) => {
          if (u.profileImage) {
            imgMap.set(u.walletAddress, u.profileImage);
          }
          mentionList.push({
            walletAddress: u.walletAddress,
            displayName: u.displayName,
          });
          // Index by displayName and by short wallet prefix for mention lookup
          if (u.displayName) {
            mMap.set(u.displayName, u.walletAddress);
          }
          // Also index by wallet prefix (first 8 chars) for @addr mentions
          mMap.set(u.walletAddress.slice(0, 8), u.walletAddress);
        });
        setProfileImageMap(imgMap);
        setMentionUsers(mentionList);
        setMentionUserMap(mMap);
      } catch {
        // ignore
      }
    };
    fetchProfiles();
  }, []);

  // Online/offline state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const inputBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Rate limiting: track timestamps of sent messages
  const sentTimestamps = useRef<number[]>([]);

  // Scroll state
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const isUserScrolled = useRef(false);

  // --- Tier resolution ---
  const resolveTierForWallet = useCallback(async (address: string) => {
    const cached = tierCache.current.get(address);
    if (cached && Date.now() - cached.fetchedAt < TIER_CACHE_TTL_MS) {
      setTierMap((prev) => new Map([...prev, [address, cached.tier]]));
      return;
    }
    try {
      // Fetch a few approved songs to check balances (drop seed/filler tracks)
      const rawSongs = await getManySongDetails('where approved = true limit 8');
      const songs = (rawSongs ?? []).filter((s) => !isSeedSong(s as any));
      let highestBalance = 0;
      for (const song of songs) {
        try {
          const bal = await runGetTokenBalanceQueryForSongs(song.id, { walletAddress: address });
          if (bal > highestBalance) highestBalance = bal;
          if (highestBalance >= 10_000_000) break; // Already platinum, no need to continue
        } catch {
          // ignore per-song errors
        }
      }
      const tier = getTierFromBalance(highestBalance);
      const entry: TierCacheEntry = { tier, balance: highestBalance, fetchedAt: Date.now() };
      tierCache.current.set(address, entry);
      setTierMap((prev) => new Map([...prev, [address, tier]]));
    } catch {
      // Fallback to none
      const entry: TierCacheEntry = { tier: 'none', balance: 0, fetchedAt: Date.now() };
      tierCache.current.set(address, entry);
    }
  }, []);

  // Resolve tiers for newly seen wallets
  useEffect(() => {
    if (!messages.length) return;
    const uniqueWallets = [...new Set(messages.map((m) => m.walletAddress))];
    uniqueWallets.forEach((addr) => {
      const cached = tierCache.current.get(addr);
      if (!cached || Date.now() - cached.fetchedAt >= TIER_CACHE_TTL_MS) {
        resolveTierForWallet(addr);
      }
    });
  }, [messages, resolveTierForWallet]);

  // Resolve own tier when authenticated
  useEffect(() => {
    if (walletAddress) resolveTierForWallet(walletAddress);
  }, [walletAddress, resolveTierForWallet]);

  // --- GM streak resolution for GM messages ---
  const fetchGmStreak = useCallback(async (address: string) => {
    if (gmStreakMap.has(address)) return;
    try {
      const streak = await getGmStreaks(address);
      if (streak) {
        setGmStreakMap((prev) => new Map([...prev, [address, streak.currentStreak as number]]));
      }
    } catch {
      // ignore
    }
  }, [gmStreakMap]);

  useEffect(() => {
    const gmMessages = messages.filter((m) => isGmMessage(m.content));
    gmMessages.forEach((m) => fetchGmStreak(m.walletAddress));
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Auto-scroll ---
  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    if (!isUserScrolled.current) scrollToBottom(false);
  }, [messages, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolled.current = distFromBottom > 60;
    setShowScrollFab(distFromBottom > 120);
  }, []);

  // --- GM streak update ---
  const handleGmStreak = useCallback(async (address: string) => {
    try {
      const existing = await getGmStreaks(address);
      const today = getUtcDateString();
      const yesterday = getYesterdayUtcDateString();

      if (!existing) {
        // Create fresh streak
        await setGmStreaks(address, {
          currentStreak: 1,
          lastGmDate: today,
          longestStreak: 1,
          totalGms: 1,
        });
        setGmStreakMap((prev) => new Map([...prev, [address, 1]]));
        return;
      }

      const lastDate = existing.lastGmDate;
      const currentStreak = existing.currentStreak;
      const longestStreak = existing.longestStreak;
      const totalGms = existing.totalGms;

      if (lastDate === today) {
        setGmStreakMap((prev) => new Map([...prev, [address, currentStreak]]));
        return;
      }

      if (lastDate === yesterday) {
        const newStreak = currentStreak + 1;
        const newLongest = Math.max(longestStreak, newStreak);
        await updateGmStreaks(address, {
          currentStreak: newStreak,
          lastGmDate: today,
          longestStreak: newLongest,
          totalGms: totalGms + 1,
        });
        setGmStreakMap((prev) => new Map([...prev, [address, newStreak]]));
      } else {
        await updateGmStreaks(address, {
          currentStreak: 1,
          lastGmDate: today,
          totalGms: totalGms + 1,
        });
        setGmStreakMap((prev) => new Map([...prev, [address, 1]]));
      }
    } catch {
      // Ignore streak errors — message still sends
    }
  }, []);

  // --- GM empty-state handler — auto-sends "👋 GM" ---
  const handleGmClick = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error('Sign in to post messages');
      return;
    }
    if (!walletAddress) return;

    setIsSending(true);

    try {
      const messageId = `${walletAddress}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const success = await setChatMessages(messageId, {
        walletAddress: Address.publicKey(walletAddress),
        displayName: displayName ?? undefined,
        content: '\u{1F44B} GM',
        isPinned: false,
        createdAt: Time.Now,
      });

      if (!success) {
        toast.error('Failed to send message');
        return;
      }

      isUserScrolled.current = false;
      setTimeout(() => scrollToBottom(true), 100);
      handleGmStreak(walletAddress);
    } catch {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  }, [isAuthenticated, walletAddress, displayName, scrollToBottom, handleGmStreak]);

  // --- Send message ---
  const handleSend = useCallback(async () => {
    if (!isOnline) return;
    if (!walletAddress || !inputValue.trim() || isSending) return;
    const content = inputValue.trim();

    if (containsProfanity(content)) {
      toast.error('Message violates community guidelines');
      return;
    }

    // ALL CAPS check
    if (content.length > 10) {
      const letters = content.replace(/[^a-zA-Z]/g, '');
      if (letters.length > 0) {
        const upperCount = letters.replace(/[^A-Z]/g, '').length;
        if (upperCount / letters.length > 0.7) {
          toast.error('Message cannot be mostly uppercase');
          return;
        }
      }
    }

    // Repeated characters check
    if (/(.)(\1{4,})/.test(content)) {
      toast.error('Message contains excessive repeated characters');
      return;
    }

    const now = Date.now();
    sentTimestamps.current = sentTimestamps.current.filter((t) => now - t < 60000);
    if (sentTimestamps.current.length >= 10) {
      toast.error('Slow down! Max 10 messages per minute');
      return;
    }

    if (!canPost) {
      toast.error('Sign in to post messages');
      return;
    }

    setIsSending(true);
    setInputValue('');

    try {
      const messageId = `${walletAddress}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const success = await setChatMessages(messageId, {
        walletAddress: Address.publicKey(walletAddress),
        displayName: displayName ?? undefined,
        content,
        isPinned: false,
        createdAt: Time.Now,
      });

      if (!success) {
        toast.error('Failed to send message');
        setInputValue(content);
        return;
      }

      sentTimestamps.current.push(now);

      if (isGmMessage(content)) {
        handleGmStreak(walletAddress);
      }

      isUserScrolled.current = false;
      setTimeout(() => scrollToBottom(true), 100);
    } catch {
      toast.error('Failed to send message');
      setInputValue(content);
    } finally {
      setIsSending(false);
    }
  }, [walletAddress, inputValue, isSending, canPost, displayName, handleGmStreak, scrollToBottom, isOnline]);

  // Reactions for a given message
  const getReactionsForMessage = useCallback(
    (messageId: string): ChatReactionsResponse[] => {
      return (allReactions ?? []).filter((r) => r.messageId === messageId);
    },
    [allReactions]
  );

  // Online count (unique wallets seen recently)
  const recentSenders = useMemo(() => {
    const cutoff = Math.floor(Date.now() / 1000) - 300; // 5 min
    return new Set(
      messages
        .filter((m) => m.createdAt > cutoff)
        .map((m) => m.walletAddress)
    ).size;
  }, [messages]);

  return (
    <div
      style={{
        position: 'fixed',
        top: insetTop,
        left: insetLeft,
        right: 0,
        bottom: 'calc(max(env(safe-area-inset-bottom, 0px), 6px) + 52px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(6,10,6,0.88)',
        backdropFilter: 'blur(16px)',
        overflow: 'hidden',
        zIndex: 95,
      }}
    >
      {/* Dark neon grid background */}
      <NeonGridBackground />
      <NeonParticles />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{
          position: 'relative',
          zIndex: 100,
          padding: '12px 16px 10px',
          background: 'hsla(260,85%,4%,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 255, 65, 0.18)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.4), 0 1px 0 rgba(0, 255, 65, 0.08)',
        }}
      >
        {/* Neon accent bar at top */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Animated neon icon */}
            <motion.div
              animate={{ boxShadow: ['0 0 8px rgba(0, 255, 65, 0.4), 0 0 16px rgba(0, 255, 65, 0.2)', '0 0 16px rgba(0, 255, 65, 0.7), 0 0 32px rgba(0, 255, 65, 0.35)', '0 0 8px rgba(0, 255, 65, 0.4), 0 0 16px rgba(0, 255, 65, 0.2)'] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'rgba(0, 255, 65, 0.08)',
                border: '1.5px solid rgba(0, 255, 65, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Hash size={16} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.8))' }} />
            </motion.div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <h1
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontWeight: 900,
                    fontSize: 15,
                    color: '#00FF41',
                    margin: 0,
                    letterSpacing: '0.08em',
                    lineHeight: 1,
                    textShadow: '0 0 8px rgba(0, 255, 65, 0.8), 0 0 20px rgba(0, 255, 65, 0.4)',
                    textTransform: 'uppercase',
                  }}
                >
                  Lit Hub
                </h1>
                <motion.div
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00FF41',
                    boxShadow: '0 0 8px rgba(0, 255, 65, 0.9)',
                    flexShrink: 0,
                  }}
                />
              </div>
              <p
                style={{
                  fontFamily: "'Inter', monospace",
                  fontSize: 9,
                  color: 'rgba(0, 255, 65, 0.45)',
                  margin: 0,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginTop: 3,
                }}
              >
                Global chat
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Connection status badge */}
            <AnimatePresence>
              {messagesRaw !== null && (
                <motion.div
                  key={hasError ? 'error' : isReconnecting ? 'reconnecting' : isConnecting ? 'connecting' : 'connected'}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 8px',
                    borderRadius: 12,
                    background: hasError
                      ? 'rgba(239,68,68,0.15)'
                      : isReconnecting
                        ? 'rgba(113,113,122,0.15)'
                        : isConnecting
                          ? 'rgba(245,158,11,0.15)'
                          : 'rgba(0, 255, 65, 0.1)',
                    border: `1px solid ${hasError ? 'rgba(239,68,68,0.3)' : isReconnecting ? 'rgba(113,113,122,0.3)' : isConnecting ? 'rgba(245,158,11,0.3)' : 'rgba(0, 255, 65, 0.35)'}`,
                  }}
                >
                  <motion.div
                    animate={(!hasError && !isReconnecting && !isConnecting) ? { opacity: [1, 0.3, 1] } : {}}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: hasError ? '#EF4444' : isReconnecting ? '#71717a' : isConnecting ? '#F59E0B' : '#00FF41',
                      boxShadow: hasError
                        ? '0 0 6px rgba(239,68,68,0.8)'
                        : isReconnecting
                          ? '0 0 6px rgba(113,113,122,0.8)'
                          : isConnecting
                            ? '0 0 6px rgba(245,158,11,0.8)'
                            : '0 0 8px rgba(0, 255, 65, 1)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      color: hasError ? '#EF4444' : isReconnecting ? '#71717a' : isConnecting ? '#F59E0B' : '#00FF41',
                      textShadow: (!hasError && !isReconnecting && !isConnecting) ? '0 0 6px rgba(0, 255, 65, 0.6)' : 'none',
                    }}
                  >
                    {hasError ? 'Disconnected' : isReconnecting ? 'Reconnecting...' : isConnecting ? 'Connecting...' : 'Live'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Own tier badge */}
            {walletAddress && <ChatTierBadge tier={myTier} size="sm" />}

            {/* Online indicator */}
            {recentSenders > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  fontFamily: "'Inter', sans-serif",
                  background: 'rgba(255,255,255,0.04)',
                  padding: '2px 7px',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Users size={10} />
                <span>{recentSenders}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Content area — chat or sign-in gate */}
      {isAuthenticated ? (
        <>
          {/* Pinned messages */}
          <AnimatePresence>
            {pinnedMessages.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{
                  position: 'relative',
                  zIndex: 9,
                  background: 'rgba(0, 255, 65, 0.04)',
                  borderBottom: '1px solid rgba(0, 255, 65, 0.15)',
                  overflow: 'hidden',
                }}
              >
                <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Pin
                    size={12}
                    style={{ color: '#00FF41', flexShrink: 0, marginTop: 3, filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.8))' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {pinnedMessages.slice(0, 2).map((msg) => (
                      <p
                        key={msg.id}
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.65)',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <span style={{ color: '#00FF41', fontWeight: 600, textShadow: '0 0 6px rgba(0, 255, 65, 0.6)' }}>
                          {shortAddress(msg.walletAddress)}:{' '}
                        </span>
                        {msg.content}
                      </p>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Offline banner */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'relative',
                  zIndex: 9,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '8px 16px',
                    background: 'rgba(120,80,0,0.35)',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid rgba(251,191,36,0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#F59E0B',
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#FCD34D',
                      letterSpacing: '0.01em',
                    }}
                  >
                    You're offline — chat is read-only
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages scroll area */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              position: 'relative',
              zIndex: 5,
              paddingTop: 8,
              paddingBottom: 8,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 255, 65, 0.2) transparent',
            }}
          >
            {messagesRaw !== null && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '60vh',
                  gap: 20,
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'center',
                  padding: '0 24px',
                }}
              >
                {/* Icon */}
                <motion.div
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(0, 255, 65, 0.2), 0 0 40px rgba(0, 255, 65, 0.1)',
                      '0 0 40px rgba(0, 255, 65, 0.4), 0 0 70px rgba(0, 255, 65, 0.2)',
                      '0 0 20px rgba(0, 255, 65, 0.2), 0 0 40px rgba(0, 255, 65, 0.1)',
                    ],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    background: 'rgba(0, 255, 65, 0.06)',
                    border: '1.5px solid rgba(0, 255, 65, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MessageCircle size={32} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 6px rgba(0, 255, 65, 0.8))' }} />
                </motion.div>

                {/* Text */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 800,
                      color: 'rgba(255,255,255,0.9)',
                      letterSpacing: '-0.01em',
                      fontFamily: "'Archivo Black', sans-serif",
                      textTransform: 'uppercase',
                    }}
                  >
                    Be the first to say GM 👋
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: 'rgba(255,255,255,0.35)',
                      fontWeight: 400,
                    }}
                  >
                    The chat is quiet — wake it up.
                  </p>
                </div>

                {/* GM button */}
                <motion.button
                  onClick={handleGmClick}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    padding: '14px 44px',
                    background: 'rgba(0, 255, 65, 0.06)',
                    border: '2px solid #00FF41',
                    borderRadius: 14,
                    color: '#00FF41',
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: 16,
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    cursor: 'pointer',
                    boxShadow: '0 0 20px rgba(0, 255, 65, 0.4), 0 0 40px rgba(0, 255, 65, 0.2)',
                    textShadow: '0 0 8px rgba(0, 255, 65, 0.8)',
                    textTransform: 'uppercase',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Zap size={16} />
                    GM
                  </span>
                </motion.button>
              </motion.div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                reactions={getReactionsForMessage(msg.id)}
                tier={tierMap.get(msg.walletAddress) ?? 'none'}
                gmStreak={
                  isGmMessage(msg.content)
                    ? (gmStreakMap.get(msg.walletAddress) ?? undefined)
                    : undefined
                }
                currentWallet={walletAddress}
                canReact={canReact}
                isOwn={walletAddress === msg.walletAddress}
                profileImageUrl={profileImageMap.get(msg.walletAddress)}
                mentionUserMap={mentionUserMap}
                currentUserWallet={walletAddress ?? undefined}
              />
            ))}
          </div>

          {/* Scroll to bottom FAB */}
          <AnimatePresence>
            {showScrollFab && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                onClick={() => {
                  isUserScrolled.current = false;
                  scrollToBottom(true);
                }}
                style={{
                  position: 'absolute',
                  bottom: 80,
                  right: 16,
                  zIndex: 20,
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'rgba(0, 255, 65, 0.06)',
                  border: '1.5px solid rgba(0, 255, 65, 0.5)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(0, 255, 65, 0.4), 0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                <ChevronDown size={18} color="#00FF41" style={{ filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.8))' }} />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Input bar */}
          <div ref={inputBarRef} style={{ position: 'relative', zIndex: 10 }}>
            <ChatInputBar
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSend}
              canPost={canPost}
              isAuthenticated={isAuthenticated}
              isSending={isSending}
              isConnected={isConnected}
              mentionUsers={mentionUsers}
            />
            {/* Offline overlay */}
            {!isOnline && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(10,5,25,0.55)',
                  backdropFilter: 'blur(2px)',
                  cursor: 'not-allowed',
                  zIndex: 5,
                }}
              />
            )}
          </div>
        </>
      ) : (
        /* Sign-in gate */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
            padding: '0 32px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 5,
          }}
        >
          {/* Animated neon icon */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px rgba(0, 255, 65, 0.2), 0 0 40px rgba(0, 255, 65, 0.1)',
                '0 0 40px rgba(0, 255, 65, 0.5), 0 0 80px rgba(0, 255, 65, 0.25)',
                '0 0 20px rgba(0, 255, 65, 0.2), 0 0 40px rgba(0, 255, 65, 0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              width: 96,
              height: 96,
              borderRadius: '50%',
              background: 'rgba(0, 255, 65, 0.06)',
              border: '2px solid rgba(0, 255, 65, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MessageCircle size={40} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.9))' }} />
          </motion.div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '-0.02em',
                fontFamily: "'Archivo Black', sans-serif",
                textTransform: 'uppercase',
                textShadow: '0 0 12px rgba(0, 255, 65, 0.4)',
              }}
            >
              Sign in to Lit Hub
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'rgba(255,255,255,0.4)',
                fontWeight: 400,
                fontFamily: "'Inter', sans-serif",
                maxWidth: 320,
                lineHeight: 1.5,
              }}
            >
              Connect your wallet to join the conversation, react to messages, and build your streak.
            </p>
          </div>

          {/* Connect button */}
          <ConnectWalletButton />
        </motion.div>
      )}
    </div>
  );
}

export default LitHubPage;
