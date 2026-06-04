import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { MessageSquare, Lock, Send, Trash2, Pin } from 'lucide-react';

import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { useRealtimeData } from '@/hooks/use-realtime-data';

import {
  subscribeManyComments,
  setComments,
  deleteComments,
  type CommentsResponse,
} from '@/lib/collections/comments';

import { Time, Address } from '@/lib/db-client';

import {
  containsProfanity,
  shortAddress,
  getAvatarInitials,
  getAddressHue,
  formatRelativeTime,
} from '@/utils/chatUtils';

// ── Types ──────────────────────────────────────────────────────────────────

interface CommentWallProps {
  artistAddress: string;
  artistName: string;
  canPost: boolean;
}

const MAX_CHARS = 280;

// ── Component ──────────────────────────────────────────────────────────────

export function CommentWall({ artistAddress, artistName, canPost }: CommentWallProps) {
  const { walletAddress, isAuthenticated, displayName } = usePrivyAuth();
  const isLoggedIn = !!walletAddress && isAuthenticated;

  // Subscribe to comments for this artist, newest first
  const { data: commentsRaw, loading: commentsLoading } = useRealtimeData<CommentsResponse[]>(
    subscribeManyComments,
    !!artistAddress,
    `where artistAddress = '${artistAddress}' order by createdAt desc limit 30`
  );

  // Profile image cache
  const [profileImageMap, setProfileImageMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!commentsRaw?.length) return;
    const wallets = [...new Set(commentsRaw.map((c) => c.walletAddress))];
    // Fetch user profiles once (not per-wallet) to avoid N+1 full-table scans
    const missingWallets = wallets.filter((addr) => !profileImageMap.has(addr));
    if (missingWallets.length > 0) {
      import('@/lib/collections/users').then(({ getManyUsers }) => {
        getManyUsers('limit 200').then((users) => {
          setProfileImageMap((prev) => {
            const newMap = new Map(prev);
            users.forEach((u) => {
              if (u.profileImage) newMap.set(u.walletAddress, u.profileImage);
            });
            return newMap;
          });
        });
      }).catch(() => {});
    }
  }, [commentsRaw]);

  // Separate pinned (at top) from regular, both newest-first
  const { pinned, regular } = useMemo(() => {
    const all = commentsRaw ?? [];
    return {
      pinned: all.filter((c) => c.isPinned),
      regular: all.filter((c) => !c.isPinned),
    };
  }, [commentsRaw]);

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const sentTimestamps = useRef<number[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const overLimit = charCount > MAX_CHARS;
  const nearLimit = charCount >= 250;
  const canSend = canPost && charCount > 0 && !overLimit && !isSending && isLoggedIn;

  // ── Send comment ──────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!walletAddress || !inputValue.trim() || isSending) return;
    if (!canPost) {
      toast.error(`Hold 1,000,000+ tokens from ${artistName}'s songs to comment`);
      return;
    }

    const content = inputValue.trim();
    if (containsProfanity(content)) {
      toast.error('Comment violates community guidelines');
      return;
    }

    // Rate limiting
    const now = Date.now();
    sentTimestamps.current = sentTimestamps.current.filter((t) => now - t < 60000);
    if (sentTimestamps.current.length >= 10) {
      toast.error('Slow down! Max 10 comments per minute');
      return;
    }

    setIsSending(true);
    setInputValue('');
    setCharCount(0);

    try {
      const commentId = `${walletAddress}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const success = await setComments(commentId, {
        walletAddress: Address.publicKey(walletAddress),
        displayName: displayName ?? undefined,
        content,
        artistAddress: Address.publicKey(artistAddress),
        createdAt: Time.Now,
        isPinned: false,
      });

      if (!success) {
        toast.error('Failed to post comment');
        setInputValue(content);
        setCharCount(content.length);
        return;
      }

      sentTimestamps.current.push(now);
      toast.success('Comment posted!');
    } catch {
      toast.error('Failed to post comment');
      setInputValue(content);
      setCharCount(content.length);
    } finally {
      setIsSending(false);
    }
  }, [walletAddress, inputValue, isSending, canPost, artistName, artistAddress, displayName]);

  // ── Delete own comment ────────────────────────────────────────────────
  const handleDelete = useCallback(async (commentId: string) => {
    const success = await deleteComments(commentId);
    if (success) {
      toast.success('Comment deleted');
    } else {
      toast.error('Failed to delete comment');
    }
  }, []);

  // ── Input handlers ────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setCharCount(val.length);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [inputValue]);

  // ── Neon theme colors ─────────────────────────────────────────────────
  const NEON_GREEN = '#00FF41';
  const PRIMARY_GREEN = '#00FF41';
  const GREEN_BORDER = 'rgba(0, 255, 65, 0.12)';
  const CARD_BG = 'hsl(120,11%,4%)';

  // ── Render a single comment ──────────────────────────────────────────
  const renderComment = (comment: CommentsResponse, index: number) => {
    const hue = getAddressHue(comment.walletAddress);
    const senderName = comment.displayName || shortAddress(comment.walletAddress);
    const initials = getAvatarInitials(comment.walletAddress);
    const profileImg = profileImageMap.get(comment.walletAddress);
    const isOwn = walletAddress === comment.walletAddress;

    return (
      <motion.div
        key={comment.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.2, delay: comment.isPinned ? index * 0.03 : index * 0.02 }}
        className={`flex gap-2.5 px-3 py-2 rounded-xl transition-colors duration-150 group ${isOwn ? 'flex-row-reverse' : ''}`}
        style={{ background: isOwn ? 'rgba(0, 255, 65, 0.06)' : 'transparent' }}
      >
        {/* Avatar */}
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden"
          style={{
            background: profileImg ? undefined : `hsla(${hue}, 60%, 20%, 0.8)`,
            border: `1.5px solid ${profileImg ? 'rgba(255,255,255,0.15)' : `hsla(${hue}, 60%, 45%, 0.4)`}`,
            color: profileImg ? undefined : `hsl(${hue}, 70%, 75%)`,
            fontFamily: "'Inter', monospace",
          }}
        >
          {profileImg ? (
            <img
              src={profileImg}
              alt={senderName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                const parent = (e.target as HTMLImageElement).parentElement;
                if (parent) parent.textContent = initials;
              }}
            />
          ) : (
            initials
          )}
        </div>

        {/* Content */}
        <div className={`flex flex-col max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
          {/* Header: name + pinned + time */}
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span
              className="text-xs font-semibold"
              style={{
                color: `hsl(${hue}, 70%, 75%)`,
                fontFamily: "'Inter', monospace",
              }}
            >
              {senderName}
            </span>
            {comment.isPinned && (
              <span style={{ color: PRIMARY_GREEN, fontSize: 10 }}>
                <Pin size={10} style={{ display: 'inline', marginRight: 2 }} />
                pinned
              </span>
            )}
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          {/* Bubble */}
          <div
            className="relative px-3 py-2 text-sm leading-relaxed"
            style={{
              background: isOwn ? 'rgba(147,51,234,0.18)' : 'rgba(255,255,255,0.05)',
              border: isOwn ? '1px solid rgba(147,51,234,0.3)' : '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.88)',
              fontFamily: "'Inter', sans-serif",
              borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
              wordBreak: 'break-word',
            }}
          >
            {comment.content}

            {/* Delete button (own comments, shown on hover) */}
            {isOwn && (
              <button
                onClick={() => handleDelete(comment.id)}
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.4)',
                  color: '#EF4444',
                }}
                title="Delete comment"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // ── Input bar ─────────────────────────────────────────────────────────
  const renderInputBar = () => {
    // Not authenticated
    if (!isLoggedIn) {
      return (
        <div
          style={{
            padding: '12px 16px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            background: 'rgba(147,51,234,0.08)',
            borderTop: `1px solid ${GREEN_BORDER}`,
            backdropFilter: 'blur(20px)',
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
            Connect wallet to comment
          </p>
        </div>
      );
    }

    // Token gated
    if (!canPost) {
      return (
        <div
          style={{
            padding: '12px 16px',
            paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
            background: 'rgba(147,51,234,0.08)',
            borderTop: `1px solid ${GREEN_BORDER}`,
            backdropFilter: 'blur(20px)',
            textAlign: 'center',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div className="flex items-center justify-center gap-2">
            <Lock size={12} style={{ color: `${PRIMARY_GREEN}80` }} />
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
              Hold 1,000,000+ tokens to join the conversation
            </p>
          </div>
        </div>
      );
    }

    // Active input
    return (
      <div
        style={{
          padding: '10px 12px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          background: `${CARD_BG}`,
          borderTop: `1px solid rgba(147,51,234,0.18)`,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${GREEN_BORDER}`,
            borderRadius: 14,
            padding: '6px 8px 6px 14px',
            transition: 'border-color 0.2s',
          }}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={`Comment on ${artistName}'s wall...`}
            rows={1}
            inputMode="text"
            autoComplete="on"
            autoCorrect="on"
            spellCheck={true}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              resize: 'none',
              color: 'rgba(255,255,255,0.9)',
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              lineHeight: 1.5,
              minHeight: 40,
              paddingTop: 4,
              paddingBottom: 4,
              maxHeight: 100,
              overflowY: 'auto',
            }}
          />

          {/* Char counter + send */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingBottom: 2 }}>
            <span
              style={{
                fontSize: 10,
                fontFamily: "'Inter', monospace",
                color: overLimit ? '#EF4444' : nearLimit ? '#F59E0B' : 'rgba(255,255,255,0.25)',
                minWidth: 44,
                textAlign: 'right',
              }}
            >
              {charCount}/{MAX_CHARS}
            </span>

            <motion.button
              onClick={handleSend}
              disabled={!canSend}
              whileHover={canSend ? { scale: 1.08 } : {}}
              whileTap={canSend ? { scale: 0.94 } : {}}
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: canSend
                  ? `linear-gradient(135deg, ${NEON_GREEN}40, ${NEON_GREEN}25)`
                  : 'rgba(255,255,255,0.06)',
                border: canSend ? `1px solid ${NEON_GREEN}60` : '1px solid rgba(255,255,255,0.06)',
                cursor: canSend ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: canSend ? `0 0 12px ${NEON_GREEN}30` : 'none',
                transition: 'background 0.2s, box-shadow 0.2s',
                flexShrink: 0,
              }}
            >
              <Send size={14} style={{ color: canSend ? NEON_GREEN : 'rgba(255,255,255,0.2)' }} />
            </motion.button>
          </div>
        </div>
      </div>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, type: 'spring', stiffness: 300, damping: 20 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(30,20,60,0.85), rgba(15,10,30,0.9))',
        border: `1px solid ${GREEN_BORDER}`,
        boxShadow: `0 0 40px rgba(139,92,246,0.06)`,
      }}
    >
      {/* Header */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ borderBottom: `1px solid rgba(139,92,246,0.12)` }}
      >
        <div className="flex items-center gap-2">
          <MessageSquare size={16} style={{ color: PRIMARY_GREEN }} />
          <h3
            className="text-sm font-bold"
            style={{
              fontFamily: "'Archivo Black', monospace",
              color: '#fff',
              letterSpacing: '0.04em',
            }}
          >
            Comment Wall
          </h3>
        </div>
        {isLoggedIn && (
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: canPost ? `${NEON_GREEN}15` : 'rgba(255,255,255,0.05)',
              color: canPost ? NEON_GREEN : 'rgba(255,255,255,0.35)',
              border: `1px solid ${canPost ? `${NEON_GREEN}30` : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {canPost ? 'Can comment' : 'Insufficient tokens'}
          </span>
        )}
      </div>

      {/* Comments area */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: '400px', minHeight: '180px' }}
      >
        {/* Loading state */}
        {commentsLoading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
              Loading comments...
            </div>
          </div>
        )}

        {/* Empty state */}
        {!commentsLoading && pinned.length === 0 && regular.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(139,92,246,0.08)',
                border: `1px solid ${GREEN_BORDER}`,
              }}
            >
              <MessageSquare size={22} style={{ color: `${PRIMARY_GREEN}60` }} />
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
              No comments yet — be the first!
            </p>
          </div>
        )}

        {/* Pinned comments */}
        <AnimatePresence>
          {pinned.length > 0 && (
            <div className="px-3 pt-3 pb-1 space-y-2">
              {pinned.map((comment, i) => renderComment(comment, i))}
              {regular.length > 0 && (
                <div className="flex items-center gap-2 pt-2 pb-1">
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', monospace" }}>
                    Recent
                  </span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

        {/* Regular comments */}
        <div className={`px-3 space-y-2 ${pinned.length === 0 ? 'py-2' : 'pb-2'}`}>
          <AnimatePresence initial={false}>
            {regular.map((comment, i) => renderComment(comment, pinned.length > 0 ? pinned.length + i : i))}
          </AnimatePresence>
        </div>
      </div>

      {/* Input bar */}
      {renderInputBar()}
    </motion.div>
  );
}

export default CommentWall;
