import { useAuth } from '@/hooks/use-privy-auth';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { hapticSuccess } from '@/utils/haptic';
import { CheckCircle, Music, Loader2, ArrowRight, Wallet, Sparkles, Package, Zap, Star, AlertCircle, ExternalLink } from 'lucide-react';
import { logError } from '@/hooks/use-error-logger';
import confetti from 'canvas-confetti';

const BG = 'transparent';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';

const CONFETTI_COLORS = ['#FFD700', '#FFC200', '#8B5CF6', '#A78BFA', '#FFFFFF', '#F3E8FF'];

function useConfettiBurst() {
  useEffect(() => {
    const fire = (opts: confetti.Options) =>
      confetti({
        particleCount: opts.particleCount ?? 80,
        spread: opts.spread ?? 70,
        origin: opts.origin ?? { x: 0.5, y: 0.1 },
        colors: CONFETTI_COLORS,
        startVelocity: opts.startVelocity ?? 45,
        gravity: 0.9,
        scalar: 1.1,
        ticks: 200,
      });

    fire({ particleCount: 100, spread: 80, startVelocity: 50 });
    const t = setTimeout(() => {
      fire({ particleCount: 60, spread: 60, origin: { x: 0.35, y: 0.1 }, startVelocity: 40 });
      fire({ particleCount: 60, spread: 60, origin: { x: 0.65, y: 0.1 }, startVelocity: 40 });
    }, 500);
    return () => clearTimeout(t);
  }, []);
}

// ─── Purchase record (safe fields from API) ────────────────────────────────────

interface PurchaseRecord {
  id: string;
  status: string;
  songId?: string;
  nftCount: number;
  tokenAmount: number;
  shopifyOrderId: string;
  createdAt: number;
  packId?: string;
  packName?: string;
  splTxHash?: string;
  nftTxHashes?: string;
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ShopifySuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderIdFromParams = searchParams.get('order_id') || searchParams.get('orderId') || '';
  const songIdFromParams = searchParams.get('songId') || '';
  const { loading, user, login, logout } = useAuth();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;
  const isLoading = loading;
  const email = (user as any)?.email ?? null;
  const displayName = email
    ? email.split('@')[0]
    : walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : 'Supporter';

  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [isCheckingPurchases, setIsCheckingPurchases] = useState(false);
  const [isFetchingOrder, setIsFetchingOrder] = useState(false);
  const [orderPurchases, setOrderPurchases] = useState<PurchaseRecord[]>([]);
  const [orderFetchStatus, setOrderFetchStatus] = useState<'none' | 'loading' | 'found' | 'not-found'>('none');

  useConfettiBurst();

  // Fire success haptic once on mount — user has just returned from Shopify checkout
  useEffect(() => { hapticSuccess(); }, []);

  // Fetch purchases by order ID from the public API (with optional songId context)
  const effectiveSongId = songIdFromParams;

  // Auto-redirect to /collection after 5 seconds (only for authenticated users with order data loaded)
  useEffect(() => {
    if (isAuthenticated && orderFetchStatus !== 'loading') {
      const timer = setTimeout(() => navigate('/collection'), 5000);
      return () => clearTimeout(timer);
    }
  }, [navigate, isAuthenticated, orderFetchStatus]);

  // Fetch purchases by order ID from the public API
  useEffect(() => {
    if (!orderIdFromParams) return;

    const fetchOrderPurchases = async () => {
      setIsFetchingOrder(true);
      setOrderFetchStatus('loading');
      try {
        const response = await fetch(`/api/purchases/by-order/${encodeURIComponent(orderIdFromParams)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.purchases && Array.isArray(data.purchases)) {
            setOrderPurchases(data.purchases);
            setOrderFetchStatus(data.purchases.length > 0 ? 'found' : 'not-found');
          } else {
            setOrderFetchStatus('not-found');
          }
        } else {
          setOrderFetchStatus('not-found');
        }
      } catch (error) {
        console.error('Failed to fetch order purchases:', error);
        logError({ message: 'Failed to fetch order purchases', context: String(error), level: 'error', source: 'frontend' });
        setOrderFetchStatus('not-found');
      } finally {
        setIsFetchingOrder(false);
      }
    };

    fetchOrderPurchases();
  }, [orderIdFromParams]);

  // Auto-refresh every 10 seconds when there are pending purchases
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasPendingPurchases = orderPurchases.some((p) => p.status === 'pending');

  const doRefresh = useCallback(async () => {
    if (!orderIdFromParams) return;
    try {
      const response = await fetch(`/api/purchases/by-order/${encodeURIComponent(orderIdFromParams)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.purchases && Array.isArray(data.purchases)) {
          setOrderPurchases(data.purchases);
          if (data.purchases.length > 0) {
            setOrderFetchStatus('found');
          }
        }
      }
    } catch (err) {
      console.error('Auto-refresh failed:', err);
      logError({ message: 'Auto-refresh failed for order purchases', context: String(err), level: 'warn', source: 'frontend' });
    }
  }, [orderIdFromParams]);

  useEffect(() => {
    if (hasPendingPurchases) {
      refreshTimerRef.current = setInterval(doRefresh, 10000);
      return () => {
        if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
      };
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    }
  }, [hasPendingPurchases, doRefresh]);

  const fetchPurchases = async (userEmail: string) => {
    setIsCheckingPurchases(true);
    try {
      const response = await fetch(
        `/api/purchases?email=${encodeURIComponent(userEmail)}`,
        { headers: { 'Content-Type': 'application/json' } }
      );
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.purchases) {
          setPurchases(data.purchases);
        }
      }
    } catch (error) {
      console.error('Failed to fetch purchases:', error);
      logError({ message: 'Failed to fetch purchases by email', context: String(error), level: 'error', source: 'frontend' });
    } finally {
      setIsCheckingPurchases(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && email) {
      fetchPurchases(email);
    }
  }, [isAuthenticated, email]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin" style={{ color: PURPLE }} />
          <p className="text-sm font-medium" style={{ color: 'rgba(220,214,240,0.4)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // ─── Unauthenticated section ──────────────────────────────────────────────────

  if (!isAuthenticated) {
    // No orderId — show basic success + connect wallet
    if (!orderIdFromParams) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
          <div className="w-full max-w-sm space-y-6 relative z-10">
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
                  border: '2px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)',
                }}
              >
                <CheckCircle size={38} style={{ color: GREEN }} />
              </div>
              <h1 className="text-3xl font-black text-white leading-tight">
                Purchase Complete!
              </h1>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Your tokens and NFTs are being minted...
              </p>
            </div>

            <div className="space-y-2">
              {[
                { icon: Package, color: PURPLE, label: 'NFTs are being minted', sub: 'Metaplex limited editions' },
                { icon: Zap, color: '#10B981', label: 'Song Coins incoming', sub: 'To your connected wallet' },
                { icon: Star, color: '#f59e0b', label: 'Artist directly supported', sub: '5% + 2% trading fees go to the artist' },
              ].map(({ icon: Icon, color, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18`, border: `1px solid ${color}33` }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{label}</div>
                    <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>{sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={login}
              className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                color: 'white',
                boxShadow: '0 0 30px rgba(139,92,246,0.4)',
                minHeight: '52px',
              }}
            >
              <Wallet size={18} />
              Sign in to Claim
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(220,214,240,0.25)' }}>
              Your tokens will be sent to your connected wallet automatically
            </p>
          </div>
        </div>
      );
    }

    // orderId exists — check order status
    if (isFetchingOrder) {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
          <div className="w-full max-w-sm space-y-6 relative z-10">
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
                  border: '2px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)',
                }}
              >
                <CheckCircle size={38} style={{ color: GREEN }} />
              </div>
              <h1 className="text-3xl font-black text-white leading-tight">
                Purchase Complete!
              </h1>
            </div>
            <div className="flex items-center justify-center gap-2 py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: PURPLE }} />
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>Looking up your order...</p>
            </div>
          </div>
        </div>
      );
    }

    // orderId found with pending/completed purchases
    if (orderFetchStatus === 'found') {
      const hasPending = orderPurchases.some((p) => p.status === 'pending');
      const hasCompleted = orderPurchases.some((p) => p.status === 'completed');

      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
          <div className="w-full max-w-sm space-y-6 relative z-10">
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
                style={{
                  background: hasCompleted
                    ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))'
                    : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
                  border: hasCompleted ? '2px solid rgba(16,185,129,0.3)' : '2px solid rgba(139,92,246,0.3)',
                  boxShadow: hasCompleted ? '0 0 40px rgba(16,185,129,0.3)' : '0 0 40px rgba(139,92,246,0.3)',
                }}
              >
                <CheckCircle size={38} style={{ color: hasCompleted ? GREEN : '#a78bfa' }} />
              </div>
              <h1 className="text-3xl font-black text-white leading-tight">
                {hasCompleted ? 'Tokens Ready!' : 'Purchase Complete!'}
              </h1>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Your tokens and NFTs are ready. Connect a wallet to receive them or check your email for a claim link.
              </p>
            </div>

            {/* Purchase list */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(20,12,40,0.95), rgba(10,5,25,0.98))',
                border: '1px solid rgba(139,92,246,0.15)',
              }}
            >
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <Music size={13} style={{ color: '#a78bfa' }} />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.5)' }}>
                  Your Purchases ({orderPurchases.length})
                </span>
              </div>
              <div className="p-3 space-y-2">
                {orderPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))', border: '1px solid rgba(139,92,246,0.2)' }}
                      >
                        <Music size={14} style={{ color: '#a78bfa' }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          {purchase.packName ?? (purchase.songId || effectiveSongId ? `Song #${(purchase.songId || effectiveSongId).slice(0, 6)}` : 'Music Token')}
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(220,214,240,0.3)' }}>
                          {(purchase.tokenAmount / 1_000_000).toFixed(1)}M tokens · {purchase.nftCount} NFT{purchase.nftCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider"
                        style={
                          purchase.status === 'completed'
                            ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
                            : purchase.status === 'pending'
                            ? { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
                            : { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }
                        }
                      >
                        {purchase.status === 'completed' ? 'Ready' : purchase.status === 'pending' ? 'Pending' : purchase.status}
                      </span>
                      {purchase.status === 'pending' && (
                        <Link to={`/claim/${purchase.id}`}>
                          <button
                            className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider transition-all"
                            style={{
                              background: 'rgba(139,92,246,0.2)',
                              color: '#a78bfa',
                              border: '1px solid rgba(139,92,246,0.3)',
                            }}
                          >
                            Claim
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Connect wallet CTA */}
            <button
              onClick={login}
              className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all"
              style={{
                background: hasPending ? 'rgba(245,158,11,0.15)' : 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                color: hasPending ? '#f59e0b' : 'white',
                border: hasPending ? '1px solid rgba(245,158,11,0.3)' : 'none',
                boxShadow: hasPending ? 'none' : '0 0 30px rgba(139,92,246,0.4)',
                minHeight: '52px',
              }}
            >
              <Wallet size={18} />
              Sign in to Claim
            </button>

            {hasPending && (
              <div className="flex items-center justify-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#f59e0b', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    // orderId found but no purchases yet (empty array)
    if (orderFetchStatus === 'not-found') {
      return (
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
          <div className="w-full max-w-sm space-y-6 relative z-10">
            <div className="text-center space-y-4">
              <div
                className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
                  border: '2px solid rgba(139,92,246,0.3)',
                  boxShadow: '0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)',
                }}
              >
                <CheckCircle size={38} style={{ color: GREEN }} />
              </div>
              <h1 className="text-3xl font-black text-white leading-tight">
                Purchase Complete!
              </h1>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Processing your order...
              </p>
            </div>

            {/* Processing card with spinner */}
            <div
              className="p-6 rounded-2xl text-center space-y-3"
              style={{
                background: 'linear-gradient(145deg, rgba(30,20,60,0.9), rgba(15,10,30,0.95))',
                border: '1px solid rgba(139,92,246,0.2)',
              }}
            >
              <div className="flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" style={{ color: PURPLE }} />
                <span className="text-sm font-black text-white">Processing your order</span>
              </div>
              <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>
                The Shopify webhook is still running. This usually takes 30-60 seconds.
              </p>
              <div className="flex items-center justify-center gap-1.5 pt-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ background: '#8b5cf6', animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={login}
              className="w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                color: 'white',
                boxShadow: '0 0 30px rgba(139,92,246,0.4)',
                minHeight: '52px',
              }}
            >
              <Wallet size={18} />
              Sign in in the Meantime
            </button>

            <p className="text-center text-xs" style={{ color: 'rgba(220,214,240,0.25)' }}>
              Page auto-refreshes every 10 seconds
            </p>
          </div>
        </div>
      );
    }

    // orderId exists but still fetching
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: BG }}>
        <div className="w-full max-w-sm space-y-6 relative z-10">
          <div className="text-center space-y-4">
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-2"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
                border: '2px solid rgba(139,92,246,0.3)',
                boxShadow: '0 0 40px rgba(139,92,246,0.3), 0 0 80px rgba(139,92,246,0.1)',
              }}
            >
              <CheckCircle size={38} style={{ color: GREEN }} />
            </div>
            <h1 className="text-3xl font-black text-white leading-tight">
              Purchase Complete!
            </h1>
          </div>
          <div className="flex items-center justify-center gap-2 py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: PURPLE }} />
            <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>Looking up your order...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Authenticated section ────────────────────────────────────────────────────

  // Determine if we should show order-specific data or general purchases
  const showOrderSpecific = !!orderIdFromParams && orderFetchStatus === 'found';
  const displayPurchases = showOrderSpecific ? orderPurchases : purchases;

  // If showing order-specific, use those statuses; otherwise use existing purchase statuses
  const hasAnyPending = displayPurchases.some((p) => p.status === 'pending');
  const allCompleted = displayPurchases.length > 0 && displayPurchases.every((p) => p.status === 'completed');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: BG }}>
      <div className="w-full max-w-sm space-y-5 relative z-10">
        {/* Success header */}
        <div className="text-center space-y-3">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              background: allCompleted
                ? 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.08))'
                : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.1))',
              border: allCompleted ? '2px solid rgba(16,185,129,0.35)' : '2px solid rgba(139,92,246,0.3)',
              boxShadow: allCompleted ? '0 0 40px rgba(16,185,129,0.25)' : '0 0 40px rgba(139,92,246,0.3)',
            }}
          >
            <CheckCircle size={30} style={{ color: allCompleted ? GREEN : '#a78bfa' }} />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white mb-1">
              {allCompleted ? 'Delivered!' : hasAnyPending ? 'Processing...' : 'Purchase Complete!'}
            </h1>
            <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
              {allCompleted
                ? 'Your tokens and NFTs are in your wallet.'
                : hasAnyPending
                ? 'Processing your mint — this takes 30-60 seconds.'
                : 'Your tokens and NFTs are being minted...'}
            </p>
          </div>

          {walletAddress && (
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mx-auto"
              style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
            >
              <Wallet size={11} style={{ color: '#a78bfa' }} />
              <span className="text-xs font-mono" style={{ fontFamily: "'Inter', monospace", color: '#c4b5fd' }}>
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Processing banner for pending items */}
        {hasAnyPending && (
          <div
            className="p-4 rounded-2xl text-center space-y-2"
            style={{
              background: 'linear-gradient(145deg, rgba(30,20,60,0.9), rgba(15,10,30,0.95))',
              border: '1px solid rgba(139,92,246,0.2)',
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: '#a78bfa' }} />
              <span className="text-sm font-black text-white">Minting in progress</span>
            </div>
            <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>
              Your Song Coins and NFT editions are being minted on Solana. This usually takes 1–3 minutes.
            </p>
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full animate-bounce"
                  style={{ background: '#8b5cf6', animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Purchases list */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(20,12,40,0.95), rgba(10,5,25,0.98))',
            border: '1px solid rgba(139,92,246,0.15)',
          }}
        >
          <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <Music size={13} style={{ color: '#a78bfa' }} />
            <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.5)' }}>
              {showOrderSpecific ? 'Your Order' : 'Your Purchases'}
            </span>
          </div>

          <div className="p-3">
            {isCheckingPurchases && !showOrderSpecific ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 size={16} className="animate-spin" style={{ color: PURPLE }} />
                <span className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Checking orders...</span>
              </div>
            ) : isFetchingOrder && showOrderSpecific ? (
              <div className="flex items-center justify-center py-6 gap-2">
                <Loader2 size={16} className="animate-spin" style={{ color: PURPLE }} />
                <span className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Looking up order...</span>
              </div>
            ) : displayPurchases.length > 0 ? (
              <div className="space-y-2">
                {displayPurchases.map((purchase) => {
                  const isCompleted = purchase.status === 'completed';
                  return (
                    <div
                      key={purchase.id}
                      className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isCompleted
                              ? 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))'
                              : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(236,72,153,0.15))',
                            border: isCompleted ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(139,92,246,0.2)',
                          }}
                        >
                          <Music size={14} style={{ color: isCompleted ? '#10B981' : '#a78bfa' }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            {(purchase as any).packName ?? (purchase.songId ? `Song #${purchase.songId.slice(0, 6)}` : 'Music Token')}
                          </p>
                          <p className="text-[10px]" style={{ fontFamily: "'Inter', monospace", color: 'rgba(220,214,240,0.3)' }}>
                            {(purchase.tokenAmount / 1_000_000).toFixed(1)}M tokens · {purchase.nftCount} NFT{purchase.nftCount !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider"
                          style={
                            isCompleted
                              ? { background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.2)' }
                              : { background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }
                          }
                        >
                          {isCompleted ? 'Delivered' : 'Pending'}
                        </span>
                        {isCompleted && walletAddress && (purchase.splTxHash || purchase.nftTxHashes) && (
                          <div className="flex items-center gap-1">
                            {purchase.splTxHash && (
                              <a
                                href={`https://solscan.io/tx/${purchase.splTxHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider transition-all"
                                style={{
                                  background: 'rgba(16,185,129,0.15)',
                                  color: '#10B981',
                                  border: '1px solid rgba(16,185,129,0.2)',
                                  textDecoration: 'none',
                                }}
                              >
                                SPL
                                <ExternalLink size={10} />
                              </a>
                            )}
                            {purchase.nftTxHashes && (
                              <a
                                href={`https://solscan.io/tx/${purchase.nftTxHashes.split(',')[0]}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider transition-all"
                                style={{
                                  background: 'rgba(139,92,246,0.15)',
                                  color: '#a78bfa',
                                  border: '1px solid rgba(139,92,246,0.2)',
                                  textDecoration: 'none',
                                }}
                              >
                                NFT
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        )}
                        {isCompleted && !showOrderSpecific && (
                          <Link to={`/claim/${purchase.id}`}>
                            <button
                              className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider transition-all"
                              style={{
                                background: 'rgba(139,92,246,0.15)',
                                color: '#a78bfa',
                                border: '1px solid rgba(139,92,246,0.2)',
                              }}
                            >
                              View
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-full mx-auto"
                  style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)' }}
                >
                  <Loader2 size={16} className="animate-spin" style={{ color: '#a78bfa' }} />
                </div>
                <p className="text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.5)' }}>
                  Processing your order
                </p>
                <p className="text-[10px]" style={{ color: 'rgba(220,214,240,0.3)' }}>
                  Tokens will appear here shortly
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Claim pending purchases */}
        {!isCheckingPurchases && displayPurchases.some((p) => p.status !== 'completed') && (
          <Link to={`/claim/${displayPurchases.find((p) => p.status !== 'completed')?.id}`}>
            <button
              className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
              style={{
                background: 'rgba(245,158,11,0.2)',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
                minHeight: '44px',
              }}
            >
              <AlertCircle size={16} />
              Claim Pending Tokens &rarr;
            </button>
          </Link>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => navigate('/collection')}
            className="w-full py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
              color: 'white',
              boxShadow: '0 0 24px rgba(139,92,246,0.3)',
              minHeight: '52px',
            }}
          >
            View Collection
            <ArrowRight size={16} />
          </button>
          <button
            onClick={logout}
            className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(220,214,240,0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
              minHeight: '44px',
            }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
