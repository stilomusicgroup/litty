import React, { useState } from 'react';
import { Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-privy-auth';
import PackCheckoutModal from '@/components/PackCheckoutModal';
import { TIER_LIST, type TierConfig } from '@/utils/tierConfig';
import type { PackInfo } from '@/components/PackCheckoutModal';

const PURPLE = '#8B5CF6';

function tierToPackInfo(tier: TierConfig): PackInfo {
  return {
    id: tier.id,
    name: `${tier.name} Pack`,
    price: `$${tier.price % 1 === 0 ? tier.price : tier.price.toFixed(2)}`,
    nftCount: 0,
    tokenAmount: 0, // calculated dynamically at purchase time
    artistPayout: 0,
  };
}

const PackBuyButtons: React.FC<{ songId: string; size?: 'small' | 'normal' }> = ({ songId, size = 'normal' }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<PackInfo | null>(null);
  const { user } = useAuth();

  const handleBuy = async (tier: TierConfig) => {
    if (size === 'normal') {
      setSelectedPack(tierToPackInfo(tier));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/api/packs/checkout', { songId, packId: tier.id, packTier: tier.id, walletAddress: user?.address });
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Could not generate checkout link');
      }
    } catch (err: any) {
      console.error('[PackBuyButtons] Checkout failed:', err);
      toast.error(`Checkout failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  if (size === 'small') {
    return (
      <>
        <div className="flex-col gap-1.5">
          {TIER_LIST.map((tier) => (
            <button
              key={tier.id}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleBuy(tier);
              }}
              disabled={loading}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-[0.97] disabled:opacity-60 ${tier.id === 'studio' ? 'neon-card-studio' : ''}`}
              style={{
                background: tier.gradient,
                color: '#fff',
                boxShadow: tier.id === 'studio' ? '0 0 20px rgba(255,255,0,0.4)' : '0 0 20px rgba(139,92,246,0.4)',
                border: tier.id === 'studio' ? '1.5px solid #FFFF00' : '1px solid rgba(255,255,255,0.1)',
                minHeight: '32px',
              }}
            >
              <span className="flex items-center gap-1.5">
                {loading ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Package size={12} color="#fff" />
                )}
                <span>{tier.name}</span>
              </span>
              <span style={{ fontFamily: "'Inter', monospace", fontSize: '0.6rem', opacity: 0.8 }}>
                at market rate
              </span>
              <span style={{ fontFamily: "'Inter', monospace", fontWeight: 900 }}>
                ${tier.price}
              </span>
            </button>
          ))}
        </div>
        {selectedPack && (
          <PackCheckoutModal
            songId={songId}
            pack={selectedPack}
            onClose={() => setSelectedPack(null)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {TIER_LIST.map((tier) => (
          <button
            key={tier.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleBuy(tier);
            }}
            disabled={loading}
            className={`group relative overflow-hidden rounded-xl p-4 transition-all duration-300 active:scale-[0.97] disabled:opacity-60 text-left ${tier.id === 'studio' ? 'neon-card-studio' : ''}`}
            style={{
              background: 'linear-gradient(145deg, rgba(30,20,60,0.95), rgba(15,10,30,0.98))',
              border: tier.id === 'studio' ? '1.5px solid #FFFF00' : '1.5px solid rgba(139,92,246,0.3)',
              boxShadow: tier.id === 'studio' ? '0 0 20px rgba(255,255,0,0.4)' : '0 0 20px rgba(139,92,246,0.15)',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (tier.id === 'studio') {
                el.style.borderColor = '#FFFF00';
                el.style.boxShadow = '0 0 30px rgba(255,255,0,0.5)';
              } else {
                el.style.borderColor = 'rgba(139,92,246,0.5)';
                el.style.boxShadow = '0 0 25px rgba(139,92,246,0.15)';
              }
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLElement;
              if (tier.id === 'studio') {
                el.style.borderColor = '#FFFF00';
                el.style.boxShadow = '0 0 20px rgba(255,255,0,0.4)';
              } else {
                el.style.borderColor = 'rgba(139,92,246,0.2)';
                el.style.boxShadow = 'none';
              }
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: tier.gradient }} />

            <div className="text-left space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                  style={{ background: tier.gradient, color: '#fff' }}>
                  {tier.name[0]}
                </div>
                <h3 className="text-sm font-black text-white">{tier.name} Pack</h3>
              </div>

              <span
                className="text-lg font-black inline-block"
                style={{
                  fontFamily: "'Inter', monospace",
                  color: tier.id === 'diamond' ? '#a855f7' : tier.id === 'legend' ? '#f59e0b' : tier.borderColor,
                }}
              >
                ${tier.price}
              </span>

              <div className="space-y-1">
                <p className="text-xs font-medium" style={{ color: 'rgba(220,214,240,0.6)' }}>
                  <span style={{ color: '#c4b5fd', fontWeight: 700 }}>Tokens</span> at market rate
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(220,214,240,0.35)' }}>
                  {tier.label}
                </p>
              </div>

              <div
                className="w-full py-2.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5"
                style={{
                  background: tier.gradient,
                  color: '#fff',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                Buy {tier.name}
              </div>
            </div>
          </button>
        ))}
      </div>

      {selectedPack && (
        <PackCheckoutModal
          songId={songId}
          pack={selectedPack}
          onClose={() => setSelectedPack(null)}
        />
      )}
    </>
  );
};

export default PackBuyButtons;
