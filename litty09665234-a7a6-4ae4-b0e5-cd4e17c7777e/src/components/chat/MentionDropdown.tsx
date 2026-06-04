import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { UsersResponse } from '@/lib/collections/users';
import { shortAddress } from '@/utils/chatUtils';

export interface MentionUser {
  walletAddress: string;
  displayName?: string;
}

interface MentionDropdownProps {
  users: MentionUser[];
  query: string;
  selectedIndex: number;
  onSelect: (user: MentionUser) => void;
  visible: boolean;
}

function getAvatarHue(address: string): number {
  if (!address) return 120;
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function MentionDropdown({
  users,
  query,
  selectedIndex,
  onSelect,
  visible,
}: MentionDropdownProps) {
  const filtered = users
    .filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      const name = (u.displayName ?? '').toLowerCase();
      const addr = u.walletAddress.toLowerCase();
      return name.includes(q) || addr.includes(q);
    })
    .slice(0, 6);

  return (
    <AnimatePresence>
      {visible && filtered.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.97 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            left: 0,
            right: 0,
            zIndex: 200,
            background: 'rgba(6,10,6,0.97)',
            border: '1px solid rgba(0, 255, 65, 0.3)',
            borderRadius: 12,
            boxShadow: '0 -4px 24px rgba(0,0,0,0.5), 0 0 16px rgba(0, 255, 65, 0.12)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '6px 12px 4px',
              borderBottom: '1px solid rgba(0, 255, 65, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', monospace",
                fontSize: 9,
                color: 'rgba(0, 255, 65, 0.5)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              Mention
            </span>
            {query && (
              <span
                style={{
                  fontFamily: "'Inter', monospace",
                  fontSize: 9,
                  color: 'rgba(0, 255, 65, 0.8)',
                  letterSpacing: '0.06em',
                  background: 'rgba(0, 255, 65, 0.08)',
                  padding: '1px 6px',
                  borderRadius: 4,
                }}
              >
                @{query}
              </span>
            )}
          </div>

          {/* User list */}
          <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(0, 255, 65, 0.2) transparent' }}>
            {filtered.map((user, idx) => {
              const isSelected = idx === selectedIndex;
              const hue = getAvatarHue(user.walletAddress);
              const displayLabel = user.displayName || shortAddress(user.walletAddress);
              return (
                <motion.button
                  key={user.walletAddress}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent textarea blur
                    onSelect(user);
                  }}
                  animate={isSelected ? { background: 'rgba(0, 255, 65, 0.1)' } : { background: 'transparent' }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    border: 'none',
                    cursor: 'pointer',
                    borderLeft: isSelected
                      ? '2px solid rgba(0, 255, 65, 0.8)'
                      : '2px solid transparent',
                    transition: 'background 0.12s, border-color 0.12s',
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: `hsla(${hue}, 50%, 18%, 0.9)`,
                      border: `1.5px solid hsla(${hue}, 60%, 45%, 0.45)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: `hsl(${hue}, 70%, 75%)`,
                      fontSize: 10,
                      fontWeight: 700,
                      fontFamily: "'Inter', monospace",
                      flexShrink: 0,
                    }}
                  >
                    {user.walletAddress.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name + address */}
                  <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 13,
                        fontWeight: 600,
                        color: isSelected ? '#00FF41' : 'rgba(255,255,255,0.85)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textShadow: isSelected ? '0 0 6px rgba(0, 255, 65, 0.4)' : 'none',
                        transition: 'color 0.12s',
                      }}
                    >
                      {displayLabel}
                    </div>
                    {user.displayName && (
                      <div
                        style={{
                          fontFamily: "'Inter', monospace",
                          fontSize: 9,
                          color: 'rgba(255,255,255,0.3)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {shortAddress(user.walletAddress)}
                      </div>
                    )}
                  </div>

                  {/* Selection indicator */}
                  {isSelected && (
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#00FF41',
                        boxShadow: '0 0 6px rgba(0, 255, 65, 0.9)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div
            style={{
              padding: '4px 12px 6px',
              borderTop: '1px solid rgba(0, 255, 65, 0.08)',
              display: 'flex',
              gap: 10,
            }}
          >
            <span style={{ fontFamily: "'Inter', monospace", fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
              ↑↓ navigate · ↵ select · esc cancel
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MentionDropdown;
