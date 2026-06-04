import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, ShoppingCart, Share2, Copy, Link2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { getPoofAPIUrl } from '@/lib/config';

export interface SongShareCardProps {
  songId: string;
  title: string;
  artist: string;
  coverImage?: string;
  symbol?: string;
  genre?: string;
  onBuy?: () => void;
  className?: string;
}

// ─── Neon Music Icon ─────────────────────────────────────────────────────────

const NeonMusicIcon: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div
    className="relative flex items-center justify-center rounded-xl"
    style={{
      width: 56,
      height: 56,
      background: 'rgba(0, 255, 65, 0.08)',
      border: '1.5px solid rgba(0, 255, 65, 0.3)',
      boxShadow: '0 0 20px rgba(0, 255, 65, 0.15), inset 0 0 12px rgba(0, 255, 65, 0.04)',
    }}
  >
    <Music size={size} style={{ color: 'var(--neon-green)', filter: 'drop-shadow(0 0 6px rgba(0, 255, 65, 0.6))' }} />
  </div>
);

// ─── Animated Glow Border ────────────────────────────────────────────────────

const GlowBorder: React.FC = () => (
  <div className="absolute inset-0 pointer-events-none rounded-2xl overflow-hidden">
    {/* Corner glow spots */}
    <div
      className="absolute"
      style={{
        top: -1,
        right: -1,
        width: 80,
        height: 80,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 255, 65, 0.25) 0%, transparent 70%)',
        filter: 'blur(12px)',
      }}
    />
    <div
      className="absolute"
      style={{
        bottom: -1,
        left: 20,
        width: 100,
        height: 100,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 70%)',
        filter: 'blur(16px)',
      }}
    />
    {/* Top edge highlight */}
    <div
      className="absolute top-0 left-4 right-4 h-px"
      style={{
        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08) 20%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 80%, transparent)',
      }}
    />
  </div>
);

// ─── Overlapping Action Buttons ──────────────────────────────────────────────

interface OverlappingButtonsProps {
  onBuy?: () => void;
  onShare?: () => void;
}

const OverlappingButtons: React.FC<OverlappingButtonsProps> = ({ onBuy, onShare }) => {
  const [buyHovered, setBuyHovered] = useState(false);
  const [shareHovered, setShareHovered] = useState(false);

  return (
    <div className="flex items-center gap-0">
      {/* Buy Now button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onBuy?.();
        }}
        onMouseEnter={() => setBuyHovered(true)}
        onMouseLeave={() => setBuyHovered(false)}
        className="relative z-10 inline-flex items-center gap-1.5 pl-3 pr-4 py-2 rounded-r-full rounded-l-lg text-xs font-bold transition-all active:scale-[0.97]"
        style={{
          background: buyHovered
            ? 'linear-gradient(135deg, #4dff2e 0%, #00FF41 40%, #00D4FF 100%)'
            : 'linear-gradient(135deg, #00FF41 0%, #00D4FF 100%)',
          color: '#000',
          boxShadow: buyHovered
            ? '0 0 20px rgba(0, 255, 65, 0.6), 0 0 40px rgba(0, 255, 65, 0.25), 0 0 60px rgba(0,212,255,0.1)'
            : '0 0 14px rgba(0, 255, 65, 0.4), 0 0 28px rgba(0, 255, 65, 0.12)',
          transform: buyHovered ? 'translateX(0px)' : undefined,
        }}
      >
        <ShoppingCart size={12} strokeWidth={2.5} />
        Buy Now
      </button>
      {/* Share button — overlaps slightly to the left of Buy Now */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onShare?.();
        }}
        onMouseEnter={() => setShareHovered(true)}
        onMouseLeave={() => setShareHovered(false)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-[0.97]"
        style={{
          background: shareHovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)',
          color: 'rgba(220,214,240,0.8)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
          marginLeft: '-6px',
        }}
      >
        <Share2 size={11} />
      </button>
    </div>
  );
};

// ─── Collectible Label ───────────────────────────────────────────────────────

const CollectibleLabel: React.FC = () => (
  <div
    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md"
    style={{
      background: 'rgba(0, 255, 65, 0.08)',
      border: '1px solid rgba(0, 255, 65, 0.2)',
    }}
  >
    <div
      className="w-1.5 h-1.5 rounded-full"
      style={{
        background: '#00FF41',
        boxShadow: '0 0 6px rgba(0, 255, 65, 0.8)',
        animation: 'pulse 2s ease-in-out infinite',
      }}
    />
    <span
      className="text-[9px] font-black tracking-[0.15em]"
      style={{
        color: 'rgba(0, 255, 65, 0.85)',
        fontFamily: "'Archivo Black', sans-serif",
      }}
    >
      COLLECTIBLE
    </span>
  </div>
);

// ─── SongShareCard ───────────────────────────────────────────────────────────

const SongShareCard: React.FC<SongShareCardProps> = ({
  songId,
  title,
  artist,
  coverImage,
  symbol,
  genre,
  onBuy,
  className = '',
}) => {
  const [cardHovered, setCardHovered] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [imageError, setImageError] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Close share menu on outside click
  useEffect(() => {
    if (!showShareMenu) return;
    const handler = (e: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showShareMenu]);

  const shareUrl = getPoofAPIUrl(`/api/eg/song/${songId}`);
  const shareText = `Check out "${title}" by ${artist} on Lit Studio`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleShare = () => {
    setShowShareMenu((prev) => !prev);
  };

  return (
    <div className={`relative ${className}`}>
      {/* ─── Main Card ─── */}
      <motion.div
        onMouseEnter={() => setCardHovered(true)}
        onMouseLeave={() => setCardHovered(false)}
        className="relative overflow-hidden rounded-2xl cursor-default"
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'linear-gradient(155deg, hsl(252 45% 6%) 0%, hsl(260 50% 8%) 40%, hsl(270 40% 7%) 70%, hsl(255 45% 5%) 100%)',
          border: `1.5px solid ${cardHovered ? 'rgba(0, 255, 65, 0.4)' : 'rgba(0, 255, 65, 0.2)'}`,
          boxShadow: cardHovered
            ? '0 0 30px rgba(0, 255, 65, 0.12), 0 0 60px rgba(0, 255, 65, 0.06), 0 0 100px rgba(0, 255, 65, 0.03), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 0 20px rgba(0, 255, 65, 0.06), 0 0 40px rgba(0, 255, 65, 0.03), 0 0 80px rgba(0, 255, 65, 0.01), inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <GlowBorder />

        {/* Subtle noise texture overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '100px 100px',
          }}
        />

        {/* Card content */}
        <div className="relative z-10 flex items-center gap-4 p-4">
          {/* Left: Music icon or cover art */}
          {coverImage && !imageError ? (
            <motion.div
              className="relative flex-shrink-0 rounded-xl overflow-hidden"
              style={{
                width: 56,
                height: 56,
                border: '1.5px solid rgba(0, 255, 65, 0.25)',
                boxShadow: '0 0 16px rgba(0, 255, 65, 0.12), 0 4px 16px rgba(0,0,0,0.4)',
              }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <img
                src={coverImage}
                alt={title}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
              {/* Shine overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)',
                }}
              />
            </motion.div>
          ) : (
            <NeonMusicIcon size={26} />
          )}

          {/* Right: Title + Artist + Actions */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  className="font-extrabold leading-tight truncate"
                  style={{
                    fontSize: 'clamp(14px, 3vw, 18px)',
                    color: '#ffffff',
                    letterSpacing: '-0.01em',
                    textShadow: cardHovered ? '0 0 16px rgba(0, 255, 65, 0.4)' : '0 0 8px rgba(0, 255, 65, 0.2)',
                    transition: 'text-shadow 0.3s ease',
                  }}
                  title={title}
                >
                  {title}
                </h3>
                <p
                  className="font-medium truncate mt-0.5"
                  style={{
                    fontSize: 'clamp(10px, 2vw, 13px)',
                    color: 'rgba(200,214,240,0.5)',
                    letterSpacing: '0.02em',
                  }}
                >
                  {artist}
                </p>
              </div>

              {/* Collectible label */}
              <CollectibleLabel />
            </div>

            {/* Badges + Actions row */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(symbol || genre) && (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {symbol && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: '9px',
                        fontFamily: "'Archivo Black', sans-serif",
                        fontWeight: 700,
                        background: 'rgba(0,212,255,0.1)',
                        color: '#00D4FF',
                        border: '1px solid rgba(0,212,255,0.2)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      ${symbol}
                    </span>
                  )}
                  {genre && (
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full"
                      style={{
                        fontSize: '9px',
                        fontFamily: "'Archivo Black', sans-serif",
                        fontWeight: 600,
                        background: 'rgba(0, 255, 65, 0.06)',
                        color: 'rgba(0, 255, 65, 0.7)',
                        border: '1px solid rgba(0, 255, 65, 0.15)',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {genre}
                    </span>
                  )}
                </div>
              )}

              {/* Overlapping Buy Now + Share buttons */}
              <OverlappingButtons onBuy={onBuy} onShare={handleShare} />
            </div>
          </div>
        </div>

        {/* Bottom edge glow line */}
        <div
          className="absolute bottom-0 left-8 right-8 h-px"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.4) 25%, rgba(0,212,255,0.5) 50%, rgba(0, 255, 65, 0.4) 75%, transparent)',
            boxShadow: '0 0 8px rgba(0, 255, 65, 0.3)',
          }}
        />
      </motion.div>

      {/* ─── Share Panel (below card) ─── */}
      <AnimatePresence>
        {showShareMenu && (
          <motion.div
            ref={shareMenuRef}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden mt-3"
            style={{ maxWidth: 420 }}
          >
            {/* Copy Share Link */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyLink();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all mb-2 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.18) 0%, rgba(168,85,247,0.12) 100%)',
                color: 'hsl(263 100% 82%)',
                border: '1px solid rgba(139,92,246,0.3)',
                boxShadow: '0 0 16px rgba(139,92,246,0.1)',
              }}
            >
              <Link2 size={14} />
              Copy Share Link
            </button>

            {/* Social share buttons */}
            <SocialShareRow songId={songId} songTitle={title} artist={artist} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Social Share Row ────────────────────────────────────────────────────────

interface SocialShareRowProps {
  songId: string;
  songTitle: string;
  artist: string;
}

// Platform SVG icons
const XIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const FacebookIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const LinkedInIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const SocialShareRow: React.FC<SocialShareRowProps> = ({ songId, songTitle, artist }) => {
  const shareUrl = getPoofAPIUrl(`/api/eg/song/${songId}`);
  const shareText = `Check out "${songTitle}" by ${artist} on Lit Studio`;

  const platforms = [
    {
      name: 'X',
      icon: <XIcon size={15} />,
      color: '#fff',
      bg: 'rgba(255,255,255,0.06)',
      hoverBg: 'rgba(255,255,255,0.12)',
      borderColor: 'rgba(255,255,255,0.12)',
      action: () => {
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer,width=550,height=420',
        );
      },
    },
    {
      name: 'Facebook',
      icon: <FacebookIcon size={15} />,
      color: '#1877F2',
      bg: 'rgba(24,119,242,0.08)',
      hoverBg: 'rgba(24,119,242,0.18)',
      borderColor: 'rgba(24,119,242,0.2)',
      action: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer,width=550,height=420',
        );
      },
    },
    {
      name: 'LinkedIn',
      icon: <LinkedInIcon size={15} />,
      color: '#0A66C2',
      bg: 'rgba(10,102,194,0.08)',
      hoverBg: 'rgba(10,102,194,0.18)',
      borderColor: 'rgba(10,102,194,0.2)',
      action: () => {
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
          '_blank',
          'noopener,noreferrer,width=550,height=420',
        );
      },
    },
  ];

  return (
    <div className="flex items-center gap-2">
      {platforms.map((p) => (
        <SocialButton key={p.name} platform={p} />
      ))}
    </div>
  );
};

interface SocialButtonProps {
  platform: {
    name: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
    hoverBg: string;
    borderColor: string;
    action: () => void;
  };
}

const SocialButton: React.FC<SocialButtonProps> = ({ platform }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        platform.action();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.95]"
      style={{
        background: hovered ? platform.hoverBg : platform.bg,
        color: platform.color,
        border: `1px solid ${platform.borderColor}`,
        boxShadow: hovered ? `0 0 12px ${platform.color}22` : 'none',
      }}
    >
      {platform.icon}
      {platform.name}
    </button>
  );
};

export default SongShareCard;
