/**
 * AddToPlaylistModal — simplified for single-playlist model.
 * Now shows a simple confirmation dialog instead of a playlist picker.
 * All existing callers keep their API intact.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Music, ListPlus, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-privy-auth';
import { useMyPlaylist } from '@/hooks/useMyPlaylist';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const NEON_GREEN = '#00FF41';

interface AddToPlaylistModalProps {
  songId: string;
  title: string;
  artist?: string;
  coverImage?: string;
  isOpen: boolean;
  onClose: () => void;
}

const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  songId,
  title,
  artist,
  coverImage,
  isOpen,
  onClose,
}) => {
  const { user, login } = useAuth();
  const { isInPlaylist, addToPlaylist, removeFromPlaylist } = useMyPlaylist();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const alreadyIn = isInPlaylist(songId);

  // Auto-close after action
  useEffect(() => {
    if (done) {
      const t = setTimeout(onClose, 1200);
      return () => clearTimeout(t);
    }
  }, [done, onClose]);

  // Reset done state when modal opens
  useEffect(() => {
    if (isOpen) setDone(false);
  }, [isOpen]);

  const handleToggle = async () => {
    if (!user) { login(); return; }
    setLoading(true);
    if (alreadyIn) {
      await removeFromPlaylist(songId);
    } else {
      await addToPlaylist(songId);
    }
    setLoading(false);
    setDone(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className="max-w-sm w-full p-0 overflow-hidden"
        style={{
          background: '#060a06',
          border: '1px solid rgba(0, 255, 65, 0.3)',
          boxShadow: '0 0 40px rgba(0, 255, 65, 0.1), 0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '0.65rem',
                fontWeight: 800,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: NEON_GREEN,
                textShadow: '0 0 10px rgba(0, 255, 65, 0.5)',
              }}
            >
              My Playlist
            </DialogTitle>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <X size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>
        </DialogHeader>

        <div className="mx-5 mt-3 mb-0 h-px" style={{ background: 'rgba(0, 255, 65, 0.12)' }} />

        <div className="p-5">
          {/* Song info */}
          <div className="flex items-center gap-3 mb-5">
            {coverImage ? (
              <img
                src={coverImage}
                alt={title}
                className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                style={{ border: '1px solid rgba(0, 255, 65, 0.2)' }}
              />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.15)' }}
              >
                <Music size={18} style={{ color: 'rgba(0, 255, 65, 0.5)' }} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{title}</p>
              {artist && (
                <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {artist}
                </p>
              )}
            </div>
          </div>

          {/* Action */}
          <AnimatePresence mode="wait">
            {done ? (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-center gap-2 py-4"
              >
                <Check size={20} style={{ color: NEON_GREEN }} />
                <span style={{ color: NEON_GREEN, fontFamily: "'Archivo Black', sans-serif", fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>
                  {alreadyIn ? 'Removed' : 'Added'}
                </span>
              </motion.div>
            ) : (
              <motion.button
                key="btn"
                onClick={handleToggle}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
                style={{
                  background: alreadyIn
                    ? 'rgba(239,68,68,0.1)'
                    : 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0, 255, 65, 0.08))',
                  border: alreadyIn
                    ? '1px solid rgba(239,68,68,0.3)'
                    : '1px solid rgba(0, 255, 65, 0.35)',
                  color: alreadyIn ? '#ef4444' : NEON_GREEN,
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {alreadyIn ? (
                  <>
                    <X size={14} />
                    Remove from Playlist
                  </>
                ) : (
                  <>
                    <ListPlus size={14} />
                    {!user ? 'Sign in to Save' : 'Add to My Playlist'}
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddToPlaylistModal;
