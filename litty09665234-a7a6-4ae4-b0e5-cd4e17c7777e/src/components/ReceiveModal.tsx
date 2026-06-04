import React, { useState } from 'react';
import { Copy, Check, QrCode, Share2, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';

interface ReceiveModalProps {
  address: string;
  onClose: () => void;
}

const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';

export default function ReceiveModal({ address, onClose }: ReceiveModalProps) {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy address');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'My Wallet Address', text: address });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
      toast.info('Address copied — paste it wherever you need!');
    }
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <QrCode size={16} color={HEADLINE_GREEN} />
          <span
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: HEADLINE_GREEN,
            }}
          >
            RECEIVE
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* QR Code */}
      <div className="flex justify-center py-4">
        <div
          className="rounded-xl p-3"
          style={{ background: '#ffffff', boxShadow: `0 0 20px rgba(0, 255, 65, 0.15)` }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${address}&bgcolor=ffffff&color=000000`}
            alt="QR Code"
            className="w-[180px] h-[180px]"
          />
        </div>
      </div>

      {/* Address display */}
      <div className="px-5 pb-2">
        <p
          className="text-[9px] font-bold tracking-widest uppercase mb-2"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: 'rgba(255,255,255,0.4)' }}
        >
          Your Wallet Address
        </p>
        <div
          className="rounded-lg px-3 py-2 cursor-pointer transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid rgba(255,255,255,0.08)`,
            fontFamily: "'Inter', monospace",
            fontSize: '0.65rem',
            color: 'rgba(255,255,255,0.8)',
            wordBreak: 'break-all',
            lineHeight: 1.5,
          }}
          onClick={handleCopy}
        >
          {address}
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-8 pt-2 flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all active:scale-[0.98]"
          style={{
            background: copied ? PRIMARY_GREEN : 'rgba(255,255,255,0.06)',
            border: `1px solid ${copied ? PRIMARY_GREEN : 'rgba(255,255,255,0.08)'}`,
            color: copied ? '#000' : PRIMARY_GREEN,
            fontFamily: "'Archivo Black', sans-serif",
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
          }}
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'COPIED!' : 'COPY'}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: "'Archivo Black', sans-serif",
            fontWeight: 700,
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
          }}
        >
          <Share2 size={14} />
          SHARE
        </button>
      </div>
    </>
  );

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[399]"
        style={{ background: 'rgba(0,0,0,0.8)' }}
        onClick={onClose}
      />

      {isMobile ? (
        /* ── Mobile Bottom Sheet ── */
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed z-[400] left-0 right-0 bottom-0 rounded-t-3xl overflow-hidden"
          style={{
            background: '#000000',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
            <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
          </div>
          {content}
        </motion.div>
      ) : (
        /* ── Desktop Centered Modal ── */
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed z-[400] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-2xl overflow-hidden"
          style={{
            maxWidth: 400,
            width: 'calc(100% - 32px)',
            background: '#000000',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {content}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
