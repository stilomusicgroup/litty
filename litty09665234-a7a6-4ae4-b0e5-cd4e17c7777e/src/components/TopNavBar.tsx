import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { WalletButton } from '@/components/WalletButton';
import { NotificationBell } from '@/components/NotificationBell';
import { useAuth } from '@/hooks/use-privy-auth';
import { ADMIN_ADDRESS } from '@/lib/constants';

const BG = '#0A1A0A';
const CARD = '#0C1510';
const DEEP = '#050f0a';
const G = '#00FF41';
const G2 = 'rgba(0, 255, 65, 0.1)';
const GB = 'rgba(0, 255, 65, 0.32)';
const GB2 = 'rgba(0, 255, 65, 0.14)';
const T1 = '#ffffff';
const T2 = '#888888';
const T3 = '#444444';

interface AvatarIconProps {
  children: React.ReactNode;
  glowColor?: string;
  size?: number;
  onClick?: () => void;
}

function AvatarIcon({ children, glowColor = 'rgba(0, 255, 65, 0.25)', size = 34, onClick }: AvatarIconProps) {
  return (
    <motion.div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1.5px solid rgba(255,255,255,0.18)',
        background: DEEP,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        boxShadow: 'none',
        cursor: 'pointer',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.92 }}
      onTapStart={() => navigator.vibrate?.(5)}
    >
      {children}
    </motion.div>
  );
}

interface LogoProps {
  onClick?: () => void;
}

function Logo_DSMC({ onClick }: LogoProps) {
  return (
    <AvatarIcon glowColor="rgba(255,255,255,0.12)" onClick={onClick}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg,#1a1a2a,#0d0d18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a0e80654f99d244e5ffafdc"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          alt="Stilo World"
        />
      </div>
    </AvatarIcon>
  );
}

function Logo_Smiley({ onClick }: LogoProps) {
  return (
    <AvatarIcon glowColor="rgba(255,220,0,0.15)" onClick={onClick}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg,#2a2010,#1a1408)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a0e7fd65409988aea260903"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          alt="Cyberfy"
        />
      </div>
    </AvatarIcon>
  );
}

function Logo_LitStudio({ onClick }: LogoProps) {
  return (
    <AvatarIcon glowColor="rgba(0, 255, 65, 0.4)" onClick={onClick}>
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(145deg,#0a2a14,#050f0a)',
          border: `1.5px solid ${G}`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a0e7fb74f99d244e5ffafdb"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          alt="Lit Studio"
        />
      </div>
    </AvatarIcon>
  );
}

interface FunHubPillProps {
  open: boolean;
  onClick: () => void;
}

function FunHubPill({ open, onClick }: FunHubPillProps) {
  return (
    <motion.button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 20px',
        borderRadius: 24,
        border: `1.5px solid ${G}`,
        background: open ? 'rgba(0, 255, 65, 0.16)' : 'rgba(0, 255, 65, 0.06)',
        cursor: 'pointer',
        outline: 'none',
        boxShadow: open
          ? '0 0 20px rgba(0, 255, 65, 0.3), inset 0 0 12px rgba(0, 255, 65, 0.08)'
          : '0 0 10px rgba(0, 255, 65, 0.18)',
        whiteSpace: 'nowrap',
      }}
      whileTap={{ scale: 0.95 }}
      onTapStart={() => navigator.vibrate?.(5)}
    >
      <span
        style={{
          fontFamily: "'Archivo Black',sans-serif",
          fontWeight: 900,
          fontSize: 11,
          color: G,
          letterSpacing: '0.14em',
          lineHeight: 1,
        }}
      >
        FUN HUB
      </span>
      <svg
        width={8}
        height={8}
        viewBox="0 0 10 6"
        fill="none"
        style={{
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          marginTop: open ? 0 : 1,
        }}
      >
        <path
          d="M1 1l4 4 4-4"
          stroke={G}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </motion.button>
  );
}

const baseHubItems: { label: string; icon: string; path: string; adminOnly?: boolean }[] = [
  { label: 'MUSIC', icon: '', path: '/stream' },
  { label: 'LAUNCH', icon: '', path: '/launch' },
  { label: 'WALLET', icon: '', path: '/wallet' },
  { label: 'MY PROFILE', icon: '', path: '/profile' },
  { label: 'ARTIST DASHBOARD', icon: '', path: '/artist-dashboard' },
  { label: 'LEADERBOARD', icon: '', path: '/leaderboard' },
  { label: 'STREAM', icon: '', path: '/stream' },
  { label: 'ADMIN', icon: '', path: '/admin', adminOnly: true },
];

interface HubDropdownProps {
  items: typeof baseHubItems;
  onSelect?: (path: string) => void;
}

function HubDropdown({ items, onSelect }: HubDropdownProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: '50%',
        transform: 'translateX(-50%)',
        minWidth: 170,
        background: 'rgba(5,12,8,0.97)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${GB}`,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.7), 0 0 24px rgba(0, 255, 65, 0.1)',
        zIndex: 500,
        animation: 'dropIn 0.16s ease forwards',
      }}
    >
      <style>{`@keyframes dropIn{from{opacity:0;transform:translateX(-50%) translateY(-6px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      {items.map((item, i) => {
        const isAdminItem = item.label === 'ADMIN';
        return (
          <motion.button
            key={item.label}
            onClick={() => onSelect?.(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '9px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: i < items.length - 1 ? '1px solid rgba(0, 255, 65, 0.07)' : 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.1s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = isAdminItem ? 'rgba(0,212,255,0.09)' : 'rgba(0, 255, 65, 0.09)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            whileTap={{ scale: 0.97 }}
            onTapStart={() => navigator.vibrate?.(5)}
          >
            <span style={{ fontSize: 13, width: 18, textAlign: 'center', color: isAdminItem ? '#00D4FF' : undefined }}>
              {isAdminItem ? '⚡' : item.icon}
            </span>
            <span
              style={{
                fontFamily: "'Archivo Black',sans-serif",
                fontSize: 9,
                fontWeight: 700,
                color: isAdminItem ? '#00D4FF' : T1,
                letterSpacing: '0.12em',
              }}
            >
              {item.label}
            </span>
            {isAdminItem && (
              <span
                style={{
                  marginLeft: 'auto',
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 4,
                  background: 'rgba(0,212,255,0.15)',
                  border: '1px solid rgba(0,212,255,0.3)',
                  color: '#00D4FF',
                  letterSpacing: '0.06em',
                  fontFamily: "'Archivo Black',sans-serif",
                }}
              >
                ADMIN
              </span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function TopNavBar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.address === ADMIN_ADDRESS;
  const hubItems = baseHubItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap'); *{box-sizing:border-box;margin:0;padding:0;}`}</style>
      <div
        className="hidden md:grid"
        style={{
          width: '100%',
          height: 52,
          background: DEEP,
          borderBottom: `1px solid ${GB2}`,
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          padding: '0 14px',
          paddingTop: 'max(env(safe-area-inset-top), 0px)',
          zIndex: 200,
          position: 'sticky',
          top: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-start' }}>
          <Logo_DSMC onClick={() => window.open('https://stiloworld.com', '_blank')} />
          <Logo_Smiley onClick={() => window.open('https://cyberfy.fun', '_blank')} />
          <Logo_LitStudio onClick={() => navigate('/')} />
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <FunHubPill open={open} onClick={() => setOpen((o) => !o)} />
          {open && (
            <HubDropdown
              items={hubItems}
              onSelect={(path) => {
                setOpen(false);
                navigate(path);
              }}
            />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 }}>
          {user && <NotificationBell />}
          <WalletButton variant="green" />
        </div>
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 199 }}
        />
      )}
    </>
  );
}
