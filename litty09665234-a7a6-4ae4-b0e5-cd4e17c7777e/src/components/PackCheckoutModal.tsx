import React, { useState } from 'react';
import { Loader2, Package, Star, Check, X, Music, Coins, Wrench, Landmark, Wallet, Mail, User, Info } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-privy-auth';
import { toast } from 'sonner';
import { TIER_LIST, type TierConfig } from '@/utils/tierConfig';
import ApplePayButton from '@/components/ApplePayButton';

const PURPLE = '#8B5CF6';
const NEON_CYAN = '#00D4FF';

const GRADIENT_MAP: Record<string, string> = {
  studio: 'linear-gradient(135deg, #e6e600, #FFFF00)',
  platinum: 'linear-gradient(135deg, #0891b2, #00D4FF)',
  diamond: 'linear-gradient(135deg, #7c3aed, #a855f7)',
  legend: 'linear-gradient(135deg, #d97706, #f59e0b)',
};

export interface PackInfo {
  id: string;
  name: string;
  price: string;
  priceCents?: number;
  nftCount: number;
  tokenAmount: number;
  artistPayout: number;
  tagline?: string;
  gradient?: string;
}

interface PackCheckoutModalProps {
  songId: string;
  pack: PackInfo;
  onClose: () => void;
}

const TIER_ACCENT: Record<string, string> = {
  studio: '#FFFF00',
  platinum: '#00D4FF',
  diamond: '#a855f7',
  legend: '#f59e0b',
};

/* NFT counts per tier */
const NFT_COUNT: Record<string, number> = {
  studio: 1,
  platinum: 2,
  diamond: 3,
  legend: 5,
};

/* Revenue breakdown data — v20 tokenomics: 92% fan / 5% artist / 1.5% infra / 1.5% treasury. */
interface RevenueBreakdown {
  fanTokensPct: string;
  artistPct: string;
  infraPct: string;
  treasuryPct: string;
  note: string;
}

const REVENUE_BREAKDOWN: Record<string, RevenueBreakdown> = {
  studio: {
    fanTokensPct: '92%',
    artistPct: '5%',
    infraPct: '1.5%',
    treasuryPct: '1.5%',
    note: 'Token amount calculated live at SOL/USD oracle price',
  },
  platinum: {
    fanTokensPct: '92%',
    artistPct: '5%',
    infraPct: '1.5%',
    treasuryPct: '1.5%',
    note: 'Token amount calculated live at SOL/USD oracle price',
  },
  diamond: {
    fanTokensPct: '92%',
    artistPct: '5%',
    infraPct: '1.5%',
    treasuryPct: '1.5%',
    note: 'Token amount calculated live at SOL/USD oracle price',
  },
  legend: {
    fanTokensPct: '92%',
    artistPct: '5%',
    infraPct: '1.5%',
    treasuryPct: '1.5%',
    note: 'Token amount calculated live at SOL/USD oracle price',
  },
};

function tierToPackInfo(tier: TierConfig): PackInfo {
  return {
    id: tier.id,
    name: `${tier.name} Pack`,
    price: `$${tier.price % 1 === 0 ? tier.price : tier.price.toFixed(2)}`,
    nftCount: NFT_COUNT[tier.id] ?? 0,
    tokenAmount: 0,
    artistPayout: 0,
    gradient: tier.gradient,
  };
}

type WalletSource = 'connected' | 'privy' | 'guest';

const PackCheckoutModal: React.FC<PackCheckoutModalProps> = ({ songId, pack: initialPack, onClose }) => {
  const [submitting, setSubmitting] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState<string>(initialPack.id);
  const [walletSource, setWalletSource] = useState<WalletSource>('connected');
  const [guestEmail, setGuestEmail] = useState('');

  const activeTier = TIER_LIST.find(t => t.id === selectedTierId) ?? TIER_LIST[0];
  const pack: PackInfo = tierToPackInfo(activeTier);

  const { user, login } = useAuth();

  const truncateWallet = (addr: string | undefined) => {
    if (!addr) return 'Not connected';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCheckout = async () => {
    if ((walletSource === 'guest' || walletSource === 'privy') && !isValidEmail(guestEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSubmitting(true);
    try {
      const checkoutData: Record<string, unknown> = {
        songId,
        packId: pack.id,
        packTier: pack.id,
        walletAddress: user?.address,
        walletSource,
      };
      if (walletSource === 'guest' || walletSource === 'privy') {
        checkoutData.email = guestEmail;
      }
      const res = await api.post('/api/packs/checkout', checkoutData);
      if (res?.checkoutUrl) {
        // Same-window navigation — no popup
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Could not generate checkout link');
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('[PackCheckout] Checkout failed:', err);
      toast.error(`Checkout failed: ${err?.message || 'Unknown error'}`);
      setSubmitting(false);
    }
  };

  const handleApplePayClick = () => {
    handleCheckout();
  };

  const accentColor = TIER_ACCENT[pack.id] ?? PURPLE;
  const breakdown = REVENUE_BREAKDOWN[pack.id];
  const nftCount = NFT_COUNT[pack.id] ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      />

      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(145deg, rgba(30,12,60,0.98), rgba(15,5,30,0.99))',
          border: `1px solid ${accentColor}40`,
          boxShadow: `0 0 60px ${accentColor}20, 0 24px 48px rgba(0,0,0,0.6)`,
          maxHeight: '90vh',
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="h-1.5 w-full flex-shrink-0 transition-all duration-300"
          style={{ background: pack.gradient || GRADIENT_MAP[pack.id] || GRADIENT_MAP.bronze }}
        />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: 'rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <X size={14} />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-32">
          <div className="mb-4">
            <h2 className="text-base font-black text-white" style={{ fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.05em' }}>
              Choose Your Pack
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Select a tier — all include Song Tokens and artist support
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5">
            {TIER_LIST.map((tier) => {
              const isSelected = selectedTierId === tier.id;
              const accent = TIER_ACCENT[tier.id] ?? PURPLE;
              return (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-200 active:scale-95 ${isSelected && tier.id === 'studio' ? 'neon-card-studio' : ''}`}
                  style={{
                    background: isSelected
                      ? `linear-gradient(145deg, ${accent}22, ${accent}10)`
                      : 'rgba(255,255,255,0.04)',
                    border: isSelected
                      ? tier.id === 'studio'
                        ? '1.5px solid #FFFF00'
                        : `1.5px solid ${accent}`
                      : '1.5px solid rgba(255,255,255,0.08)',
                    boxShadow: isSelected
                      ? tier.id === 'studio'
                        ? `0 0 14px rgba(255,255,0,0.5), inset 0 0 8px rgba(255,255,0,0.15)`
                        : `0 0 14px ${accent}50, inset 0 0 8px ${accent}15`
                      : 'none',
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                    style={{
                      background: tier.gradient,
                      color: '#fff',
                      boxShadow: isSelected ? `0 0 8px ${accent}80` : 'none',
                    }}
                  >
                    {tier.name[0]}
                  </div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider leading-none"
                    style={{
                      color: isSelected ? accent : 'rgba(255,255,255,0.4)',
                      textShadow: isSelected ? `0 0 6px ${accent}` : 'none',
                      fontFamily: "'Archivo Black', sans-serif",
                    }}
                  >
                    {tier.name}
                  </span>
                  <span
                    className="text-[9px] font-bold leading-none"
                    style={{
                      color: isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
                      fontFamily: "'Inter', monospace",
                    }}
                  >
                    ${tier.price}
                  </span>
                  {isSelected && (
                    <div
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
                    >
                      <Check size={9} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div
            className="flex items-center gap-3 mb-4 p-3 rounded-xl transition-all duration-300"
            style={{
              background: `${accentColor}0a`,
              border: `1px solid ${accentColor}20`,
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{ background: pack.gradient || GRADIENT_MAP[pack.id] || GRADIENT_MAP.bronze }}
            >
              <Star size={20} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-black text-white leading-tight">{pack.name}</h3>
              <div
                className="text-lg font-black transition-all duration-300"
                style={{
                  fontFamily: "'Inter', monospace",
                  color: accentColor,
                  textShadow: `0 0 10px ${accentColor}60`,
                }}
              >
                {pack.price}
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          {breakdown && (
            <div
              className="rounded-xl p-4 mb-5 space-y-3"
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(139,92,246,0.15)',
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(220,214,240,0.4)' }}>
                Revenue Breakdown
              </div>

              <div className="flex items-center gap-1.5 mb-3">
                <Package size={13} style={{ color: accentColor }} />
                <span className="text-[11px] font-bold" style={{ color: accentColor }}>
                  {nftCount} NFT{nftCount > 1 ? 's' : ''}
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(220,214,240,0.4)' }}>
                  included
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins size={13} style={{ color: '#00FF41' }} />
                    <span className="text-[12px]" style={{ color: 'rgba(220,214,240,0.7)' }}>Fan Tokens</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0, 255, 65, 0.1)', color: '#00FF41', border: '1px solid rgba(0, 255, 65, 0.2)' }}>{breakdown.fanTokensPct}</span>
                    <span className="text-[12px] font-bold text-white font-mono">Your allocation</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music size={13} style={{ color: '#00D4FF' }} />
                    <span className="text-[12px]" style={{ color: 'rgba(220,214,240,0.7)' }}>Artist Allocation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: '#00D4FF', border: '1px solid rgba(0,212,255,0.2)' }}>{breakdown.artistPct}</span>
                    <span className="text-[12px] font-bold text-white font-mono">To artist</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench size={13} style={{ color: '#f59e0b' }} />
                    <span className="text-[12px]" style={{ color: 'rgba(220,214,240,0.7)' }}>Infrastructure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>{breakdown.infraPct}</span>
                    <span className="text-[12px] font-bold text-white font-mono">Platform ops</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark size={13} style={{ color: '#e2e8f0' }} />
                    <span className="text-[12px]" style={{ color: 'rgba(220,214,240,0.7)' }}>Treasury</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(226,232,240,0.1)', color: '#e2e8f0', border: '1px solid rgba(226,232,240,0.2)' }}>{breakdown.treasuryPct}</span>
                    <span className="text-[12px] font-bold text-white font-mono">Protocol</span>
                  </div>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(139,92,246,0.15)' }} />

              <div className="flex items-center gap-3 mt-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0, 255, 65, 0.15)', border: '1px solid rgba(0, 255, 65, 0.2)' }}>
                  <span style={{ fontSize: '14px' }}>🪙</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Song Tokens at live price</div>
                  <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>{breakdown.note}</div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Source Selector */}
          <div
            className="rounded-xl p-4 mb-5 space-y-3"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(139,92,246,0.15)',
            }}
          >
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(220,214,240,0.4)' }}>
              How would you like to receive your pack?
            </div>

            <div className="space-y-2">
              {/* Connected Wallet */}
              <button
                onClick={() => setWalletSource('connected')}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: walletSource === 'connected'
                    ? `linear-gradient(145deg, ${accentColor}22, ${accentColor}10)`
                    : 'rgba(255,255,255,0.04)',
                  border: walletSource === 'connected'
                    ? `1.5px solid ${accentColor}`
                    : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: walletSource === 'connected'
                    ? `0 0 14px ${accentColor}50, inset 0 0 8px ${accentColor}15`
                    : 'none',
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: walletSource === 'connected' ? accentColor : 'rgba(255,255,255,0.08)' }}>
                  <Wallet size={16} color={walletSource === 'connected' ? '#000' : 'rgba(255,255,255,0.5)'} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[12px] font-bold text-white">Connected Wallet</div>
                  <div className="text-[10px] font-mono" style={{ color: 'rgba(220,214,240,0.4)' }}>
                    {user?.address ? truncateWallet(user.address) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); login(); }}
                        className="text-[10px] underline"
                        style={{ color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Connect Phantom
                      </button>
                    )}
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${walletSource === 'connected' ? accentColor : 'rgba(255,255,255,0.2)'}` }}>
                  {walletSource === 'connected' && <Check size={10} color={accentColor} strokeWidth={3} />}
                </div>
              </button>

              {/* Email Wallet (Privy) */}
              <button
                onClick={() => setWalletSource('privy')}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 active:scale-[0.98] relative"
                style={{
                  background: walletSource === 'privy'
                    ? `linear-gradient(145deg, ${accentColor}22, ${accentColor}10)`
                    : 'rgba(255,255,255,0.04)',
                  border: walletSource === 'privy'
                    ? `1.5px solid ${accentColor}`
                    : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: walletSource === 'privy'
                    ? `0 0 14px ${accentColor}50, inset 0 0 8px ${accentColor}15`
                    : 'none',
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: walletSource === 'privy' ? accentColor : 'rgba(255,255,255,0.08)' }}>
                  <Mail size={16} color={walletSource === 'privy' ? '#000' : 'rgba(255,255,255,0.5)'} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[12px] font-bold text-white">Email Wallet (Privy)</div>
                  <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>
                    Create a wallet linked to your email
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${walletSource === 'privy' ? accentColor : 'rgba(255,255,255,0.2)'}` }}>
                  {walletSource === 'privy' && <Check size={10} color={accentColor} strokeWidth={3} />}
                </div>
              </button>

              {/* Guest Checkout */}
              <button
                onClick={() => setWalletSource('guest')}
                className="w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 active:scale-[0.98] relative"
                style={{
                  background: walletSource === 'guest'
                    ? `linear-gradient(145deg, ${accentColor}22, ${accentColor}10)`
                    : 'rgba(255,255,255,0.04)',
                  border: walletSource === 'guest'
                    ? `1.5px solid ${accentColor}`
                    : '1.5px solid rgba(255,255,255,0.08)',
                  boxShadow: walletSource === 'guest'
                    ? `0 0 14px ${accentColor}50, inset 0 0 8px ${accentColor}15`
                    : 'none',
                }}
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: walletSource === 'guest' ? accentColor : 'rgba(255,255,255,0.08)' }}>
                  <User size={16} color={walletSource === 'guest' ? '#000' : 'rgba(255,255,255,0.5)'} />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-[12px] font-bold text-white">Guest Checkout</div>
                  <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>
                    Enter email, we create a wallet automatically
                  </div>
                </div>
                <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ border: `1.5px solid ${walletSource === 'guest' ? accentColor : 'rgba(255,255,255,0.2)'}` }}>
                  {walletSource === 'guest' && <Check size={10} color={accentColor} strokeWidth={3} />}
                </div>
              </button>
            </div>

            {/* Email input for guest/privy */}
            {(walletSource === 'guest' || walletSource === 'privy') && (
              <div className="space-y-2 mt-3">
                <input
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: `1px solid ${guestEmail && isValidEmail(guestEmail) ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    color: '#fff',
                    fontFamily: "'Inter', monospace",
                  }}
                />
                {walletSource === 'guest' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" defaultChecked className="rounded" style={{ accentColor }} />
                    <span className="text-[11px]" style={{ color: 'rgba(220,214,240,0.5)' }}>
                      Create my wallet automatically
                    </span>
                  </label>
                )}
                {walletSource === 'privy' && (
                  <p className="text-[10px]" style={{ color: 'rgba(220,214,240,0.35)' }}>
                    A Privy email wallet will be created for receiving your tokens and NFTs.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment method badges */}
          <div className="flex items-center justify-center gap-1.5 mt-3 flex-wrap">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(220,214,240,0.6)">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              <span className="text-[9px] font-bold" style={{ color: 'rgba(220,214,240,0.6)', letterSpacing: '0.04em' }}>Apple Pay</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 10.5v3h4.9c-.2 1.1-1.4 3.3-4.9 3.3-3 0-5.4-2.5-5.4-5.5s2.4-5.5 5.4-5.5c1.7 0 2.8.7 3.4 1.3l2.3-2.2C16.3 3.5 14.3 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.7H12z" fill="rgba(220,214,240,0.6)"/>
              </svg>
              <span className="text-[9px] font-bold" style={{ color: 'rgba(220,214,240,0.6)', letterSpacing: '0.04em' }}>Google Pay</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span className="text-[9px] font-black italic" style={{ color: 'rgba(220,214,240,0.6)', letterSpacing: '0.05em' }}>VISA</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center -space-x-1">
                <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(235,77,55,0.7)' }} />
                <div className="w-3 h-3 rounded-full" style={{ background: 'rgba(255,175,25,0.7)' }} />
              </div>
              <span className="text-[9px] font-bold" style={{ color: 'rgba(220,214,240,0.6)', letterSpacing: '0.04em' }}>MC</span>
            </div>
          </div>
        </div>

        {/* Sticky checkout button bar — always visible at bottom */}
        <div
          className="flex-shrink-0 p-4 sm:p-5"
          style={{
            borderTop: '1px solid rgba(139,92,246,0.2)',
            background: 'linear-gradient(180deg, rgba(30,12,60,0) 0%, rgba(15,5,30,1) 30%)',
          }}
        >
          <div className="space-y-3">
            <ApplePayButton
              onClick={handleApplePayClick}
              disabled={submitting}
              size="large"
            />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(220,214,240,0.3)' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button
              onClick={handleCheckout}
              disabled={submitting}
              className="w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.97]"
              style={{
                background: pack.gradient || GRADIENT_MAP[pack.id] || GRADIENT_MAP.bronze,
                color: '#fff',
                boxShadow: `0 4px 20px ${accentColor}40, 0 4px 16px rgba(0,0,0,0.4)`,
                border: `1px solid ${accentColor}40`,
                minHeight: '48px',
                fontFamily: "'Archivo Black', sans-serif",
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Going to Checkout...
                </>
              ) : (
                'Checkout'
              )}
            </button>
          </div>
          <p className="text-[10px] text-center mt-3" style={{ color: 'rgba(220,214,240,0.3)' }}>
            Secure checkout. Tokens delivered to your wallet.
          </p>
        </div>

      </div>
    </div>
  );
};

export default PackCheckoutModal;
