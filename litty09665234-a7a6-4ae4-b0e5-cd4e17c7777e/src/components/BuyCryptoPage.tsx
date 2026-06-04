import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { Coins, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import RiskDisclaimerBanner from '@/components/RiskDisclaimerBanner';

const BuyCryptoPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;
  const [isLoading, setIsLoading] = useState(false);

  const openRamp = () => {
    if (!walletAddress) {
      toast.error('Please connect your wallet first');
      login();
      return;
    }
    setIsLoading(true);
    const script = document.createElement('script');
    script.src = 'https://cdn.ramp.network/v4/main.js';
    script.onload = () => {
      setIsLoading(false);
      // @ts-expect-error Ramp widget types not available
      window.RampWidget.createWidget({
        host: document.body,
        swapAsset: 'SOL',
        userAddress: walletAddress,
      });
    };
    script.onerror = () => {
      setIsLoading(false);
      toast.error('Failed to load Ramp. Please try again.');
    };
    document.head.appendChild(script);
    toast.success('Opening Ramp...');
  };

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      <RiskDisclaimerBanner />
      <div className="container pt-20 pb-24 max-w-2xl px-4 sm:px-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:text-primary transition-colors py-2"
          style={{ color: 'rgba(220,214,240,0.5)', minHeight: '44px' }}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div className="text-center mb-6 sm:mb-8">
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
              border: '1px solid rgba(139,92,246,0.25)',
            }}
          >
            <Coins size={28} style={{ color: '#a78bfa' }} />
          </div>
          <h1
            className="text-2xl sm:text-3xl font-black mb-2"
            style={{
              background: 'linear-gradient(135deg, #e0d7ff, #a78bfa, #f472b6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Buy SOL
          </h1>
          <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
            Instant purchase with Apple Pay, Google Pay, or card
          </p>
        </div>

        {/* Apple Pay Hero Button */}
        <button
          onClick={openRamp}
          disabled={!isAuthenticated || isLoading}
          className="w-full py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg transition-all flex flex-col items-center justify-center gap-2 disabled:opacity-50 mb-6"
          style={{
            background: '#000000',
            color: '#fff',
            boxShadow: '0 0 32px rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {isLoading ? (
            <span className="animate-pulse">Loading...</span>
          ) : (
            <>
              <span className="text-xl font-black">Buy SOL with Apple Pay</span>
              <span className="text-sm font-normal" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Apple Pay • Google Pay • Card • Bank
              </span>
            </>
          )}
        </button>

        {/* Alternative Payment Methods */}
        <div
          className="p-4 rounded-xl mb-6"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(139,92,246,0.1)',
          }}
        >
          <div className="text-xs font-bold tracking-wider uppercase mb-3" style={{ color: 'rgba(220,214,240,0.4)' }}>
            All Payment Options
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', minHeight: '64px' }}>
              <div className="text-lg mb-1">🍎</div>
              <div className="text-xs font-semibold text-white">Apple Pay</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', minHeight: '64px' }}>
              <div className="text-lg mb-1">💳</div>
              <div className="text-xs font-semibold text-white">Google Pay</div>
            </div>
            <div className="p-3 rounded-lg" style={{ background: 'rgba(139,92,246,0.1)', minHeight: '64px' }}>
              <div className="text-lg mb-1">🏦</div>
              <div className="text-xs font-semibold text-white">Bank Transfer</div>
            </div>
          </div>
        </div>

        {/* Wallet Address Card */}
        <div
          className="p-4 rounded-2xl mb-6"
          style={{
            background: 'linear-gradient(145deg, rgba(30,20,60,0.9), rgba(15,10,30,0.95))',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Buying for wallet
              </div>
              {walletAddress ? (
                <div
                  className="text-sm font-mono"
                  style={{ fontFamily: "'Inter', monospace", color: '#c4b5fd' }}
                >
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'rgba(220,214,240,0.4)' }}>
                  No wallet connected
                </div>
              )}
            </div>
            {!walletAddress && (
              <button
                onClick={login}
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: 'white',
                }}
              >
                Connect
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div
          className="mt-6 p-4 rounded-xl"
          style={{
            background: 'rgba(16,185,129,0.06)',
            border: '1px solid rgba(16,185,129,0.12)',
          }}
        >
          <div className="text-xs" style={{ color: 'rgba(220,214,240,0.5)' }}>
            <span style={{ color: '#10B981' }} className="font-semibold">Note:</span> Ramp
            processes all transactions. Your SOL will be sent directly to your connected wallet.
            Lit Studios does not custody your funds.
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyCryptoPage;
