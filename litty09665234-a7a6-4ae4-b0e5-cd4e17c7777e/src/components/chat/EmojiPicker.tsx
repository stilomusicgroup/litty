import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmojiCategory {
  name: string;
  emojis: string[];
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: 'Smileys',
    emojis: ['😀', '😂', '😍', '😎', '🥹', '😏', '🤩', '🥳', '😈', '💀', '🤡', '👻'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '🔥', '💯', '✨', '👋', '🤝', '🙌', '👏', '🤙', '✌️', '🫡'],
  },
  {
    name: 'Hearts',
    emojis: ['❤️', '💜', '💚', '💙', '🖤', '🤍', '💖', '💝', '💗', '💕', '💞', '💘'],
  },
  {
    name: 'Music',
    emojis: ['🎵', '🎶', '🎸', '🎤', '🎧', '🎹', '🥁', '🎷', '🪗', '🎺', '📻', '🎙️'],
  },
  {
    name: 'Party',
    emojis: ['🎉', '🎊', '🥂', '🍾', '🎁', '🏆', '💎', '🎰', '🎲', '🃏', '♠️', '💰'],
  },
  {
    name: 'Symbols',
    emojis: ['⭐', '🌟', '💫', '⚡', '🚀', '🎯', '💥', '🌈', '☀️', '🌙', '🔮', '🎪'],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay adding listener so the click that opens the picker doesn't immediately close it
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const timer = setTimeout(() => document.addEventListener('keydown', handleKey), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.96 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          bottom: 70,
          right: 12,
          background: 'hsl(260, 40%, 6%)',
          border: '1px solid rgba(147, 51, 234, 0.35)',
          borderRadius: 16,
          padding: '12px 14px',
          width: 320,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 120px)',
          overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 16px rgba(147,51,234,0.15)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          zIndex: 9999,
          fontFamily: "'Inter', sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {EMOJI_CATEGORIES.map((category) => (
          <div key={category.name} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 10,
                fontFamily: "'Inter', monospace",
                color: 'rgba(147, 51, 234, 0.8)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 6,
                paddingLeft: 2,
              }}
            >
              {category.name}
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: 2,
              }}
            >
              {category.emojis.map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.3, y: -2 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.12 }}
                  onClick={() => onEmojiSelect(emoji)}
                  style={{
                    width: 38,
                    height: 38,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 20,
                    transition: 'border-color 0.15s, background 0.15s',
                    padding: 0,
                    margin: 'auto',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background =
                      'rgba(147, 51, 234, 0.12)';
                    (e.currentTarget as HTMLButtonElement).style.borderColor =
                      'rgba(147, 51, 234, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
                  }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
          </div>
        ))}

        {/* Decorative bottom bar */}
        <div
          style={{
            height: 2,
            borderRadius: 1,
            background:
              'linear-gradient(90deg, transparent, hsl(276,100%,50%), hsl(190,100%,50%), hsl(114,100%,54%), transparent)',
            marginTop: 8,
            opacity: 0.5,
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default EmojiPicker;
