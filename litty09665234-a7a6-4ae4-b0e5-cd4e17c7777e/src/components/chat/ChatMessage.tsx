import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  shortAddress,
  getAvatarInitials,
  getAddressHue,
  formatRelativeTime,
  isGmMessage,
  TIER_INFO,
  type ChatTier,
} from '@/utils/chatUtils';
import { ChatTierBadge } from './ChatTierBadge';
import { ChatReactionBar } from './ChatReactionBar';
import type { ChatMessagesResponse } from '@/lib/collections/chatMessages';
import type { ChatReactionsResponse } from '@/lib/collections/chatReactions';
import { Pin } from 'lucide-react';

interface ChatMessageProps {
  message: ChatMessagesResponse;
  reactions: ChatReactionsResponse[];
  tier: ChatTier;
  gmStreak?: number;
  currentWallet: string | null;
  canReact: boolean;
  isOwn: boolean;
  compact?: boolean;
  profileImageUrl?: string;
  /** Map from display name -> wallet address for highlight lookups */
  mentionUserMap?: Map<string, string>;
  currentUserWallet?: string;
}

/**
 * Parse message content and render @mentions as highlighted spans.
 * Mentions are @word tokens — we highlight them in neon green.
 */
function renderMessageContent(
  content: string,
  currentUserWallet: string | null | undefined,
  mentionUserMap: Map<string, string> | undefined,
): React.ReactNode {
  // Split on @word boundaries (words with letters, digits, dots, underscores, hyphens)
  const parts = content.split(/(@[\w.\-]+)/g);
  if (parts.length <= 1) return content;

  return (
    <>
      {parts.map((part, i) => {
        if (!part.startsWith('@')) return part;

        const handle = part.slice(1); // strip @
        // Check if it resolves to the current user (highlight differently)
        const resolvedAddress = mentionUserMap?.get(handle);
        const isSelf = resolvedAddress && currentUserWallet && resolvedAddress === currentUserWallet;

        return (
          <span
            key={i}
            style={{
              color: isSelf ? '#BF00FF' : '#00FF41',
              fontWeight: 700,
              fontFamily: "'Inter', monospace",
              fontSize: '0.9em',
              background: isSelf
                ? 'rgba(191,0,255,0.1)'
                : 'rgba(0, 255, 65, 0.08)',
              borderRadius: 4,
              padding: '0 3px',
              textShadow: isSelf
                ? '0 0 6px rgba(191,0,255,0.6)'
                : '0 0 6px rgba(0, 255, 65, 0.5)',
              cursor: resolvedAddress ? 'pointer' : 'default',
              display: 'inline',
            }}
            onClick={() => {
              if (resolvedAddress) {
                window.location.href = `/profile/${resolvedAddress}`;
              }
            }}
          >
            {part}
          </span>
        );
      })}
    </>
  );
}

export function ChatMessage({
  message,
  reactions,
  tier,
  gmStreak,
  currentWallet,
  canReact,
  isOwn,
  compact = false,
  profileImageUrl,
  mentionUserMap,
  currentUserWallet,
}: ChatMessageProps) {
  const [hovered, setHovered] = useState(false);

  const hue = getAddressHue(message.walletAddress);
  const tierInfo = TIER_INFO[tier];
  const isGm = isGmMessage(message.content);
  const displayName = message.displayName || shortAddress(message.walletAddress);
  const initials = getAvatarInitials(message.walletAddress);

  const avatarBg = tier !== 'none'
    ? tierInfo.bg
    : `hsla(${hue}, 60%, 20%, 0.8)`;
  const avatarBorder = tier !== 'none'
    ? tierInfo.border
    : `hsla(${hue}, 60%, 45%, 0.4)`;
  const avatarColor = tier !== 'none'
    ? tierInfo.color
    : `hsl(${hue}, 70%, 75%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group flex gap-2.5 px-3 py-2 rounded-xl transition-colors duration-150 ${
        isOwn ? 'flex-row-reverse' : ''
      }`}
      style={{
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
    >
      {/* Avatar */}
      <div
        className="flex-shrink-0"
        style={{
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          borderRadius: '50%',
          background: profileImageUrl ? undefined : avatarBg,
          border: `1.5px solid ${profileImageUrl ? 'rgba(255,255,255,0.15)' : avatarBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: avatarColor,
          fontSize: compact ? 10 : 12,
          fontWeight: 700,
          fontFamily: "'Inter', monospace",
          boxShadow: tier !== 'none' ? `0 0 8px ${tierInfo.glow}` : 'none',
          flexShrink: 0,
          alignSelf: 'flex-start',
          marginTop: 2,
          overflow: 'hidden',
        }}
      >
        {profileImageUrl ? (
          <img
            src={profileImageUrl}
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          initials
        )}
      </div>

      {/* Message content */}
      <div className={`flex flex-col gap-0.5 max-w-[78%] ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Header row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            style={{
              fontSize: compact ? 11 : 12,
              fontWeight: 600,
              color: avatarColor,
              fontFamily: "'Inter', monospace",
              letterSpacing: '0.01em',
            }}
          >
            {displayName}
          </span>
          <ChatTierBadge tier={tier} size="xs" />
          {message.isPinned && (
            <span style={{ color: 'hsl(263,80%,70%)', fontSize: 10 }}>
              <Pin size={10} style={{ display: 'inline', marginRight: 2 }} />
              pinned
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.28)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {formatRelativeTime(message.createdAt)}
          </span>
        </div>

        {/* Message bubble */}
        <div
          style={{
            padding: compact ? '5px 10px' : '7px 12px',
            borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
            background: isOwn
              ? 'rgba(0, 255, 65, 0.08)'
              : 'rgba(255,255,255,0.05)',
            border: isOwn
              ? '1px solid rgba(0, 255, 65, 0.25)'
              : '1px solid rgba(255,255,255,0.08)',
            boxShadow: isOwn
              ? '0 2px 12px rgba(0, 255, 65, 0.1)'
              : 'none',
            backdropFilter: 'blur(8px)',
            maxWidth: '100%',
          }}
        >
          <p
            style={{
              fontSize: compact ? 13 : 14,
              color: 'rgba(255,255,255,0.88)',
              fontFamily: "'Inter', sans-serif",
              fontWeight: 400,
              lineHeight: 1.5,
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {isGm ? (
              <span>
                {message.content}
                {gmStreak && gmStreak > 0 ? (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      fontFamily: "'Inter', monospace",
                      color: '#FF6B35',
                    }}
                  >
                    🔥 {gmStreak}
                  </span>
                ) : null}
              </span>
            ) : (
              renderMessageContent(message.content, currentUserWallet ?? currentWallet, mentionUserMap)
            )}
          </p>
        </div>

        {/* Reactions */}
        <ChatReactionBar
          messageId={message.id}
          reactions={reactions}
          currentWallet={currentWallet}
          canReact={canReact}
          visible={hovered}
        />
      </div>
    </motion.div>
  );
}

export default ChatMessage;
