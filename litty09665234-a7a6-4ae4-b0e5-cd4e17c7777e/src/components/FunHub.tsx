import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Rocket, Flame, Music, Disc3, X, Shield, Store, User, Compass, Sparkles, BookOpen, Gem, Trophy, Settings, Plus } from 'lucide-react';
import { ADMIN_ADDRESS } from '@/lib/constants';
import { useTheme } from '@/hooks/use-theme';

const NEON_PURPLE = '#8B5CF6';
const NEON_MAGENTA = '#EC4899';
const NEON_CYAN = '#00D4FF';

interface HubItem {
  label: string;
  emoji: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  glowColor: string;
  adminOnly?: boolean;
}

const baseHubItems: HubItem[] = [
  // Discovery
  {
    label: 'MUSIC',
    emoji: '\uD83C\uDFB5',
    icon: <Music size={18} />,
    path: 'https://litstudio.online/stream',
    color: '#00FF41',
    glowColor: 'rgba(0, 255, 65, 0.4)',
  },
  {
    label: 'DISCOVER',
    emoji: '\uD83D\uDD0D',
    icon: <Compass size={18} />,
    path: '/discover',
    color: '#BF00FF',
    glowColor: 'rgba(191, 0, 255, 0.4)',
  },
  {
    label: 'NEW DROPS',
    emoji: '\u2728',
    icon: <Sparkles size={18} />,
    path: '/new-drops',
    color: '#60a5fa',
    glowColor: 'rgba(96, 165, 250, 0.4)',
  },
  // Platform
  {
    label: 'ABOUT',
    emoji: '\uD83D\uDCD6',
    icon: <BookOpen size={18} />,
    path: '/about',
    color: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.4)',
  },
  {
    label: 'BEAM UP',
    emoji: '\uD83D\uDE80',
    icon: <Rocket size={18} />,
    path: '/beam-up',
    color: '#22d3ee',
    glowColor: 'rgba(34, 211, 238, 0.4)',
  },
  {
    label: 'NFT MARKET',
    emoji: '\uD83D\uDC8E',
    icon: <Gem size={18} />,
    path: '/nft-marketplace',
    color: '#d4a017',
    glowColor: 'rgba(212, 160, 23, 0.4)',
  },
  // Personal
  {
    label: 'MY PROFILE',
    emoji: '\uD83D\uDC64',
    icon: <User size={18} />,
    path: '/profile',
    color: '#00FF41',
    glowColor: 'rgba(0, 255, 65, 0.4)',
  },
  {
    label: 'LEADERBOARD',
    emoji: '\uD83C\uDFC6',
    icon: <Trophy size={18} />,
    path: '/leaderboard',
    color: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.4)',
  },
  {
    label: 'ADMIN',
    emoji: '\u2699\uFE0F',
    icon: <Settings size={18} />,
    path: '/admin',
    color: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    adminOnly: true,
  },
  {
    label: 'CREATE',
    emoji: '\u2795',
    icon: <Plus size={18} />,
    path: '/create',
    color: '#00FF41',
    glowColor: 'rgba(74, 222, 128, 0.4)',
  },
];

const FunHub: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { user, login: poofLogin } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const GLASS = 'rgba(255,255,255,0.3)';
  const GLASS_BORDER = 'rgba(255,255,255,0.6)';
  const NAVY = '#1a2744';
  const NAVY_MUTED = 'rgba(26,39,68,0.55)';

  const isAdmin = user?.address === ADMIN_ADDRESS;
  const hubItems = baseHubItems.filter(item => !item.adminOnly || isAdmin);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKey);
    }
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  const handleNavigate = (path: string, _item: HubItem) => {
    setIsOpen(false);
    if (path.startsWith('http')) {
      window.open(path, '_blank');
    } else if (path === '/profile' && !user) {
      // Will be handled by the parent; just navigate to trigger login flow
    } else {
      navigate(path);
    }
  };

  return (
    <div ref={containerRef} className="fixed fun-hub-anchor z-[45]" style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))', right: '16px' }}>
      <style>{`
        @media (min-width: 768px) {
          .fun-hub-anchor {
            bottom: 32px !important;
          }
        }
        @keyframes funhub-glow-pulse {
          0%, 100% {
            box-shadow:
              0 0 16px rgba(167, 139, 250, 0.5),
              0 0 32px rgba(167, 139, 250, 0.25),
              0 0 48px rgba(200, 100, 255, 0.15);
          }
          50% {
            box-shadow:
              0 0 22px rgba(167, 139, 250, 0.7),
              0 0 44px rgba(167, 139, 250, 0.35),
              0 0 64px rgba(200, 100, 255, 0.2);
          }
        }
        @keyframes funhub-ring-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Popup Card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 16 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="absolute bottom-16 right-0 w-[min(280px,calc(100vw-32px))] rounded-2xl overflow-hidden"
            style={{
              background: isDark ? 'rgba(16, 10, 36, 0.92)' : GLASS,
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: `1px solid ${isDark ? 'rgba(167, 139, 250, 0.2)' : GLASS_BORDER}`,
              boxShadow: isDark
                ? `0 8px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(167, 139, 250, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.06)`
                : '0 8px 40px rgba(0, 0, 0, 0.15), 0 0 30px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{
                borderBottom: `1px solid ${isDark ? 'rgba(167, 139, 250, 0.12)' : 'rgba(26,39,68,0.1)'}`,
                background: isDark
                  ? 'linear-gradient(135deg, rgba(167, 139, 250, 0.06), rgba(200, 100, 255, 0.04))'
                  : 'rgba(0, 255, 65, 0.04)',
              }}
            >
              <div className="flex items-center gap-2">
                <Rocket size={16} style={{ color: isDark ? NEON_PURPLE : '#00FF41' }} />
                <span
                  className="text-sm font-bold tracking-wide"
                  style={{
                    background: isDark
                      ? `linear-gradient(135deg, ${NEON_PURPLE}, ${NEON_MAGENTA})`
                      : `linear-gradient(135deg, #00FF41, #06d6a0)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  FUN HUB
                </span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  background: 'rgba(255, 255, 255, 0.05)',
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Items */}
            <div className="p-2 space-y-0.5">
              {hubItems.map((item, index) => {
                const active = item.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.path);
                return (
                  <motion.button
                    key={item.path}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={() => {
                      if (item.path === '/profile' && !user) {
                        setIsOpen(false);
                        poofLogin();
                      } else {
                        handleNavigate(item.path, item);
                      }
                    }}
                    className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-left transition-all group"
                    style={{
                      background: active
                        ? `rgba(167, 139, 250, 0.1)`
                        : 'transparent',
                      border: active
                        ? '1px solid rgba(167, 139, 250, 0.2)'
                        : '1px solid transparent',
                      minHeight: '52px',
                    }}
                  >
                    {/* Icon container */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${item.color}22, ${item.color}11)`,
                        border: `1px solid ${item.color}33`,
                        color: item.color,
                        boxShadow: active ? `0 0 12px ${item.glowColor}` : 'none',
                      }}
                    >
                      {item.icon}
                    </div>

                    {/* Label */}
                    <div className="flex-1 min-w-0">
                      <span
                        className="text-[15px] font-medium block tracking-wide"
                        style={{
                          color: active ? '#fff' : 'rgba(220, 230, 240, 0.85)',
                          fontFamily: "'Inter', sans-serif",
                        }}
                      >
                        {item.label}
                      </span>
                    </div>

                    {/* Active indicator */}
                    {active && (
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          background: item.color,
                          boxShadow: `0 0 6px ${item.color}`,
                        }}
                      />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Footer sparkle */}
            <div
              className="px-4 py-2 text-center"
              style={{
                borderTop: '1px solid rgba(167, 139, 250, 0.08)',
              }}
            >
              <span
                className="text-[10px] font-medium"
                style={{ color: 'rgba(167, 139, 250, 0.4)' }}
              >
                Explore the Lit universe
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fun-hub-container relative flex items-center justify-center"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: isDark
            ? (isOpen
                ? 'linear-gradient(135deg, hsl(295, 85%, 52%), hsl(263, 80%, 55%))'
                : 'linear-gradient(135deg, hsl(263, 80%, 55%), hsl(295, 85%, 52%))')
            : 'linear-gradient(135deg, #00FF41, #06d6a0)',
          animation: isOpen ? 'none' : (isDark ? 'funhub-glow-pulse 3s ease-in-out infinite' : 'none'),
          boxShadow: isDark
            ? (isOpen
                ? '0 0 20px rgba(167, 139, 250, 0.6), 0 0 40px rgba(200, 100, 255, 0.3)'
                : undefined)
            : '0 0 20px rgba(0, 255, 65, 0.4), 0 0 40px rgba(6,214,160,0.2)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.4)',
        }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        aria-label="Open Fun Hub"
      >
        {/* Rotating ring accent */}
        <div
          className="absolute inset-[-3px] rounded-full pointer-events-none"
          style={{
            border: isDark ? '1.5px dashed rgba(167, 139, 250, 0.25)' : '1.5px dashed rgba(255, 255, 255, 0.4)',
            animation: 'funhub-ring-rotate 12s linear infinite',
          }}
        />

        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} color={isDark ? '#fff' : NAVY} />
            </motion.div>
          ) : (
            <motion.div
              key="rocket"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Rocket size={22} color={isDark ? '#fff' : NAVY} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
};

export default FunHub;
