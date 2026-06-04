import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Share2 } from 'lucide-react';
import ViralSongCard from './ViralSongCard';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';

interface ViralSongCardModalProps {
  song: SongsResponse;
  details?: SongDetailsResponse | null;
  repostCount?: number;
  bondingProgress?: number;
  isOpen: boolean;
  onClose: () => void;
  onBuy?: () => void;
}

const ViralSongCardModal: React.FC<ViralSongCardModalProps> = ({
  song,
  details,
  repostCount,
  bondingProgress,
  isOpen,
  onClose,
  onBuy,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
    }
  }, [isOpen]);

  const handleExited = useCallback(() => {
    if (!isOpen) {
      setMounted(false);
    }
  }, [isOpen]);

  const handleShare = useCallback(() => {
    const shareText = `Check out "${song.name}" on SongFi — I just streamed and earned tokens for listening. 🎧🔥`;
    const shareUrl = `${window.location.origin}/song/${song.id}`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  }, [song.name, song.id]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!mounted && !isOpen) return null;

  return (
    <AnimatePresence onExitComplete={handleExited}>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={handleOverlayClick}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            {/* Card container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{
                duration: 0.4,
                ease: [0.34, 1.56, 0.64, 1],
              }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: -48,
                  right: 0,
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#A1A1AA',
                  transition: 'all 0.2s',
                  zIndex: 10,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#A1A1AA'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
              >
                <X size={18} />
              </button>

              {/* The card */}
              <ViralSongCard
                song={song}
                details={details}
                repostCount={repostCount}
                bondingProgress={bondingProgress}
                onShare={handleShare}
                onBuy={onBuy}
              />

              {/* Share to X button */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                style={{ display: 'flex', gap: 12, alignItems: 'center' }}
              >
                <button
                  onClick={handleShare}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 16px',
                    borderRadius: 9999,
                    background: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#000',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <Share2 size={14} />
                  Share to X
                </button>
              </motion.div>

              {/* Hint text */}
              <motion.p
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.3 }}
                style={{
                  fontSize: 11,
                  color: 'rgba(161,161,170,0.6)',
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                Screenshot this to share
              </motion.p>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ViralSongCardModal;
