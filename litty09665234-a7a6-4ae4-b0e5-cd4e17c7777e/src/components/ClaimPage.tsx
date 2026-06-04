import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { get } from '@/lib/db-client';
import { getPackPurchases } from '@/lib/collections/packPurchases';
import { api, createAuthenticatedApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Music, Wallet, CheckCircle, AlertCircle, Loader2, Mail, Package } from 'lucide-react';
import { logError } from '@/hooks/use-error-logger';
import { Input } from '@/components/ui/input';

interface PurchaseRecord {
  id: string;
  email: string;
  orderId: string;
  songId: string;
  walletAddress?: string;
  tokenAmount?: number;
  status: string;
  createdAt: number;
  isPackPurchase?: boolean;
  packName?: string;
  nftCount?: number;
  buyerAddress?: string;
  walletSource?: string;
}

export default function ClaimPage() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const [searchParams] = useSearchParams();
  const { loading, user, login } = useAuth();
  const isAuthenticated = !!user;
  const authLoading = loading;
  const walletAddress = user?.address ?? null;
  const isReady = !loading;
  const [purchase, setPurchase] = useState<PurchaseRecord | null>(null);
  const [purchaseLoading, setPurchaseLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email verification state
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [claimToken, setClaimToken] = useState<string | null>(searchParams.get('token') ?? null);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  // If token came from URL params, mark email as pre-verified
  useEffect(() => {
    if (searchParams.get('token') && searchParams.get('email')) {
      setEmailVerified(true);
    }
  }, [searchParams]);

  // Fetch purchase record on mount — checks both purchases and packPurchases
  useEffect(() => {
    if (!purchaseId) return;

    const fetchPurchase = async () => {
      setPurchaseLoading(true);
      try {
        // Try regular purchases first
        const record = await get(`purchases/${purchaseId}`) as PurchaseRecord | null;
        if (record) {
          setPurchase({ ...record, isPackPurchase: false });
        } else {
          // Try pack purchases
          const packRecord = await getPackPurchases(purchaseId);
          if (packRecord) {
            setPurchase({
              id: packRecord.id,
              email: packRecord.buyerEmail,
              orderId: packRecord.shopifyOrderId,
              songId: packRecord.songId ?? '',
              walletAddress: packRecord.buyerAddress,
              tokenAmount: packRecord.tokenAmount,
              status: packRecord.status,
              createdAt: packRecord.createdAt,
              isPackPurchase: true,
              packName: packRecord.packName,
              nftCount: packRecord.nftCount,
              buyerAddress: packRecord.buyerAddress,
              walletSource: packRecord.walletSource,
            });
          } else {
            setPurchase(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch purchase:', err);
        logError({ message: 'Failed to fetch purchase in claim page', context: String(err), level: 'error', source: 'frontend' });
      } finally {
        setPurchaseLoading(false);
      }
    };

    fetchPurchase();
  }, [purchaseId]);

  // Step 1: Verify email and get claim token
  async function handleVerifyEmail() {
    if (!purchaseId || !email) return;
    setVerifyingEmail(true);
    setError(null);

    try {
      const data = await api.post('/api/purchases/claim-token', { purchaseId, email: email.trim() });
      setClaimToken(data.claimToken);
      setEmailVerified(true);
      toast.success('Email verified! Now connect your wallet to claim.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not verify email. Make sure this is the email used for your purchase.';
      setError(message);
      toast.error('Verification failed');
    } finally {
      setVerifyingEmail(false);
    }
  }

  // Step 2: Claim with verified token (regular purchase) or wallet connection (pack purchase)
  async function handleClaim() {
    if (!purchaseId || !walletAddress) return;
    setClaiming(true);
    setError(null);

    try {
      const token = localStorage.getItem('poof_auth_token') ?? '';
      const authApi = createAuthenticatedApiClient(token, walletAddress);

      if (purchase?.isPackPurchase && (purchase.status === 'pending_wallet' || purchase.status === 'pending')) {
        // Pack purchase: claim by email + wallet only (no claim token needed)
        await authApi.post(`/api/purchases/claim/${purchaseId}`, {
          email: email.trim(),
        });
        toast.success('Pack purchase claimed! Your NFTs and tokens are being delivered.');
      } else {
        // Regular purchase: claim with token + email
        if (!claimToken) {
          setError('No claim token. Please verify your email first.');
          setClaiming(false);
          return;
        }
        await authApi.post(`/api/purchases/claim/${purchaseId}`, {
          claimToken,
          email: email.trim(),
        });
        toast.success('Tokens claimed! They are on their way to your wallet.');
      }

      setClaimed(true);
      // Refresh purchase to show updated status
      if (purchaseId) {
        const updated = await getPackPurchases(purchaseId);
        if (updated) {
          setPurchase({
            id: updated.id,
            email: updated.buyerEmail,
            orderId: updated.shopifyOrderId,
            songId: updated.songId ?? '',
            walletAddress: updated.buyerAddress,
            tokenAmount: updated.tokenAmount,
            status: updated.status,
            createdAt: updated.createdAt,
            isPackPurchase: true,
            packName: updated.packName,
            nftCount: updated.nftCount,
            buyerAddress: updated.buyerAddress,
            walletSource: updated.walletSource,
          });
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Claim failed. Please try again.';
      setError(message);
      toast.error('Claim failed');
    } finally {
      setClaiming(false);
    }
  }

  const isPackPendingWallet = purchase?.isPackPurchase && (purchase.status === 'pending_wallet' || purchase.status === 'pending');

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      
      <div className="pt-24 pb-24 max-w-lg mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-10">
          <div
            className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6, #ec4899)' }}
          >
            {purchase?.isPackPurchase ? <Package size={36} color="white" /> : <Music size={36} color="white" />}
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            {isPackPendingWallet ? 'Claim Your Pack' : 'Claim Your Music'}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
            {isPackPendingWallet
              ? 'Connect your wallet to complete your purchase fulfillment'
              : 'Verify your email and connect your wallet to claim your tokens'}
          </p>
        </div>

        {/* Purchase Info Card */}
        <div
          className="rounded-2xl p-5 mb-6"
          style={{
            background: 'linear-gradient(145deg, rgba(30,20,60,0.9) 0%, rgba(15,10,30,0.95) 100%)',
            border: '1px solid rgba(139,92,246,0.2)',
          }}
        >
          {purchaseLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} style={{ color: '#8b5cf6' }} className="animate-spin" />
            </div>
          ) : purchase ? (
            <>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(220,214,240,0.5)' }}>Order</span>
                  <span className="text-white font-mono text-xs">{purchase.orderId}</span>
                </div>
                {purchase.packName && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgba(220,214,240,0.5)' }}>Pack</span>
                    <span className="text-white font-bold">{purchase.packName}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(220,214,240,0.5)' }}>Tokens</span>
                  <span className="text-white font-bold" style={{ color: '#00D4FF' }}>
                    {purchase.tokenAmount ? purchase.tokenAmount.toLocaleString() : '—'}
                  </span>
                </div>
                {purchase.nftCount !== undefined && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgba(220,214,240,0.5)' }}>NFTs</span>
                    <span className="text-white font-bold">{purchase.nftCount}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span style={{ color: 'rgba(220,214,240,0.5)' }}>Status</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: purchase.status === 'completed' ? 'rgba(0, 255, 65, 0.15)'
                        : purchase.status === 'pending_wallet' ? 'rgba(234,179,8,0.15)'
                        : 'rgba(234,179,8,0.15)',
                      color: purchase.status === 'completed' ? '#00FF41'
                        : purchase.status === 'pending_wallet' ? '#facc15'
                        : '#facc15',
                    }}
                  >
                    {purchase.status}
                  </span>
                </div>
                {purchase.walletSource && (
                  <div className="flex justify-between text-sm">
                    <span style={{ color: 'rgba(220,214,240,0.5)' }}>Wallet Source</span>
                    <span className="text-white font-bold">{purchase.walletSource}</span>
                  </div>
                )}
                {purchase.songId && (
                  <Link to={`/song/${purchase.songId}`} className="block mt-2">
                    <div
                      className="text-center py-2 rounded-xl text-sm font-semibold"
                      style={{
                        background: 'rgba(139,92,246,0.15)',
                        color: '#a78bfa',
                        border: '1px solid rgba(139,92,246,0.2)',
                      }}
                    >
                      View Song &rarr;
                    </div>
                  </Link>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <AlertCircle size={24} style={{ color: 'rgba(220,214,240,0.3)', margin: '0 auto' }} className="mb-2" />
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Purchase not found. Contact support if you believe this is an error.
              </p>
            </div>
          )}
        </div>

        {/* Claim Flow */}
        {claimed ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: 'rgba(0, 255, 65, 0.08)',
              border: '1px solid rgba(0, 255, 65, 0.2)',
            }}
          >
            <CheckCircle size={48} style={{ color: '#00FF41', margin: '0 auto' }} className="mb-3" />
            <h2 className="text-xl font-bold text-white mb-2">
              {isPackPendingWallet ? 'Pack Claimed!' : 'Tokens Claimed!'}
            </h2>
            <p className="text-sm mb-4" style={{ color: 'rgba(220,214,240,0.6)' }}>
              {isPackPendingWallet
                ? 'Your NFTs and tokens are being delivered to your wallet.'
                : 'Your tokens are on their way to your wallet.\nThis may take a few moments.'}
            </p>
            <Link to="/">
              <button
                className="w-full py-3 rounded-xl font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white' }}
              >
                Explore the Marketplace
              </button>
            </Link>
          </div>
        ) : !emailVerified ? (
          /* Step 1: Email verification */
          <div>
            <div
              className="rounded-2xl p-5 mb-4"
              style={{
                background: 'linear-gradient(145deg, rgba(30,20,60,0.9) 0%, rgba(15,10,30,0.95) 100%)',
                border: '1px solid rgba(139,92,246,0.2)',
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Mail size={16} style={{ color: '#8b5cf6' }} />
                <span className="text-sm font-semibold text-white">Step 1: Verify Your Email</span>
              </div>
              <p className="text-xs mb-4" style={{ color: 'rgba(220,214,240,0.5)' }}>
                {isPackPendingWallet
                  ? 'Enter the email address used for your purchase.'
                  : 'Enter the email address you used for your purchase to verify ownership.'}
              </p>
              <div className="space-y-3">
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleVerifyEmail(); }}
                  className="bg-black/30 border-purple-500/20 text-white placeholder:text-white/30"
                />
                <button
                  onClick={handleVerifyEmail}
                  disabled={verifyingEmail || !email.trim()}
                  className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white' }}
                >
                  {verifyingEmail ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      Verify Email
                    </>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                className="rounded-xl p-3 mb-4 flex items-center gap-2"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                <AlertCircle size={16} style={{ color: '#f87171' }} />
                <span className="text-xs" style={{ color: '#f87171' }}>{error}</span>
              </div>
            )}
          </div>
        ) : !isAuthenticated ? (
          /* Step 2: Connect wallet */
          <div className="text-center">
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-2"
              style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.15)' }}
            >
              <CheckCircle size={16} style={{ color: '#00FF41' }} />
              <span className="text-xs text-white">Email verified: {email}</span>
            </div>
            <button
              onClick={login}
              disabled={authLoading || !isReady}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white' }}
            >
              {authLoading || !isReady ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Wallet size={20} />
                  Sign in to Claim
                </>
              )}
            </button>
            <p className="text-xs mt-3" style={{ color: 'rgba(220,214,240,0.3)' }}>
              Step 2: Connect or create your wallet to receive the tokens
            </p>
          </div>
        ) : (
          /* Step 3: Claim */
          <div>
            {/* Email verified indicator */}
            <div
              className="rounded-xl p-3 mb-3 flex items-center gap-2"
              style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.15)' }}
            >
              <CheckCircle size={16} style={{ color: '#00FF41' }} />
              <span className="text-xs text-white">Email verified: {email}</span>
            </div>

            {/* Wallet connected */}
            <div
              className="rounded-xl p-3 mb-4 flex items-center gap-3"
              style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.15)' }}
            >
              <CheckCircle size={16} style={{ color: '#00FF41' }} />
              <span className="text-xs text-white">
                Connected: <span className="font-mono">{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}</span>
              </span>
            </div>

            {error && (
              <div
                className="rounded-xl p-3 mb-4 flex items-center gap-2"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}
              >
                <AlertCircle size={16} style={{ color: '#f87171' }} />
                <span className="text-xs" style={{ color: '#f87171' }}>{error}</span>
              </div>
            )}

            {purchase?.status === 'completed' ? (
              <div
                className="rounded-2xl p-6 text-center"
                style={{
                  background: 'rgba(0, 255, 65, 0.08)',
                  border: '1px solid rgba(0, 255, 65, 0.2)',
                }}
              >
                <CheckCircle size={36} style={{ color: '#00FF41', margin: '0 auto' }} className="mb-3" />
                <h3 className="text-lg font-bold text-white mb-2">Already Claimed</h3>
                <p className="text-sm" style={{ color: 'rgba(220,214,240,0.6)' }}>
                  This purchase has already been processed.
                </p>
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-3 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)', color: 'white' }}
              >
                {claiming ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {isPackPendingWallet ? 'Claiming Pack...' : 'Claiming...'}
                  </>
                ) : (
                  <>
                    <Music size={20} />
                    {isPackPendingWallet ? 'Claim My Pack' : 'Claim My Tokens'}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
