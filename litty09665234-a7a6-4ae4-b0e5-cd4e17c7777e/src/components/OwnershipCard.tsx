import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Play, Share2, Music } from 'lucide-react';
import { NftMintsResponse } from '@/lib/collections/nftMints';
import FanTierBadge, { FanTier, calculateTier, TIER_CONFIGS } from '@/components/FanTierBadge';
import PriceChartSVG from '@/components/PriceChartSVG';
import ShareCardRenderer from '@/components/ShareCardRenderer';
import { useSongCandles } from '@/hooks/useSongCandles';

interface OwnershipCardProps {
  songId: string;
  title: string;
  artist: string;
  coverImage?: string;
  splBalance: number;
  tokenSymbol?: string;
  userNfts: NftMintsResponse[];
  index: number;
  mintAddress?: string | null;
}

const OwnershipCard: React.FC<OwnershipCardProps> = ({
  songId,
  title,
  artist,
  coverImage,
  splBalance,
  tokenSymbol,
  userNfts,
  index,
  mintAddress,
}) => {
  const { candles, loading: candlesLoading } = useSongCandles(mintAddress ?? null, '1h');
  const candleHistory = candles.length >= 2 ? candles.map(c => c.c) : undefined;
  const [shareOpen, setShareOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  const nftCount = userNfts.length;
  const tier: FanTier = calculateTier(splBalance, nftCount);
  const tierConfig = TIER_CONFIGS[tier];
  const primaryNft = userNfts[0];

  const hasNft = nftCount > 0;
  const isHighTier = tier === 'diamond' || tier === 'legend';

  useEffect(() => {
    if (!hasAnimated && isHighTier) {
      const timer = setTimeout(() => {
        setShowParticles(true);
        setHasAnimated(true);
        setTimeout(() => setShowParticles(false), 1500);
      }, 300 + index * 120);
      return () => clearTimeout(timer);
    }
  }, [isHighTier, hasAnimated, index]);

  const formatBalance = (bal: number) => {
    if (bal >= 1_000_000) return `${(bal / 1_000_000).toFixed(1)}M`;
    if (bal >= 1_000) return `${(bal / 1_000).toFixed(1)}K`;
    return bal.toLocaleString();
  };

  const particles = Array.from({ length: 12 }, (_, i) => i);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        style={{ position: 'relative' }}
      >
        {/* Particle burst for diamond/legend */}
        <AnimatePresence>
          {showParticles && tier === 'legend' && particles.map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 1,
                x: (Math.random() - 0.5) * 120,
                y: (Math.random() - 0.5) * 120,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 + Math.random() * 0.4, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: tierConfig.color,
                boxShadow: `0 0 6px ${tierConfig.glow}`,
                zIndex: 10,
                pointerEvents: 'none',
              }}
            />
          ))}
          {showParticles && tier === 'diamond' && particles.slice(0, 8).map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 1,
                x: (Math.random() - 0.5) * 80,
                y: (Math.random() - 0.5) * 80,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 + Math.random() * 0.3, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: tierConfig.color,
                boxShadow: `0 0 4px ${tierConfig.glow}`,
                zIndex: 10,
                pointerEvents: 'none',
              }}
            />
          ))}
        </AnimatePresence>

        <div
          style={{
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, rgba(22,14,48,0.95) 0%, rgba(10,6,24,0.98) 100%)',
            border: hasNft
              ? `2px solid ${tierConfig.border}`
              : '1px solid rgba(139,92,246,0.25)',
            backdropFilter: 'blur(20px)',
            boxShadow: hasNft
              ? `0 0 30px ${tierConfig.glow}, 0 8px 32px rgba(0,0,0,0.5)`
              : '0 4px 24px rgba(0,0,0,0.4)',
            transition: 'box-shadow 0.3s ease',
          }}
        >
          {/* Cover art with glow for NFT holders */}
          <div style={{ position: 'relative' }}>
            <div style={{
              height: '160px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #2d1b69 0%, #11094e 50%, #1a0533 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Music size={40} color="rgba(167,139,250,0.2)" />
                </div>
              )}

              {/* NFT animated glow overlay */}
              {hasNft && (
                <motion.div
                  animate={{
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `linear-gradient(135deg, ${tierConfig.glow}20 0%, transparent 60%, ${tierConfig.glow}15 100%)`,
                    pointerEvents: 'none',
                  }}
                />
              )}

              {/* Gradient overlay for readability */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'linear-gradient(transparent, rgba(10,6,24,0.9))',
                pointerEvents: 'none',
              }} />

              {/* NFT edition badge on cover */}
              {primaryNft?.editionNumber && primaryNft?.totalEditions && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(8px)',
                  border: `1px solid ${tierConfig.border}`,
                  color: tierConfig.color,
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: "'Inter', monospace",
                  boxShadow: `0 0 10px ${tierConfig.glow}`,
                }}>
                  #{primaryNft.editionNumber} of {primaryNft.totalEditions}
                </div>
              )}

              {/* Tier badge on cover top-right */}
              {tier !== 'none' && (
                <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                  <FanTierBadge tier={tier} size="sm" />
                </div>
              )}
            </div>
          </div>

          {/* Card body */}
          <div style={{ padding: '14px 16px 0' }}>
            {/* Title + artist */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{
                fontSize: '15px',
                fontWeight: 800,
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.2,
                marginBottom: '3px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {title}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#a78bfa',
                fontFamily: "'Inter', sans-serif",
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {artist}
              </div>
            </div>

            {/* Balance + sparkline row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '9px', color: 'rgba(167,139,250,0.4)', fontFamily: "'Inter', monospace", textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '2px' }}>
                  Balance
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: tier !== 'none' ? tierConfig.color : '#c4b5fd',
                  fontFamily: "'Inter', monospace",
                }}>
                  {formatBalance(splBalance)}
                  <span style={{ fontSize: '10px', marginLeft: '4px', opacity: 0.6 }}>
                    {tokenSymbol ?? ''}
                  </span>
                </div>
              </div>
              <div style={{ opacity: 0.8 }}>
                <PriceChartSVG songId={songId} width={90} height={44} history={candleHistory} loading={candlesLoading} />
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            padding: '10px 12px 12px',
            display: 'flex',
            gap: '8px',
            borderTop: '1px solid rgba(139,92,246,0.08)',
          }}>
            <Link
              to={`/song/${songId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                flex: 1,
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.25), rgba(109,40,217,0.15))',
                border: '1px solid rgba(139,92,246,0.3)',
                color: '#c4b5fd',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: "'Inter', sans-serif",
                textDecoration: 'none',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
            >
              <Play size={12} fill="currentColor" />
              Play
            </Link>
            <button
              onClick={() => setShareOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '12px',
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Share2 size={12} />
              Share
            </button>
          </div>
        </div>
      </motion.div>

      {shareOpen && (
        <ShareCardRenderer
          songId={songId}
          title={title}
          artist={artist}
          coverImage={coverImage}
          tier={tier}
          splBalance={splBalance}
          tokenSymbol={tokenSymbol}
          editionNumber={primaryNft?.editionNumber}
          totalEditions={primaryNft?.totalEditions}
          onClose={() => setShareOpen(false)}
        />
      )}
    </>
  );
};

export default OwnershipCard;
