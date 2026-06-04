/**
 * MobileBottomNav — fixed bottom tab bar for mobile (< 768px).
 * ~64px tall with 5 icons: Home, Music, Launch, Wallet, Profile.
 */
import { Home, Music2, Wallet, Rocket, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { triggerHapticFeedback } from '@/utils/haptic';
import { ProfileSignInSheet } from '@/components/ProfileSignInSheet';
import { useState } from 'react';

const HEADLINE_GREEN = '#00FF41';

interface TabItem {
  label: string;
  icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
  path: string;
  matchPath: (pathname: string) => boolean;
}

const tabs: TabItem[] = [
  { label: 'Home', icon: Home, path: '/', matchPath: p => p === '/' },
  { label: 'Music', icon: Music2, path: '/stream', matchPath: p => p.startsWith('/stream') },
  { label: 'Launch', icon: Rocket, path: '/create', matchPath: p => p.startsWith('/create') },
  { label: 'Wallet', icon: Wallet, path: '/collection', matchPath: p => p.startsWith('/collection') },
  { label: 'Profile', icon: User, path: '/profile', matchPath: p => p === '/profile' },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;
  const [showSignInSheet, setShowSignInSheet] = useState(false);

  const handleTab = (tab: TabItem) => {
    triggerHapticFeedback();
    if (tab.label === 'Profile' && !user) {
      setShowSignInSheet(true);
      return;
    }
    navigate(tab.path);
  };

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-[900]"
      style={{ fontFamily: "'Archivo Black', sans-serif" }}
    >
      {/* Safe area spacer */}
      <div style={{
        background: 'rgba(6,10,6,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(131,255,68,0.12)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.5)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          height: 64,
          padding: '0 4px',
        }}>
          {tabs.map(tab => {
            const isActive = tab.matchPath(location.pathname);
            return (
              <motion.button
                key={tab.label}
                onClick={() => handleTab(tab)}
                whileTap={{ scale: 0.9 }}
                className="flex-1 flex flex-col items-center justify-center gap-1 relative"
                style={{
                  minHeight: 56,
                  paddingTop: 8,
                  paddingBottom: 4,
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {/* Active indicator line at top */}
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      key="indicator"
                      layoutId="mobile-tab-indicator"
                      className="absolute inset-x-4 top-0 h-[2px] rounded-b-full"
                      style={{
                        background: HEADLINE_GREEN,
                        boxShadow: '0 0 10px rgba(131,255,68,0.6), 0 0 20px rgba(131,255,68,0.3)',
                      }}
                      initial={{ opacity: 0, scaleX: 0.3 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      exit={{ opacity: 0, scaleX: 0.3 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <motion.div
                  animate={isActive ? { scale: 1.1, y: -1 } : { scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  style={{
                    color: isActive ? HEADLINE_GREEN : 'rgba(255, 255, 255, 0.4)',
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(131,255,68,0.8))' : 'none',
                    transition: 'color 0.2s, filter 0.2s',
                  }}
                >
                  <tab.icon
                    size={22}
                    strokeWidth={isActive ? 2.4 : 1.75}
                  />
                </motion.div>

                {/* Label */}
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    fontFamily: "'Archivo Black', sans-serif",
                    color: isActive ? HEADLINE_GREEN : 'rgba(255, 255, 255, 0.4)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'color 0.2s',
                  }}
                >
                  {tab.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
      <ProfileSignInSheet open={showSignInSheet} onOpenChange={setShowSignInSheet} />
    </div>
  );
}

export default MobileBottomNav;
