import React, { useState } from 'react';
import { Package, Loader2, Info, Zap, ShieldCheck, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { triggerHapticFeedback } from '@/utils/haptic';
import PackCheckoutModal, { type PackInfo } from '@/components/PackCheckoutModal';
import { TIER_LIST, type TierConfig } from '@/utils/tierConfig';

const PURPLE = '#BF00FF';
const NEON_CYAN = '#00D4FF';
const NEON_GREEN = '#00FF41';

// Allocation data per tier — what buyers get and how funds flow
const TIER_ALLOCATION: Record<string, { nftCount: number; coinPercent: number; artistPercent: number }> = {
  studio: { nftCount: 1, coinPercent: 5, artistPercent: 95 },
  platinum: { nftCount: 2, coinPercent: 8, artistPercent: 92 },
  diamond: { nftCount: 3, coinPercent: 10, artistPercent: 90 },
  legend: { nftCount: 5, coinPercent: 15, artistPercent: 85 },
};

// Max editions cap — enforced by NFT limit
const MAX_EDITIONS = 10;

interface PackSectionProps {
  songId?: string;
  tokenPriceUsd?: number;
  layout?: 'grid' | 'horizontal';
}

// Map tier id to PackInfo for checkout modal compatibility
function tierToPackInfo(tier: TierConfig): PackInfo {
  return {
    id: tier.id,
    name: `${tier.name} Pack`,
    price: `$${tier.price % 1 === 0 ? tier.price : tier.price.toFixed(2)}`,
    nftCount: 0,
    tokenAmount: 0, // calculated dynamically at purchase time based on current token price
    artistPayout: 0,
  };
}

/** Tier detail modal — simplified percentage breakdown */
const TierDetailModal: React.FC<{
  tier: TierConfig;
  onClose: () => void;
  onBuy: () => void;
}> = ({ tier, onClose, onBuy }) => {
  const percentageRows = [
    { emoji: '🪙', label: 'Fan Tokens', pct: '92%', color: '#00FF41' },
    { emoji: '🎤', label: 'Artist Allocation', pct: '5%', color: '#00D4FF' },
    { emoji: '⚙️', label: 'Infrastructure', pct: '1.5%', color: '#9CA3AF' },
    { emoji: '🏛', label: 'Treasury', pct: '1.5%', color: '#8B5CF6' },
  ];

  const priceStr = tier.price % 1 === 0 ? tier.price.toFixed(0) : tier.price.toFixed(2);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(20,12,40,0.99) 0%, rgba(10,5,25,0.99) 100%)',
          border: `2px solid ${tier.borderColor}`,
          boxShadow: `0 0 20px ${tier.glowColor}, 0 0 40px ${tier.glowColor}40, inset 0 0 15px ${tier.glowColor}15`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1.5 w-full flex-shrink-0" style={{ background: tier.gradient }} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <X size={16} style={{ color: '#fff' }} />
        </button>

        <div className="p-5">
          {/* Header */}
          <h3 className="text-base font-black text-white mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            🪙 Song Token Purchase
          </h3>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
            v20 tokenomics — ${priceStr} at live SOL/USD price
          </p>

          {/* Percentage rows */}
          <div className="space-y-1.5 mb-4">
            {percentageRows.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {row.emoji} {row.label}
                </span>
                <span className="font-black font-mono" style={{ color: row.color, textShadow: `0 0 6px ${row.color}40` }}>
                  {row.pct}
                </span>
              </div>
            ))}
          </div>

          {/* Segmented bar */}
          <div className="w-full h-2 rounded-full overflow-hidden flex mb-1" style={{ gap: '1px' }}>
            <div style={{ width: '92%', background: '#00FF41' }} />
            <div style={{ width: '5%', background: '#00D4FF' }} />
            <div style={{ width: '1.5%', background: '#9CA3AF' }} />
            <div style={{ width: '1.5%', background: '#8B5CF6' }} />
          </div>

          {/* Link to full breakdown */}
          <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Full breakdown on the <a href="/about" style={{ color: NEON_CYAN, textDecoration: 'underline' }}>About page</a>
          </p>

          {/* Footer */}
          <div className="text-center mb-4 space-y-1">
            <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Token price set live by <span style={{ color: '#00FF41', fontWeight: 700 }}>SOL/USD oracle</span> at purchase time
            </p>
          </div>

          {/* View More button */}
          <button
            onClick={() => {
              onBuy();
            }}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.97]"
            style={{
              background: tier.gradient,
              color: '#fff',
              boxShadow: `0 0 16px ${tier.glowColor}, 0 4px 12px rgba(0,0,0,0.3)`,
              border: `1.5px solid ${tier.borderColor}`,
              fontFamily: "'Archivo Black', sans-serif",
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            VIEW MORE
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PackSection: React.FC<PackSectionProps> = ({ songId, layout = 'grid' }: PackSectionProps) => {
  const navigate = useNavigate();
  const [loading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackInfo | null>(null);
  const [detailTier, setDetailTier] = useState<TierConfig | null>(null);

  const handleViewDetails = (tier: TierConfig) => {
    setDetailTier(tier);
  };

  const handleBuyFromModal = (tier: TierConfig) => {
    setDetailTier(null); // close detail modal so checkout isn't blocked
    if (songId) {
      setSelectedPack(tierToPackInfo(tier));
    } else {
      navigate(`/song/${tier.id}`);
    }
  };

  const isPopular = (tier: TierConfig) => tier.id === 'platinum';

  return (
    <>
      <div
        className="relative overflow-hidden rounded-lg sm:rounded-3xl"
        style={{
          background: 'linear-gradient(145deg, rgba(15,10,30,0.95) 0%, rgba(10,5,20,0.98) 100%)',
          border: `1.5px solid rgba(0, 255, 65, 0.2)`,
          boxShadow: `0 0 20px rgba(0, 255, 65, 0.06), 0 0 40px rgba(0,212,255,0.03)`,
          backdropFilter: 'blur(20px)',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
          <div style={{
            position: 'absolute', top: '-20%', right: '-10%',
            width: '300px', height: '300px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0, 255, 65, 0.06) 0%, transparent 70%)',
          }} />
          <div style={{
            position: 'absolute', bottom: '-30%', left: '-5%',
            width: '250px', height: '250px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.05) 0%, transparent 70%)',
          }} />
        </div>

        <div className="relative z-10 p-2 sm:p-6">
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
              style={{
                background: 'rgba(0, 255, 65, 0.08)',
                border: `1px solid rgba(0, 255, 65, 0.2)`,
                boxShadow: `0 0 10px rgba(0, 255, 65, 0.15)`,
              }}
            >
              <Zap size={10} color={NEON_GREEN} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON_GREEN }}>
                {songId ? 'Support This Artist' : 'Buy Music Packs'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white mb-1">
              {songId ? 'Get Song Tokens' : 'Support Artists Directly'}
            </h2>
            <p className="text-xs sm:text-sm" style={{ color: '#FFFFFF' }}>
              {songId
                ? 'Choose a pack to receive tokens and support this artist'
                : 'Choose a pack below to buy tokens and support your favorite artists'}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: PURPLE }} />
              <span className="ml-3 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Loading packs...
              </span>
            </div>
          ) : layout === 'horizontal' ? (
            <div className="space-y-3">
              {/* Header section matching the image */}
              {songId && (
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
                    style={{
                      background: 'rgba(0, 255, 65, 0.12)',
                      border: `1px solid rgba(0, 255, 65, 0.3)`,
                      boxShadow: `0 0 12px rgba(0, 255, 65, 0.15)`,
                    }}
                  >
                    <ShieldCheck size={12} color={NEON_GREEN} />
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON_GREEN }}>
                      Support This Artist
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                    GET NFTs + SONG COINS
                  </h2>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    Choose a pack to receive NFTs and Song Coins — % allocation locked at purchase
                  </p>
                </div>
              )}

              {TIER_LIST.map((tier) => {
                const borderColor = tier.borderColor ?? 'rgba(0, 255, 65, 0.3)';
                const glowColor = tier.glowColor ?? 'rgba(0, 255, 65, 0.3)';
                const popular = isPopular(tier);
                const alloc = TIER_ALLOCATION[tier.id] ?? { nftCount: 1, coinPercent: 10, artistPercent: 90 };

                return (
                  <div
                    key={tier.id}
                    className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-all duration-300 cursor-pointer group ${tier.id === 'studio' ? 'neon-card-studio' : ''}`}
                    style={{
                      background: popular
                        ? 'linear-gradient(145deg, rgba(25,15,45,0.98), rgba(15,8,35,0.99))'
                        : 'linear-gradient(145deg, rgba(20,12,40,0.95), rgba(10,5,25,0.98))',
                      border: tier.id === 'studio' ? `2px solid #FFFF00` : `2px solid ${borderColor}`,
                      boxShadow: popular
                        ? `0 0 24px ${glowColor}, 0 0 40px ${glowColor}30`
                        : tier.id === 'studio'
                          ? `0 0 15px rgba(255,255,0,0.45)`
                          : `0 0 15px ${glowColor}`,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(-2px)';
                      el.style.boxShadow = popular
                        ? `0 8px 30px ${glowColor}, 0 0 20px ${borderColor}`
                        : tier.id === 'studio'
                          ? `0 0 30px rgba(255,255,0,0.6), 0 0 20px rgba(255,255,0,0.3)`
                          : `0 8px 30px ${glowColor}, 0 0 20px ${borderColor}`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = popular
                        ? `0 0 24px ${glowColor}, 0 0 40px ${glowColor}30`
                        : tier.id === 'studio'
                          ? `0 0 15px rgba(255,255,0,0.45)`
                          : `0 0 15px ${glowColor}`;
                    }}
                  >
                    {/* Popular badge */}
                    {popular && (
                      <div className="absolute -top-0 right-4 px-3 py-1 rounded-b-lg text-[9px] font-black uppercase tracking-wider"
                        style={{
                          background: `linear-gradient(135deg, ${NEON_GREEN}, ${NEON_CYAN})`,
                          color: '#000',
                          textShadow: 'none',
                        }}>
                        MOST POPULAR
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      {/* Left: Tier icon + name + label */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black"
                          style={{
                            background: tier.gradient,
                            color: 'white',
                            border: `1.5px solid ${borderColor}`,
                            boxShadow: `0 0 12px ${glowColor}`,
                            fontFamily: "'Archivo Black', sans-serif",
                          }}>
                          {tier.name[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black text-white leading-tight" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
                              {tier.name}
                            </h3>
                          </div>
                          <p className="text-[10px] font-semibold mt-0.5" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                            {tier.label}
                          </p>
                        </div>
                      </div>

                      {/* Middle: Allocation info rows */}
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <span style={{ fontSize: '13px' }}>🖼️</span>
                          <span className="font-bold text-white">{alloc.nftCount} NFT</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <Info size={12} style={{ color: NEON_CYAN }} />
                          <span className="font-bold" style={{ color: NEON_CYAN }}>{alloc.coinPercent}%</span>
                          <span>&rarr; Coins</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                          <Zap size={12} style={{ color: NEON_GREEN }} />
                          <span className="font-bold" style={{ color: NEON_GREEN }}>{alloc.artistPercent}%</span>
                          <span>&rarr; Artist</span>
                        </div>
                      </div>

                      {/* Right: Price + View Details button */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-2xl font-black"
                          style={{ fontFamily: "'Inter', monospace", color: NEON_CYAN, textShadow: `0 0 10px rgba(0,212,255,0.4)` }}>
                          ${tier.price % 1 === 0 ? tier.price : tier.price.toFixed(2)}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerHapticFeedback();
                            handleViewDetails(tier);
                          }}
                          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.97] whitespace-nowrap"
                          style={{
                            background: 'rgba(0,212,255,0.08)',
                            border: `1.5px solid ${NEON_CYAN}`,
                            color: NEON_CYAN,
                            boxShadow: `0 0 12px rgba(0,212,255,0.3), inset 0 0 8px rgba(0,212,255,0.05)`,
                            textShadow: `0 0 6px rgba(0,212,255,0.5)`,
                            fontFamily: "'Archivo Black', sans-serif",
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                          }}
                          onMouseEnter={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(0,212,255,0.15)';
                            el.style.boxShadow = `0 0 18px rgba(0,212,255,0.5), 0 0 30px rgba(0,212,255,0.2)`;
                          }}
                          onMouseLeave={e => {
                            const el = e.currentTarget as HTMLElement;
                            el.style.background = 'rgba(0,212,255,0.08)';
                            el.style.boxShadow = `0 0 12px rgba(0,212,255,0.3), inset 0 0 8px rgba(0,212,255,0.05)`;
                          }}
                        >
                          VIEW DETAILS
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
              {TIER_LIST.map((tier) => {
                const borderColor = tier.borderColor ?? 'rgba(0, 255, 65, 0.3)';
                const glowColor = tier.glowColor ?? 'rgba(0, 255, 65, 0.3)';
                const popular = isPopular(tier);

                return (
                  <div
                    key={tier.id}
                    className={`card-shine relative overflow-hidden rounded-xl p-4 sm:p-5 transition-all duration-300 cursor-pointer group ${tier.id === 'studio' ? 'neon-card-studio' : ''}`}
                    style={{
                      background: popular
                        ? 'linear-gradient(145deg, rgba(25,15,45,0.98), rgba(15,8,35,0.99))'
                        : 'linear-gradient(145deg, rgba(20,12,40,0.95), rgba(10,5,25,0.98))',
                      border: tier.id === 'studio' ? '2px solid #FFFF00' : `2px solid ${borderColor}`,
                      boxShadow: popular ? `0 0 24px ${glowColor}, 0 0 40px ${glowColor}30` : tier.id === 'studio' ? `0 0 15px rgba(255,255,0,0.45)` : `0 0 15px ${glowColor}`,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(-2px)';
                      el.style.boxShadow = `0 8px 30px ${glowColor}, 0 0 20px ${borderColor}`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = popular ? `0 0 24px ${glowColor}, 0 0 40px ${glowColor}30` : `0 0 15px ${glowColor}`;
                    }}
                  >
                    <div className="card-shine-overlay rounded-xl" />
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ background: tier.gradient }} />

                    {popular && (
                      <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider"
                        style={{
                          background: 'rgba(0,212,255,0.15)',
                          color: NEON_CYAN,
                          border: `1px solid rgba(0,212,255,0.3)`,
                          textShadow: `0 0 4px rgba(0,212,255,0.5)`,
                        }}>
                        Popular
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                        style={{
                          background: tier.gradient,
                          color: 'white',
                          border: `1px solid ${borderColor}`,
                          boxShadow: `0 0 8px ${glowColor}`,
                        }}>
                        {tier.name[0]}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white leading-tight">{tier.name}</h3>
                        <p className="text-[9px] font-semibold" style={{ color: '#FFFFFF' }}>{tier.label}</p>
                      </div>
                    </div>

                    <div className="text-2xl font-black mb-3"
                      style={{ fontFamily: "'Inter', monospace", color: NEON_CYAN, textShadow: `0 0 10px rgba(0,212,255,0.4)` }}>
                      ${tier.price % 1 === 0 ? tier.price : tier.price.toFixed(2)}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-xs" style={{ color: '#FFFFFF' }}>
                        <span style={{ fontSize: '14px' }}>🎁</span>
                        <span className="font-bold" style={{ color: NEON_CYAN }}>Song Token Pack</span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHapticFeedback();
                        handleViewDetails(tier);
                      }}
                      className="w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 active:scale-[0.97]"
                      style={{
                        background: 'rgba(0,212,255,0.08)',
                        border: `1.5px solid ${NEON_CYAN}`,
                        color: NEON_CYAN,
                        boxShadow: `0 0 12px rgba(0,212,255,0.3), inset 0 0 8px rgba(0,212,255,0.05)`,
                        textShadow: `0 0 6px rgba(0,212,255,0.5)`,
                        fontFamily: "'Archivo Black', sans-serif",
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                      }}
                      onMouseEnter={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'rgba(0,212,255,0.15)';
                        el.style.boxShadow = `0 0 18px rgba(0,212,255,0.5), 0 0 30px rgba(0,212,255,0.2)`;
                      }}
                      onMouseLeave={e => {
                        const el = e.currentTarget as HTMLElement;
                        el.style.background = 'rgba(0,212,255,0.08)';
                        el.style.boxShadow = `0 0 12px rgba(0,212,255,0.3), inset 0 0 8px rgba(0,212,255,0.05)`;
                      }}
                    >
                      <Info size={12} />
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {detailTier && (
        <TierDetailModal
          tier={detailTier}
          onClose={() => setDetailTier(null)}
          onBuy={() => handleBuyFromModal(detailTier)}
        />
      )}

      {selectedPack && songId && (
        <PackCheckoutModal
          songId={songId}
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
        />
      )}
    </>
  );
};

export default PackSection;
