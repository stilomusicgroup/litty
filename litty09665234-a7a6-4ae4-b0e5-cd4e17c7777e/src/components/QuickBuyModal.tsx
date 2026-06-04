import { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, Settings2, Wallet, Loader2, AlertCircle } from 'lucide-react';
import type { SongsResponse } from '@/lib/collections/songs';
import { useTheme } from '@/hooks/use-theme';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import SlippagePanel, { useSlippage } from '@/components/TradeSlippage';
import TradeQuote from '@/components/TradeQuote';

interface QuickBuyModalProps {
  song: SongsResponse | null;
  details?: { title?: string; artist?: string; coverImage?: string } | null;
  bondingProgress?: number;
  price?: string;
  onClose: () => void;
  onConfirm: (song: SongsResponse, amount: number, slipBps?: number) => void;
  /** Override amount presets. Defaults to [1, 5, 20]. */
  presets?: number[];
  /** Label prefix shown before each preset amount. Defaults to '$'. */
  unit?: string;
}

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const AUTH_PRESETS = [1, 5, 25, 100];
const MIN_AUTH_AMOUNT = 1;

/** Apple Pay SVG mark — official-style */
const ApplePayMark: React.FC<{ height?: number }> = ({ height = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 0 174 106" height={height} width={Math.round(height * (174 / 106))} aria-label="Apple Pay" role="img" style={{ flexShrink: 0, overflow: 'visible' }}>
    <g fill="#fff">
      <path d="M40.58 12.3c2.63-3.3 4.42-7.9 3.93-12.3-3.82.16-8.44 2.54-11.18 5.74-2.45 2.82-4.6 7.53-4.02 11.97 4.26.33 8.61-2.16 11.27-5.41z" />
      <path d="M44.46 18.07c-6.23-.37-11.53 3.54-14.5 3.54-2.97 0-7.56-3.35-12.43-3.26-6.4.09-12.3 3.72-15.6 9.46-6.65 11.53-1.7 28.63 4.78 38.01 3.17 4.6 6.95 9.74 11.92 9.56 4.78-.18 6.58-3.08 12.35-3.08 5.77 0 7.38 3.08 12.35 2.99 5.14-.09 8.44-4.69 11.61-9.3 3.63-5.31 5.12-10.46 5.21-10.73-.09-.09-10.01-3.82-10.1-15.24-.09-9.56 7.81-14.14 8.17-14.42-4.46-6.58-11.4-7.31-13.87-7.53z" />
      <path d="M88.64 4.15c10.86 0 18.42 7.49 18.42 18.39S99.63 41 88.51 41H76.77v20.93h-8.63V4.15zm-11.87 30h9.74c7.56 0 11.87-4.08 11.87-10.58s-4.31-10.55-11.83-10.55h-9.78z" />
      <path d="M109.63 49.04c0-7.11 5.45-11.47 15.11-12.04l11.13-.66v-3.08c0-4.52-3.04-7.23-8.12-7.23-4.82 0-7.87 2.41-8.6 6.11h-7.87c.47-7.56 6.48-13.17 16.76-13.17 9.84 0 16.17 5.24 16.17 13.38v28.01h-7.99v-6.68h-.18c-2.38 4.52-7.56 7.36-12.97 7.36-8.06 0-13.44-4.96-13.44-12.0zm26.24-3.63v-3.15l-10.01.63c-4.99.33-7.83 2.5-7.83 5.99 0 3.58 2.97 5.93 7.49 5.93 5.89 0 10.35-4.05 10.35-9.4z" />
      <path d="M150.83 76.82v-6.77c.57.14 1.83.14 2.47.14 3.54 0 5.45-1.49 6.62-5.31l.71-2.28-14.42-40.8h9.04l9.98 32.88h.14l9.98-32.88h8.83L169.2 65.5c-3.26 9.23-7.01 12.2-14.86 12.2-.64 0-2.94-.09-3.51-.23v-.65z" />
    </g>
  </svg>
);

const QuickBuyModal: React.FC<QuickBuyModalProps> = ({
  song,
  details,
  bondingProgress = 0,
  price = '$0.000000',
  onClose,
  onConfirm,
  presets = [1, 5, 20],
  unit = '$',
}) => {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { isAuthenticated, login, isLoading, email } = usePrivyAuth();

  const [selectedAmount, setSelectedAmount] = useState<number | 'custom'>(presets[0] ?? 5);
  const [customAmount, setCustomAmount] = useState('');
  const [showSlippage, setShowSlippage] = useState(false);
  const [slipBps, setSlipBps] = useSlippage();

  // Auth view amount state (dollar-based for Shopify checkout)
  const [authSelectedAmount, setAuthSelectedAmount] = useState<number | 'custom'>(AUTH_PRESETS[1]);
  const [authCustomAmount, setAuthCustomAmount] = useState('');
  const [authValidation, setAuthValidation] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // State: 'auth' = showing login screen, 'transitioning' = wallet being set up, 'buy' = amount picker
  const [viewState, setViewState] = useState<'auth' | 'transitioning' | 'buy'>('auth');

  // sessionStorage key for persisting amount across wallet connect
  const sessionKey = song ? `poof:quickBuyAmount:${song.id}` : '';

  // Restore amount from sessionStorage when modal opens
  useEffect(() => {
    if (!song || !sessionKey) return;
    try {
      const saved = sessionStorage.getItem(sessionKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.amount === 'number') {
          // Try to match a preset
          if (presets.includes(parsed.amount)) {
            setSelectedAmount(parsed.amount);
          } else if (AUTH_PRESETS.includes(parsed.amount)) {
            setAuthSelectedAmount(parsed.amount);
          } else {
            setSelectedAmount('custom');
            setCustomAmount(String(parsed.amount));
            setAuthSelectedAmount('custom');
            setAuthCustomAmount(String(parsed.amount));
          }
        }
        if (typeof parsed.authAmount === 'number') {
          if (AUTH_PRESETS.includes(parsed.authAmount)) {
            setAuthSelectedAmount(parsed.authAmount);
          } else {
            setAuthSelectedAmount('custom');
            setAuthCustomAmount(String(parsed.authAmount));
          }
        }
        if (typeof parsed.buyAmount === 'number') {
          if (presets.includes(parsed.buyAmount)) {
            setSelectedAmount(parsed.buyAmount);
          } else {
            setSelectedAmount('custom');
            setCustomAmount(String(parsed.buyAmount));
          }
        }
        if (parsed.custom !== undefined) {
          setCustomAmount(String(parsed.custom));
        }
        if (parsed.authCustom !== undefined) {
          setAuthCustomAmount(String(parsed.authCustom));
        }
      }
    } catch { /* ignore */ }
  }, [!!song, sessionKey]);

  // Persist amount to sessionStorage whenever it changes
  useEffect(() => {
    if (!sessionKey) return;
    try {
      const authVal = authSelectedAmount === 'custom' ? (parseFloat(authCustomAmount) || 0) : authSelectedAmount;
      const buyVal = selectedAmount === 'custom' ? (parseFloat(customAmount) || 0) : selectedAmount;
      sessionStorage.setItem(sessionKey, JSON.stringify({
        authAmount: authVal,
        buyAmount: buyVal,
        custom: customAmount,
        authCustom: authCustomAmount,
      }));
    } catch { /* ignore */ }
  }, [selectedAmount, customAmount, authSelectedAmount, authCustomAmount, sessionKey]);

  // When auth state changes, update view
  useEffect(() => {
    if (isAuthenticated && viewState !== 'buy') {
      // Brief transition state then go to buy
      setViewState('transitioning');
      const t = setTimeout(() => setViewState('buy'), 1200);
      return () => clearTimeout(t);
    } else if (!isAuthenticated && viewState !== 'auth') {
      setViewState('auth');
    }
  }, [isAuthenticated]);

  // Reset view state when modal opens/closes
  useEffect(() => {
    if (song) {
      setViewState(isAuthenticated ? 'buy' : 'auth');
    }
  }, [!!song, isAuthenticated]);

  useEffect(() => {
    if (!song) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [song, onClose]);

  // Auth custom amount validation (must be before early return)
  useEffect(() => {
    if (authCustomAmount === '') {
      setAuthValidation(null);
      return;
    }
    const n = parseFloat(authCustomAmount);
    if (isNaN(n)) {
      setAuthValidation('Enter a valid amount');
    } else if (n < MIN_AUTH_AMOUNT) {
      setAuthValidation(`Minimum is $${MIN_AUTH_AMOUNT}.00`);
    } else {
      setAuthValidation(null);
    }
  }, [authCustomAmount]);

  if (!song) return null;

  const title = details?.title ?? song.name ?? 'UNTITLED';
  const artist = details?.artist ?? 'Unknown Artist';
  const coverImage = details?.coverImage;
  const solAmount = selectedAmount === 'custom' ? (parseFloat(customAmount) || 0) : selectedAmount;

  const handleConfirm = () => {
    if (solAmount <= 0) return;
    onConfirm(song, solAmount, slipBps);
  };

  const authActiveAmount = authSelectedAmount === 'custom'
    ? (parseFloat(authCustomAmount) || 0)
    : authSelectedAmount;
  const isValidAuthAmount = authActiveAmount >= MIN_AUTH_AMOUNT;

  const handleAuthCustomInput = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    setAuthCustomAmount(validated);
    setAuthSelectedAmount('custom');
  };

  const handleApplePay = async () => {
    if (!isValidAuthAmount || !song) return;
    setIsCheckingOut(true);
    try {
      const res = await api.post('/api/packs/checkout/open-amount', {
        songId: song.id,
        amountUsd: authActiveAmount,
        walletAddress: '',
        email: email ?? '',
        tipPercent: 0,
      });
      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      } else {
        toast.error('Could not generate checkout link');
        setIsCheckingOut(false);
      }
    } catch (err) {
      console.error('[QuickBuyModal] Guest checkout error:', err);
      toast.error('Failed to connect to server');
      setIsCheckingOut(false);
    }
  };

  const handlePhantomConnect = () => {
    // Amount is already persisted to sessionStorage via the useEffect above
    login();
  };

  // ─── AUTH VIEW (not logged in) ───
  if (viewState === 'auth') {
    return ReactDOM.createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[299]"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        />

        {/* Bottom sheet */}
        <div
          className="fixed z-[300] left-0 right-0 bottom-0 rounded-t-2xl overflow-hidden"
          style={{
            maxWidth: 480,
            margin: '0 auto',
            background: isDark ? '#000000' : '#ffffff',
            borderTop: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <span
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '0.75rem',
                fontWeight: 900,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: isDark ? '#fff' : '#1a2744',
              }}
            >
              Buy Token
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Song info row */}
          <div className="flex items-center gap-3 px-4 pb-4">
            <div
              className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {coverImage ? (
                <img src={coverImage} alt={title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg opacity-30">
                  ♫
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate text-sm" style={{ color: isDark ? '#fff' : '#1a2744' }}>
                {title}
              </p>
              <p className="text-xs truncate" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,39,68,0.5)' }}>
                {artist}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-mono text-xs font-bold" style={{ color: isDark ? NEON_GREEN : '#00FF41' }}>
                {price}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="px-4">
            <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }} />
          </div>

          {/* Amount selection */}
          <div className="px-4 pt-4 pb-3">
            <p
              className="text-[10px] font-bold tracking-widest uppercase mb-2"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.4)',
              }}
            >
              Amount
            </p>
            <div className="flex gap-2">
              {AUTH_PRESETS.map(amt => (
                <button
                  key={amt}
                  onClick={() => { setAuthSelectedAmount(amt); setAuthCustomAmount(''); setAuthValidation(null); }}
                  className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    background: authSelectedAmount === amt
                      ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                      : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    color: authSelectedAmount === amt ? '#000' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,39,68,0.6)',
                    border: `1px solid ${authSelectedAmount === amt ? 'transparent' : isDark ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0,0,0,0.1)'}`,
                    boxShadow: authSelectedAmount === amt ? `0 0 12px rgba(0, 255, 65, 0.3)` : 'none',
                  }}
                >
                  ${amt}
                </button>
              ))}
              <button
                onClick={() => setAuthSelectedAmount('custom')}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  background: authSelectedAmount === 'custom'
                    ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: authSelectedAmount === 'custom' ? '#000' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,39,68,0.6)',
                  border: `1px solid ${authSelectedAmount === 'custom' ? 'transparent' : isDark ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0,0,0,0.1)'}`,
                  boxShadow: authSelectedAmount === 'custom' ? `0 0 12px rgba(0, 255, 65, 0.3)` : 'none',
                }}
              >
                Custom
              </button>
            </div>

            {authSelectedAmount === 'custom' && (
              <div className="mt-2 relative">
                <span
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold"
                  style={{ color: 'rgba(0, 255, 65, 0.5)' }}
                >
                  $
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={authCustomAmount}
                  onChange={handleAuthCustomInput}
                  placeholder="3.00"
                  className="w-full pl-8 pr-16 py-3 rounded-xl text-base outline-none transition-all"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                    border: `1.5px solid ${
                      authValidation
                        ? 'rgba(248,113,113,0.5)'
                        : authCustomAmount && parseFloat(authCustomAmount) >= MIN_AUTH_AMOUNT
                        ? 'rgba(0, 255, 65, 0.5)'
                        : 'rgba(0, 255, 65, 0.15)'
                    }`,
                    color: isDark ? '#fff' : '#1a2744',
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
            )}
            {authValidation && (
              <div className="flex items-center gap-1 mt-1.5">
                <AlertCircle size={11} style={{ color: '#f87171' }} />
                <span className="text-xs" style={{ color: '#f87171' }}>{authValidation}</span>
              </div>
            )}
          </div>

          {/* Auth options */}
          <div className="px-4 pt-2 pb-6 space-y-3">
            <p
              className="text-center text-xs font-medium"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,39,68,0.6)' }}
            >
              Sign in to buy tokens — fast & secure
            </p>

            {/* Apple Pay button — logo only, black, full-width */}
            <button
              onClick={handleApplePay}
              disabled={!isValidAuthAmount || isCheckingOut}
              className="w-full flex items-center justify-center gap-2 rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                padding: '16px 24px',
                background: '#000000',
                border: '1px solid rgba(255,255,255,0.12)',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset',
              }}
              onMouseEnter={e => {
                if (!isCheckingOut) {
                  (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset';
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = '#000000';
                (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset';
              }}
              aria-label="Buy with Apple Pay"
            >
              {isCheckingOut ? (
                <Loader2 size={20} className="animate-spin" style={{ color: '#fff' }} />
              ) : (
                <ApplePayMark height={22} />
              )}
            </button>

            {/* Phantom / Wallet connect — secondary, ghost style */}
            <button
              onClick={handlePhantomConnect}
              className="w-full flex items-center justify-center gap-2 rounded-xl transition-all active:scale-[0.98]"
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'}`,
                cursor: 'pointer',
                fontFamily: "'Archivo Black', sans-serif",
                fontWeight: 600,
                fontSize: '0.75rem',
                color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(26,39,68,0.85)',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.4)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
                (e.currentTarget as HTMLElement).style.borderColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
              }}
              aria-label="Connect Phantom wallet"
            >
              <Wallet size={16} />
              <span>Connect Phantom</span>
            </button>

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 pt-2">
              {['No seed phrase', 'Instant wallet', 'Secure'].map(label => (
                <span
                  key={label}
                  className="text-[9px] font-medium tracking-wider uppercase"
                  style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(26,39,68,0.35)' }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </>,
      document.body
    );
  }

  // ─── TRANSITIONING VIEW (wallet being set up) ───
  if (viewState === 'transitioning') {
    return ReactDOM.createPortal(
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-[299]"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onClose}
        />

        {/* Bottom sheet */}
        <div
          className="fixed z-[300] left-0 right-0 bottom-0 rounded-t-2xl overflow-hidden"
          style={{
            maxWidth: 480,
            margin: '0 auto',
            background: isDark ? '#000000' : '#ffffff',
            borderTop: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0,0,0,0.1)'}`,
            boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
            animation: 'slideUp 0.25s ease-out',
          }}
        >
          <style>{`
            @keyframes slideUp {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes pulse-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(0, 255, 65, 0.2); }
              50% { box-shadow: 0 0 40px rgba(0, 255, 65, 0.5); }
            }
          `}</style>

          {/* Centered loading content */}
          <div className="flex flex-col items-center justify-center py-16">
            {/* Spinning ring */}
            <div
              className="w-16 h-16 rounded-full mb-6"
              style={{
                border: `3px solid ${isDark ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0, 255, 65, 0.15)'}`,
                borderTopColor: NEON_GREEN,
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p
              className="text-sm font-bold"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                color: isDark ? '#fff' : '#1a2744',
                letterSpacing: '0.05em',
              }}
            >
              Setting up your wallet...
            </p>
            <p
              className="text-xs mt-2"
              style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.4)' }}
            >
              Almost ready
            </p>
          </div>
        </div>
      </>,
      document.body
    );
  }

  // ─── BUY VIEW (logged in — amount picker) ───
  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[299]"
        style={{ background: 'rgba(0,0,0,0.7)' }}
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        className="fixed z-[300] left-0 right-0 bottom-0 rounded-t-2xl overflow-hidden"
        style={{
          maxWidth: 480,
          margin: '0 auto',
          background: isDark ? '#000000' : '#ffffff',
          borderTop: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0,0,0,0.1)'}`,
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.25s ease-out',
        }}
      >
        <style>{`
          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }
        `}</style>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <span
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '0.75rem',
              fontWeight: 900,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: isDark ? '#fff' : '#1a2744',
            }}
          >
            Buy Token
          </span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Song info row */}
        <div className="flex items-center gap-3 px-4 pb-3">
          {/* Cover */}
          <div
            className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
          >
            {coverImage ? (
              <img src={coverImage} alt={title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg opacity-30">
                ♫
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="font-bold truncate text-sm"
              style={{ color: isDark ? '#fff' : '#1a2744' }}
            >
              {title}
            </p>
            <p
              className="text-xs truncate"
              style={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,39,68,0.5)' }}
            >
              {artist}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p
              className="font-mono text-xs font-bold"
              style={{ color: isDark ? NEON_GREEN : '#00FF41' }}
            >
              {price}
            </p>
          </div>
        </div>

        {/* Bonding progress bar */}
        {bondingProgress > 0 && (
          <div className="px-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[9px] font-bold tracking-widest uppercase"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.4)',
                }}
              >
                Bonding Curve
              </span>
              <span
                className="text-[9px] font-bold"
                style={{ color: isDark ? NEON_GREEN : '#00FF41' }}
              >
                {bondingProgress.toFixed(0)}%
              </span>
            </div>
            <div
              className="h-1 rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(bondingProgress, 100)}%`,
                  background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Amount presets */}
        <div className="px-4 pb-4">
          <p
            className="text-[10px] font-bold tracking-widest uppercase mb-2"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(26,39,68,0.4)',
            }}
          >
            Amount
          </p>
          <div className="flex gap-2">
            {presets.map(amt => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  background: selectedAmount === amt
                    ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                    : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  color: selectedAmount === amt ? '#000' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,39,68,0.6)',
                  border: `1px solid ${selectedAmount === amt ? 'transparent' : isDark ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0,0,0,0.1)'}`,
                  boxShadow: selectedAmount === amt ? `0 0 12px rgba(0, 255, 65, 0.3)` : 'none',
                }}
              >
                {unit}{amt}
              </button>
            ))}
            <button
              onClick={() => setSelectedAmount('custom')}
              className="flex-1 py-2 rounded-lg text-xs font-bold transition-all active:scale-95"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                background: selectedAmount === 'custom'
                  ? `linear-gradient(135deg, ${NEON_GREEN}, ${CYAN})`
                  : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                color: selectedAmount === 'custom' ? '#000' : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(26,39,68,0.6)',
                border: `1px solid ${selectedAmount === 'custom' ? 'transparent' : isDark ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0,0,0,0.1)'}`,
                boxShadow: selectedAmount === 'custom' ? `0 0 12px rgba(0, 255, 65, 0.3)` : 'none',
              }}
            >
              Custom
            </button>
          </div>

          {selectedAmount === 'custom' && (
            <div className="mt-2">
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="Enter amount..."
                min="0"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${isDark ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0,0,0,0.1)'}`,
                  background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  color: isDark ? '#fff' : '#1a2744',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
          )}
        </div>

        {/* Live quote + slippage */}
        {isDark && song && (
          <div className="px-4 pb-3 space-y-2">
            {/* Quote */}
            <TradeQuote
              songId={song.id}
              symbol={song.symbol ?? ''}
              mode="buy"
              amount={solAmount}
              slipBps={slipBps}
            />
            {/* Slippage toggle */}
            <div>
              <button
                onClick={() => setShowSlippage(p => !p)}
                className="flex items-center gap-1.5 text-xs transition-colors"
                style={{ color: showSlippage ? NEON_GREEN : 'rgba(255,255,255,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <Settings2 size={11} />
                Slippage: {(slipBps / 100).toFixed(0)}%
              </button>
              {showSlippage && (
                <div className="mt-2">
                  <SlippagePanel
                    slipBps={slipBps}
                    onChange={setSlipBps}
                    onClose={() => setShowSlippage(false)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <div className="px-4 pb-6">
          <button
            onClick={handleConfirm}
            className="w-full py-3 rounded-xl text-sm font-black tracking-widest uppercase transition-all active:scale-[0.98]"
            style={{
              background: `linear-gradient(135deg, ${NEON_GREEN} 0%, ${CYAN} 100%)`,
              color: '#000',
              fontFamily: "'Archivo Black', sans-serif",
              boxShadow: `0 0 20px rgba(0, 255, 65, 0.3), 0 0 40px rgba(0,212,255,0.15)`,
            }}
          >
            Confirm Buy
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};

export default QuickBuyModal;
