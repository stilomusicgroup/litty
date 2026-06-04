import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share, Plus } from 'lucide-react';
import { isStandalone } from '@/utils/registerServiceWorker';

const STORAGE_KEY = 'lit-install-dismissed-at';
const VISIT_COUNT_KEY = 'lit-visit-count';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function getIsIOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function getIsAndroid() {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

function shouldShow(): boolean {
  if (isStandalone()) return false;

  const dismissedAt = localStorage.getItem(STORAGE_KEY);
  if (dismissedAt) {
    const elapsed = Date.now() - parseInt(dismissedAt, 10);
    if (elapsed < DISMISS_DURATION_MS) return false;
  }

  const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  return visits >= 2;
}

export default function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const isIOS = getIsIOS();
  const isAndroid = getIsAndroid();

  // Track visit count
  useEffect(() => {
    const count = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
    localStorage.setItem(VISIT_COUNT_KEY, String(count + 1));
  }, []);

  // Listen for beforeinstallprompt (Android/Chrome)
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Decide whether to show
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShow() && (isIOS || isAndroid || deferredPrompt)) {
        setVisible(true);
      }
    }, 3000); // short delay after load
    return () => clearTimeout(timer);
  }, [deferredPrompt, isIOS, isAndroid]);

  const dismiss = () => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  };

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSInstructions(true);
      return;
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        dismiss();
      }
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="install-prompt"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
            left: '12px',
            right: '12px',
            zIndex: 60,
            borderRadius: '20px',
            background: 'hsla(260, 85%, 4%, 0.96)',
            border: '1px solid hsla(263, 80%, 40%, 0.3)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 8px 40px hsla(263, 80%, 10%, 0.7), 0 0 0 1px hsla(263, 80%, 40%, 0.1)',
            padding: '16px 16px 18px',
            maxWidth: '480px',
            margin: '0 auto',
          }}
          className="md:hidden"
        >
          {/* Close */}
          <button
            onClick={dismiss}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'hsla(258, 30%, 25%, 0.5)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'hsla(258, 20%, 65%, 1)',
            }}
            aria-label="Dismiss install prompt"
          >
            <X size={14} />
          </button>

          {!showIOSInstructions ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* App icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, hsla(263,80%,20%,0.8), hsla(295,85%,20%,0.6))',
                  border: '1px solid hsla(263, 80%, 40%, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
                  <path d="M17 14 L17 30 Q17 33 14 33 Q11 33 11 30 Q11 27 14 27 Q15.5 27 17 28 L17 20 L31 17 L31 27 Q31 30 28 30 Q25 30 25 27 Q25 24 28 24 Q29.5 24 31 25 L31 18 Z" fill="url(#ipg)"/>
                  <defs>
                    <linearGradient id="ipg" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8B5CF6"/>
                      <stop offset="100%" stopColor="#D946EF"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                  Install Lit Studio
                </div>
                <div style={{ fontSize: 12, color: 'hsla(258, 20%, 58%, 1)', lineHeight: 1.4 }}>
                  Own music on Solana — add to your home screen
                </div>
              </div>

              <button
                onClick={handleInstall}
                style={{
                  flexShrink: 0,
                  padding: '9px 16px',
                  borderRadius: 100,
                  background: 'linear-gradient(135deg, hsl(263,80%,55%), hsl(295,85%,52%))',
                  border: 'none',
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {isIOS ? 'How?' : 'Install'}
              </button>
            </div>
          ) : (
            // iOS instructions
            <div>
              <div style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 14, paddingRight: 32 }}>
                Add Lit Studio to your home screen
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: <Share size={16} />, text: 'Tap the Share button in Safari' },
                  { icon: <Plus size={16} />, text: 'Tap "Add to Home Screen"' },
                  { icon: <span style={{ fontSize: 14 }}>✓</span>, text: 'Tap "Add" to confirm' },
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'hsla(263, 80%, 40%, 0.2)',
                        border: '1px solid hsla(263, 80%, 40%, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'hsl(263, 80%, 72%)',
                        flexShrink: 0,
                      }}
                    >
                      {step.icon}
                    </div>
                    <span style={{ fontSize: 13, color: 'hsla(258, 20%, 72%, 1)' }}>{step.text}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={dismiss}
                style={{
                  marginTop: 14,
                  width: '100%',
                  padding: '10px',
                  borderRadius: 12,
                  background: 'hsla(263, 80%, 40%, 0.15)',
                  border: '1px solid hsla(263, 80%, 40%, 0.25)',
                  color: 'hsl(263, 80%, 75%)',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Got it
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Trigger the install prompt programmatically (e.g., after first purchase).
 * Call this from any component after a conversion event.
 */
export function triggerInstallPromptAfterPurchase() {
  const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10);
  if (visits < 2) {
    localStorage.setItem(VISIT_COUNT_KEY, '2');
  }
}
