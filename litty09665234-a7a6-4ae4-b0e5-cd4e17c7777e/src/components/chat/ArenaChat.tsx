import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ChevronDown,
  Pin,
  MessageCircle,
  Lock,
  BadgeCheck,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { useArtistTier } from '@/hooks/useArtistTier';
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

import { Time, Address } from '@/lib/db-client';

import {
  getTierFromBalance,
  containsProfanity,
  isGmMessage,
  getUtcDateString,
  getYesterdayUtcDateString,
  shortAddress,
  type ChatTier,
} from '@/utils/chatUtils';

import { ChatMessage } from './ChatMessage';
import { ChatInputBar } from './ChatInputBar';
import { ChatTierBadge } from './ChatTierBadge';
import { runGetTokenBalanceQueryForSongs } from '@/lib/collections/songs';
import { getManySongDetails as fetchSongDetails } from '@/lib/collections/songDetails';
import { getManyUsers, type UsersResponse } from '@/lib/collections/users';
import type { MentionUser } from './MentionDropdown';

// ── Types ──────────────────────────────────────────────────────────────────

interface ArenaChatProps {
  artistAddress: string;
  artistName: string;
  coverImage?: string;
  isVerified?: boolean;
}

interface TierCacheEntry {
  tier: ChatTier;
  fetchedAt: number;
}

const TIER_CACHE_TTL_MS = 5 * 60 * 1000;

// ── Component ──────────────────────────────────────────────────────────────

export function ArenaChat({
  artistAddress,
  artistName,
  coverImage,
  isVerified,
}: ArenaChatProps) {
  const { walletAddress, isAuthenticated, displayName } = usePrivyAuth();
  const { tier: myTier, loading: tierLoading } = useArtistTier(
    artistAddress,
    walletAddress ?? undefined
  );

  const canPost = myTier !== 'none';
  const canReact = myTier !== 'none';
  const canPin = myTier === 'diamond' || myTier === 'legend';

  // Real-time arena messages (filtered by arenaId = artistAddress)
  const { data: messagesRaw, loading, error } = useRealtimeData<ChatMessagesResponse[]>(
    subscribeManyChatMessages,
    !!artistAddress,
    `where arenaId = '${artistAddress}' order by createdAt desc limit 60`
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

  const messages: ChatMessagesResponse[] = useMemo(() => {
    if (!messagesRaw) return [];
    return [...messagesRaw].sort((a, b) => a.createdAt - b.createdAt);
  }, [messagesRaw]);

  const pinnedMessages = useMemo(
    () => messages.filter((m) => m.isPinned),
    [messages]
  );

  // Tier cache for message senders
  const tierCache = useRef<Map<string, TierCacheEntry>>(new Map());
  const [tierMap, setTierMap] = useState<Map<string, ChatTier>>(new Map());
  const [gmStreakMap, setGmStreakMap] = useState<Map<string, number>>(new Map());

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const inputBarRef = useRef<HTMLDivElement>(null);
  const [profileImageMap, setProfileImageMap] = useState<Map<string, string>>(new Map());
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
          mentionList.push({ walletAddress: u.walletAddress, displayName: u.displayName });
          if (u.displayName) mMap.set(u.displayName, u.walletAddress);
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

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const sentTimestamps = useRef<number[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollFab, setShowScrollFab] = useState(false);
  const isUserScrolled = useRef(false);

  // ── Tier resolution for message senders ───────────────────────────────────

  const resolveTierForWallet = useCallback(async (address: string) => {
    const cached = tierCache.current.get(address);
    if (cached && Date.now() - cached.fetchedAt < TIER_CACHE_TTL_MS) {
      setTierMap((prev) => new Map([...prev, [address, cached.tier]]));
      return;
    }
    try {
      const songs = await fetchSongDetails(`where artistAddress = '${artistAddress}' limit 6`);
      let highestBalance = 0;
      for (const song of songs) {
        try {
          const bal = await runGetTokenBalanceQueryForSongs(song.id, { walletAddress: address });
          if (bal > highestBalance) highestBalance = bal;
          if (highestBalance >= 10_000_000) break;
        } catch {
          // ignore
        }
      }
      const tier = getTierFromBalance(highestBalance);
      const entry: TierCacheEntry = { tier, fetchedAt: Date.now() };
      tierCache.current.set(address, entry);
      setTierMap((prev) => new Map([...prev, [address, tier]]));
    } catch {
      const entry: TierCacheEntry = { tier: 'none', fetchedAt: Date.now() };
      tierCache.current.set(address, entry);
    }
  }, [artistAddress]);

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

  // ── GM streaks ────────────────────────────────────────────────────────────

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
    messages.filter((m) => isGmMessage(m.content)).forEach((m) => fetchGmStreak(m.walletAddress));
  }, [messages]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-scroll ───────────────────────────────────────────────────────────

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

  // ── GM streak update ──────────────────────────────────────────────────────

  const handleGmStreak = useCallback(async (address: string) => {
    try {
      const existing = await getGmStreaks(address);
      const today = getUtcDateString();
      const yesterday = getYesterdayUtcDateString();

      if (!existing) {
        await setGmStreaks(address, {
          currentStreak: 1,
          lastGmDate: today,
          longestStreak: 1,
          totalGms: 1,
        });
        setGmStreakMap((prev) => new Map([...prev, [address, 1]]));
        return;
      }

      const { lastGmDate, currentStreak, longestStreak, totalGms } = existing;

      if (lastGmDate === today) {
        setGmStreakMap((prev) => new Map([...prev, [address, currentStreak]]));
        return;
      }

      if (lastGmDate === yesterday) {
        const newStreak = currentStreak + 1;
        await updateGmStreaks(address, {
          currentStreak: newStreak,
          lastGmDate: today,
          longestStreak: Math.max(longestStreak, newStreak),
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
      // Streak errors don't block message send
    }
  }, []);

  // ── GM empty state ────────────────────────────────────────────────────────

  const handleGmClick = useCallback(() => {
    setInputValue('GM');
    setTimeout(() => {
      const textarea = inputBarRef.current?.querySelector('textarea');
      if (textarea) textarea.focus();
    }, 0);
  }, []);

  // ── Send message ──────────────────────────────────────────────────────────

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
      toast.error(`Own a song by ${artistName} to post in their Arena`);
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
        arenaId: artistAddress,
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
  }, [walletAddress, inputValue, isSending, canPost, displayName, artistAddress, artistName, handleGmStreak, scrollToBottom, isOnline]);

  // ── Reactions helper ──────────────────────────────────────────────────────

  const getReactionsForMessage = useCallback(
    (messageId: string): ChatReactionsResponse[] =>
      (allReactions ?? []).filter((r) => r.messageId === messageId),
    [allReactions]
  );

  // ── Recent sender count ───────────────────────────────────────────────────

  const recentSenders = useMemo(() => {
    const cutoff = Math.floor(Date.now() / 1000) - 300;
    return new Set(
      messages.filter((m) => m.createdAt > cutoff).map((m) => m.walletAddress)
    ).size;
  }, [messages]);

  const hue = artistAddress
    ? Math.abs(
        artistAddress.split('').reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      ) % 360
    : 280;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#060A06',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        {coverImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.04,
              filter: 'blur(20px)',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 80% 40% at 50% 0%, hsla(${hue},70%,30%,0.15) 0%, transparent 70%)`,
          }}
        />
      </div>

      {/* Arena Header */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          borderBottom: `1px solid hsla(${hue},60%,50%,0.2)`,
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {/* Cover image banner */}
        {coverImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${coverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
              opacity: 0.18,
              filter: 'blur(8px)',
            }}
          />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(6,10,6,0.85)',
            backdropFilter: 'blur(20px)',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            padding: '12px 16px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Artist avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                overflow: 'hidden',
                flexShrink: 0,
                background: `linear-gradient(135deg, hsla(${hue},70%,30%,0.6), hsla(${(hue + 60) % 360},80%,20%,0.5))`,
                border: `1px solid hsla(${hue},60%,50%,0.4)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 800,
                color: `hsl(${hue},80%,80%)`,
                fontFamily: "'Inter', sans-serif",
                boxShadow: `0 0 16px hsla(${hue},70%,50%,0.25)`,
              }}
            >
              {coverImage ? (
                <img src={coverImage} alt={artistName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                artistName[0]?.toUpperCase() ?? '?'
              )}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <h1
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 800,
                    fontSize: 15,
                    color: '#fff',
                    margin: 0,
                    letterSpacing: '-0.01em',
                    lineHeight: 1,
                  }}
                >
                  {artistName}
                </h1>
                {isVerified && (
                  <BadgeCheck size={14} style={{ color: `hsl(${hue},80%,70%)`, flexShrink: 0 }} />
                )}
              </div>
              <p
                style={{
                  fontFamily: "'Inter', monospace",
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.35)',
                  margin: '2px 0 0',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Arena
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                          : 'rgba(0, 255, 65, 0.15)',
                    border: `1px solid ${hasError ? 'rgba(239,68,68,0.3)' : isReconnecting ? 'rgba(113,113,122,0.3)' : isConnecting ? 'rgba(245,158,11,0.3)' : 'rgba(0, 255, 65, 0.3)'}`,
                  }}
                >
                  <div
                    className={isConnecting || isReconnecting ? 'animate-pulse' : undefined}
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: hasError ? '#EF4444' : isReconnecting ? '#71717a' : isConnecting ? '#F59E0B' : '#00FF41',
                      boxShadow: hasError
                        ? '0 0 6px rgba(239,68,68,0.8)'
                        : isReconnecting
                          ? '0 0 6px rgba(113,113,122,0.8)'
                          : isConnecting
                            ? '0 0 6px rgba(245,158,11,0.8)'
                            : '0 0 6px rgba(0, 255, 65, 0.8)',
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: hasError ? '#EF4444' : isReconnecting ? '#71717a' : isConnecting ? '#F59E0B' : '#00FF41',
                    }}
                  >
                    {hasError ? 'Disconnected' : isReconnecting ? 'Reconnecting...' : isConnecting ? 'Connecting...' : 'Live'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {walletAddress && !tierLoading && <ChatTierBadge tier={myTier} size="sm" />}

            {recentSenders > 0 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                <div
                  className="animate-pulse"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: '#00FF41',
                    boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
                  }}
                />
                <span>
                  <Users size={10} style={{ display: 'inline', marginRight: 3 }} />
                  {recentSenders}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

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
              background: `hsla(${hue},60%,20%,0.12)`,
              borderBottom: `1px solid hsla(${hue},60%,50%,0.18)`,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div style={{ padding: '6px 16px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <Pin size={12} style={{ color: `hsl(${hue},80%,70%)`, flexShrink: 0, marginTop: 3 }} />
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
                    <span style={{ color: `hsl(${hue},80%,70%)`, fontWeight: 600 }}>
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
            style={{ position: 'relative', zIndex: 9, overflow: 'hidden', flexShrink: 0 }}
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
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
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

      {/* Messages */}
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
          scrollbarColor: `hsla(${hue},60%,50%,0.3) transparent`,
        }}
      >
        {/* Empty state */}
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
              minHeight: '55vh',
              gap: 20,
              fontFamily: "'Inter', sans-serif",
              textAlign: 'center',
              padding: '0 24px',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: `linear-gradient(135deg, hsla(${hue},70%,30%,0.22), hsla(${(hue + 60) % 360},80%,20%,0.15))`,
                border: `1.5px solid hsla(${hue},60%,50%,0.35)`,
                boxShadow: `0 0 32px hsla(${hue},70%,50%,0.18)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MessageCircle size={30} style={{ color: `hsl(${hue},80%,70%)` }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: '-0.01em' }}>
                Be the first to say GM in {artistName}'s Arena 👋
              </p>
              <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                The Arena is quiet — wake it up.
              </p>
            </div>

            {canPost && (
              <motion.button
                onClick={handleGmClick}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '12px 36px',
                  background: `linear-gradient(135deg, hsl(${hue},70%,40%), hsl(${(hue + 60) % 360},80%,35%))`,
                  border: 'none',
                  borderRadius: 14,
                  color: '#fff',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  boxShadow: `0 0 24px hsla(${hue},70%,50%,0.45), 0 4px 16px rgba(0,0,0,0.3)`,
                }}
              >
                GM
              </motion.button>
            )}
          </motion.div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            reactions={getReactionsForMessage(msg.id)}
            tier={tierMap.get(msg.walletAddress) ?? 'none'}
            gmStreak={isGmMessage(msg.content) ? (gmStreakMap.get(msg.walletAddress) ?? undefined) : undefined}
            currentWallet={walletAddress}
            canReact={canReact}
            isOwn={walletAddress === msg.walletAddress}
            profileImageUrl={profileImageMap.get(msg.walletAddress)}
            mentionUserMap={mentionUserMap}
            currentUserWallet={walletAddress ?? undefined}
          />
        ))}
      </div>

      {/* Scroll FAB */}
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
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: `linear-gradient(135deg, hsl(${hue},70%,40%), hsl(${(hue + 60) % 360},80%,35%))`,
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 20px hsla(${hue},70%,50%,0.45)`,
            }}
          >
            <ChevronDown size={18} color="#fff" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Read-only gate — no token holdings */}
      {isAuthenticated && !tierLoading && myTier === 'none' ? (
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            padding: '12px 16px',
            background: 'rgba(6,10,6,0.7)',
            backdropFilter: 'blur(20px)',
            borderTop: `1px solid hsla(${hue},60%,50%,0.18)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={14} style={{ color: `hsl(${hue},70%,60%)`, flexShrink: 0 }} />
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.55)', margin: 0 }}>
              Own any song by {artistName} to join the Arena
            </p>
          </div>
          <Link
            to="/discover"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              color: `hsl(${hue},80%,70%)`,
              textDecoration: 'none',
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 8,
              background: `hsla(${hue},70%,30%,0.2)`,
              border: `1px solid hsla(${hue},60%,50%,0.25)`,
            }}
          >
            Browse Songs →
          </Link>
        </div>
      ) : (
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
          {!isOnline && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(6,10,6,0.55)',
                backdropFilter: 'blur(2px)',
                cursor: 'not-allowed',
                zIndex: 5,
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default ArenaChat;
