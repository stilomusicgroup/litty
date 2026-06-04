import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Link2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getPoofAPIUrl } from '@/lib/config';

interface ShareMenuProps {
  songId: string;
  songTitle: string;
  artist: string;
  coverImage?: string;
  symbol?: string;
  genre?: string;
  variant?: 'icon' | 'full';
  className?: string;
}

function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
      } catch {
        document.body.removeChild(textarea);
        return false;
      }
    },
  );
}

function getShareUrl(songId: string): string {
  return getPoofAPIUrl(`/api/eg/song/${songId}`);
}

const ShareMenu: React.FC<ShareMenuProps> = ({
  songId,
  songTitle,
  artist,
  variant = 'icon',
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  const shareUrl = getShareUrl(songId);
  const shareText = `Check out "${songTitle}" by ${artist} on Lit Studios`;

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) toast.success('Share link copied!');
    else toast.error('Failed to copy link');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: shareText, url: shareUrl });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }
    handleCopyLink();
  };

  // Full variant — single Share Link button
  if (variant === 'full') {
    return (
      <div className={className}>
        <motion.button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleShare();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(168,85,247,0.18) 100%)',
            color: 'hsl(263 100% 82%)',
            border: '1px solid rgba(139,92,246,0.35)',
            boxShadow: '0 0 16px rgba(139,92,246,0.12)',
          }}
          whileTap={{ scale: 0.97 }}
          onTapStart={() => navigator.vibrate?.(5)}
        >
          <Share2 size={16} />
          Share Link
        </motion.button>
      </div>
    );
  }

  // Icon variant with dropdown
  return (
    <div className={`relative ${className}`}>
      <motion.button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-2 rounded-lg transition-all hover:bg-white/10 inline-touch"
        style={{ color: 'rgba(220,214,240,0.5)' }}
        title="Share"
        whileTap={{ scale: 0.85 }}
        onTapStart={() => navigator.vibrate?.(5)}
      >
        <Share2 size={14} />
      </motion.button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden animate-fade-in"
            style={{
              background: 'rgba(15,10,30,0.95)',
              border: '1px solid rgba(139,92,246,0.25)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              minWidth: '220px',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleShare();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-xs font-semibold transition-all hover:bg-white/5"
              style={{ color: 'hsl(263 100% 82%)', borderBottom: '1px solid rgba(139,92,246,0.08)' }}
              whileTap={{ scale: 0.97 }}
              onTapStart={() => navigator.vibrate?.(5)}
            >
              <Share2 size={14} />
              <span>Share Link</span>
            </motion.button>
            <motion.button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCopyLink();
                setOpen(false);
              }}
              className="w-full flex items-center gap-3 px-3 py-3 text-xs font-semibold transition-all hover:bg-white/5"
              style={{ color: 'hsl(263 100% 82%)', borderBottom: '1px solid rgba(139,92,246,0.08)' }}
              whileTap={{ scale: 0.97 }}
              onTapStart={() => navigator.vibrate?.(5)}
            >
              <Copy size={14} />
              <span>Copy Share Link</span>
            </motion.button>
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.4)' }}>Share to</span>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(false); }} className="text-white/30 hover:text-white/60">
                <X size={12} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ShareMenu;
