/**
 * FiatPurchaseModal — Buy song tokens via Shopify checkout.
 * Stripe payment support has been removed. This modal handles Shopify-only flow.
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { ShoppingBag, Wallet, Loader2, Zap, Package } from 'lucide-react';
import { api } from '@/lib/api-client';
import { triggerHapticFeedback } from '@/utils/haptic';
import ApplePayButton from '@/components/ApplePayButton';

// ─── Pack Tier Configuration ──────────────────────────────────────────────────
interface PackTier {
  id: string;
  name: string;
  label: string;
  fallbackTokenAmount: number;
  fiatPriceUsd: string;
  gradient: string;
  borderColor: string;
}

const PACK_TIERS: PackTier[] = [
  { id: 'studio', name: 'Studio', label: 'Starter Pack', fallbackTokenAmount: 10990, fiatPriceUsd: '10.99', gradient: 'linear-gradient(135deg, #e6e600, #FFFF00)', borderColor: '#FFFF00' },
  { id: 'platinum', name: 'Platinum', label: 'Popular Pack', fallbackTokenAmount: 39990, fiatPriceUsd: '39.99', gradient: 'linear-gradient(135deg, #0891b2, #00D4FF)', borderColor: '#00D4FF' },
  { id: 'diamond', name: 'Diamond', label: 'Premium Pack', fallbackTokenAmount: 59990, fiatPriceUsd: '69.99', gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)', borderColor: '#a855f7' },
  { id: 'legend', name: 'Legend', label: 'VIP Pack', fallbackTokenAmount: 99990, fiatPriceUsd: '99.99', gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', borderColor: '#f59e0b' },
];

function PackTierSelector({
  selectedTier,
  onSelect,
}: {
  selectedTier: string;
  onSelect: (tier: PackTier) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Package size={14} style={{ color: '#a78bfa' }} />
        <span className="text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.5)' }}>Choose Pack Tier</span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {PACK_TIERS.map((tier) => {
          const isSelected = selectedTier === tier.id;
          return (
            <button
              key={tier.id}
              onClick={() => { triggerHapticFeedback(); onSelect(tier); }}
              className="flex-shrink-0 w-32 sm:w-auto p-3 rounded-xl text-left transition-all active:scale-[0.97]"
              style={{
                minHeight: '48px',
                background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
                border: `1.5px solid ${isSelected ? tier.borderColor : 'rgba(139,92,246,0.15)'}`,
                boxShadow: isSelected ? `0 0 16px ${isSelected ? tier.borderColor : 'transparent'}` : 'none',
              }}
            >
              <div
                className="w-6 h-6 rounded-md mb-2 flex items-center justify-center text-[10px] font-black"
                style={{ background: tier.gradient, color: tier.id === 'studio' ? '#333' : '#fff' }}
              >
                {tier.name[0]}
              </div>
              <div className="text-xs font-bold text-white mb-0.5">{tier.name}</div>
              <div className="text-[10px] font-mono" style={{ color: 'rgba(220,214,240,0.5)' }}>{tier.label}</div>
              <div className="text-sm font-black mt-1" style={{ fontFamily: "'Inter', monospace", color: '#10B981' }}>${tier.fiatPriceUsd}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Selection Step ────────────────────────────────────────────────────────────

function SelectionStep({
  selectedTier,
  onTierSelect,
  onContinue,
  submitting,
}: {
  selectedTier: string;
  onTierSelect: (tier: PackTier) => void;
  onContinue: () => void;
  submitting: boolean;
}) {
  const tier = PACK_TIERS.find(t => t.id === selectedTier) ?? PACK_TIERS[0];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(236,72,153,0.15))', border: '1px solid rgba(139,92,246,0.3)' }}>
          <ShoppingBag size={24} style={{ color: '#a78bfa' }} />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Buy Tokens with Card</h2>
        <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
          No wallet needed. We'll create one for you automatically.
        </p>
      </div>

      <PackTierSelector selectedTier={selectedTier} onSelect={onTierSelect} />

      <div className="p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.15)' }}>
        <div className="flex items-start gap-2">
          <Wallet size={14} style={{ color: '#10B981', marginTop: 2 }} />
          <p className="text-xs" style={{ color: 'rgba(220,214,240,0.5)' }}>
            A free Solana wallet will be created and tokens stored securely. You can export it anytime.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <ApplePayButton
          onClick={onContinue}
          disabled={submitting}
          size="large"
        />

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(220,214,240,0.3)' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <Button
          onClick={onContinue}
          disabled={submitting}
          className="w-full py-4 rounded-xl font-black text-base transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white', boxShadow: '0 0 24px rgba(139,92,246,0.4)', minHeight: '48px' }}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Preparing checkout...
            </>
          ) : (
            <>
              <ShoppingBag size={16} />
              <span>Checkout via Shopify</span>
              <span className="text-sm" style={{ color: '#10B981' }}>${tier.fiatPriceUsd}</span>
            </>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-center" style={{ color: 'rgba(220,214,240,0.3)' }}>
        Secure checkout via Shopify. Tokens delivered to your wallet.
      </p>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export interface FiatPurchaseModalProps {
  open: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  symbol?: string;
  coverImage?: string;
  usdPricePerToken?: number;
  defaultPackTier?: string;
  /** Tip percentage 0–100 selected by the user on the song page (0 = no tip) */
  tipPercent?: number;
}

const FiatPurchaseModal: React.FC<FiatPurchaseModalProps> = ({
  open,
  onClose,
  songId,
  defaultPackTier,
  tipPercent = 0,
}) => {
  const [selectedTierId, setSelectedTierId] = useState(defaultPackTier ?? 'studio');
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);

  const selectedTier = PACK_TIERS.find(t => t.id === selectedTierId) ?? PACK_TIERS[0];

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSelectedTierId(defaultPackTier ?? 'studio');
    }
  }, [open, defaultPackTier]);

  // Sync selected tier when modal opens with a defaultPackTier
  useEffect(() => {
    if (open && defaultPackTier) {
      setSelectedTierId(defaultPackTier);
    }
  }, [open, defaultPackTier]);

  const handleContinue = async () => {
    triggerHapticFeedback();
    setIsCreatingIntent(true);

    try {
      const res = await api.post('/api/packs/checkout', {
        songId,
        packId: selectedTierId,
        packTier: selectedTierId,
        ...(tipPercent > 0 ? { tipPercent } : {}),
      });

      if (res?.checkoutUrl) {
        // Same-window navigation — no popup
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Could not generate checkout link');
      }
    } catch (err) {
      console.error('[FiatPurchaseModal] Checkout error:', err);
      toast.error('Failed to connect to server');
    } finally {
      setIsCreatingIntent(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(145deg, rgba(20,12,40,0.98), rgba(10,5,25,0.99))',
          border: '1px solid rgba(139,92,246,0.25)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="mb-4">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Zap size={18} style={{ color: '#a78bfa' }} />
            Buy with Card
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          {isCreatingIntent ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 size={28} className="animate-spin" style={{ color: '#a78bfa' }} />
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>Preparing checkout...</p>
            </div>
          ) : (
            <SelectionStep
              selectedTier={selectedTierId}
              onTierSelect={(tier) => setSelectedTierId(tier.id)}
              onContinue={handleContinue}
              submitting={isCreatingIntent}
            />
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

export default FiatPurchaseModal;
