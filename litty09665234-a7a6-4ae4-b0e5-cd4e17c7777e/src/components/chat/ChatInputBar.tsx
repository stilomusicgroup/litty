import React, { useRef, useEffect, useState } from 'react';
import { Send, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { EmojiPicker } from './EmojiPicker';
import { MentionDropdown, type MentionUser } from './MentionDropdown';

interface ChatInputBarProps {
  value: string;
  onChange: (val: string) => void;
  onSend: () => void;
  canPost: boolean;
  isAuthenticated: boolean;
  isSending: boolean;
  isConnected?: boolean;
  mentionUsers?: MentionUser[];
}

const MAX_CHARS = 280;

// Detect an active @mention at the cursor position
function detectMentionQuery(text: string, cursorPos: number): { query: string; start: number } | null {
  const before = text.slice(0, cursorPos);
  const match = before.match(/(?:^|[\s,])@([^\s@]*)$/);
  if (!match) return null;
  const query = match[1];
  const atIndex = before.lastIndexOf('@');
  return { query, start: atIndex };
}

// ─── Content moderation helpers ────────────────────────────────────────────

const BANNED_WORDS = [
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'spic', 'chink', 'gook',
  'retard', 'cunt', 'twat', 'bitch', 'whore', 'slut',
  'tranny', 'dyke', 'wetback', 'cracker', 'spook',
];

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lower);
  });
}

function isAllCaps(text: string): boolean {
  if (text.length <= 10) return false;
  const letters = text.replace(/[^a-zA-Z]/g, '');
  if (letters.length === 0) return false;
  const upperCount = letters.replace(/[^A-Z]/g, '').length;
  return upperCount / letters.length > 0.7;
}

function hasRepeatedChars(text: string): boolean {
  return /(.)(\1{4,})/.test(text);
}

function validateMessage(text: string): { valid: boolean; error?: string } {
  const trimmed = text.trim();
  if (!trimmed) {
    return { valid: false, error: 'Message cannot be empty' };
  }
  if (containsProfanity(trimmed)) {
    return { valid: false, error: 'Message contains inappropriate content' };
  }
  if (isAllCaps(trimmed)) {
    return { valid: false, error: 'Message cannot be mostly uppercase' };
  }
  if (hasRepeatedChars(trimmed)) {
    return { valid: false, error: 'Message contains excessive repeated characters' };
  }
  return { valid: true };
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  canPost,
  isAuthenticated,
  isSending,
  isConnected = true,
  mentionUsers = [],
}: ChatInputBarProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const charCount = value.length;
  const overLimit = charCount > MAX_CHARS;
  const nearLimit = charCount >= 250;
  const canSend = canPost && charCount > 0 && !overLimit && !isSending && isConnected;

  function handleSend() {
    if (!canSend) return;
    const result = validateMessage(value);
    if (!result.valid) {
      toast.error(result.error!);
      return;
    }
    onSend();
  }

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Mention state
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const [mentionSelectedIdx, setMentionSelectedIdx] = useState(0);
  const showMentionDropdown = mentionQuery !== null && mentionUsers.length > 0;

  // Filtered users for the current query
  const filteredMentionUsers = mentionUsers
    .filter((u) => {
      if (!mentionQuery) return true;
      const q = mentionQuery.toLowerCase();
      const name = (u.displayName ?? '').toLowerCase();
      const addr = u.walletAddress.toLowerCase();
      return name.includes(q) || addr.includes(q);
    })
    .slice(0, 6);

  function insertEmoji(emoji: string) {
    const ta = inputRef.current;
    if (!ta) {
      onChange(value + emoji);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newValue = value.substring(0, start) + emoji + value.substring(end);
    onChange(newValue);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + emoji.length;
      ta.focus();
    });
    setShowEmojiPicker(false);
  }

  function handleMentionSelect(user: MentionUser) {
    const ta = inputRef.current;
    const cursorPos = ta?.selectionStart ?? value.length;
    const label = user.displayName || user.walletAddress.slice(0, 8);

    const before = value.slice(0, mentionStart);
    const after = value.slice(cursorPos);
    const replacement = `@${label} `;
    const newValue = before + replacement + after;
    onChange(newValue);

    setMentionQuery(null);
    setMentionStart(-1);
    setMentionSelectedIdx(0);

    requestAnimationFrame(() => {
      if (!ta) return;
      const pos = before.length + replacement.length;
      ta.selectionStart = ta.selectionEnd = pos;
      ta.focus();
    });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newVal = e.target.value;
    onChange(newVal);

    const cursorPos = e.target.selectionStart ?? newVal.length;
    const detected = detectMentionQuery(newVal, cursorPos);
    if (detected) {
      setMentionQuery(detected.query);
      setMentionStart(detected.start);
      setMentionSelectedIdx(0);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showMentionDropdown && filteredMentionUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionSelectedIdx((prev) => (prev + 1) % filteredMentionUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionSelectedIdx((prev) => (prev - 1 + filteredMentionUsers.length) % filteredMentionUsers.length);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (filteredMentionUsers[mentionSelectedIdx]) {
          handleMentionSelect(filteredMentionUsers[mentionSelectedIdx]);
        }
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionQuery(null);
        setMentionStart(-1);
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        if (filteredMentionUsers[mentionSelectedIdx]) {
          handleMentionSelect(filteredMentionUsers[mentionSelectedIdx]);
        }
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) handleSend();
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const ta = inputRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 100)}px`;
  }, [value]);

  if (!isAuthenticated) {
    return (
      <div
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          background: 'rgba(6,10,6,0.92)',
          borderTop: '1px solid rgba(0, 255, 65, 0.12)',
          backdropFilter: 'blur(20px)',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
          Connect your wallet to join the conversation
        </p>
      </div>
    );
  }

  if (!canPost) {
    return (
      <div
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          background: 'rgba(6,10,6,0.92)',
          borderTop: '1px solid rgba(0, 255, 65, 0.12)',
          backdropFilter: 'blur(20px)',
          textAlign: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
          You need permission to post in this chat
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '10px 12px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        background: 'rgba(6,10,6,0.92)',
        borderTop: '1px solid rgba(0, 255, 65, 0.12)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        position: 'relative',
      }}
    >
      {/* Mention dropdown — rendered above the input */}
      <MentionDropdown
        users={mentionUsers}
        query={mentionQuery ?? ''}
        selectedIndex={mentionSelectedIdx}
        onSelect={handleMentionSelect}
        visible={showMentionDropdown}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 8,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${showMentionDropdown ? 'rgba(0, 255, 65, 0.4)' : 'rgba(0, 255, 65, 0.2)'}`,
          borderRadius: 14,
          padding: '6px 8px 6px 14px',
          transition: 'border-color 0.2s',
        }}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <textarea
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isConnected ? "Say something... (@ to mention)" : "Reconnecting..."}
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

        {/* Char counter + emoji + send */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingBottom: 2, position: 'relative' }}>
          <span
            style={{
              fontSize: 10,
              fontFamily: "'Inter', monospace",
              color: overLimit
                ? '#EF4444'
                : nearLimit
                ? '#F59E0B'
                : 'rgba(255,255,255,0.25)',
              minWidth: 44,
              textAlign: 'right',
            }}
          >
            {charCount}/{MAX_CHARS}
          </span>

          {/* Emoji picker trigger */}
          <motion.button
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: showEmojiPicker
                ? 'rgba(0, 255, 65, 0.12)'
                : 'rgba(255,255,255,0.06)',
              border: showEmojiPicker
                ? '1px solid rgba(0, 255, 65, 0.5)'
                : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, border-color 0.2s',
              flexShrink: 0,
              padding: 0,
            }}
          >
            <Smile
              size={16}
              style={{
                color: showEmojiPicker
                  ? '#00FF41'
                  : 'rgba(255,255,255,0.35)',
                transition: 'color 0.2s',
              }}
            />
          </motion.button>

          {/* Send button */}
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
                ? 'rgba(0, 255, 65, 0.12)'
                : 'rgba(255,255,255,0.06)',
              border: canSend
                ? '1.5px solid rgba(0, 255, 65, 0.6)'
                : '1.5px solid transparent',
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: canSend
                ? '0 0 12px rgba(0, 255, 65, 0.4)'
                : 'none',
              transition: 'background 0.2s, box-shadow 0.2s',
              flexShrink: 0,
            }}
          >
            <Send
              size={14}
              style={{ color: canSend ? '#00FF41' : 'rgba(255,255,255,0.2)', filter: canSend ? 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.8))' : 'none' }}
            />
          </motion.button>

          {/* Emoji picker panel */}
          <AnimatePresence>
            {showEmojiPicker && (
              <EmojiPicker
                onEmojiSelect={insertEmoji}
                onClose={() => setShowEmojiPicker(false)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default ChatInputBar;
