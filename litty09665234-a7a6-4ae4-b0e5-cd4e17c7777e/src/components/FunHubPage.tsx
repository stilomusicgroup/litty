import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import {
  Zap,
  Flame, Music, Compass, Sparkles, BookOpen, Rocket, Gem, User, Trophy,
  Settings, Plus, LogIn, Mail,
} from 'lucide-react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { ADMIN_ADDRESS } from '@/lib/constants';

// ─── Theme constants ──────────────────────────────────────────────────────────
const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const MAGENTA = '#EC4899';
const AMBER = '#f59e0b';

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({
  icon,
  label,
  sub,
  color,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38 }}
      className="flex items-center gap-3 mb-5"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{
          background: `${color}18`,
          border: `1.5px solid ${color}55`,
          boxShadow: `0 0 14px ${color}22`,
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <h2
          className="text-base font-black uppercase tracking-widest leading-none"
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            background: `linear-gradient(90deg, ${color}, #ffffff88)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {label}
        </h2>
        {sub && (
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ─── Hub Tile ─────────────────────────────────────────────────────────────────
interface HubTileProps {
  emoji: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description?: string;
  badge?: number | null;
  onClick: () => void;
  delay?: number;
}

function HubTile({ emoji, label, icon, color, description, badge, onClick, delay = 0 }: HubTileProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex flex-col items-center justify-center gap-2 rounded-2xl text-center transition-all duration-200 active:scale-95"
      style={{
        minHeight: 152,
        padding: '16px 12px',
        background: hovered
          ? `radial-gradient(ellipse at 50% 30%, ${color}28 0%, #0C1510 70%)`
          : `radial-gradient(ellipse at 50% 30%, ${color}14 0%, #050D05 70%)`,
        border: `1px solid ${color}${hovered ? '60' : '25'}`,
        boxShadow: hovered
          ? `0 0 28px ${color}45, 0 0 8px ${color}20, inset 0 1px 0 rgba(255,255,255,0.06)`
          : `0 0 12px ${color}18, inset 0 1px 0 rgba(255,255,255,0.03)`,
        transform: hovered ? 'scale(1.05) translateY(-2px)' : 'scale(1)',
        cursor: 'pointer',
      }}
    >
      {/* Badge */}
      {badge != null && badge > 0 && (
        <div
          className="absolute top-2 right-2 min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black"
          style={{
            background: color,
            color: '#000',
            fontFamily: "'Archivo Black', monospace",
            boxShadow: `0 0 8px ${color}88`,
          }}
        >
          {badge > 99 ? '99+' : badge}
        </div>
      )}

      {/* Emoji */}
      <span className="text-3xl leading-none select-none" style={{ filter: hovered ? `drop-shadow(0 0 8px ${color}88)` : 'none', transition: 'filter 0.2s' }}>
        {emoji}
      </span>

      {/* Icon circle */}
      <div
        className="flex items-center justify-center rounded-full transition-all duration-200"
        style={{
          width: 32,
          height: 32,
          background: hovered ? `${color}33` : `${color}18`,
          border: `1.5px solid ${hovered ? color : `${color}55`}`,
          color,
          boxShadow: hovered ? `0 0 12px ${color}66` : 'none',
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <span
        className="text-[11px] font-black uppercase tracking-widest leading-tight"
        style={{
          fontFamily: "'Archivo Black', sans-serif",
          color: hovered ? color : `${color}cc`,
          textShadow: hovered ? `0 0 10px ${color}88` : 'none',
        }}
      >
        {label}
      </span>

      {description && (
        <span
          className="text-[9px] leading-tight opacity-60"
          style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}
        >
          {description}
        </span>
      )}
    </motion.button>
  );
}

// ─── Main FunHubPage ──────────────────────────────────────────────────────────
const FunHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  // Beam-up count
  const { data: rawSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
    "where beamUpEnabled = true AND assetType = 'spl' AND mintStatus = 'cold'",
  );
  const beamUpCount = rawSongs?.length ?? null;

  // Admin check — matches same pattern as FunHub.tsx
  const isAdmin = !!(user?.address && user.address === ADMIN_ADDRESS);

  // Derive display name from user
  const userEmail = (user as any)?.email as string | undefined;
  const userDisplayName = userEmail
    ? userEmail.split('@')[0]
    : user?.address
      ? `${user.address.slice(0, 6)}…${user.address.slice(-4)}`
      : null;

  const tileDelay = (i: number) => 0.05 + i * 0.04;

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: 'transparent',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Safe-area spacer for iOS PWA */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />

      {/* Background grid */}
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,255,0.015) 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px',
        }}
      />

      {/* Ambient blobs */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', left: '15%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 255, 65, 0.03) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '40%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.025) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 255, 65, 0.02) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 px-4 pt-14 max-w-2xl mx-auto">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="flex items-center justify-between mb-8 pt-2"
        >
          {/* Left: title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${NEON_GREEN}15`, border: `1.5px solid ${NEON_GREEN}55`, boxShadow: `0 0 20px ${NEON_GREEN}25` }}>
              <Zap size={18} style={{ color: NEON_GREEN, filter: `drop-shadow(0 0 6px ${NEON_GREEN})` }} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-widest uppercase leading-none" style={{ fontFamily: "'Archivo Black', sans-serif", background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Fun Hub
              </h1>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>Discover · Stream · Explore</p>
            </div>
          </div>

          {/* Right: auth state */}
          {user ? (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{
                background: `${NEON_GREEN}10`,
                border: `1px solid ${NEON_GREEN}30`,
                boxShadow: `0 0 12px ${NEON_GREEN}12`,
              }}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `${NEON_GREEN}25`, border: `1px solid ${NEON_GREEN}55` }}
              >
                {userEmail ? (
                  <Mail size={10} style={{ color: NEON_GREEN }} />
                ) : (
                  <User size={10} style={{ color: NEON_GREEN }} />
                )}
              </div>
              <span
                className="text-[11px] font-bold truncate max-w-[96px]"
                style={{ color: NEON_GREEN, fontFamily: "'Inter', sans-serif" }}
              >
                {userDisplayName}
              </span>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              onClick={login}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider transition-all duration-200"
              style={{
                background: `${NEON_GREEN}18`,
                border: `1.5px solid ${NEON_GREEN}50`,
                color: NEON_GREEN,
                fontFamily: "'Archivo Black', sans-serif",
                boxShadow: `0 0 14px ${NEON_GREEN}20`,
                letterSpacing: '0.08em',
              }}
            >
              <LogIn size={13} />
              Sign In
            </motion.button>
          )}
        </motion.div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* TILE GRID */}
        {/* ══════════════════════════════════════════════════════════════ */}

        {/* Row 1 — Discovery */}
        <section className="mb-6">
          <SectionHeading icon={<Flame size={16} />} label="Discover" color="#ff6b35" delay={0.05} />
          <div className="grid grid-cols-3 gap-3">
            <HubTile
              emoji="🎵"
              label="MUSIC"
              icon={<Music size={15} />}
              color="#00FF41"
              description="Stream on Lit Studio"
              onClick={() => window.open('https://litstudio.online/stream', '_blank')}
              delay={tileDelay(0)}
            />
            <HubTile
              emoji="🔍"
              label="DISCOVER"
              icon={<Compass size={15} />}
              color="#BF00FF"
              description="Find your next favourite"
              onClick={() => navigate('/discover')}
              delay={tileDelay(1)}
            />
            <HubTile
              emoji="✨"
              label="NEW DROPS"
              icon={<Sparkles size={15} />}
              color="#60a5fa"
              description="Fresh music just landed"
              onClick={() => navigate('/new-drops')}
              delay={tileDelay(2)}
            />
          </div>
        </section>

        {/* Divider */}
        <div className="mb-6" style={{ height: 1, background: `linear-gradient(90deg, transparent, ${CYAN}33, transparent)` }} />

        {/* Row 2 — Platform */}
        <section className="mb-6">
          <SectionHeading icon={<Rocket size={16} />} label="Platform" color={CYAN} delay={0.1} />
          <div className="grid grid-cols-3 gap-3">
            <HubTile
              emoji="📖"
              label="ABOUT"
              icon={<BookOpen size={15} />}
              color="#06b6d4"
              description="Learn about Lit Studios"
              onClick={() => navigate('/about')}
              delay={tileDelay(3)}
            />
            <HubTile
              emoji="🚀"
              label="BEAM UP"
              icon={<Rocket size={15} />}
              color="#22d3ee"
              description="Cold SPL songs awaiting launch"
              badge={beamUpCount}
              onClick={() => navigate('/beam-up')}
              delay={tileDelay(4)}
            />
            <HubTile
              emoji="💎"
              label="NFT MARKET"
              icon={<Gem size={15} />}
              color="#d4a017"
              description="Collectible song NFTs"
              onClick={() => navigate('/nft-marketplace')}
              delay={tileDelay(5)}
            />
          </div>
        </section>

        {/* Divider */}
        <div className="mb-6" style={{ height: 1, background: `linear-gradient(90deg, transparent, ${MAGENTA}33, transparent)` }} />

        {/* Row 3 — Personal (2×2 grid) */}
        <section className="mb-10">
          <SectionHeading icon={<User size={16} />} label="Personal" color={NEON_GREEN} delay={0.15} />
          <div className="grid grid-cols-2 gap-3">
            <HubTile
              emoji="👤"
              label="MY PROFILE"
              icon={<User size={15} />}
              color={NEON_GREEN}
              description="Your artist page"
              onClick={() => {
                if (!user) { login(); return; }
                navigate('/profile');
              }}
              delay={tileDelay(6)}
            />
            <HubTile
              emoji="🏆"
              label="LEADERBOARD"
              icon={<Trophy size={15} />}
              color={AMBER}
              description="Top holders & streamers"
              onClick={() => navigate('/leaderboard')}
              delay={tileDelay(7)}
            />
            {isAdmin && (
              <HubTile
                emoji="⚙️"
                label="ADMIN"
                icon={<Settings size={15} />}
                color="#ef4444"
                description="Platform administration"
                onClick={() => navigate('/admin')}
                delay={tileDelay(8)}
              />
            )}
            <HubTile
              emoji="➕"
              label="CREATE"
              icon={<Plus size={15} />}
              color="#00FF41"
              description="Launch your song token"
              onClick={() => {
                if (!user) { login(); return; }
                navigate('/create');
              }}
              delay={tileDelay(isAdmin ? 9 : 8)}
            />
          </div>
        </section>

        {/* Footer badge */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center pb-6">
          <div className="px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest" style={{ background: `${NEON_GREEN}08`, border: `1px solid ${NEON_GREEN}22`, color: `${NEON_GREEN}66`, fontFamily: "'Archivo Black', sans-serif" }}>
            Lit Studios — Powered by Solana
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default FunHubPage;
