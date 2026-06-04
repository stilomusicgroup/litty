import React from 'react';
import type { ChatTier } from '@/utils/chatUtils';
import { TIER_INFO } from '@/utils/chatUtils';

interface ChatTierBadgeProps {
  tier: ChatTier;
  size?: 'xs' | 'sm';
}

export function ChatTierBadge({ tier, size = 'sm' }: ChatTierBadgeProps) {
  const info = TIER_INFO[tier];
  if (tier === 'none') return null;

  const isXs = size === 'xs';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: isXs ? '1px 5px' : '2px 7px',
        borderRadius: '20px',
        background: info.bg,
        border: `1px solid ${info.border}`,
        color: info.color,
        fontSize: isXs ? '9px' : '10px',
        fontWeight: 700,
        fontFamily: "'Inter', monospace",
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        boxShadow: `0 0 8px ${info.glow}`,
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontSize: isXs ? '9px' : '11px' }}>{info.emoji}</span>
      <span>{info.label}</span>
    </span>
  );
}

export default ChatTierBadge;
