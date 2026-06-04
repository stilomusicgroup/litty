import { useParams, Link } from 'react-router-dom';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import {
  subscribeEditions,
  setEditionsPay,
  EditionsResponse,
} from '@/lib/collections/editions';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import { triggerHapticFeedback } from '@/utils/haptic';
import { PageLayout } from '@/components/poof-ui';
import { motion } from 'framer-motion';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import {
  ArrowLeft,
  Music,
  ExternalLink,
  Lock,
  CheckCircle,
  Loader2,
  Play,
  Pause,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';

const lamportsToSol = (lamports: number) => (lamports / 1_000_000_000).toFixed(3);

const AudioPlayer = ({ audioUrl, coverImage }: { audioUrl?: string; coverImage?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => setProgress(audio.currentTime / audio.duration);

    audio.addEventListener('timeupdate', updateProgress);
    return () => audio.removeEventListener('timeupdate', updateProgress);
  }, []);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  if (!audioUrl) return null;

  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl border"
      style={{
        background: 'rgba(129, 140, 248, 0.05)',
        borderColor: 'rgba(129, 140, 248, 0.2)',
      }}
    >
      <audio ref={audioRef} src={audioUrl} />

      <button
        onClick={togglePlay}
        className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
        style={{
          background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          color: '#fff',
        }}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-1" />}
      </button>

      <div className="flex-1">
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progress * 100}%`,
              background: 'linear-gradient(90deg, #818cf8, #c084fc)',
            }}
          />
        </div>
      </div>

      {coverImage && (
        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
          <img
            src={coverImage}
            alt=""
            className="w-full h-full object-cover block"
          />
        </div>
      )}
    </div>
  );
};

const EditionDetailPage: React.FC = () => {
  const { editionId } = useParams<{ editionId: string }>();
  const { user, login } = useAuth();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;
  const [purchasing, setPurchasing] = useState(false);
  const [email, setEmail] = useState('');
  const [purchased, setPurchased] = useState(false);

  const { data: edition, loading } = useRealtimeData<EditionsResponse | null>(
    subscribeEditions,
    !!editionId,
    editionId || ''
  );

  if (!editionId) {
    return (
      <PageLayout>
        <div className="container mx-auto px-6 py-20 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-bold">Edition Not Found</h2>
          <Link to="/collectibles" className="text-primary hover:underline mt-4 inline-block">
            Back to Collectibles
          </Link>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return (
      <PageLayout>
        <div className="container mx-auto px-6 py-20">
          <div className="animate-pulse space-y-6">
            <div className="aspect-square max-w-md mx-auto rounded-2xl" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="h-8 w-64 mx-auto rounded" style={{ background: 'rgba(255,255,255,0.1)' }} />
            <div className="h-4 w-32 mx-auto rounded" style={{ background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!edition) {
    return (
      <PageLayout>
        <div className="container mx-auto px-6 py-20 text-center">
          <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-bold">Edition Not Found</h2>
          <Link to="/collectibles" className="text-primary hover:underline mt-4 inline-block">
            Back to Collectibles
          </Link>
        </div>
      </PageLayout>
    );
  }

  const sold = edition.editionSize - edition.remaining;
  const soldPercent = (sold / edition.editionSize) * 100;
  const isSoldOut = edition.remaining === 0;

  const handlePurchase = async () => {
    triggerHapticFeedback();

    if (!isAuthenticated || !walletAddress) {
      toast.error('Please connect your wallet to purchase');
      login();
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setPurchasing(true);

    try {
      // Step 1: Policy-enforced SOL payment from buyer to artist
      // The pay collection hook reads priceSol and artistAddress from the parent edition,
      // so the buyer cannot tamper with payment amount or destination.
      toast.info('Confirming SOL payment...');
      const payId = crypto.randomUUID();
      const paymentSuccess = await setEditionsPay(editionId!, payId, {});

      if (!paymentSuccess) {
        toast.error('SOL payment failed or was rejected. Please try again.');
        setPurchasing(false);
        return;
      }

      // Step 2: Call backend to mint NFT and transfer bundled token
      // This only runs after the SOL payment has been confirmed on-chain.
      toast.info('Minting your collectible...');
      const token = (await getIdToken()) ?? '';
      const authApi = createAuthenticatedApiClient(token, walletAddress);

      await authApi.post('/api/editions/purchase', {
        editionId,
        buyerEmail: email,
        metadataUri: edition.coverImage || `https://arweave.net/edition-${editionId}`,
      });

      setPurchased(true);
      toast.success('Purchase complete! Check your wallet for the NFT and token.');
    } catch (error: any) {
      console.error('Purchase error:', error);
      const msg = error?.message || 'Purchase failed. Please try again.';
      toast.error(msg);
    } finally {
      setPurchasing(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    let success = false;
    try {
      await navigator.clipboard.writeText(text);
      success = true;
    } catch {
      // Fallback for mobile Safari / iframes
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        success = true;
      } catch {
        success = false;
      }
      document.body.removeChild(textarea);
    }
    if (success) {
      toast.success(`${label} copied to clipboard`);
    } else {
      toast.error(`Failed to copy ${label}`);
    }
  };

  return (
    <PageLayout>
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Back Link */}
        <Link
          to="/collectibles"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 sm:mb-6 py-2"
          style={{ minHeight: '44px' }}
        >
          <ArrowLeft size={16} />
          Back to Collectibles
        </Link>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-12">
          {/* Left: Cover Art & Audio */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="relative">
              {/* Glow Effect */}
              <div
                className="absolute -inset-4 rounded-3xl opacity-30"
                style={{
                  background: 'linear-gradient(135deg, #818cf8 0%, #ec4899 50%, #818cf8 100%)',
                  filter: 'blur(30px)',
                  zIndex: -1,
                }}
              />

              {/* Cover Art */}
              <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10">
                {edition.coverImage ? (
                  <img
                    src={edition.coverImage}
                    alt={edition.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(129, 140, 248, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)',
                    }}
                  >
                    <Music size={120} className="text-white/20" />
                  </div>
                )}

                {/* Sold Out Overlay */}
                {isSoldOut && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <div className="text-center">
                      <Lock size={64} className="mx-auto text-white/40 mb-4" />
                      <p
                        className="text-2xl font-bold text-white/60"
                        style={{ fontFamily: "'Inter', monospace" }}
                      >
                        SOLD OUT
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Audio Player */}
            {edition.audioUrl && (
              <div className="mt-6">
                <AudioPlayer audioUrl={edition.audioUrl} coverImage={edition.coverImage} />
              </div>
            )}
          </motion.div>

          {/* Right: Details & Purchase */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Title & Artist */}
            <div>
              <h1
                className="text-3xl sm:text-4xl md:text-5xl font-black mb-2"
                style={{
                  background: 'linear-gradient(135deg, #fff 0%, #a78bfa 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {edition.title}
              </h1>
              <p className="text-xl text-muted-foreground">{edition.artist}</p>
            </div>

            {/* Edition Info */}
            <div
              className="p-4 sm:p-6 rounded-2xl border space-y-4"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Edition Size</span>
                <span
                  className="text-lg font-bold"
                  style={{ color: '#818cf8', fontFamily: "'Inter', monospace" }}
                >
                  {edition.editionSize} editions
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Remaining</span>
                <span
                  className="text-lg font-bold"
                  style={{
                    color: isSoldOut ? '#ef4444' : edition.remaining <= 3 ? '#f59e0b' : '#34d399',
                    fontFamily: "'Inter', monospace",
                  }}
                >
                  {edition.remaining} of {edition.editionSize}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sold</span>
                  <span
                    style={{
                      color: '#818cf8',
                      fontFamily: "'Inter', monospace",
                    }}
                  >
                    {sold} / {edition.editionSize}
                  </span>
                </div>
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: 'rgba(255,255,255,0.1)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${soldPercent}%`,
                      background: isSoldOut
                        ? '#ef4444'
                        : 'linear-gradient(90deg, #818cf8, #c084fc)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            {edition.description && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">Description</h3>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {edition.description}
                </p>
              </div>
            )}

            {/* Token Info */}
            <div
              className="p-4 sm:p-6 rounded-2xl border space-y-4"
              style={{
                background: 'rgba(129, 140, 248, 0.05)',
                borderColor: 'rgba(129, 140, 248, 0.2)',
              }}
            >
              <h3 className="font-semibold flex items-center gap-2">
                <span style={{ color: '#818cf8' }}>Bundled Song Coins</span>
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Token Name</span>
                  <span className="font-medium">{edition.editionTokenName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Symbol</span>
                  <span
                    className="font-bold"
                    style={{ color: '#818cf8', fontFamily: "'Inter', monospace" }}
                  >
                    {edition.editionTokenSymbol}
                  </span>
                </div>
                {edition.mintAddress && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Mint Address</span>
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-mono"
                        style={{ color: '#a78bfa' }}
                      >
                        {edition.mintAddress.slice(0, 8)}...{edition.mintAddress.slice(-6)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(edition.mintAddress!, 'Mint address')}
                        className="p-2 hover:bg-white/10 rounded transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                      <a
                        href={`https://solscan.io/token/${edition.mintAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Purchase Section */}
            {isSoldOut ? (
              <div
                className="p-5 sm:p-8 rounded-2xl border text-center"
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'rgba(239, 68, 68, 0.2)',
                }}
              >
                <Lock size={48} className="mx-auto text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-red-400 mb-2">Sold Out</h3>
                <p className="text-muted-foreground">
                  This edition has sold out. Join the waitlist to be notified of future releases.
                </p>
              </div>
            ) : purchased ? (
              <div
                className="p-5 sm:p-8 rounded-2xl border text-center"
                style={{
                  background: 'rgba(52, 211, 153, 0.05)',
                  borderColor: 'rgba(52, 211, 153, 0.2)',
                }}
              >
                <CheckCircle size={48} className="mx-auto text-emerald-400 mb-4" />
                <h3 className="text-xl font-bold text-emerald-400 mb-2">Purchase Initiated!</h3>
                <p className="text-muted-foreground">
                  Check your wallet for the NFT and bundled token. The transaction may take a moment to appear.
                </p>
              </div>
            ) : (
              <div
                className="p-5 sm:p-8 rounded-2xl border space-y-6 pb-8"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                {/* Price */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p
                    className="text-3xl sm:text-5xl font-black"
                    style={{
                      color: '#818cf8',
                      fontFamily: "'Inter', monospace",
                    }}
                  >
                    {lamportsToSol(edition.priceSol)} SOL
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Includes NFT + {edition.editionTokenSymbol} token
                  </p>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-sm font-medium mb-2">Email for purchase receipt</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                </div>

                {/* Buy Button */}
                <button
                  onClick={handlePurchase}
                  disabled={purchasing || !isAuthenticated}
                  className="w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{
                    background: isAuthenticated
                      ? 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)'
                      : 'rgba(129, 140, 248, 0.3)',
                    color: '#fff',
                  }}
                >
                  {purchasing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Processing...
                    </>
                  ) : !isAuthenticated ? (
                    'Sign in to Purchase'
                  ) : (
                    <>
                      <Music size={20} />
                      Buy Collectible
                    </>
                  )}
                </button>

                {!isAuthenticated && (
                  <p className="text-xs text-center text-muted-foreground">
                    Connect your wallet to purchase this collectible
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </PageLayout>
  );
};

export default EditionDetailPage;
