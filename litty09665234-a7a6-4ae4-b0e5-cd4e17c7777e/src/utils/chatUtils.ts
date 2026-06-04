// Chat utilities for Lit Hub

export type ChatTier = 'none' | 'studio' | 'diamond' | 'legend';

export interface TierInfo {
  tier: ChatTier;
  label: string;
  emoji: string;
  color: string;
  glow: string;
  bg: string;
  border: string;
}

export const TIER_INFO: Record<ChatTier, TierInfo> = {
  none: {
    tier: 'none',
    label: 'Fan',
    emoji: '',
    color: 'rgba(255,255,255,0.35)',
    glow: 'transparent',
    bg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.08)',
  },
  studio: {
    tier: 'studio',
    label: 'Studio',
    emoji: '⚡',
    color: '#FFFF00',
    glow: 'rgba(255,255,0,0.5)',
    bg: 'rgba(255,255,0,0.10)',
    border: 'rgba(255,255,0,0.4)',
  },
  diamond: {
    tier: 'diamond',
    label: 'Diamond',
    emoji: '💎',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.5)',
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.45)',
  },
  legend: {
    tier: 'legend',
    label: 'Legend',
    emoji: '👑',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.6)',
    bg: 'rgba(245,158,11,0.10)',
    border: 'rgba(245,158,11,0.5)',
  },
};

/**
 * Determine tier from the highest single-song token balance
 */
export function getTierFromBalance(highestBalance: number): ChatTier {
  if (highestBalance >= 50_000_000) return 'legend';
  if (highestBalance >= 25_000_000) return 'diamond';
  if (highestBalance >= 10_000_000) return 'studio';
  return 'none';
}

/**
 * Format a wallet address to first4...last4
 */
export function shortAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

/**
 * Get avatar initials from wallet address
 */
export function getAvatarInitials(address: string): string {
  if (!address) return '??';
  return address.slice(0, 2).toUpperCase();
}

/**
 * Get a deterministic hue from a wallet address for avatar coloring
 */
export function getAddressHue(address: string): number {
  if (!address) return 263;
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

/**
 * Format Unix seconds timestamp to relative time
 */
export function formatRelativeTime(unixSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - unixSeconds;
  if (diff < 60) return `${Math.max(0, diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString();
}

/**
 * Check if a string is a GM message
 */
export function isGmMessage(content: string): boolean {
  return content === 'GM' || content === 'gm' || content === 'Gm';
}

/**
 * Get today's UTC date as YYYY-MM-DD
 */
export function getUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Get yesterday's UTC date as YYYY-MM-DD
 */
export function getYesterdayUtcDateString(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Simple profanity word list for client-side filtering
 */
const BANNED_WORDS = [
  'nigger', 'nigga', 'faggot', 'fag', 'kike', 'spic', 'chink', 'gook',
  'retard', 'cunt', 'twat', 'bitch', 'whore', 'slut',
  'tranny', 'dyke', 'wetback', 'cracker', 'spook',
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(lower);
  });
}

export const REACTION_EMOJIS = [
  { emoji: '🔥', name: 'fire' },
  { emoji: '❤️', name: 'heart' },
  { emoji: '🚀', name: 'rocket' },
  { emoji: '💎', name: 'diamond' },
  { emoji: '🎵', name: 'music' },
];

export function getReactionId(messageId: string, walletAddress: string, emojiName: string): string {
  return `${messageId}_${walletAddress}_${emojiName}`;
}
