/**
 * CollectToPlaylistModal — shown in the Now Playing view for non-holders.
 * Lets user pick a price tier and a playlist, then opens Shopify checkout.
 * After purchase (Shopify redirect → ShopifySuccessPage), the song is
 * auto-added to the selected playlist.
 *
 * Because checkout happens via external redirect we store the intent in
 * sessionStorage so ShopifySuccessPage can pick it up on return.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Zap, Sparkles, ListMusic, Loader2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-privy-auth';
import { useMyPlaylist } from '@/hooks/useMyPlaylist';
import { usePlayer } from '@/contexts/PlayerContext';
import { triggerHapticFeedback } from '@/utils/haptic';
import { api } from '@/lib/api-client';
import ApplePayButton from '@/components/ApplePayButton';

const TIERS = [
  { label: 'Studio', packId: 'studio', amount: 10.99, icon: Star, color: '#FFFF00', glow: 'rgba(255,255,0,0.4)', gradient: 'linear-gradient(135deg, #e6e600, #FFFF00)' },
  { label: 'Platinum', packId: 'platinum', amount: 39.99, icon: Zap, color: '#00D4FF', glow: 'rgba(0,212,255,0.4)', gradient: 'linear-gradient(135deg, #0891b2, #00D4FF)', popular: true },
  { label: 'Diamond', packId: 'diamond', amount: 69.99, icon: Sparkles, color: '#a855f7', glow: 'rgba(168,85,247,0.4)', gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)' },
];

// Map a custom amount to the nearest pack tier.
function resolvePackIdForAmount(amount: number): string {
  if (amount >= 99.99) return 'legend';
  if (amount >= 69.99) return 'diamond';
  if (amount >= 39.99) return 'platinum';
  return 'studio';
}

interface CollectToPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CollectToPlaylistModal: React.FC<CollectToPlaylistModalProps> = ({ isOpen, onClose }) => {
  const { currentSong } = usePlayer();
  const { user, login } = useAuth();
  const { addToPlaylist } = useMyPlaylist();
  const [selectedTierIdx, setSelectedTierIdx] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!currentSong) return null;

  const tier = TIERS[selectedTierIdx];
  const effectiveAmount = useCustom ? parseFloat(customAmount) || 0 : tier.amount;

  const handleCollect = async () => {
    if (effectiveAmount < 9) {
      toast.error('Minimum amount is $9');
      return;
    }
    if (!user?.address) return;
    if (!currentSong.songId) {
      toast.error('No song selected');
      return;
    }
    triggerHapticFeedback();
    setLoading(true);
    try {
      // Resolve packId: use the selected tier's packId, or map custom amount to a tier.
      const packId = useCustom
        ? resolvePackIdForAmount(effectiveAmount)
        : tier.packId;

      // Auto-add to user's single playlist after purchase
      if (currentSong.songId && user?.address) {
        sessionStorage.setItem(
          'lit-collect-playlist-intent',
          JSON.stringify({ songId: currentSong.songId, userAddress: user.address })
        );
      }

      const { checkoutUrl } = await api.post<{ checkoutUrl: string }>('/api/packs/checkout', {
        songId: currentSong.songId,
        packId,
        walletAddress: user.address,
      });

      if (!checkoutUrl) throw new Error('No checkout URL returned');
      window.location.href = checkoutUrl;
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Failed to start checkout');
      setLoading(false);
    }
  };

  const handleApplePayClick = () => {
    handleCollect();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[250]"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[260] rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(18,10,40,0.99) 0%, rgba(8,3,20,0.99) 100%)',
              border: '1px solid rgba(139,92,246,0.25)',
              borderBottom: 'none',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              maxHeight: '88vh',
              overflowY: 'auto',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(139,92,246,0.3)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div>
                <h3 className="text-base font-black text-white">Collect to Playlist</h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(220,214,240,0.45)' }}>
                  {currentSong.title} by {currentSong.artist}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>

            <div className="px-5 pb-8 flex flex-col gap-5">
              {/* Price Tiers */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(220,214,240,0.35)' }}>
                  Choose Amount
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {TIERS.map((t, i) => {
                    const Icon = t.icon;
                    const selected = !useCustom && selectedTierIdx === i;
                    return (
                      <button
                        key={t.label}
                        onClick={() => { triggerHapticFeedback(); setSelectedTierIdx(i); setUseCustom(false); }}
                        className="flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl relative transition-all active:scale-95"
                        style={{
                          background: selected ? t.gradient : 'rgba(255,255,255,0.04)',
                          border: selected ? `1px solid ${t.color}` : '1px solid rgba(255,255,255,0.08)',
                          boxShadow: selected ? `0 0 16px ${t.glow}` : 'none',
                        }}
                      >
                        {t.popular && (
                          <div
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-black"
                            style={{ background: t.gradient, color: 'white' }}
                          >
                            POPULAR
                          </div>
                        )}
                        <Icon size={16} style={{ color: selected ? 'white' : t.color }} />
                        <span className="text-xs font-bold" style={{ color: selected ? 'white' : 'rgba(220,214,240,0.6)' }}>
                          {t.label}
                        </span>
                        <span className="text-sm font-black" style={{ color: selected ? 'white' : 'rgba(220,214,240,0.8)' }}>
                          ${t.amount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom amount */}
                <div className="mt-2">
                  <button
                    onClick={() => { setUseCustom(true); setSelectedTierIdx(-1); }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: useCustom ? 'rgba(139,92,246,0.12)' : 'rgba(255,255,255,0.04)',
                      border: useCustom ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.07)',
                      color: useCustom ? '#c4b5fd' : 'rgba(220,214,240,0.5)',
                    }}
                  >
                    Custom amount
                  </button>
                  <AnimatePresence>
                    {useCustom && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-2"
                      >
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}>
                          <span className="text-sm font-bold text-white">$</span>
                          <input
                            autoFocus
                            type="number"
                            min={9}
                            step={0.01}
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            placeholder="9.00"
                            className="flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/30"
                          />
                        </div>
                        {parseFloat(customAmount) > 0 && parseFloat(customAmount) < 9 && (
                          <p className="text-xs mt-1 px-1" style={{ color: '#ef4444' }}>Minimum is $9</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Playlist note */}
              <div
                className="flex items-center gap-2 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}
              >
                <ListMusic size={14} style={{ color: '#a78bfa' }} />
                <span className="text-xs" style={{ color: 'rgba(167,139,250,0.7)' }}>
                  Song will be automatically added to your playlist after purchase.
                </span>
              </div>

              {/* Summary */}
              <div
                className="px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.15)' }}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs" style={{ color: 'rgba(220,214,240,0.5)' }}>You pay</span>
                  <span className="text-base font-black text-white">
                    ${effectiveAmount > 0 ? effectiveAmount.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>

              {/* CTA */}
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
                    className="w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                      color: 'white',
                      boxShadow: '0 0 24px rgba(139,92,246,0.45)',
                    }}
                  >
                    Connect Wallet
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <ApplePayButton
                    onClick={() => { triggerHapticFeedback(); handleApplePayClick(); }}
                    disabled={loading || effectiveAmount < 9}
                    size="large"
                  />

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(220,214,240,0.3)' }}>or</span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  </div>

                  <button
                    onClick={handleCollect}
                    disabled={loading || effectiveAmount < 9}
                    className="w-full py-4 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-95"
                    style={{
                      background: effectiveAmount >= 9
                        ? 'linear-gradient(135deg, #7c3aed, #a855f7)'
                        : 'rgba(139,92,246,0.1)',
                      color: effectiveAmount >= 9 ? 'white' : 'rgba(167,139,250,0.4)',
                      boxShadow: effectiveAmount >= 9 ? '0 0 24px rgba(139,92,246,0.45)' : 'none',
                      opacity: loading ? 0.7 : 1,
                    }}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                    {loading ? 'Redirecting...' : `Collect for $${effectiveAmount > 0 ? effectiveAmount.toFixed(2) : '9.00'}`}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CollectToPlaylistModal;
