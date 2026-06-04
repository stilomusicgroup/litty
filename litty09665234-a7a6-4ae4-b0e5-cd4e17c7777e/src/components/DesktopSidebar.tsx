import {
  Home,
  Music2,
  Library,
  TrendingUp,
  MessageCircle,
  PlusCircle,
  FileText,
  Wallet,
  Disc3,
  Flame,
  Store,
  Gem,
  Rocket,
  LogOut,
  Layers,
  Sparkles,
  User,
  Shield,
  LifeBuoy,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HapticWrapper } from '@/components/HapticWrapper';
import { useAuth } from '@/hooks/use-privy-auth';
import { usePlayer } from '@/contexts/PlayerContext';
import { ADMIN_ADDRESS } from '@/lib/constants';
import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/use-theme';

const CYAN = '#00D4FF';
const NEON_GREEN = '#00FF41';
const PRIMARY_GREEN = '#00FF41';
const NEON_MAGENTA = '#EC4899';

const navLinks = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Music', icon: Music2, path: '/stream' },
  { label: 'Library', icon: Library, path: '/collection' },
  { label: 'Charts', icon: TrendingUp, path: '/hot100' },
  { label: 'Social', icon: MessageCircle, path: '/social' },
  { label: 'Create', icon: PlusCircle, path: '/create' },
  { label: 'About', icon: FileText, path: '/about' },
  { label: 'Support', icon: LifeBuoy, path: '/support' },
];

const funHubItems = [
  { label: 'Marketplace', icon: <Store size={16} />, path: '/', color: CYAN },
  { label: 'Hot 100', icon: <Flame size={16} />, path: '/hot100', color: '#ff6b35' },
  { label: 'Collectibles', icon: <Gem size={16} />, path: '/collectibles', color: NEON_MAGENTA },
  { label: 'My Collection', icon: <Disc3 size={16} />, path: '/collection', color: '#a78bfa' },
];

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

interface DesktopSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  desktopOpen?: boolean;
  onDesktopToggle?: () => void;
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, user, logout, login } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const { currentSong } = usePlayer();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;
  const email = (user as any)?.email ?? null;
  const isAdmin = walletAddress === ADMIN_ADDRESS;
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    try {
      logout();
      setDropdownOpen(false);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to sign out');
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNav = (path: string) => {
    navigate(path);
    onNavClick?.();
  };

  return (
    <div className="flex flex-col h-full" style={{ width: 220 }}>
      {/* Logo */}
      <div className="flex-shrink-0 px-4 py-4">
        <motion.img
          src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d1f2b1c3c0c32401de37e9"
          alt="Lit Studio"
          className="h-8 w-auto object-contain cursor-pointer"
          style={{ filter: 'drop-shadow(0 0 12px rgba(0, 255, 65, 0.35))' }}
          onClick={() => handleNav('/')}
          whileTap={{ scale: 0.95 }}
          onTapStart={() => navigator.vibrate?.(5)}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isAuthenticated && walletAddress && (() => {
          const profilePath = `/artist/${walletAddress}`;
          const isActive = location.pathname === profilePath;
          return (
            <motion.button
              onClick={() => handleNav(profilePath)}
              className="w-full flex items-center gap-3 rounded-lg transition-all duration-200"
              style={{
                padding: '10px 12px',
                color: isActive ? NEON_GREEN : 'rgba(220,230,240,0.75)',
                background: isActive ? 'rgba(0, 255, 65, 0.12)' : 'rgba(0, 255, 65, 0.04)',
                border: isActive ? '1px solid rgba(0, 255, 65, 0.35)' : '1px solid rgba(0, 255, 65, 0.15)',
                marginBottom: 4,
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 65, 0.1)';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0, 255, 65, 0.04)';
              }}
              whileTap={{ scale: 0.97 }}
              onTapStart={() => navigator.vibrate?.(5)}
            >
              <User
                size={18}
                style={{
                  color: isActive ? NEON_GREEN : '#86efac',
                  filter: `drop-shadow(0 0 6px ${NEON_GREEN})`,
                }}
              />
              <span className="text-sm font-semibold" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                My Profile
              </span>
            </motion.button>
          );
        })()}
        {navLinks.map(({ label, icon: Icon, path }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <motion.button
              key={path}
              onClick={() => handleNav(path)}
              className="w-full flex items-center gap-3 rounded-lg transition-all duration-200"
              style={{
                padding: '10px 12px',
                color: isActive ? PRIMARY_GREEN : 'rgba(220,230,240,0.6)',
                background: isActive ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(0, 255, 65, 0.15)' : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
              whileTap={{ scale: 0.97 }}
              onTapStart={() => navigator.vibrate?.(5)}
            >
              <Icon
                size={18}
                style={{
                  color: isActive ? PRIMARY_GREEN : undefined,
                  filter: isActive ? `drop-shadow(0 0 6px ${PRIMARY_GREEN})` : undefined,
                  transition: 'all 0.2s',
                }}
              />
              <span className="text-sm font-medium" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                {label}
              </span>
            </motion.button>
          );
        })}

        {/* Fun Hub */}
        <div className="pt-4 pb-1">
          <div className="flex items-center gap-2 px-3" style={{ color: 'rgba(0, 255, 65, 0.5)' }}>
            <Rocket size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">Fun Hub</span>
          </div>
        </div>

        {funHubItems.map(({ label, icon, path, color }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <motion.button
              key={path}
              onClick={() => handleNav(path)}
              className="w-full flex items-center gap-3 rounded-lg transition-all duration-200"
              style={{
                padding: '10px 12px',
                color: isActive ? color : 'rgba(220,230,240,0.6)',
                background: isActive ? `${color}15` : 'transparent',
                border: isActive ? `1px solid ${color}30` : '1px solid transparent',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                }
              }}
              whileTap={{ scale: 0.97 }}
              onTapStart={() => navigator.vibrate?.(5)}
            >
              <span style={{ color: isActive ? color : undefined, filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined }}>
                {icon}
              </span>
              <span className="text-sm font-medium" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
                {label}
              </span>
            </motion.button>
          );
        })}

        {isAdmin && (
          <motion.button
            onClick={() => handleNav('/admin')}
            className="w-full flex items-center gap-3 rounded-lg mt-2 transition-all duration-200"
            style={{
              padding: '10px 12px',
              color: location.pathname.startsWith('/admin') ? CYAN : 'rgba(220,230,240,0.6)',
              background: location.pathname.startsWith('/admin') ? 'rgba(0,212,255,0.08)' : 'transparent',
              border: location.pathname.startsWith('/admin') ? '1px solid rgba(0,212,255,0.15)' : '1px solid transparent',
            }}
            whileTap={{ scale: 0.97 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            <Shield size={18} style={{ color: location.pathname.startsWith('/admin') ? CYAN : undefined }} />
            <span className="text-sm font-medium" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
              Admin
            </span>
          </motion.button>
        )}
      </nav>

      {/* Bottom section */}
      <div className="flex-shrink-0 px-3 pb-4 space-y-3">
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

        {/* Wallet / Auth */}
        {loading ? (
          <div
            className="w-full rounded-lg animate-pulse"
            style={{ height: 36, backgroundColor: 'rgba(255,255,255,0.1)' }}
          />
        ) : !isAuthenticated ? (
          <motion.button
            onClick={login}
            className="w-full flex items-center justify-center gap-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'rgba(0, 255, 65, 0.15)',
              color: '#00FF41',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              padding: '8px 12px',
              minHeight: 36,
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Wallet size={16} />
            Sign in
          </motion.button>
        ) : (
          <div className="relative" ref={dropdownRef}>
            <motion.button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center gap-2 rounded-lg text-sm font-medium transition-all"
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '8px 12px',
                minHeight: 36,
              }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
            >
              <img
                src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d734be21f73302c16fe66b"
                alt="Lit"
                className="flex-shrink-0"
                style={{ height: 18, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(0, 255, 65, 0.5))' }}
              />
              <span className="font-mono text-xs truncate" style={{ color: 'rgba(220,230,240,0.8)' }}>
                {walletAddress ? shortenAddress(walletAddress) : email}
              </span>
            </motion.button>

            {/* Dropdown */}
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute bottom-full left-0 mb-2 w-56 rounded-xl overflow-hidden"
                style={{
                  backgroundColor: 'rgba(10,16,10,0.98)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  zIndex: 60,
                }}
              >
                <div className="px-4 py-3 border-b border-white/10">
                  <p className="text-sm font-medium truncate" style={{ color: '#fff' }}>
                    {email ? email.split('@')[0] : (walletAddress ? shortenAddress(walletAddress) : 'Anonymous')}
                  </p>
                  {walletAddress && (
                    <p className="text-xs font-mono mt-1 truncate" style={{ color: 'rgba(220,230,240,0.5)' }}>
                      {walletAddress}
                    </p>
                  )}
                </div>
                <div className="py-2">
                  {[
                    { icon: <User size={16} />, label: 'My Profile', path: walletAddress ? `/artist/${walletAddress}` : '/artist' },
                    { icon: <Layers size={16} />, label: 'My Collection', path: '/collection' },
                    { icon: <Sparkles size={16} />, label: 'Create Collectible', path: '/create-edition' },
                  ].map(item => (
                    <motion.button
                      key={item.path}
                      onClick={() => { setDropdownOpen(false); handleNav(item.path); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                      style={{ color: 'rgba(220,230,240,0.8)' }}
                      whileTap={{ scale: 0.97 }}
                      onTapStart={() => navigator.vibrate?.(5)}
                    >
                      {item.icon}
                      {item.label}
                    </motion.button>
                  ))}
                </div>
                <div className="border-t border-white/10" />
                <div className="py-2">
                  <motion.button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{ color: 'rgba(220,230,240,0.8)' }}
                    whileTap={{ scale: 0.97 }}
                    onTapStart={() => navigator.vibrate?.(5)}
                  >
                    <LogOut size={16} />
                    Sign Out
                  </motion.button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Now Playing Mini-Card */}
        {currentSong && (
          <motion.button
            onClick={() => handleNav(`/song/${currentSong.songId}`)}
            className="w-full flex items-center gap-3 rounded-lg transition-all overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              padding: '8px',
            }}
            whileHover={{ background: 'rgba(255,255,255,0.06)' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            whileTap={{ scale: 0.97 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            <img
              src={currentSong.coverImage || 'https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d1f2b1c3c0c32401de37e9'}
              alt={currentSong.title}
              className="w-10 h-10 rounded-md object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium truncate" style={{ color: '#fff' }}>
                {currentSong.title}
              </p>
              <p className="text-[10px] truncate mt-0.5" style={{ color: 'rgba(220,230,240,0.5)' }}>
                {currentSong.artist}
              </p>
            </div>
          </motion.button>
        )}

        {/* Footer links */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <motion.button
            onClick={() => handleNav('/terms')}
            className="text-[10px] font-medium transition-colors hover:text-white/70"
            style={{ color: 'rgba(220,230,240,0.35)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            whileTap={{ scale: 0.95 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            Terms
          </motion.button>
          <span style={{ color: 'rgba(220,230,240,0.2)' }}>·</span>
          <motion.button
            onClick={() => handleNav('/privacy')}
            className="text-[10px] font-medium transition-colors hover:text-white/70"
            style={{ color: 'rgba(220,230,240,0.35)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            whileTap={{ scale: 0.95 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            Privacy
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export function DesktopSidebar({ isOpen = false, onClose, desktopOpen = false, onDesktopToggle }: DesktopSidebarProps) {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const sidebarStyle: React.CSSProperties = {
    background: isDark ? '#080512' : 'rgba(255,255,255,0.3)',
    borderRight: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.6)',
    backdropFilter: isDark ? 'none' : 'blur(20px)',
  };

  return (
    <>
      {/* Desktop: collapsible sidebar, hidden by default, slides in/out */}
      <AnimatePresence>
        {desktopOpen && (
          <motion.aside
            key="desktop-sidebar"
            initial={{ x: -220 }}
            animate={{ x: 0 }}
            exit={{ x: -220 }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="hidden md:flex flex-col fixed top-0 left-0 h-screen z-50"
            style={{ width: 220, ...sidebarStyle }}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile: overlay panel sliding from left */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 md:hidden"
              style={{ zIndex: 59, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={onClose}
            />

            {/* Slide-in panel */}
            <motion.div
              key="sidebar-panel"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed top-0 left-0 bottom-0 md:hidden flex flex-col overflow-hidden"
              style={{ zIndex: 60, width: 260, ...sidebarStyle }}
            >
              <SidebarContent onNavClick={onClose} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
