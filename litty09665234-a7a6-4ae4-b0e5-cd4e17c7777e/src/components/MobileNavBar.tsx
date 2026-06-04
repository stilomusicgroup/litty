/**
 * MobileNavBar — top navigation bar for mobile (< 768px).
 * Fixed at top, rounded pill style.
 * Left: three circular logos | Center: FUN HUB pill | Right: wallet pill
 */
import { ChevronDown } from 'lucide-react';
import { useNavMenu } from '@/contexts/NavMenuContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WalletButton } from '@/components/WalletButton';

const NEON_GREEN = '#00FF41';
const BG_BLACK = '#0a0a0a';
const BORDER_GREY = '#333';

export function MobileNavBar() {
  const { toggle } = useNavMenu();
  const navigate = useNavigate();

  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-[900] px-3 pt-[env(safe-area-inset-top)]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          background: BG_BLACK,
          padding: '10px 15px',
          borderRadius: 50,
          border: `1px solid ${BORDER_GREY}`,
        }}
      >
        {/* Left: three circular logos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Logo 1 — Stilo World (butterfly) */}
          <motion.div
            onClick={() => window.open('https://stiloworld.com', '_blank')}
            style={{
              width: 35,
              height: 35,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.18)',
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            whileTap={{ scale: 0.92 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            <img
              src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a0e80654f99d244e5ffafdc"
              alt="Stilo World"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </motion.div>

          {/* Logo 2 — Cyberfy (smiley) */}
          <motion.div
            onClick={() => window.open('https://cyberfy.fun', '_blank')}
            style={{
              width: 35,
              height: 35,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.18)',
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            whileTap={{ scale: 0.92 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            <img
              src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a0e7fd65409988aea260903"
              alt="Cyberfy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </motion.div>

          {/* Logo 3 — Lit Studio */}
          <motion.div
            onClick={() => navigate('/')}
            style={{
              width: 35,
              height: 35,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.18)',
              overflow: 'hidden',
              background: '#fff',
              flexShrink: 0,
              cursor: 'pointer',
            }}
            whileTap={{ scale: 0.92 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            <img
              src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a0e7fb74f99d244e5ffafdb"
              alt="Lit Studio"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </motion.div>
        </div>

        {/* Center: FUN HUB pill */}
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.95 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            border: `1.5px solid ${NEON_GREEN}`,
            padding: '6px 8px',
            borderRadius: 25,
            color: NEON_GREEN,
            fontFamily: "'Archivo Black', sans-serif",
            fontWeight: 900,
            fontSize: 11,
            letterSpacing: '0.14em',
            background: 'rgba(0, 255, 65, 0.06)',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: '0 0 10px rgba(0, 255, 65, 0.18)',
          }}
        >
          FUN HUB
          <ChevronDown size={10} style={{ color: NEON_GREEN, flexShrink: 0 }} />
        </motion.button>

        {/* Right: WalletButton only */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <WalletButton variant="green" />
        </div>
      </div>
    </div>
  );
}

export default MobileNavBar;
