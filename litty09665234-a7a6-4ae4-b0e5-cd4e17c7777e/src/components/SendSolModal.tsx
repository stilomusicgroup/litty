import React, { useState, useMemo, useEffect } from 'react';
import { X, Send, AlertTriangle, Clipboard, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { Time, Address, Token } from '@/lib/db-client';
import { setUserSolTransfers, getUserSolTransfers } from '@/lib/collections/userSolTransfers';
import { setUserTokenTransfers, getUserTokenTransfers } from '@/lib/collections/userTokenTransfers';
import { setWalletTransfers } from '@/lib/collections/walletTransfers';

interface SendSolModalProps {
  walletAddress: string;
  solBalance: number;
  usdcBalance?: number;
  solPriceUsd: number | null;
  onClose: () => void;
  onSent?: (signature: string) => void;
}

const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const ESTIMATED_FEE_SOL = 0.000005;
const RECENT_KEY = 'recent_send_addresses';

function isValidSolanaAddress(address: string): boolean {
  return address.length >= 32 && address.length <= 44;
}

function getRecentAddresses(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentAddress(addr: string) {
  const recent = getRecentAddresses().filter((a) => a !== addr);
  recent.unshift(addr);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

function truncateAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

function formatUsd(amount: number, price: number | null): string {
  if (!price) return '';
  const usd = amount * price;
  return `~$${usd.toFixed(2)}`;
}

export default function SendSolModal({
  walletAddress,
  solBalance,
  usdcBalance = 0,
  solPriceUsd,
  onClose,
  onSent,
}: SendSolModalProps) {
  const isMobile = useIsMobile();
  const [tokenType, setTokenType] = useState<'SOL' | 'USDC'>('SOL');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAddresses, setRecentAddresses] = useState<string[]>([]);

  useEffect(() => {
    setRecentAddresses(getRecentAddresses());
  }, []);

  const numericAmount = parseFloat(amount) || 0;
  const maxAmount = tokenType === 'SOL' ? Math.max(0, solBalance - ESTIMATED_FEE_SOL) : usdcBalance;
  const isValidRecipient = useMemo(() => recipient.length > 0 && isValidSolanaAddress(recipient), [recipient]);
  const isValidAmount = numericAmount > 0 && numericAmount <= maxAmount + 0.000001;
  const canSend = isValidRecipient && isValidAmount && !sending;

  const handleMax = () => {
    setAmount(maxAmount.toFixed(tokenType === 'SOL' ? 6 : 2));
  };

  const handleSend = async () => {
    if (!canSend) return;
    setError(null);
    setSending(true);

    try {
      const transferId = crypto.randomUUID();
      let signature: string | undefined;

      if (tokenType === 'SOL') {
        const amountLamports = Math.floor(numericAmount * 1_000_000_000);
        const success = await setUserSolTransfers(transferId, {
          toAddress: Address.publicKey(recipient),
          amountLamports,
          createdAt: Time.Now,
        });

        if (!success) {
          setError('Transfer was denied or failed. Please check your balance and try again.');
          setSending(false);
          return;
        }

        const doc = await getUserSolTransfers(transferId);
        signature = doc?.tarobase_transaction_hash;
      } else {
        const success = await setUserTokenTransfers(transferId, {
          toAddress: Address.publicKey(recipient),
          mintAddress: Address.publicKey(USDC_MINT),
          amount: Token.amount('USDC', numericAmount),
          createdAt: Time.Now,
        });

        if (!success) {
          setError('Transfer was denied or failed. Please check your balance and try again.');
          setSending(false);
          return;
        }

        const doc = await getUserTokenTransfers(transferId);
        signature = doc?.tarobase_transaction_hash;
      }

      if (!signature) {
        console.warn('[SendSolModal] No transaction hash returned from onchain transfer');
      }

      // Write offchain audit log
      const auditSuccess = await setWalletTransfers(transferId, {
        fromAddress: Address.publicKey(walletAddress),
        toAddress: Address.publicKey(recipient),
        amountLamports: tokenType === 'SOL' ? Math.floor(numericAmount * 1_000_000_000) : 0,
        amountSol: tokenType === 'SOL' ? numericAmount.toString() : '0',
        amountUsdc: tokenType === 'USDC' ? numericAmount.toString() : undefined,
        signature: signature ?? '',
        tokenType,
        status: 'confirmed',
        createdAt: Time.Now,
      });

      if (!auditSuccess) {
        console.warn('[SendSolModal] Failed to write walletTransfers audit log');
      }

      toast.success(`${tokenType} sent! ${signature ? signature.slice(0, 8) + '...' : ''}`);
      if (recipient) {
        addRecentAddress(recipient);
        setRecentAddresses(getRecentAddresses());
      }
      onSent?.(signature ?? '');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      if (message.includes('User rejected') || message.includes('rejected')) {
        toast.info('Transaction cancelled');
      } else {
        setError(message);
        toast.error(`Send failed: ${message}`);
      }
    } finally {
      setSending(false);
    }
  };

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
            <div
              className="w-10 h-1 rounded-full"
              style={{ background: 'rgba(255,255,255,0.35)' }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Send size={16} color={HEADLINE_GREEN} />
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
                SEND
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

          <div className="px-5 pb-8 space-y-4">
            <SheetContent
              tokenType={tokenType}
              setTokenType={setTokenType}
              recipient={recipient}
              setRecipient={setRecipient}
              amount={amount}
              setAmount={setAmount}
              numericAmount={numericAmount}
              maxAmount={maxAmount}
              isValidRecipient={isValidRecipient}
              isValidAmount={isValidAmount}
              canSend={canSend}
              sending={sending}
              error={error}
              solBalance={solBalance}
              usdcBalance={usdcBalance}
              solPriceUsd={solPriceUsd}
              handleMax={handleMax}
              handleSend={handleSend}
              recentAddresses={recentAddresses}
            />
          </div>
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
            maxWidth: 420,
            width: 'calc(100% - 32px)',
            background: '#0a0a0a',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-2">
              <Send size={16} color={HEADLINE_GREEN} />
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
                SEND
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

          <div className="px-5 pb-5 space-y-4">
            <SheetContent
              tokenType={tokenType}
              setTokenType={setTokenType}
              recipient={recipient}
              setRecipient={setRecipient}
              amount={amount}
              setAmount={setAmount}
              numericAmount={numericAmount}
              maxAmount={maxAmount}
              isValidRecipient={isValidRecipient}
              isValidAmount={isValidAmount}
              canSend={canSend}
              sending={sending}
              error={error}
              solBalance={solBalance}
              usdcBalance={usdcBalance}
              solPriceUsd={solPriceUsd}
              handleMax={handleMax}
              handleSend={handleSend}
              recentAddresses={recentAddresses}
            />
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </AnimatePresence>
  );
}

/* ── Shared content between mobile & desktop ── */
interface SheetContentProps {
  tokenType: 'SOL' | 'USDC';
  setTokenType: (t: 'SOL' | 'USDC') => void;
  recipient: string;
  setRecipient: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  numericAmount: number;
  maxAmount: number;
  isValidRecipient: boolean;
  isValidAmount: boolean;
  canSend: boolean;
  sending: boolean;
  error: string | null;
  solBalance: number;
  usdcBalance: number;
  solPriceUsd: number | null;
  handleMax: () => void;
  handleSend: () => void;
  recentAddresses: string[];
}

function SheetContent({
  tokenType,
  setTokenType,
  recipient,
  setRecipient,
  amount,
  setAmount,
  numericAmount,
  maxAmount,
  isValidRecipient,
  isValidAmount,
  canSend,
  sending,
  error,
  solBalance,
  usdcBalance,
  solPriceUsd,
  handleMax,
  handleSend,
  recentAddresses,
}: SheetContentProps) {
  const inputBorderColor = (isValid: boolean, value: string) => {
    if (value.length === 0) return 'rgba(255,255,255,0.1)';
    if (isValid) return PRIMARY_GREEN;
    return 'rgba(239,68,68,0.4)';
  };

  return (
    <>
      {/* Token selector */}
      <div>
        <p
          className="text-[11px] font-medium mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)' }}
        >
          Asset
        </p>
        <div className="flex gap-2">
          {(['SOL', 'USDC'] as const).map(token => (
            <button
              key={token}
              onClick={() => setTokenType(token)}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                background: tokenType === token
                  ? PRIMARY_GREEN
                  : 'rgba(255,255,255,0.06)',
                color: tokenType === token ? '#000' : 'rgba(255,255,255,0.7)',
                border: `1px solid ${tokenType === token ? PRIMARY_GREEN : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* Recent addresses */}
      {recentAddresses.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Clock size={10} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p
              className="text-[11px] font-medium"
              style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.35)' }}
            >
              Recent
            </p>
          </div>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {recentAddresses.map((addr) => (
              <motion.button
                key={addr}
                whileTap={{ scale: 0.92 }}
                onClick={() => setRecipient(addr)}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                {truncateAddr(addr)}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Recipient */}
      <div>
        <p
          className="text-[11px] font-medium mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)' }}
        >
          Send to
        </p>
        <div className="relative">
          <input
            type="text"
            value={recipient}
            onChange={e => setRecipient(e.target.value.trim())}
            placeholder="Enter Solana address..."
            style={{
              width: '100%',
              padding: '10px 14px',
              paddingRight: '70px',
              borderRadius: '10px',
              border: `1px solid ${inputBorderColor(isValidRecipient, recipient)}`,
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: '0.8rem',
              fontFamily: "'Inter', monospace",
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
          {!recipient && (
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setRecipient(text.trim());
                } catch {
                  // ignore
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all active:scale-95 flex items-center gap-1"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: 'rgba(0,255,65,0.12)',
                color: PRIMARY_GREEN,
                border: `1px solid rgba(0,255,65,0.25)`,
              }}
            >
              <Clipboard size={10} />
              Paste
            </button>
          )}
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif" }}>
          Wallet address or .sol domain
        </p>
        {recipient.length > 0 && !isValidRecipient && (
          <p className="text-[10px] mt-1" style={{ color: '#ef4444', fontFamily: "'Inter', sans-serif" }}>
            Invalid Solana address
          </p>
        )}
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

      {/* Amount */}
      <div>
        <p
          className="text-[11px] font-medium mb-2"
          style={{ fontFamily: "'Inter', sans-serif", color: 'rgba(255,255,255,0.5)' }}
        >
          Amount
        </p>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            min="0"
            step="any"
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${inputBorderColor(isValidAmount, amount)}`,
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              fontSize: '0.95rem',
              fontWeight: 500,
              fontFamily: "'Orbitron', monospace",
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
          />
          <button
            onClick={handleMax}
            className="px-3 py-2 rounded-full text-[10px] font-bold transition-all active:scale-[0.98]"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              background: 'rgba(0,255,65,0.1)',
              border: `1px solid rgba(0,255,65,0.3)`,
              color: PRIMARY_GREEN,
            }}
          >
            MAX
          </button>
        </div>
        <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', sans-serif" }}>
          Available: {tokenType === 'SOL' ? solBalance.toFixed(4) : usdcBalance.toFixed(2)} {tokenType}
        </p>
      </div>

      {/* Preview */}
      {numericAmount > 0 && isValidRecipient && (
        <div
          className="rounded-lg p-3 space-y-2"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex justify-between items-center">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
              Sending
            </span>
            <span className="text-xs font-medium" style={{ color: '#fff', fontFamily: "'Orbitron', monospace" }}>
              {numericAmount} {tokenType}
            </span>
          </div>
          {tokenType === 'SOL' && solPriceUsd && (
            <div className="flex justify-between items-center">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
                Value
              </span>
              <span className="text-xs" style={{ color: PRIMARY_GREEN, fontFamily: "'Orbitron', monospace" }}>
                {formatUsd(numericAmount, solPriceUsd)}
              </span>
            </div>
          )}
          {tokenType === 'USDC' && (
            <div className="flex justify-between items-center">
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
                Value
              </span>
              <span className="text-xs" style={{ color: PRIMARY_GREEN, fontFamily: "'Orbitron', monospace" }}>
                ~${numericAmount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif" }}>
              Est. Fee
            </span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Orbitron', monospace" }}>
              ~{ESTIMATED_FEE_SOL} SOL
            </span>
          </div>
          <div
            style={{ height: 1, background: 'rgba(255,255,255,0.06)' }}
          />
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold" style={{ color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif" }}>
              You send
            </span>
            <span className="text-sm font-bold" style={{ color: PRIMARY_GREEN, fontFamily: "'Archivo Black', sans-serif" }}>
              {numericAmount} {tokenType}
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="rounded-lg p-3 flex items-start gap-2"
          style={{
            background: 'rgba(239,68,68,0.06)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <AlertTriangle size={14} color="#ef4444" className="mt-0.5 flex-shrink-0" />
          <p className="text-[10px]" style={{ color: '#ef4444', fontFamily: "'Inter', sans-serif", lineHeight: 1.5 }}>
            {error}
          </p>
        </div>
      )}

      {/* Send button */}
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="w-full py-3.5 rounded-xl text-sm font-black tracking-widest uppercase transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        style={{
          background: canSend ? PRIMARY_GREEN : '#ffffff',
          color: '#000000',
          fontFamily: "'Archivo Black', sans-serif",
          cursor: canSend ? 'pointer' : 'not-allowed',
          opacity: canSend ? 1 : 0.35,
          boxShadow: canSend ? '0 0 12px rgba(0,255,65,0.4)' : 'none',
        }}
      >
        {sending ? (
          <>
            <div
              className="w-4 h-4 rounded-full"
              style={{
                border: '2px solid rgba(0,0,0,0.2)',
                borderTopColor: '#000',
                animation: 'spin 0.6s linear infinite',
              }}
            />
            SENDING...
          </>
        ) : (
          <>
            <Send size={14} />
            SEND {tokenType}
          </>
        )}
      </button>
    </>
  );
}
