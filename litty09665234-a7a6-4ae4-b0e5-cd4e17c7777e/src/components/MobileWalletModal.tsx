import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, Ghost, Mail, Chrome, ChevronLeft, ExternalLink, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-privy-auth';
import { usePrivyAuth } from '@/hooks/usePrivyAuth';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const PRIMARY_GREEN = '#00FF41';
const DARK_BG = 'rgba(8,14,8,0.98)';
const CARD_BG = 'rgba(17,22,17,0.95)';

type ModalView = 'selector' | 'get-wallet';

interface MobileWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export const MobileWalletModal: React.FC<MobileWalletModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [view, setView] = useState<ModalView>('selector');
  const { login: poofLogin } = useAuth();
  const { login: privyLogin } = usePrivyAuth();

  // Reset view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('selector');
    }
  }, [isOpen]);

  const handleWalletConnect = () => {
    privyLogin();
    onClose();
  };

  const handleGoogle = () => {
    privyLogin();
    onClose();
  };

  const handleEmailPhone = () => {
    privyLogin();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0"
            style={{
              zIndex: 10000,
              background: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onClick={onClose}
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="fixed bottom-0 left-0 right-0"
            style={{
              zIndex: 10001,
              maxHeight: '85vh',
              background: DARK_BG,
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              border: `1px solid rgba(0, 255, 65, 0.2)`,
              borderBottom: 'none',
              borderLeft: `1px solid rgba(0, 255, 65, 0.1)`,
              borderRight: `1px solid rgba(0, 255, 65, 0.1)`,
              boxShadow: `0 -8px 40px rgba(0, 255, 65, 0.1), 0 -2px 20px rgba(0,0,0,0.6)`,
              paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
              overflow: 'auto',
            }}
          >
            {/* Handle bar */}
            <div
              className="flex justify-center pt-3 pb-2"
              style={{ cursor: 'grab' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '4px',
                  borderRadius: '2px',
                  background: 'rgba(255,255,255,0.3)',
                }}
              />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-6 pt-2 pb-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                {view === 'get-wallet' && (
                  <button
                    onClick={() => setView('selector')}
                    className="flex items-center justify-center w-8 h-8 rounded-full transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
                <div>
                  <h2
                    className="text-lg font-bold"
                    style={{
                      color: '#fff',
                      fontFamily: "'Archivo Black', system-ui, sans-serif",
                      textShadow: `0 0 12px ${NEON_GREEN}60`,
                    }}
                  >
                    {view === 'selector' ? 'Sign in' : 'Get a Wallet'}
                  </h2>
                  {view === 'selector' && (
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      Choose how you want to connect
                    </p>
                  )}
                </div>
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

            {/* Content */}
            <div className="px-6 pt-4 pb-6">
              {view === 'selector' ? (
                <div className="flex flex-col gap-3">
                  {/* Phantom */}
                  <motion.button
                    onClick={handleWalletConnect}
                    className="w-full flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(139,92,246,0.12)',
                      border: `1px solid rgba(139,92,246,0.35)`,
                      boxShadow: `0 0 16px rgba(139,92,246,0.15)`,
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 0 24px rgba(139,92,246,0.25)`,
                      borderColor: `rgba(139,92,246,0.6)`,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{
                        background: 'rgba(139,92,246,0.2)',
                        border: '1px solid rgba(139,92,246,0.3)',
                      }}
                    >
                      <Ghost
                        size={22}
                        style={{ color: PRIMARY_GREEN, filter: `drop-shadow(0 0 6px ${PRIMARY_GREEN})` }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: '#fff' }}
                      >
                        Connect with Phantom
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        Tap to connect — works in-app or browser
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </motion.button>

                  {/* WalletConnect */}
                  <motion.button
                    onClick={handleWalletConnect}
                    className="w-full flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.3)',
                      boxShadow: '0 0 12px rgba(0,212,255,0.1)',
                      color: '#fff',
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 0 20px rgba(0,212,255,0.2)`,
                      borderColor: `rgba(0,212,255,0.5)`,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{
                        background: 'rgba(0,212,255,0.15)',
                        border: '1px solid rgba(0,212,255,0.25)',
                      }}
                    >
                      <Wallet
                        size={22}
                        style={{ color: CYAN, filter: `drop-shadow(0 0 6px ${CYAN})` }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: '#fff' }}
                      >
                        Connect with WalletConnect
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        Connect any wallet via WalletConnect
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </motion.button>

                  {/* Google */}
                  <motion.button
                    onClick={handleGoogle}
                    className="w-full flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(234,67,53,0.08)',
                      border: '1px solid rgba(234,67,53,0.35)',
                      boxShadow: '0 0 12px rgba(234,67,53,0.1)',
                      color: '#fff',
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 0 20px rgba(234,67,53,0.2)`,
                      borderColor: `rgba(234,67,53,0.6)`,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{
                        background: 'rgba(234,67,53,0.15)',
                        border: '1px solid rgba(234,67,53,0.25)',
                      }}
                    >
                      <Chrome
                        size={22}
                        style={{ color: '#EA4335', filter: `drop-shadow(0 0 6px #EA4335)` }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: '#fff' }}
                      >
                        Continue with Google
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        Sign in with your Google account
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </motion.button>

                  {/* Email/Phone */}
                  <motion.button
                    onClick={handleEmailPhone}
                    className="w-full flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(0, 255, 65, 0.06)',
                      border: '1px solid rgba(0, 255, 65, 0.25)',
                      boxShadow: '0 0 10px rgba(0, 255, 65, 0.08)',
                      color: '#fff',
                    }}
                    whileHover={{
                      scale: 1.02,
                      boxShadow: `0 0 18px rgba(0, 255, 65, 0.15)`,
                      borderColor: `rgba(0, 255, 65, 0.45)`,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div
                      className="flex items-center justify-center w-12 h-12 rounded-xl"
                      style={{
                        background: 'rgba(0, 255, 65, 0.12)',
                        border: '1px solid rgba(0, 255, 65, 0.2)',
                      }}
                    >
                      <Mail
                        size={22}
                        style={{ color: NEON_GREEN, filter: `drop-shadow(0 0 6px ${NEON_GREEN})` }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className="text-sm font-semibold"
                        style={{ color: '#fff' }}
                      >
                        Continue with email/phone
                      </p>
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        Create a wallet using your email
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </motion.button>

                  {/* Don't have a wallet link */}
                  <button
                    onClick={() => setView('get-wallet')}
                    className="w-full text-center py-3 text-sm font-medium transition-all"
                    style={{
                      color: CYAN,
                      textShadow: `0 0 8px ${CYAN}80`,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLElement).style.textShadow = `0 0 12px ${CYAN}cc`;
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLElement).style.textShadow = `0 0 8px ${CYAN}80`;
                    }}
                  >
                    Don&apos;t have a wallet? Get one here
                  </button>
                </div>
              ) : (
                /* Get a Wallet view */
                <div className="flex flex-col gap-4">
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: 'rgba(255,255,255,0.7)' }}
                  >
                    Phantom is the most popular Solana wallet. Download it on your device to get started:
                  </p>

                  {/* Phantom download links */}
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(139,92,246,0.1)',
                      border: '1px solid rgba(139,92,246,0.3)',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        background: 'rgba(139,92,246,0.2)',
                      }}
                    >
                      <Ghost
                        size={20}
                        style={{ color: PRIMARY_GREEN }}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                        Phantom Wallet
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        phantom.app
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </a>

                  {/* iOS App Store link */}
                  <a
                    href="https://apps.apple.com/app/phantom-crypto-wallet/id1598432977"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(0, 255, 65, 0.06)',
                      border: '1px solid rgba(0, 255, 65, 0.2)',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        background: 'rgba(0, 255, 65, 0.15)',
                      }}
                    >
                      <span className="text-lg">🍎</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                        Download on the App Store
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        For iPhone and iPad
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </a>

                  {/* Google Play link */}
                  <a
                    href="https://play.google.com/store/apps/details?id=app.phantom"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 rounded-xl p-4 transition-all"
                    style={{
                      background: 'rgba(0,212,255,0.06)',
                      border: '1px solid rgba(0,212,255,0.2)',
                      textDecoration: 'none',
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        background: 'rgba(0,212,255,0.12)',
                      }}
                    >
                      <span className="text-lg">🤖</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: '#fff' }}>
                        Get it on Google Play
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        For Android devices
                      </p>
                    </div>
                    <ExternalLink
                      size={16}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    />
                  </a>

                  {/* Back to selector */}
                  <button
                    onClick={() => setView('selector')}
                    className="w-full text-center py-3 text-sm font-medium transition-all"
                    style={{
                      color: NEON_GREEN,
                      textShadow: `0 0 8px ${NEON_GREEN}80`,
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Back to connect options
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileWalletModal;
