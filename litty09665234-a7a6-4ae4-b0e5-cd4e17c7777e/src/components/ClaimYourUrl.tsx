import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Link2, Check, X, Copy, Edit3, Loader2 } from 'lucide-react';
import { Time, Address } from '@/lib/db-client';
import { setMany } from '@/lib/db-client';
import {
  getUsernames,
  buildUsernames,
  buildUpdateUsernames,
} from '@/lib/collections/usernames';
import { buildUpdateUsers } from '@/lib/collections/users';

const NEON_GREEN = '#00FF41';
const GLASS_CARD: Record<string, string> = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;

interface ClaimYourUrlProps {
  currentUsername?: string;
  userAddress: string;
  onClaimed?: () => void;
}

const ClaimYourUrl: React.FC<ClaimYourUrlProps> = ({ currentUsername, userAddress, onClaimed }) => {
  const [input, setInput] = useState(currentUsername ?? '');
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [isClaiming, setIsClaiming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/u/` : '/u/';

  useEffect(() => {
    setInput(currentUsername ?? '');
    setStatus('idle');
    setValidationError(null);
    setIsEditing(false);
  }, [currentUsername]);

  const validate = useCallback((value: string): string | null => {
    if (value.length < 3) return 'Must be at least 3 characters';
    if (value.length > 30) return 'Must be 30 characters or fewer';
    if (!USERNAME_REGEX.test(value)) return 'Only lowercase letters, numbers, and underscores allowed';
    return null;
  }, []);

  const handleCheck = async () => {
    const error = validate(input.trim());
    if (error) {
      setValidationError(error);
      setStatus('idle');
      return;
    }
    setValidationError(null);
    setStatus('checking');
    const existing = await getUsernames(input.trim());
    if (existing && existing.userAddress && existing.userAddress !== userAddress) {
      setStatus('taken');
    } else {
      setStatus('available');
    }
  };

  const handleClaim = async () => {
    const username = input.trim();
    if (!username) return;
    setIsClaiming(true);

    const ops = [];

    // If editing from an old username, we can't delete the old mapping (no delete SDK),
    // but we create the new mapping and update the user record.
    ops.push(buildUsernames(username, {
      userAddress: Address.publicKey(userAddress),
      createdAt: Time.Now,
    }));

    // Also update the users record with the new username
    ops.push(buildUpdateUsers(userAddress, { username }));

    const success = await setMany(ops);
    if (success) {
      toast.success(`Username @${username} claimed!`);
      setStatus('idle');
      setIsEditing(false);
      onClaimed?.();
    } else {
      toast.error('Failed to claim username. It may have been taken.');
      setStatus('available');
    }
    setIsClaiming(false);
  };

  const handleCopy = async () => {
    const url = `${baseUrl}${currentUsername}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const hasClaimed = !!currentUsername && !isEditing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl p-4 mt-4"
      style={GLASS_CARD}
    >
      <div className="flex items-center gap-2 mb-3">
        <Link2 size={14} style={{ color: NEON_GREEN }} />
        <h4
          className="text-xs font-black uppercase tracking-widest"
          style={{ color: NEON_GREEN, fontFamily: "'Archivo Black', monospace" }}
        >
          {hasClaimed ? 'Your Profile URL' : 'Claim your profile URL'}
        </h4>
      </div>

      <AnimatePresence mode="wait">
        {hasClaimed ? (
          <motion.div
            key="claimed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-mono"
              style={{
                background: 'rgba(0, 255, 65, 0.06)',
                border: `1px solid ${NEON_GREEN}30`,
                color: NEON_GREEN,
              }}
            >
              <span className="truncate">{baseUrl}{currentUsername}</span>
            </div>
            <div className="flex gap-2">
              <motion.button
                onClick={handleCopy}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-xs"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontFamily: "'Archivo Black', monospace",
                }}
              >
                {copied ? <Check size={13} style={{ color: NEON_GREEN }} /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy Link'}
              </motion.button>
              <motion.button
                onClick={() => {
                  setIsEditing(true);
                  setInput(currentUsername ?? '');
                  setStatus('idle');
                  setValidationError(null);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-10 rounded-xl flex items-center justify-center gap-2 font-bold text-xs"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontFamily: "'Archivo Black', monospace",
                }}
              >
                <Edit3 size={13} /> Edit
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="claiming"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Pick a unique username to get a shareable link like{' '}
              <span style={{ color: NEON_GREEN }}>litstudio.online/u/yourname</span>
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  @
                </span>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setStatus('idle');
                    setValidationError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCheck();
                  }}
                  placeholder="username"
                  className="w-full h-10 pl-7 pr-3 rounded-xl text-sm font-bold bg-transparent outline-none"
                  style={{
                    border: `1px solid ${validationError ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.12)'}`,
                    color: '#fff',
                    fontFamily: "'Archivo Black', monospace",
                  }}
                />
              </div>
              <motion.button
                onClick={handleCheck}
                disabled={status === 'checking'}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="h-10 px-4 rounded-xl font-bold text-xs flex items-center gap-1.5"
                style={{
                  background: `${NEON_GREEN}12`,
                  border: `1px solid ${NEON_GREEN}40`,
                  color: NEON_GREEN,
                  fontFamily: "'Archivo Black', monospace",
                }}
              >
                {status === 'checking' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  'Check'
                )}
              </motion.button>
            </div>

            <AnimatePresence>
              {validationError && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] font-bold flex items-center gap-1"
                  style={{ color: '#f87171' }}
                >
                  <X size={12} /> {validationError}
                </motion.p>
              )}
              {status === 'taken' && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[11px] font-bold flex items-center gap-1"
                  style={{ color: '#f87171' }}
                >
                  <X size={12} /> Username taken
                </motion.p>
              )}
              {status === 'available' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <p className="text-[11px] font-bold flex items-center gap-1" style={{ color: NEON_GREEN }}>
                    <Check size={12} /> Available!
                  </p>
                  <motion.button
                    onClick={handleClaim}
                    disabled={isClaiming}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                    style={{
                      background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
                      color: '#000',
                      fontFamily: "'Archivo Black', monospace",
                    }}
                  >
                    {isClaiming ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Claim username
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ClaimYourUrl;
