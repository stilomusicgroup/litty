/**
 * PayWhatYouWantCheckout — Shopify-powered pay-what-you-want checkout for Lit Studios
 * Supports preset tiers + custom amount, live breakdown, and Shopify Storefront cart creation.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag, Loader2, Zap, Package, Star, Music2,
  AlertCircle, CheckCircle, Sparkles, TrendingUp, Users
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-privy-auth';
import { triggerHapticFeedback } from '@/utils/haptic';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { api } from '@/lib/api-client';

// ─── Constants ─────────────────────────────────────────────────────────────────

// Mirrors MIN_PURCHASE_USD from partyserver/src/constants.ts — keep in sync.
const MIN_AMOUNT = 1.00;

// Suggested amounts for open-amount checkout. All use 'studio' SKU (the open-amount Shopify variant).
// Amounts are suggestions only — buyer can also type any custom amount >= $1.00.
const PRESETS = [
  {
    label: 'Supporter',
    packId: 'studio',
    amount: 5,
    icon: Star,
    color: '#FFFF00',
    glow: 'rgba(255,255,0,0.4)',
    gradient: 'linear-gradient(135deg, #e6e600, #FFFF00)',
  },
  {
    label: 'Fan',
    packId: 'studio',
    amount: 10,
    icon: Zap,
    color: '#00D4FF',
    glow: 'rgba(0,212,255,0.4)',
    gradient: 'linear-gradient(135deg, #0891b2, #00D4FF)',
    popular: true,
  },
  {
    label: 'Superfan',
    packId: 'studio',
    amount: 25,
    icon: Sparkles,
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.4)',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  },
  {
    label: 'Legend',
    packId: 'studio',
    amount: 50,
    icon: Music2,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.4)',
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
  },
];

// All checkout uses the 'studio' SKU (open-amount Shopify variant).
// Amount is passed directly as amountUsd — no tier-mapping needed.
function resolvePackIdForAmount(_amount: number): string {
  return 'studio';
}

// ─── Breakdown calc (v20 tokenomics) ───────────────────────────────────────────
// Fan: 92% as SPL tokens via bonding curve (no direct cash)
// Artist: 5% as SPL tokens via bonding curve (no direct SOL payout)
// Infrastructure: 1.5% SOL to infra wallet
// Treasury: 1.5% SOL to treasury wallet

function calcBreakdown(amount: number, _editionLimit: number) {
  const buyerTokens = amount * 0.92;  // 92% fan SPL tokens
  const artistTokens = amount * 0.05; // 5% artist SPL tokens via bonding curve
  const infrastructure = amount * 0.015; // 1.5% infra
  const treasury = amount * 0.015;       // 1.5% treasury
  return { buyerTokens, artistTokens, infrastructure, treasury };
}

// ─── Animated number display ────────────────────────────────────────────────────

function AnimatedValue({
  value,
  decimals = 2,
}: {
  value: number;
  decimals?: number;
}) {
  const [displayed, setDisplayed] = useState(value);
  const rafRef = useRef<number | undefined>(undefined);
  const startRef = useRef<number>(value);
  const targetRef = useRef<number>(value);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 380;

  useEffect(() => {
    startRef.current = displayed;
    targetRef.current = value;
    startTimeRef.current = null;

    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const progress = Math.min((ts - startTimeRef.current) / DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(startRef.current + (targetRef.current - startRef.current) * eased);
      if (progress < 1) rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span>{displayed.toFixed(decimals)}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────────────────

interface PayWhatYouWantCheckoutProps {
  songId: string;
  songTitle?: string;
  // Support both prop names for backward-compat with call sites
  artistName?: string;
  artist?: string;
  editionLimit?: number;
  // Legacy: pass full details object to derive editionLimit + tokenSymbol
  details?: SongDetailsResponse | null;
  coverImage?: string;
}

const PayWhatYouWantCheckout: React.FC<PayWhatYouWantCheckoutProps> = ({
  songId,
  songTitle,
  artistName,
  artist,
  editionLimit: editionLimitProp,
  details,
  coverImage,
}) => {
  const { user, login } = useAuth();

  // Resolve effective values from props + details fallback
  const effectiveArtist = artistName ?? artist ?? details?.artist ?? '';
  const effectiveTitle = songTitle ?? details?.title ?? '';
  const effectiveEditionLimit =
    editionLimitProp !== undefined
      ? editionLimitProp
      : (details?.totalEditions ?? 0);
  const tokenSymbol = details?.tokenSymbol ?? 'tokens';

  const [customAmount, setCustomAmount] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(0); // Supporter default
  const [isLoading, setIsLoading] = useState(false);
  const [variantError, setVariantError] = useState<string | null>(null);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  // Compute active amount
  const activeAmount = (() => {
    if (customAmount !== '') {
      const n = parseFloat(customAmount);
      return isNaN(n) ? 0 : n;
    }
    if (selectedPreset !== null) return PRESETS[selectedPreset].amount;
    return 0;
  })();

  const breakdown = calcBreakdown(activeAmount, effectiveEditionLimit);
  const isValidAmount = activeAmount >= MIN_AMOUNT;

  // Validate custom input
  useEffect(() => {
    if (customAmount === '') {
      setValidationMsg(null);
      return;
    }
    const n = parseFloat(customAmount);
    if (isNaN(n)) {
      setValidationMsg('Enter a valid amount');
    } else if (n < MIN_AMOUNT) {
      setValidationMsg(`Minimum is $${MIN_AMOUNT}.00`);
    } else {
      setValidationMsg(null);
    }
  }, [customAmount]);

  const handlePreset = (idx: number) => {
    triggerHapticFeedback();
    setSelectedPreset(idx);
    setCustomAmount('');
    setValidationMsg(null);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and one decimal point, max 2 decimal places
    const raw = e.target.value;
    const cleaned = raw.replace(/[^0-9.]/g, '');
    // Only one decimal point
    const parts = cleaned.split('.');
    let validated = cleaned;
    if (parts.length > 2) {
      validated = parts[0] + '.' + parts.slice(1).join('');
    }
    // Max 2 decimal places
    if (parts[1] !== undefined && parts[1].length > 2) {
      validated = parts[0] + '.' + parts[1].slice(0, 2);
    }
    setCustomAmount(validated);
    setSelectedPreset(null);
  };

  const handleCheckout = useCallback(async () => {
    if (!isValidAmount) return;
    if (!user?.address) return;

    setIsLoading(true);
    setVariantError(null);

    try {
      // Resolve packId: use the selected preset, or map custom amount to a tier.
      const packId = selectedPreset !== null
        ? PRESETS[selectedPreset].packId
        : resolvePackIdForAmount(activeAmount);

      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>('/api/packs/checkout', {
        songId,
        packId,
        walletAddress: user.address,
      });

      if (!checkoutUrl) throw new Error('No checkout URL returned');

      toast.success('Opening checkout...');
      window.location.href = checkoutUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Checkout failed. Please try again.';
      toast.error(msg);
      setVariantError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [isValidAmount, activeAmount, songId, selectedPreset, user?.address]);

  const activePreset = selectedPreset !== null ? PRESETS[selectedPreset] : null;

  // ─── Main render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, rgba(18,8,40,0.98), rgba(10,5,25,0.99))',
        border: `1px solid ${activePreset ? activePreset.color + '44' : 'rgba(139,92,246,0.25)'}`,
        boxShadow: activePreset
          ? `0 0 40px ${activePreset.glow}22`
          : '0 0 32px rgba(139,92,246,0.08)',
        transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* Top gradient bar */}
      <div
        className="h-1"
        style={{
          background: activePreset?.gradient ?? 'linear-gradient(90deg, #6d28d9, #8b5cf6, #ec4899)',
          transition: 'background 0.3s ease',
        }}
      />

      <div className="p-4 sm:p-5 space-y-4">

        {/* Header: song + artist */}
        <div className="flex items-start gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <Music2 size={10} style={{ color: '#a78bfa' }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#a78bfa' }}>
              Support
            </span>
          </div>
          {(effectiveTitle || effectiveArtist) && (
            <div className="min-w-0">
              {effectiveTitle && (
                <p className="text-xs font-bold text-white truncate leading-tight">{effectiveTitle}</p>
              )}
              {effectiveArtist && (
                <p className="text-[10px] truncate leading-tight" style={{ color: 'rgba(220,214,240,0.45)' }}>
                  {effectiveArtist}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Preset tier buttons */}
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((preset, idx) => {
            const Icon = preset.icon;
            const isActive = selectedPreset === idx;
            return (
              <button
                key={preset.label}
                onClick={() => handlePreset(idx)}
                className="relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-200 active:scale-95"
                style={{
                  background: isActive ? preset.gradient : 'rgba(0,0,0,0.35)',
                  border: isActive
                    ? `1.5px solid ${preset.color}88`
                    : '1px solid rgba(255,255,255,0.06)',
                  boxShadow: isActive ? `0 0 20px ${preset.glow}55` : 'none',
                  transform: isActive ? 'translateY(-1px)' : 'none',
                }}
              >
                {preset.popular && (
                  <div
                    className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider"
                    style={{ background: preset.color, color: '#fff', whiteSpace: 'nowrap' }}
                  >
                    Popular
                  </div>
                )}
                <Icon size={14} style={{ color: isActive ? '#fff' : preset.color }} />
                <span
                  className="text-[10px] font-black"
                  style={{ color: isActive ? '#fff' : 'rgba(220,214,240,0.6)' }}
                >
                  {preset.label}
                </span>
                <span
                  className="font-black text-sm"
                  style={{
                    fontFamily: "'Inter', monospace",
                    color: isActive ? '#fff' : preset.color,
                  }}
                >
                  ${preset.amount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom amount input */}
        <div>
          <label
            className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: 'rgba(220,214,240,0.4)' }}
          >
            Or enter a custom amount
          </label>
          <div className="relative">
            <span
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold"
              style={{ color: 'rgba(220,214,240,0.4)' }}
            >
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={customAmount}
              onChange={handleCustomInput}
              placeholder="9.00"
              className="w-full pl-7 pr-16 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: 'rgba(0,0,0,0.4)',
                border: `1px solid ${
                  validationMsg
                    ? 'rgba(248,113,113,0.4)'
                    : selectedPreset === null && customAmount
                    ? 'rgba(139,92,246,0.45)'
                    : 'rgba(255,255,255,0.07)'
                }`,
                color: '#e0d7ff',
                fontFamily: "'Inter', monospace",
              }}
            />
            <span
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold"
              style={{ color: 'rgba(220,214,240,0.35)' }}
            >
              USD
            </span>
          </div>
          <AnimatePresence>
            {validationMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1 mt-1.5 overflow-hidden"
              >
                <AlertCircle size={11} style={{ color: '#f87171' }} />
                <span className="text-xs" style={{ color: '#f87171' }}>{validationMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Live breakdown panel */}
        <AnimatePresence mode="wait">
          {activeAmount >= MIN_AMOUNT && (
            <motion.div
              key="breakdown"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl overflow-hidden"
              style={{
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(139,92,246,0.12)',
              }}
            >
              <div
                className="px-3.5 py-2 border-b"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <span
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color: 'rgba(220,214,240,0.35)' }}
                >
                  Your $<AnimatedValue value={activeAmount} decimals={2} /> breakdown
                </span>
              </div>

              <div className="px-3.5 py-3 space-y-2.5">

                {/* Buyer Tokens — 92% via bonding curve */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: 'rgba(0,212,255,0.15)' }}
                    >
                      <TrendingUp size={10} style={{ color: '#00D4FF' }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'rgba(220,214,240,0.6)' }}>
                      Your Tokens
                    </span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF' }}
                    >
                      92%
                    </span>
                  </div>
                  <span
                    className="text-xs font-black"
                    style={{ fontFamily: "'Inter', monospace", color: '#67e8f9' }}
                  >
                    $<AnimatedValue value={breakdown.buyerTokens} decimals={2} />
                  </span>
                </div>

                {/* Artist Tokens — 5% via bonding curve */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: 'rgba(139,92,246,0.15)' }}
                    >
                      <Package size={10} style={{ color: '#8B5CF6' }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'rgba(220,214,240,0.6)' }}>
                      Artist Tokens
                    </span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{ background: 'rgba(139,92,246,0.1)', color: '#8B5CF6' }}
                    >
                      5%
                    </span>
                  </div>
                  <span
                    className="text-xs font-black"
                    style={{ fontFamily: "'Inter', monospace", color: '#c4b5fd' }}
                  >
                    $<AnimatedValue value={breakdown.artistTokens} decimals={2} />
                  </span>
                </div>

                {/* Infrastructure — 1.5% */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <Zap size={10} style={{ color: 'rgba(220,214,240,0.3)' }} />
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(220,214,240,0.35)' }}>
                      Infrastructure
                    </span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(220,214,240,0.3)' }}
                    >
                      1.5%
                    </span>
                  </div>
                  <span
                    className="text-xs"
                    style={{ fontFamily: "'Inter', monospace", color: 'rgba(220,214,240,0.3)' }}
                  >
                    $<AnimatedValue value={breakdown.infrastructure} decimals={2} />
                  </span>
                </div>

                {/* Treasury — 1.5% */}
                <div
                  className="flex items-center justify-between pt-1.5"
                  style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ background: 'rgba(245,158,11,0.1)' }}
                    >
                      <span style={{ fontSize: '10px' }}>🏛️</span>
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(220,214,240,0.35)' }}>
                      Treasury
                    </span>
                    <span
                      className="text-[9px] px-1 py-0.5 rounded"
                      style={{ background: 'rgba(245,158,11,0.08)', color: 'rgba(245,158,11,0.7)' }}
                    >
                      1.5%
                    </span>
                  </div>
                  <span
                    className="text-xs"
                    style={{ fontFamily: "'Inter', monospace", color: 'rgba(220,214,240,0.3)' }}
                  >
                    $<AnimatedValue value={breakdown.treasury} decimals={2} />
                  </span>
                </div>

                {/* Tokenomics note */}
                <p className="text-[9px] text-center" style={{ color: 'rgba(220,214,240,0.2)' }}>
                  Tokens distributed via bonding curve · Artist earns from trading fees
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Inline variant error */}
        <AnimatePresence>
          {variantError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2 p-3 rounded-xl overflow-hidden"
              style={{ background: 'rgba(248,113,113,0.07)', border: '1px solid rgba(248,113,113,0.15)' }}
            >
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#f87171' }} />
              <p className="text-xs" style={{ color: '#fca5a5' }}>{variantError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Checkout button / Sign-in prompt */}
        {!user?.address ? (
          <div className="space-y-2.5">
            <p
              className="text-xs text-center font-medium"
              style={{ color: 'rgba(220,214,240,0.5)' }}
            >
              Sign in to complete your purchase
            </p>
            <button
              onClick={() => { triggerHapticFeedback(); login(); }}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
                color: '#000',
                boxShadow: '0 0 20px rgba(0, 255, 65, 0.4), 0 0 40px rgba(0, 255, 65, 0.15)',
                minHeight: '52px',
              }}
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => { triggerHapticFeedback(); handleCheckout(); }}
              disabled={!isValidAmount || isLoading}
              className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: isValidAmount
                  ? 'linear-gradient(135deg, #00FF41, #00D4FF)'
                  : 'rgba(255,255,255,0.05)',
                color: isValidAmount ? '#000' : '#fff',
                boxShadow:
                  isValidAmount && !isLoading
                    ? '0 0 20px rgba(0, 255, 65, 0.4), 0 0 40px rgba(0, 255, 65, 0.15)'
                    : 'none',
                minHeight: '52px',
                transition: 'background 0.3s ease, box-shadow 0.3s ease',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Opening Checkout...
                </>
              ) : !isValidAmount ? (
                <>
                  <ShoppingBag size={16} />
                  {activeAmount > 0 ? `Minimum $${MIN_AMOUNT}` : 'Select an Amount'}
                </>
              ) : (
                <>
                  <ShoppingBag size={16} />
                  Buy Now — ${activeAmount.toFixed(2)}
                </>
              )}
            </button>

            {isValidAmount && (
              <div className="flex items-center justify-center gap-1.5">
                <CheckCircle size={11} style={{ color: 'rgba(220,214,240,0.25)' }} />
                <p className="text-[10px] text-center" style={{ color: 'rgba(220,214,240,0.25)' }}>
                  Apple Pay · Google Pay · Card — powered by Shopify
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
};

export default PayWhatYouWantCheckout;
