/**
 * SellModal — sell song tokens via the DeFi swap hook on the bonding curve.
 *
 * Creates a record under songs/{songId}/swaps/{swapId} with:
 *   mint = song token mint address (DeFiPlugin detects this as a sell)
 *   amt  = token amount in smallest units (raw integer, no decimals)
 *
 * The onchain hook executes the swap and writes tarobase_transaction_hash.
 * We subscribe to the swap record to detect completion and link to Solscan.
 *
 * Trade fees (bonding curve):
 *   pump.fun charges ~2% total on sells (1% protocol + 1% creator).
 *   There is NO additional platform fee on sells — PLATFORM_TRADE_FEE_BPS
 *   is defined as a constant but is not enforced in the swap hook.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingDown, Loader2, ExternalLink, AlertCircle, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-privy-auth';
import {
  setSongsSwaps,
  subscribeSongsSwaps,
} from '@/lib/collections/songs';
import type { SongsSwapsResponse } from '@/lib/collections/songs';
import { Address } from '@/lib/db-client';
import { triggerHapticFeedback, hapticSuccess, hapticError } from '@/utils/haptic';
import SlippagePanel, { useSlippage } from '@/components/TradeSlippage';
import TradeQuote from '@/components/TradeQuote';
import { useCostBasis, estimateSolFromTokens } from '@/hooks/use-cost-basis';

// Solana-network URL for Solscan links. Preview uses devnet.
const SOLSCAN_BASE =
  import.meta.env.VITE_ENV === 'LIVE'
    ? 'https://solscan.io/tx'
    : 'https://solscan.io/tx';

interface SellModalProps {
  open: boolean;
  onClose: () => void;
  songId: string;
  songTitle: string;
  symbol: string;
  mintAddress: string;
  tokenBalance: number;
  onSellConfirmed?: () => void;
}

type SwapState = 'idle' | 'submitting' | 'pending' | 'confirmed' | 'error';


const NEON_GREEN = '#00FF41';
const NEON_RED = '#FF3F4B';

const SellModal: React.FC<SellModalProps> = ({
  open,
  onClose,
  songId,
  songTitle,
  symbol,
  mintAddress,
  tokenBalance,
  onSellConfirmed,
}) => {
  const { user } = useAuth();
  const { recordSellPnL } = useCostBasis();
  const [rawAmount, setRawAmount] = useState('');
  const [swapState, setSwapState] = useState<SwapState>('idle');
  const [swapId, setSwapId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSlippage, setShowSlippage] = useState(false);
  const [slipBps, setSlipBps] = useSlippage();

  // Computed values (must be before effects that reference them)
  const parsedAmount = (() => {
    const n = parseInt(rawAmount, 10);
    return isNaN(n) || n <= 0 ? 0 : n;
  })();

  const isValid = parsedAmount > 0 && parsedAmount <= tokenBalance;
  const validationMsg = (() => {
    if (rawAmount === '') return null;
    if (parsedAmount <= 0) return 'Enter a positive token amount';
    if (parsedAmount > tokenBalance) return `You only have ${tokenBalance.toLocaleString()} ${symbol}`;
    return null;
  })();

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setRawAmount('');
      setSwapState('idle');
      setSwapId(null);
      setTxHash(null);
      setErrorMsg(null);
    }
  }, [open]);

  // Subscribe to swap record to detect tx completion
  useEffect(() => {
    if (!swapId || swapState !== 'pending') return;
    let unsub: (() => Promise<void>) | null = null;

    subscribeSongsSwaps(
      async (data: SongsSwapsResponse | null) => {
        if (data?.tarobase_transaction_hash) {
          setTxHash(data.tarobase_transaction_hash);
          setSwapState('confirmed');
          hapticSuccess();
          onSellConfirmed?.();
          toast.success('Sell confirmed!');

          // Record realized PnL via FIFO lot matching
          if (user?.address) {
            try {
              const saleProceeds = await estimateSolFromTokens(songId, parsedAmount);
              await recordSellPnL({
                userAddress: user.address,
                songId,
                songName: songTitle,
                songSymbol: symbol,
                tokenMint: mintAddress,
                soldQuantity: parsedAmount,
                saleProceeds,
                currency: 'SOL',
                source: 'swap',
                txSignature: data.tarobase_transaction_hash,
              });
            } catch (e) {
              console.error('[SellModal] Failed to record sell PnL:', e);
            }
          }
        }
      },
      songId,
      swapId,
    ).then((fn) => { unsub = fn; });

    return () => { unsub?.(); };
  }, [swapId, swapState, songId, parsedAmount, user?.address, recordSellPnL, songTitle, symbol, mintAddress]);

  const handleSell = async () => {
    if (!isValid || !user?.address) return;
    if (!mintAddress) {
      toast.error('Token mint not loaded yet, please wait');
      return;
    }
    triggerHapticFeedback();
    setSwapState('submitting');
    setErrorMsg(null);

    const newSwapId = `swap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    try {
      const success = await setSongsSwaps(songId, newSwapId, {
        mint: Address.publicKey(mintAddress),
        amt: parsedAmount,
      });

      if (!success) {
        hapticError();
        setSwapState('error');
        setErrorMsg('Swap rejected — you may not have enough tokens or the transaction was denied.');
        return;
      }

      setSwapId(newSwapId);
      setSwapState('pending');
    } catch (err: any) {
      console.error('[SellModal] Swap error:', err);
      hapticError();
      setSwapState('error');
      setErrorMsg(err?.message || 'Swap failed — please try again');
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[300]"
            style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={swapState === 'idle' || swapState === 'error' || swapState === 'confirmed' ? onClose : undefined}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-[310] rounded-t-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(10,3,20,0.99) 0%, rgba(4,1,10,0.99) 100%)',
              border: '1px solid rgba(255,63,75,0.25)',
              borderBottom: 'none',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,63,75,0.25)' }} />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-2 pb-4">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <TrendingDown size={16} style={{ color: NEON_RED }} />
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#fff',
                  }}>
                    Sell Token
                  </span>
                </h3>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {songTitle}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.07)' }}
                disabled={swapState === 'submitting' || swapState === 'pending'}
              >
                <X size={16} className="text-white/60" />
              </button>
            </div>

            <div className="px-5 pb-8 flex flex-col gap-5">
              {/* Balance display */}
              <div
                className="rounded-2xl px-4 py-3 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Your balance</span>
                <span
                  className="text-sm font-black"
                  style={{ fontFamily: "'Inter', monospace", color: NEON_GREEN }}
                >
                  {tokenBalance.toLocaleString()} {symbol}
                </span>
              </div>

              {/* Amount input */}
              {swapState === 'idle' || swapState === 'error' ? (
                <>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      Token amount to sell
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={tokenBalance}
                        value={rawAmount}
                        onChange={(e) => setRawAmount(e.target.value)}
                        placeholder="e.g. 1000"
                        className="w-full rounded-2xl px-4 py-3 text-white text-sm font-bold outline-none"
                        style={{
                          background: 'rgba(255,63,75,0.06)',
                          border: validationMsg ? '1px solid rgba(255,63,75,0.6)' : '1px solid rgba(255,63,75,0.25)',
                          fontFamily: "'Inter', monospace",
                        }}
                        disabled={swapState === 'error'}
                      />
                      {tokenBalance > 0 && (
                        <button
                          onClick={() => setRawAmount(String(tokenBalance))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-2 py-1 rounded-lg"
                          style={{ background: 'rgba(255,63,75,0.15)', color: NEON_RED }}
                        >
                          MAX
                        </button>
                      )}
                    </div>
                    {validationMsg && (
                      <p className="text-xs" style={{ color: NEON_RED }}>{validationMsg}</p>
                    )}
                  </div>

                  {/* Live quote */}
                  <TradeQuote
                    songId={songId}
                    symbol={symbol}
                    mode="sell"
                    amount={parsedAmount}
                    slipBps={slipBps}
                  />

                  {/* Slippage toggle */}
                  <div>
                    <button
                      onClick={() => setShowSlippage(prev => !prev)}
                      className="flex items-center gap-1.5 text-xs transition-colors"
                      style={{ color: showSlippage ? NEON_RED : 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Settings2 size={11} />
                      Slippage: {(slipBps / 100).toFixed(0)}%
                    </button>
                    {showSlippage && (
                      <div className="mt-2">
                        <SlippagePanel
                          slipBps={slipBps}
                          onChange={setSlipBps}
                          onClose={() => setShowSlippage(false)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Fee info */}
                  <div
                    className="rounded-xl px-4 py-2.5 flex items-center justify-between"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Pump.fun fee</span>
                    <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', monospace" }}>~2%</span>
                  </div>

                  {swapState === 'error' && errorMsg && (
                    <div
                      className="rounded-xl px-4 py-3 flex items-start gap-2"
                      style={{ background: 'rgba(255,63,75,0.08)', border: '1px solid rgba(255,63,75,0.3)' }}
                    >
                      <AlertCircle size={14} style={{ color: NEON_RED, flexShrink: 0, marginTop: 1 }} />
                      <p className="text-xs" style={{ color: 'rgba(255,150,150,0.85)' }}>{errorMsg}</p>
                    </div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={handleSell}
                    disabled={!isValid || !user?.address}
                    className="w-full rounded-2xl font-black text-sm py-4 transition-all"
                    style={{
                      background: isValid && user?.address
                        ? 'linear-gradient(135deg, #FF3F4B, #FF6B6B)'
                        : 'rgba(255,63,75,0.15)',
                      color: isValid && user?.address ? '#fff' : 'rgba(255,255,255,0.3)',
                      fontFamily: "'Archivo Black', sans-serif",
                      letterSpacing: '0.05em',
                      boxShadow: isValid && user?.address ? '0 0 24px rgba(255,63,75,0.4)' : 'none',
                    }}
                  >
                    {!user?.address ? 'Connect Wallet to Sell' : `Sell ${parsedAmount > 0 ? parsedAmount.toLocaleString() : ''} ${symbol}`}
                  </motion.button>
                </>
              ) : swapState === 'submitting' || swapState === 'pending' ? (
                <div className="flex flex-col items-center gap-4 py-8">
                  <Loader2 size={36} className="animate-spin" style={{ color: NEON_RED }} />
                  <div className="text-center">
                    <p className="text-sm font-bold text-white">
                      {swapState === 'submitting' ? 'Submitting swap…' : 'Waiting for confirmation…'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {swapState === 'submitting'
                        ? 'Signing with your wallet'
                        : 'Transaction is being processed onchain'}
                    </p>
                  </div>
                </div>
              ) : swapState === 'confirmed' ? (
                <div className="flex flex-col items-center gap-4 py-6">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(0, 255, 65, 0.12)', border: '2px solid rgba(0, 255, 65, 0.4)' }}
                  >
                    <span className="text-2xl">✓</span>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black text-white">Sell Confirmed</p>
                    <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {parsedAmount.toLocaleString()} {symbol} sold
                    </p>
                  </div>
                  {txHash && (
                    <a
                      href={`${SOLSCAN_BASE}/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold transition-all active:scale-95"
                      style={{
                        background: 'rgba(0, 255, 65, 0.08)',
                        border: '1px solid rgba(0, 255, 65, 0.3)',
                        color: NEON_GREEN,
                      }}
                    >
                      <ExternalLink size={14} />
                      View on Solscan
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="text-xs font-semibold mt-2"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Close
                  </button>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SellModal;
