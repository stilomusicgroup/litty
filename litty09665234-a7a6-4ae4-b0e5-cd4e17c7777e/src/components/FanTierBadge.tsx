import React from 'react';
import { motion } from 'framer-motion';

export type FanTier = 'none' | 'studio' | 'diamond' | 'legend';

interface TierConfig {
  label: string;
  /** Base metallic color (used for border glow) */
  color: string;
  /** glow rgba */
  glow: string;
  /** Metallic gradient for text + border */
  gradient: string;
  /** Border base color */
  border: string;
  /** Glow box-shadow value */
  boxShadow: string;
  /** Shine sweep highlight — diagonal strip */
  shineSweep: boolean;
  /** Breathing pulse for high tiers */
  pulse: boolean;
}

export const TIER_CONFIGS: Record<FanTier, TierConfig> = {
  none: {
    label: 'Fan',
    color: 'rgba(255,255,255,0.4)',
    glow: 'transparent',
    gradient: 'linear-gradient(90deg, rgba(255,255,255,0.3), rgba(255,255,255,0.5), rgba(255,255,255,0.3))',
    border: 'rgba(255,255,255,0.12)',
    boxShadow: 'none',
    shineSweep: false,
    pulse: false,
  },
  studio: {
    label: 'Studio',
    color: '#FFFF00',
    glow: 'rgba(255,255,0,0.55)',
    gradient: 'linear-gradient(90deg, #e6e600, #FFFF00, #e6e600)',
    border: '#FFFF00',
    boxShadow: '0 0 12px rgba(255,255,0,0.6), 0 0 28px rgba(255,255,0,0.25), inset 0 0 8px rgba(255,255,0,0.08)',
    shineSweep: true,
    pulse: true,
  },
  diamond: {
    label: 'Diamond',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.7)',
    gradient: 'linear-gradient(90deg, #7c3aed, #a855f7, #7c3aed)',
    border: '#a855f7',
    boxShadow: '0 0 14px rgba(168,85,247,0.65), 0 0 32px rgba(168,85,247,0.3), 0 0 60px rgba(168,85,247,0.1), inset 0 0 10px rgba(168,85,247,0.08)',
    shineSweep: true,
    pulse: true,
  },
  legend: {
    label: 'Legend',
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.8)',
    gradient: 'linear-gradient(90deg, #d97706, #f59e0b, #d97706)',
    border: '#f59e0b',
    boxShadow: '0 0 16px rgba(245,158,11,0.7), 0 0 36px rgba(245,158,11,0.35), 0 0 70px rgba(245,158,11,0.15), inset 0 0 12px rgba(245,158,11,0.1)',
    shineSweep: true,
    pulse: true,
  },
};

export function calculateTier(splBalance: number, nftCount: number): FanTier {
  if (splBalance >= 250000 || nftCount >= 5) return 'legend';
  if (splBalance >= 50000 || nftCount >= 2) return 'diamond';
  if (splBalance >= 10000 || nftCount >= 1) return 'studio';
  return 'none';
}

interface FanTierBadgeProps {
  tier: FanTier;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

const TIER_ICONS: Record<FanTier, string> = {
  none: '♪',
  studio: '⚡',
  diamond: '💎',
  legend: '👑',
};

const SIZE_MAP = {
  sm: { padding: '2px 8px', fontSize: '10px', iconSize: '10px' },
  md: { padding: '3px 10px', fontSize: '11px', iconSize: '11px' },
  lg: { padding: '5px 14px', fontSize: '13px', iconSize: '13px' },
};

const FanTierBadge: React.FC<FanTierBadgeProps> = ({ tier, size = 'md', animate = true }) => {
  const config = TIER_CONFIGS[tier];
  const sz = SIZE_MAP[size];
  const isActive = tier !== 'none';

  const badge = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: sz.padding,
        borderRadius: '20px',
        background: isActive ? 'rgba(10,5,24,0.92)' : 'rgba(255,255,255,0.05)',
        border: `1.5px solid ${isActive ? config.border : 'rgba(255,255,255,0.1)'}`,
        boxShadow: config.boxShadow,
        fontFamily: "'Inter', monospace",
        fontSize: sz.fontSize,
        fontWeight: 700,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.06em',
        whiteSpace: 'nowrap' as const,
        position: 'relative' as const,
        overflow: 'hidden' as const,
        cursor: 'default',
      }}
    >
      {/* Metallic gradient text via background-clip */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: isActive ? config.gradient : 'rgba(255,255,255,0.4)',
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: sz.iconSize }}>{TIER_ICONS[tier]}</span>
        <span>{config.label}</span>
      </span>

      {/* Diagonal shine sweep pseudo-element simulation */}
      {isActive && config.shineSweep && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'metalShine 2.8s ease-in-out infinite',
            borderRadius: '20px',
            zIndex: 1,
            pointerEvents: 'none',
          }}
        />
      )}
    </span>
  );

  if (!animate || !config.pulse) return badge;

  return (
    <motion.span
      animate={{
        filter: [
          `drop-shadow(0 0 4px ${config.glow})`,
          `drop-shadow(0 0 10px ${config.glow})`,
          `drop-shadow(0 0 4px ${config.glow})`,
        ],
      }}
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      style={{ display: 'inline-block' }}
    >
      {badge}
    </motion.span>
  );
};

export default FanTierBadge;

// Inject keyframes for metallic shine sweep
const styleId = 'fan-tier-metallic-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes metalShine {
      0%   { background-position: -200% 0; opacity: 0; }
      10%  { opacity: 1; }
      50%  { background-position: 200% 0; }
      60%  { opacity: 0; }
      100% { background-position: 200% 0; opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
