import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { REACTION_EMOJIS, getReactionId } from '@/utils/chatUtils';
import { setChatReactions, deleteChatReactions } from '@/lib/collections/chatReactions';
import { Address, Time } from '@/lib/db-client';
import type { ChatReactionsResponse } from '@/lib/collections/chatReactions';
import { toast } from 'sonner';

interface ChatReactionBarProps {
  messageId: string;
  reactions: ChatReactionsResponse[];
  currentWallet: string | null;
  canReact: boolean;
  visible: boolean;
}

export function ChatReactionBar({
  messageId,
  reactions,
  currentWallet,
  canReact,
  visible,
}: ChatReactionBarProps) {
  const [pendingReactions, setPendingReactions] = useState<Set<string>>(new Set());

  // Aggregate reactions by emoji
  const reactionCounts = REACTION_EMOJIS.map(({ emoji, name }) => {
    const count = reactions.filter((r) => r.emoji === name).length;
    const hasReacted = currentWallet
      ? reactions.some((r) => r.emoji === name && r.walletAddress === currentWallet)
      : false;
    return { emoji, name, count, hasReacted };
  }).filter((r) => r.count > 0 || visible);

  const handleReaction = async (emojiName: string, hasReacted: boolean) => {
    if (!currentWallet) return;
    if (!canReact) {
      toast.error('Buy a song token to react');
      return;
    }
    const reactionId = getReactionId(messageId, currentWallet, emojiName);
    if (pendingReactions.has(reactionId)) return;

    setPendingReactions((prev) => new Set([...prev, reactionId]));
    try {
      if (hasReacted) {
        const success = await deleteChatReactions(reactionId);
        if (!success) toast.error('Could not remove reaction');
      } else {
        const success = await setChatReactions(reactionId, {
          messageId,
          walletAddress: Address.publicKey(currentWallet),
          emoji: emojiName,
          createdAt: Time.Now,
        });
        if (!success) toast.error('Could not add reaction');
      }
    } finally {
      setPendingReactions((prev) => {
        const next = new Set(prev);
        next.delete(reactionId);
        return next;
      });
    }
  };

  const nonVisibleReactions = reactionCounts.filter((r) => r.count > 0);

  if (!visible && nonVisibleReactions.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -4 }}
          transition={{ duration: 0.15 }}
          className="flex gap-1 flex-wrap mt-1"
          onClick={(e) => e.stopPropagation()}
        >
          {REACTION_EMOJIS.map(({ emoji, name }) => {
            const data = reactionCounts.find((r) => r.name === name);
            const count = data?.count ?? 0;
            const hasReacted = data?.hasReacted ?? false;
            const isPending = currentWallet
              ? pendingReactions.has(getReactionId(messageId, currentWallet, name))
              : false;
            return (
              <button
                key={name}
                onClick={() => handleReaction(name, hasReacted)}
                disabled={isPending}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  padding: '2px 7px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  cursor: canReact ? 'pointer' : 'default',
                  background: hasReacted
                    ? 'rgba(147,51,234,0.25)'
                    : 'rgba(255,255,255,0.06)',
                  border: hasReacted
                    ? '1px solid rgba(147,51,234,0.5)'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: hasReacted ? 'hsl(263, 80%, 82%)' : 'rgba(255,255,255,0.6)',
                  transition: 'all 0.15s',
                  opacity: isPending ? 0.5 : 1,
                  lineHeight: '1.4',
                }}
              >
                <span>{emoji}</span>
                {count > 0 && <span style={{ minWidth: '8px' }}>{count}</span>}
              </button>
            );
          })}
        </motion.div>
      )}
      {!visible && nonVisibleReactions.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-1">
          {nonVisibleReactions.map(({ emoji, name, count, hasReacted }) => (
            <button
              key={name}
              onClick={() => handleReaction(name, hasReacted)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '1px 6px',
                borderRadius: '10px',
                fontSize: '11px',
                fontFamily: "'Inter', sans-serif",
                fontWeight: 500,
                cursor: canReact ? 'pointer' : 'default',
                background: hasReacted
                  ? 'rgba(147,51,234,0.2)'
                  : 'rgba(255,255,255,0.05)',
                border: hasReacted
                  ? '1px solid rgba(147,51,234,0.4)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: hasReacted ? 'hsl(263, 80%, 80%)' : 'rgba(255,255,255,0.55)',
              }}
            >
              <span>{emoji}</span>
              <span>{count}</span>
            </button>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

export default ChatReactionBar;
