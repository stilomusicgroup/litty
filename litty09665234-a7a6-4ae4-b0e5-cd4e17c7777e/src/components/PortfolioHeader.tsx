import React from 'react';
import { motion } from 'framer-motion';
import { Gem, TrendingUp, Disc3 } from 'lucide-react';
import { useTheme } from '@/hooks/use-theme';

interface PortfolioHeaderProps {
  walletAddress: string | null;
  ownedCount: number;
  portfolioUsdValue: number;
  priceFallback: boolean;
  isLoading: boolean;
}

const NAVY = '#1a2744';
const NAVY_MUTED = 'rgba(26,39,68,0.55)';
const GLASS = 'rgba(255,255,255,0.3)';
const GLASS_BORDER = 'rgba(255,255,255,0.6)';
const GREEN_TEXT = '#00FF41';

const PortfolioHeader: React.FC<PortfolioHeaderProps> = ({
  walletAddress,
  ownedCount,
  portfolioUsdValue,
  priceFallback,
  isLoading,
}) => {
  const { mode } = useTheme();
  const isDark = mode === 'dark';
  const displayAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
    : '';

  return (
    <div style={{ marginBottom: '36px' }}>
      {/* Title row */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ marginBottom: '28px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: isDark
              ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))'
              : 'rgba(0, 255, 65, 0.1)',
            border: `1px solid ${isDark ? 'rgba(139,92,246,0.3)' : GLASS_BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...(!isDark ? { backdropFilter: 'blur(20px)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } : {}),
          }}>
            <Gem size={18} color={isDark ? '#a78bfa' : GREEN_TEXT} />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 900,
            color: isDark ? '#fff' : NAVY,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            My Collection
          </h1>
        </div>
        {displayAddress && (
          <div style={{
            fontSize: '12px',
            color: isDark ? 'rgba(167,139,250,0.6)' : NAVY_MUTED,
            fontFamily: "'Inter', monospace",
            marginLeft: '48px',
          }}>
            {displayAddress}
          </div>
        )}
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
        }}
      >
        {/* Portfolio Value */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(15,10,30,0.8) 100%)'
            : GLASS,
          border: `1px solid ${isDark ? 'rgba(139,92,246,0.2)' : GLASS_BORDER}`,
          backdropFilter: isDark ? 'blur(12px)' : 'blur(20px)',
          ...(!isDark ? { WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } : {}),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <TrendingUp size={13} color={isDark ? 'rgba(167,139,250,0.6)' : GREEN_TEXT} />
            <span style={{ fontSize: '10px', color: isDark ? 'rgba(167,139,250,0.5)' : NAVY_MUTED, fontFamily: "'Inter', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Portfolio Value
            </span>
          </div>
          {isLoading ? (
            <div style={{ height: '26px', width: '80px', borderRadius: '6px', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,39,68,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <>
              <div style={{ fontSize: '22px', fontWeight: 800, color: isDark ? '#a78bfa' : GREEN_TEXT, fontFamily: "'Inter', monospace" }}>
                {'$' + portfolioUsdValue.toFixed(2)}
              </div>
              {priceFallback && (
                <div style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.3)' : NAVY_MUTED, marginTop: '4px' }}>
                  Estimated value
                </div>
              )}
            </>
          )}
        </div>

        {/* Songs owned */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(236,72,153,0.08) 0%, rgba(15,10,30,0.8) 100%)'
            : GLASS,
          border: `1px solid ${isDark ? 'rgba(236,72,153,0.15)' : GLASS_BORDER}`,
          backdropFilter: isDark ? 'blur(12px)' : 'blur(20px)',
          ...(!isDark ? { WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } : {}),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <Disc3 size={13} color={isDark ? 'rgba(244,114,182,0.6)' : GREEN_TEXT} />
            <span style={{ fontSize: '10px', color: isDark ? 'rgba(244,114,182,0.5)' : NAVY_MUTED, fontFamily: "'Inter', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              On-Chain
            </span>
          </div>
          {isLoading ? (
            <div style={{ height: '26px', width: '60px', borderRadius: '6px', background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(26,39,68,0.06)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ) : (
            <div style={{ fontSize: '22px', fontWeight: 800, color: isDark ? '#f472b6' : GREEN_TEXT, fontFamily: "'Inter', monospace" }}>
              {ownedCount}
              <span style={{ fontSize: '12px', marginLeft: '4px', color: isDark ? 'rgba(244,114,182,0.6)' : NAVY_MUTED }}>
                {ownedCount === 1 ? 'song' : 'songs'}
              </span>
            </div>
          )}
        </div>

        {/* 24h change */}
        <div style={{
          padding: '16px 18px',
          borderRadius: '16px',
          background: isDark ? 'rgba(15,10,30,0.8)' : GLASS,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : GLASS_BORDER}`,
          backdropFilter: isDark ? 'blur(12px)' : 'blur(20px)',
          position: 'relative',
          overflow: 'hidden',
          ...(!isDark ? { WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' } : {}),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: isDark ? 'rgba(255,255,255,0.2)' : NAVY_MUTED }}>↗</span>
            <span style={{ fontSize: '10px', color: isDark ? 'rgba(255,255,255,0.25)' : NAVY_MUTED, fontFamily: "'Inter', monospace", textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              24h Change
            </span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: isDark ? 'rgba(255,255,255,0.2)' : NAVY_MUTED, fontFamily: "'Inter', monospace" }}>
            –
          </div>
          <div style={{
            position: 'absolute',
            bottom: '6px',
            right: '8px',
            fontSize: '9px',
            color: isDark ? 'rgba(255,255,255,0.15)' : NAVY_MUTED,
            fontFamily: "'Inter', monospace",
          }}>
            Coming soon
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PortfolioHeader;
