/**
 * PayWhatYouWantModal — Pay-what-you-want checkout modal for individual songs.
 * Users type any amount they want to pay (minimum $1), then get redirected
 * to Shopify checkout with the appropriate pack tier.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ShoppingBag, Loader2, Music, Zap, TrendingUp, Package, CheckCircle, AlertCircle, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-privy-auth';
import { triggerHapticFeedback } from '@/utils/haptic';
import { api } from '@/lib/api-client';
import ApplePayButton from '@/components/ApplePayButton';

// ─── Constants ─────────────────────────────────────────────────────────────────

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const MIN_AMOUNT = 1;
const QUICK_AMOUNTS = [1, 2, 5, 10, 20];

// Breakdown: where the money goes
function calcBreakdown(amount: number) {
  const fanTokens = amount * 0.92;
  const artistTokens = amount * 0.05;
  const infrastructure = amount * 0.015;
  const treasury = amount * 0.015;
  return { fanTokens, artistTokens, infrastructure, treasury };
}

// ─── Animated number ───────────────────────────────────────────────────────────

function AnimatedValue({ value, decimals = 2 }: { value: number; decimals?: number }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = React.useRef(value);

  useEffect(() => {
    const start = prevRef.current;
    const target = value;
    const duration = 300;
    const startTime = performance.now();

    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + (target - start) * eased);
      if (progress < 1) requestAnimationFrame(step);
    };

    prevRef.current = value;
    requestAnimationFrame(step);
  }, [value]);

  return <span>{displayed.toFixed(decimals)}</span>;
}

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface PayWhatYouWantModalProps {
  open: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  artist?: string;
  coverImage?: string;
}

const PayWhatYouWantModal: React.FC<PayWhatYouWantModalProps> = ({
  open,
  onClose,
  songId,
  songTitle,
  artist,
  coverImage,
}) => {
  const { user, login } = useAuth();

  // sessionStorage key for persisting amount across wallet connect
  const amountKey = `poof:pendingPackAmount:${songId}`;

  // Initialize amount from sessionStorage if available
  const [customAmount, setCustomAmount] = useState(() => {
    try { return sessionStorage.getItem(amountKey) ?? ''; } catch { return ''; }
  });
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  // ─── Compute active amount ──────────────────────────────────────────────────

  const activeAmount = (() => {
    if (customAmount !== '') {
      const n = parseFloat(customAmount);
      return isNaN(n) ? 0 : n;
    }
    if (selectedQuick !== null) return selectedQuick;
    return 0;
  })();

  const breakdown = calcBreakdown(activeAmount);
  const isValidAmount = activeAmount >= MIN_AMOUNT;

  // ─── Persist amount to sessionStorage ──────────────────────────────────────

  useEffect(() => {
    try {
      if (customAmount) {
        sessionStorage.setItem(amountKey, customAmount);
      } else if (selectedQuick !== null) {
        sessionStorage.setItem(amountKey, String(selectedQuick));
      }
    } catch { /* ignore */ }
  }, [customAmount, selectedQuick, amountKey]);

  // ─── Validation ─────────────────────────────────────────────────────────────

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

  // ─── Reset on close ─────────────────────────────────────────────────────────
  // NOTE: We do NOT reset the amount on close so it persists across wallet connect flows.

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleQuickSelect = (amount: number) => {
    triggerHapticFeedback();
    setSelectedQuick(amount);
    setCustomAmount('');
    setValidationMsg(null);
  };

  const handleCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleaned = raw.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let validated = cleaned;
    if (parts.length > 2) {
      validated = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parts[1] !== undefined && parts[1].length > 2) {
      validated = parts[0] + '.' + parts[1].slice(0, 2);
    }
    setCustomAmount(validated);
    setSelectedQuick(null);
  };

  const handleCheckout = async () => {
    if (!isValidAmount) return;
    if (!songId) return;
    // Bug 4: guard against undefined/zero values before hitting the API
    if (!songId || !user?.address || activeAmount <= 0) return;

    setIsLoading(true);

    try {
      const res = await api.post('/api/packs/checkout/open-amount', {
        songId,
        amountUsd: activeAmount,
        walletAddress: user?.address,
        tipPercent: 0,
      });

      if (res?.checkoutUrl) {
        // Clear sessionStorage amount since we're going to checkout
        try { sessionStorage.removeItem(amountKey); } catch { /* ignore */ }
        // Same-window navigation — no popup
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Could not generate checkout link');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[PayWhatYouWantModal] Checkout error:', err);
      toast.error('Failed to connect to server');
      setIsLoading(false);
    }
  };

  const handleApplePayClick = () => {
    handleCheckout();
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="max-w-md w-full p-0 overflow-hidden"
        style={{
          background: '#000',
          border: '1px solid rgba(0, 255, 65, 0.3)',
          boxShadow: '0 0 40px rgba(0, 255, 65, 0.1), 0 24px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: NEON_GREEN,
                textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
              }}
            >
              Collect Track
            </DialogTitle>
          </div>
        </DialogHeader>

        {/* Divider */}
        <div className="mx-5 mt-3 mb-0 h-px" style={{ background: 'rgba(0, 255, 65, 0.12)' }} />

        {/* Scrollable body */}
        <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: 'calc(85vh - 80px)' }}>
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Song info */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{
                background: 'rgba(0, 255, 65, 0.04)',
                border: '1px solid rgba(0, 255, 65, 0.12)',
              }}
            >
              {coverImage ? (
                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0" style={{ border: '1px solid rgba(0, 255, 65, 0.2)' }}>
                  <img src={coverImage} alt={songTitle} className="w-full h-full object-cover block" />
                </div>
              ) : (
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.15)' }}
                >
                  <Music size={18} style={{ color: 'rgba(0, 255, 65, 0.5)' }} />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{songTitle}</p>
                {artist && (
                  <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{artist}</p>
                )}
              </div>
            </div>

            {/* Quick amount buttons */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{
                  color: 'rgba(0, 255, 65, 0.5)',
                  fontFamily: "'Archivo Black', sans-serif",
                  letterSpacing: '0.14em',
                }}
              >
                Quick amounts
              </label>
              <div className="grid grid-cols-5 gap-2">
                {QUICK_AMOUNTS.map((amount) => {
                  const isSelected = selectedQuick === amount;
                  return (
                    <button
                      key={amount}
                      onClick={() => handleQuickSelect(amount)}
                      className="py-3 rounded-xl text-xs font-bold transition-all active:scale-95"
                      style={{
                        fontFamily: "'Archivo Black', sans-serif",
                        background: isSelected
                          ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                          : 'rgba(0, 255, 65, 0.04)',
                        border: `1.5px solid ${isSelected ? 'transparent' : 'rgba(0, 255, 65, 0.18)'}`,
                        color: isSelected ? '#000' : 'rgba(0, 255, 65, 0.7)',
                        boxShadow: isSelected ? `0 0 14px rgba(0, 255, 65, 0.35)` : 'none',
                      }}
                    >
                      ${amount}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom amount input */}
            <div>
              <label
                className="block text-[10px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: 'rgba(0, 255, 65, 0.5)', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.14em' }}
              >
                Custom amount
              </label>
              <div className="relative">
                <span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold"
                  style={{ color: 'rgba(0, 255, 65, 0.5)' }}
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={handleCustomInput}
                  placeholder="3.00"
                  className="w-full pl-8 pr-16 py-4 rounded-xl text-lg outline-none transition-all"
                  style={{
                    background: 'rgba(0, 255, 65, 0.04)',
                    border: `1.5px solid ${
                      validationMsg
                        ? 'rgba(248,113,113,0.5)'
                        : customAmount && parseFloat(customAmount) >= MIN_AMOUNT
                        ? 'rgba(0, 255, 65, 0.5)'
                        : 'rgba(0, 255, 65, 0.15)'
                    }`,
                    color: '#fff',
                    fontFamily: "'Inter', monospace",
                  }}
                />
                <span
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold"
                  style={{ color: 'rgba(0, 255, 65, 0.4)', fontFamily: "'Archivo Black', sans-serif" }}
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

            {/* Live breakdown */}
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
                    background: 'rgba(0, 255, 65, 0.03)',
                    border: '1px solid rgba(0, 255, 65, 0.12)',
                  }}
                >
                  <div className="px-3.5 py-2 border-b" style={{ borderColor: 'rgba(0, 255, 65, 0.08)' }}>
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: 'rgba(0, 255, 65, 0.45)', fontFamily: "'Archivo Black', sans-serif" }}
                    >
                      Your ${activeAmount.toFixed(2)} breakdown
                    </span>
                  </div>

                  <div className="px-3.5 py-3 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(0,212,255,0.1)' }}>
                          <TrendingUp size={10} style={{ color: CYAN }} />
                        </div>
                        <span className="text-xs font-medium text-white/60">Fan Tokens</span>
                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.08)', color: CYAN }}>92%</span>
                      </div>
                      <span className="text-xs font-black" style={{ fontFamily: "'Inter', monospace", color: CYAN }}>
                        $<AnimatedValue value={breakdown.fanTokens} decimals={2} />
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(0, 255, 65, 0.08)' }}>
                          <Package size={10} style={{ color: NEON_GREEN }} />
                        </div>
                        <span className="text-xs text-white/50">Artist Tokens</span>
                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(0, 255, 65, 0.06)', color: NEON_GREEN }}>5%</span>
                      </div>
                      <span className="text-xs font-black" style={{ fontFamily: "'Inter', monospace", color: NEON_GREEN }}>
                        $<AnimatedValue value={breakdown.artistTokens} decimals={2} />
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                          <Zap size={10} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        </div>
                        <span className="text-xs text-white/30">Platform</span>
                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }}>3%</span>
                      </div>
                      <span className="text-xs" style={{ fontFamily: "'Inter', monospace", color: 'rgba(255,255,255,0.25)' }}>
                        $<AnimatedValue value={breakdown.infrastructure + breakdown.treasury} decimals={2} />
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action area — never blocks checkout on wallet state */}
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 size={28} className="animate-spin" style={{ color: NEON_GREEN }} />
                <p className="text-sm" style={{ color: 'rgba(0, 255, 65, 0.5)' }}>Preparing checkout...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Apple Pay — primary option */}
                <ApplePayButton
                  onClick={() => { triggerHapticFeedback(); handleApplePayClick(); }}
                  disabled={!isValidAmount}
                  size="large"
                />

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(220,214,240,0.3)' }}>or</span>
                  <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Primary checkout button — always available */}
                <button
                  onClick={() => { triggerHapticFeedback(); handleCheckout(); }}
                  disabled={!isValidAmount}
                  className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    letterSpacing: '0.1em',
                    background: isValidAmount
                      ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                      : 'rgba(255,255,255,0.04)',
                    color: isValidAmount ? '#000' : '#fff',
                    boxShadow: isValidAmount ? `0 0 24px rgba(0, 255, 65, 0.4)` : 'none',
                    minHeight: '52px',
                  }}
                >
                  <ShoppingBag size={16} />
                  {!isValidAmount
                    ? activeAmount > 0
                      ? `Minimum $${MIN_AMOUNT}`
                      : 'Choose an Amount'
                    : `Pay $${activeAmount.toFixed(2)} — Card`
                  }
                </button>

                {/* Connect wallet prompt — inline, non-blocking */}
                {!user && (
                  <div
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      background: 'rgba(0, 255, 65, 0.04)',
                      border: '1px solid rgba(0, 255, 65, 0.12)',
                    }}
                  >
                    <span className="text-xs" style={{ color: 'rgba(0, 255, 65, 0.5)', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.06em' }}>
                      Have a Phantom wallet?
                    </span>
                    <button
                      onClick={() => { triggerHapticFeedback(); login(); }}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all active:scale-[0.97]"
                      style={{
                        fontFamily: "'Archivo Black', sans-serif",
                        letterSpacing: '0.06em',
                        background: 'rgba(0, 255, 65, 0.12)',
                        border: '1px solid rgba(0, 255, 65, 0.3)',
                        color: NEON_GREEN,
                      }}
                    >
                      <Wallet size={12} />
                      Connect
                    </button>
                  </div>
                )}

                {isValidAmount && (
                  <div className="flex items-center justify-center gap-1.5">
                    <CheckCircle size={11} style={{ color: 'rgba(0, 255, 65, 0.25)' }} />
                    <p className="text-[10px] text-center" style={{ color: 'rgba(0, 255, 65, 0.3)' }}>
                      Apple Pay · Google Pay · Card — powered by Shopify
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PayWhatYouWantModal;
