import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ListMusic, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const NEON_GREEN = '#00FF41';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (playlistId: string, name: string) => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ isOpen, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    const playlistId = crypto.randomUUID();
    onCreated?.(playlistId, trimmed);
    setLoading(false);
    setName('');
    onClose();
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
              Create Playlist
            </DialogTitle>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <X size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          </div>
        </DialogHeader>

        <div className="mx-5 mt-3 mb-0 h-px" style={{ background: 'rgba(0, 255, 65, 0.12)' }} />

        <form onSubmit={handleSubmit} className="p-5">
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.15)' }}
            >
              <ListMusic size={18} style={{ color: 'rgba(0, 255, 65, 0.5)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">New Playlist</p>
              <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Give your playlist a name
              </p>
            </div>
          </div>

          <input
            type="text"
            placeholder="Playlist name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="w-full mb-4 px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0, 255, 65, 0.25)',
              color: '#fff',
              fontFamily: "'Inter', sans-serif",
            }}
          />

          <motion.button
            type="submit"
            disabled={loading || !name.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0, 255, 65, 0.08))',
              border: '1px solid rgba(0, 255, 65, 0.35)',
              color: NEON_GREEN,
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '0.65rem',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              opacity: loading || !name.trim() ? 0.5 : 1,
            }}
          >
            Create Playlist
          </motion.button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePlaylistModal;
