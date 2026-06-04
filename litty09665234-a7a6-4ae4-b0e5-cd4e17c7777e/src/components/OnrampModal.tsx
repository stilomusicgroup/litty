import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Wallet,
  QrCode,
  ArrowLeftRight,
  X,
  ChevronRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';

interface OnrampModalProps {
  open: boolean;
  onClose: () => void;
  onReceive?: () => void;
  onSwap?: () => void;
  onConnectWallet?: () => void;
  walletAddress?: string | null;
}

const PRIMARY_GREEN = '#00FF41';
const BG = '#000000';

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

const PRESET_AMOUNTS = [1, 5, 25, 100];

const OnrampModal: React.FC<OnrampModalProps> = ({
  open,
  onClose,
  onReceive,
  onSwap,
  onConnectWallet,
  walletAddress,
}) => {
  const isMobile = useIsMobile();
  const isConnected = !!walletAddress;
  const [step, setStep] = useState<'menu' | 'amount'>('menu');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setStep('menu');
    setSelectedAmount(null);
    setCustomAmount('');
    setIsLoading(false);
    onClose();
  };

  const activeAmount = selectedAmount ?? (customAmount ? parseFloat(customAmount) : null);
  const isValidAmount = activeAmount != null && !isNaN(activeAmount) && activeAmount >= 1;

  const handleDepositConfirm = async () => {
    if (!isValidAmount || !activeAmount) {
      toast.error('Please select or enter a valid amount');
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.post<{
        checkoutUrl: string;
        originalAmount: number;
        feeAmount: number;
        totalAmount: number;
      }>('/api/packs/checkout/open-amount', {
        amountUsd: activeAmount,
        walletAddress: walletAddress ?? '',
      });
      if (res?.checkoutUrl) {
        window.open(res.checkoutUrl, '_blank');
        handleClose();
      } else {
        toast.error('Could not create checkout');
      }
    } catch (err: any) {
      console.error('[OnrampModal] Deposit checkout error:', err);
      toast.error(err?.message || 'Failed to create checkout');
    } finally {
      setIsLoading(false);
    }
  };

  const menuOptions = [
    {
      id: 'deposit',
      icon: CreditCard,
      title: 'Instant Deposit',
      subtitle: 'Buy with Apple Pay · 2.5% fee',
      onClick: () => setStep('amount'),
    },
    {
      id: 'phantom',
      icon: Wallet,
      title: isConnected ? 'Phantom Wallet' : 'Phantom Wallet',
      subtitle: isConnected
        ? truncateAddress(walletAddress!)
        : 'Connect your Phantom wallet',
      onClick: () => {
        if (!isConnected) {
          handleClose();
          onConnectWallet?.();
        }
      },
    },
    {
      id: 'receive',
      icon: QrCode,
      title: 'Receive / QR',
      subtitle: 'Show your wallet address',
      onClick: () => {
        handleClose();
        onReceive?.();
      },
    },
    {
      id: 'swap',
      icon: ArrowLeftRight,
      title: 'Swap',
      subtitle: 'Swap SOL ↔ tokens',
      onClick: () => {
        handleClose();
        onSwap?.();
      },
    },
  ];

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        {step === 'amount' ? (
          <button
            onClick={() => {
              setStep('menu');
              setSelectedAmount(null);
              setCustomAmount('');
            }}
            className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Archivo Black', sans-serif" }}
          >
            <ArrowLeft size={14} />
            Back
          </button>
        ) : (
          <span
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            Add Funds
          </span>
        )}
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          <X size={14} />
        </button>
      </div>

      {step === 'menu' ? (
        /* ── Menu Options ── */
        <div className="px-5 pb-8 flex flex-col gap-2">
          {menuOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={opt.onClick}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl transition-all active:scale-[0.98] text-left"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(0, 255, 65, 0.1)' }}
              >
                <opt.icon size={20} style={{ color: PRIMARY_GREEN }} />
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-sm font-bold text-white truncate"
                  style={{ fontFamily: "'Archivo Black', sans-serif" }}
                >
                  {opt.title}
                </div>
                <div className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {opt.subtitle}
                </div>
              </div>
              <ChevronRight size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
            </button>
          ))}
        </div>
      ) : (
        /* ── Amount Selection ── */
        <div className="px-5 pb-8 flex flex-col gap-5">
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-widest mb-3"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Select Amount
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setSelectedAmount(amt);
                    setCustomAmount('');
                  }}
                  className="rounded-xl py-3 text-sm font-bold transition-all active:scale-95"
                  style={{
                    background:
                      selectedAmount === amt
                        ? 'rgba(0, 255, 65, 0.15)'
                        : 'rgba(255,255,255,0.03)',
                    border:
                      selectedAmount === amt
                        ? `1px solid ${PRIMARY_GREEN}`
                        : '1px solid rgba(255,255,255,0.06)',
                    color: selectedAmount === amt ? PRIMARY_GREEN : '#fff',
                    fontFamily: "'Archivo Black', sans-serif",
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          {/* Custom amount */}
          <div>
            <p
              className="text-[9px] font-bold uppercase tracking-widest mb-2"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              Custom Amount
            </p>
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <span className="text-sm font-bold text-white">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                placeholder="0.00"
                step="any"
                min="1"
                className="flex-1 bg-transparent text-white text-lg font-bold outline-none"
                style={{ fontFamily: "'Inter', monospace" }}
              />
            </div>
          </div>

          {/* Apple Pay button */}
          <button
            onClick={handleDepositConfirm}
            disabled={!isValidAmount || isLoading}
            className="w-full rounded-2xl font-black text-sm py-4 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: isValidAmount && !isLoading ? PRIMARY_GREEN : 'rgba(255,255,255,0.06)',
              color: isValidAmount && !isLoading ? '#000' : 'rgba(255,255,255,0.3)',
              fontFamily: "'Archivo Black', sans-serif",
              letterSpacing: '0.05em',
              cursor: isValidAmount && !isLoading ? 'pointer' : 'not-allowed',
              boxShadow: isValidAmount && !isLoading ? '0 0 24px rgba(0, 255, 65, 0.35)' : 'none',
            }}
          >
            {isLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {/* Apple Pay logo SVG */}
                <svg
                  viewBox="-2 0 174 106"
                  width="40"
                  height="24"
                  style={{ fill: 'currentColor' }}
                >
                  <path d="M150.7 0H13C5.8 0 0 5.8 0 13v80c0 7.2 5.8 13 13 13h137.7c7.2 0 13-5.8 13-13V13c0-7.2-5.8-13-13-13z" fill="currentColor" />
                  <path d="M46.4 33.2c.1-2.6 1.4-5.2 3.5-6.9-1.6-2.3-4.2-3.6-7-3.4-3-.3-5.8 1.7-7.3 1.7-2.5 0-5.1-1.6-7.4-1.5-3.8.1-7.3 2.2-9.2 5.6-3.9 6.8-1 16.8 2.8 22.3 1.9 2.7 4.1 5.7 7 5.6 2.8-.1 3.9-1.8 7.3-1.8 3.4 0 4.3 1.8 7.3 1.7 3-.1 4.9-2.7 6.8-5.4 2.1-3.1 3-6.1 3.1-6.3-.1-.1-5.9-2.3-5.9-9.1-.1-4 3.5-6.8 3.7-6.9-2-2.9-5.1-3.2-6.2-3.3-2.8-.3-5.5 1.5-6.5 1.5zm-5.8-4.3c1.5-1.8 2.5-4.3 2.2-6.8-2.1.1-4.7 1.4-6.2 3.2-1.4 1.6-2.6 4.2-2.3 6.7 2.4.2 4.9-1.2 6.3-3.1z" fill="#000" />
                </svg>
                Pay
              </>
            )}
          </button>

          <p className="text-[10px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
            2.5% platform fee applied. Min $1.00.
          </p>
        </div>
      )}
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[399]"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={handleClose}
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
                background: BG,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1" onClick={handleClose}>
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
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
                maxWidth: 460,
                width: 'calc(100% - 32px)',
                background: BG,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {content}
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default OnrampModal;
