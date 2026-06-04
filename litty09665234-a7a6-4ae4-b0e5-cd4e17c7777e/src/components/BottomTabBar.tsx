import {
  Home,
  Music2,
  Rocket,
  User,
  Wallet,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-privy-auth';
import { triggerHapticFeedback } from '@/utils/haptic';
import { ProfileSignInSheet } from '@/components/ProfileSignInSheet';
import { useState } from 'react';

const NEON_GREEN = '#00FF41';

interface TabItem {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  path: string;
  matchPath: (pathname: string) => boolean;
}

const tabs: TabItem[] = [
  { label: 'Home', icon: Home, path: '/', matchPath: p => p === '/' },
  { label: 'Music', icon: Music2, path: '/stream', matchPath: p => p.startsWith('/stream') },
  { label: 'Launch', icon: Rocket, path: '/create', matchPath: p => p.startsWith('/create') },
  { label: 'Wallet', icon: Wallet, path: '/wallet', matchPath: p => p.startsWith('/wallet') },
  { label: 'Profile', icon: User, path: '/profile', matchPath: p => p === '/profile' },
];

export function BottomTabBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;
  const [showSignInSheet, setShowSignInSheet] = useState(false);

  const handleNav = (tab: TabItem) => {
    triggerHapticFeedback();
    if (tab.label === 'Profile' && !user) {
      setShowSignInSheet(true);
      return;
    }
    navigate(tab.path);
  };

  return (
    <>
      {/* Bottom Nav Bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex"
        style={{
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid hsla(140, 50%, 30%, 0.18)',
          boxShadow: '0 -1px 0 0 hsla(140, 50%, 25%, 0.12), 0 -4px 20px hsla(140, 50%, 10%, 0.7)',
          width: '100%',
          maxWidth: '100%',
          boxSizing: 'border-box',
        }}
        role="navigation"
        aria-label="Main navigation"
      >
        <div
          className="flex items-stretch w-full"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 4px)' }}
        >
          {tabs.map(({ label, icon: Icon, path, matchPath }) => {
            const active = matchPath(location.pathname);
            const isWalletTab = label === 'Wallet';
            const showConnectedDot = isWalletTab && walletAddress && !active;
            return (
              <motion.button
                key={path}
                onClick={() => handleNav({ label, icon: Icon, path, matchPath })}
                className="flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 relative"
                style={{ minHeight: '56px', paddingTop: '8px', paddingBottom: '4px' }}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                whileTap={{ scale: 0.95 }}
              >
                {/* Active indicator line at top — neon green for active tab only */}
                <AnimatePresence>
                  {active && (
                    <motion.span
                      key="indicator"
                      layoutId="tab-indicator"
                      className="absolute inset-x-4 top-0 h-[2px] rounded-b-full"
                      style={{
                        background: NEON_GREEN,
                        boxShadow: `0 0 10px rgba(0, 255, 65, 0.6), 0 0 20px rgba(0, 255, 65, 0.3)`,
                      }}
                      initial={{ opacity: 0, scaleX: 0.3 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0.3 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon or Logo — glow only on active tab */}
                <motion.div
                  animate={active ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    color: active ? NEON_GREEN : 'rgba(255, 255, 255, 0.4)',
                    filter: active ? 'drop-shadow(0 0 8px rgba(0, 255, 65, 0.8))' : 'none',
                    transition: 'color 0.2s, filter 0.2s',
                    position: 'relative',
                  }}
                >
                  <Icon
                    size={22}
                    strokeWidth={active ? 2.4 : 1.75}
                  />
                  {/* Connected indicator dot on Wallet tab */}
                  {showConnectedDot && (
                    <span
                      className="absolute -top-0.5 -right-1.5 w-2 h-2 rounded-full"
                      style={{
                        background: NEON_GREEN,
                        boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
                      }}
                    />
                  )}
                </motion.div>

                {/* Label — Orbitron font */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'Archivo Black', sans-serif",
                    color: active ? NEON_GREEN : 'rgba(255, 255, 255, 0.4)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'color 0.2s',
                  }}
                >
                  {label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </nav>
      <ProfileSignInSheet open={showSignInSheet} onOpenChange={setShowSignInSheet} />
    </>
  );
}
