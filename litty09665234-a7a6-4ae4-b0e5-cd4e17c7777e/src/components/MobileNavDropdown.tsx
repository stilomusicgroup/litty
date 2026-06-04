import {
  Wallet,
  Sparkles,
  Layers,
  User,
  LogOut,
  X,
  RefreshCw,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-privy-auth';
import { ADMIN_ADDRESS } from '@/lib/constants';
import { TAROBASE_CONFIG } from '@/lib/config';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { useNavMenu } from '@/contexts/NavMenuContext';

const CYAN = '#00D4FF';
const NEON_MAGENTA = '#EC4899';
const NEON_GREEN = '#00FF41';

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...`;
}

interface MobileNavDropdownProps {
  /** @deprecated — uses NavMenuContext automatically now */
  isOpen?: boolean;
  /** @deprecated — uses NavMenuContext automatically now */
  onClose?: () => void;
}

export function MobileNavDropdown(_props: MobileNavDropdownProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, user, logout, login, isPrivyAuthenticated } = useAuth();
  const { isOpen, close } = useNavMenu();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;
  const isStuck = isPrivyAuthenticated && !user;
  const email = (user as any)?.email ?? null;
  const isAdmin = walletAddress === ADMIN_ADDRESS;

  // SOL balance state
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 5000;

  const fetchSolBalance = async () => {
    if (!walletAddress || !TAROBASE_CONFIG.rpcUrl) {
      setSolBalance(null);
      setBalanceLoading(false);
      return;
    }
    setBalanceLoading(true);
    try {
      const res = await fetch(TAROBASE_CONFIG.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [walletAddress] }),
      });
      const data = await res.json();
      if (data?.result?.value != null) {
        setSolBalance(data.result.value / 1_000_000_000);
      } else {
        setSolBalance(null);
      }
    } catch {
      setSolBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const refetchBalance = () => {
    const now = Date.now();
    if (now - lastFetchTime.current < FETCH_COOLDOWN) {
      const remaining = Math.ceil((FETCH_COOLDOWN - (now - lastFetchTime.current)) / 1000);
      toast.info(`Please wait ${remaining}s before refreshing`);
      return;
    }
    lastFetchTime.current = now;
    fetchSolBalance();
  };

  useEffect(() => {
    lastFetchTime.current = 0;
    fetchSolBalance();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const formatBalance = (bal: number | null) => {
    if (bal === null) return '—';
    return bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  };

  const shortenWalletAddress = (addr: string) => `${addr.slice(0, 6)}...`;

  const onClose = close;

  const handleConnectWallet = () => {
    try {
      login();
    } catch (error) {
      console.error('Login failed', error);
      toast.error('Unable to connect wallet. Please try again.');
    }
  };

  const handleNav = (path: string) => {
    navigator.vibrate?.(5);
    onClose();
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    } else {
      navigate(path);
    }
  };

  const handleLogout = () => {
    try {
      logout();
      onClose();
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to sign out');
    }
  };

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const navItems = [
    { label: 'MUSIC', path: '/stream' },
    { label: 'LAUNCH', path: '/launch' },
    { label: 'DISCOVER', path: '/hub' },
    { label: 'MY PROFILE', path: walletAddress ? `/artist/${walletAddress}` : '/artist' },
    { label: 'WALLET', path: '/wallet' },
    { label: 'LEADERBOARD', path: '/leaderboard' },
    ...(isAdmin ? [{ label: 'ADMIN', path: '/admin' }] : []),
  ];

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="mobile-nav-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            style={{
              zIndex: 998,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
            }}
            onClick={onClose}
          />

          {/* Dropdown panel — drops down from top navbar */}
          <motion.div
            key="mobile-nav-dropdown"
            initial={{ y: -20, opacity: 0, scaleY: 0.92 }}
            animate={{ y: 0, opacity: 1, scaleY: 1 }}
            exit={{ y: -20, opacity: 0, scaleY: 0.92 }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
            className="fixed left-0 right-0 overflow-hidden"
            style={{
              zIndex: 999,
              top: 'max(48px, calc(48px + env(safe-area-inset-top, 0px)))',
              transformOrigin: 'top center',
              background: 'rgba(4,10,4,0.98)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderBottom: '1px solid rgba(0, 255, 65, 0.18)',
              borderLeft: '1px solid rgba(0, 255, 65, 0.08)',
              borderRight: '1px solid rgba(0, 255, 65, 0.08)',
              boxShadow: '0 16px 60px rgba(0,0,0,0.8), 0 4px 24px rgba(0, 255, 65, 0.08)',
              borderRadius: '0 0 20px 20px',
              maxHeight: 'calc(100dvh - 80px)',
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{
                    background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: 'none',
                    fontFamily: "'Archivo Black', sans-serif",
                  }}
                >
                  Fun Hub
                </span>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full transition-all"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Wallet Balance Card */}
            <div
              className="mx-4 mt-2 mb-1 rounded-xl flex items-center gap-3 px-3 py-2.5"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.08), rgba(0,212,255,0.06))',
                border: '1px solid rgba(0, 255, 65, 0.25)',
                boxShadow: '0 0 16px rgba(0, 255, 65, 0.08)',
              }}
            >
              {/* Wallet icon */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0,212,255,0.1))',
                  border: '1.5px solid rgba(0, 255, 65, 0.3)',
                  boxShadow: isAuthenticated ? '0 0 10px rgba(0, 255, 65, 0.35)' : 'none',
                }}
              >
                <Wallet size={18} style={{ color: '#00FF41', filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.7))' }} />
              </div>

              {/* Balance info */}
              {isAuthenticated ? (
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: '#00FF41', textShadow: '0 0 8px rgba(0, 255, 65, 0.5)', fontFamily: "'Inter', monospace" }}
                  >
                    {balanceLoading ? '...' : `${formatBalance(solBalance)} SOL`}
                  </p>
                  <p className="text-[11px] font-mono truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {walletAddress ? shortenWalletAddress(walletAddress) : (email ?? 'Connected')}
                  </p>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    Connect Wallet
                  </p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    Sign in to see balance
                  </p>
                </div>
              )}

              {/* Refresh button (when logged in), Disconnect (stuck), or Login button */}
              {isAuthenticated ? (
                <button
                  onClick={refetchBalance}
                  disabled={balanceLoading}
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
                  style={{
                    background: 'rgba(0, 255, 65, 0.1)',
                    border: '1.5px solid rgba(0, 255, 65, 0.3)',
                    opacity: balanceLoading ? 0.5 : 1,
                  }}
                >
                  <RefreshCw
                    size={14}
                    style={{
                      color: '#00FF41',
                      animation: balanceLoading ? 'mnd-spin 1s linear infinite' : 'none',
                    }}
                  />
                </button>
              ) : isStuck ? (
                <button
                  onClick={handleLogout}
                  className="flex-shrink-0 px-3 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-90"
                  style={{
                    background: 'rgba(255,50,50,0.15)',
                    border: '1.5px solid rgba(255,50,50,0.4)',
                    color: '#ff5555',
                    textShadow: '0 0 6px rgba(255,50,50,0.5)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => { handleConnectWallet(); }}
                  className="flex-shrink-0 px-3 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-90"
                  style={{
                    background: 'rgba(0, 255, 65, 0.15)',
                    border: '1.5px solid rgba(0, 255, 65, 0.4)',
                    color: '#00FF41',
                    textShadow: '0 0 6px rgba(0, 255, 65, 0.5)',
                    letterSpacing: '0.05em',
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
            <style>{`@keyframes mnd-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

            {/* Scrollable content */}
            <div className="overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', maxHeight: 'calc(100dvh - 130px)' }}>
              {/* Navigation Links */}
              <div className="px-4 pt-3 pb-2">
                {navItems.map((item, i) => {
                  const isAdminItem = item.label === 'ADMIN';
                  return (
                    <motion.button
                      key={item.label}
                      onClick={() => handleNav(item.path)}
                      className="w-full flex items-center"
                      style={{
                        padding: '13px 14px',
                        background: isActive(item.path) ? (isAdminItem ? 'rgba(0,212,255,0.08)' : 'rgba(0, 255, 65, 0.08)') : 'transparent',
                        border: 'none',
                        borderBottom: i < navItems.length - 1 ? '1px solid rgba(0, 255, 65, 0.08)' : 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.12s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive(item.path)) e.currentTarget.style.background = isAdminItem ? 'rgba(0,212,255,0.06)' : 'rgba(0, 255, 65, 0.06)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive(item.path)) e.currentTarget.style.background = 'transparent';
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <span
                        className="text-sm font-black uppercase"
                        style={{
                          fontFamily: "'Archivo Black', sans-serif",
                          fontWeight: 900,
                          letterSpacing: '0.12em',
                          color: '#ffffff',
                          textShadow: isActive(item.path) ? `0 0 10px ${isAdminItem ? '#00D4FF' : NEON_GREEN}` : `0 0 6px ${isAdminItem ? '#00D4FF60' : NEON_GREEN + '60'}`,
                        }}
                      >
                        {item.label}
                      </span>
                      {isAdminItem && (
                        <span
                          className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: 'rgba(0,212,255,0.15)',
                            border: '1px solid rgba(0,212,255,0.3)',
                            color: '#00D4FF',
                            letterSpacing: '0.08em',
                          }}
                        >
                          ADMIN
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Auth section */}
              <div
                className="px-4 py-3 mx-4 mb-4 rounded-xl"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {loading ? (
                  <div
                    className="w-full rounded-lg animate-pulse"
                    style={{ height: 40, backgroundColor: 'rgba(255,255,255,0.08)' }}
                  />
                ) : !isAuthenticated ? (
                  isStuck ? (
                    <motion.button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                      style={{
                        backgroundColor: 'rgba(255,50,50,0.08)',
                        color: '#ff5555',
                        border: '1px solid rgba(255,50,50,0.4)',
                        textShadow: '0 0 8px rgba(255,50,50,0.6)',
                        boxShadow: '0 0 12px rgba(255,50,50,0.2)',
                        padding: '10px 16px',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <LogOut size={16} />
                      Disconnect & Reconnect
                    </motion.button>
                  ) : (
                    <motion.button
                      onClick={handleConnectWallet}
                      className="w-full flex items-center justify-center gap-2 rounded-xl text-sm font-semibold"
                      style={{
                        backgroundColor: 'rgba(0, 255, 65, 0.08)',
                        color: NEON_GREEN,
                        border: '1px solid rgba(0, 255, 65, 0.4)',
                        textShadow: '0 0 8px rgba(0, 255, 65, 0.6)',
                        boxShadow: '0 0 12px rgba(0, 255, 65, 0.2)',
                        padding: '10px 16px',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <Wallet size={16} />
                      Sign in
                    </motion.button>
                  )
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      <img
                        src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d734be21f73302c16fe66b"
                        alt="Lit"
                        style={{ height: 20, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.5))', flexShrink: 0 }}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: '#fff' }}>
                          {email ? email.split('@')[0] : (walletAddress ? shortenAddress(walletAddress) : 'Anonymous')}
                        </p>
                        {walletAddress && (
                          <p className="text-[10px] font-mono truncate mt-0.5" style={{ color: 'rgba(220,230,240,0.45)' }}>
                            {walletAddress}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { icon: User, label: 'My Profile', path: walletAddress ? `/artist/${walletAddress}` : '/artist' },
                        { icon: Layers, label: 'Collection', path: '/collection' },
                        { icon: Sparkles, label: 'Create', path: '/create-edition' },
                      ].map(item => (
                        <motion.button
                          key={item.path}
                          onClick={() => handleNav(item.path)}
                          className="flex flex-col items-center gap-1.5 rounded-xl py-2.5 px-2 transition-all"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.07)',
                            color: 'rgba(220,230,240,0.7)',
                          }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <item.icon size={15} />
                          <span className="text-[10px] font-medium" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                            {item.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                    <motion.button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 rounded-xl text-sm transition-all"
                      style={{
                        padding: '8px 16px',
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                        color: 'rgba(220,230,240,0.6)',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <LogOut size={14} />
                      Sign Out
                    </motion.button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    </>
  );
}
