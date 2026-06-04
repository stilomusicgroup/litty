import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Coins } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import type { SongsResponse } from '@/lib/collections/songs';
import type { Candle } from '@/hooks/useSongCandles';
import { orbitronFont } from '@/theme';
import TokenActionStrip from '@/components/TokenActionStrip';

const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';
const BG = '#000000';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

/* ── Mini sparkline ── */
export function MiniSparkline({ candles, width = 60, height = 24 }: { candles: Candle[]; width?: number; height?: number }) {
  if (!candles.length) {
    return (
      <svg width={width} height={height}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#00FF41" strokeWidth="1" opacity="0.3" />
      </svg>
    );
  }

  const closes = candles.map((c) => c.c);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;

  const points = closes
    .map((c, i) => {
      const x = (i / (closes.length - 1)) * width;
      const y = height - ((c - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke="#00FF41" strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function getPctChange(candles: Candle[]): number | null {
  if (!candles.length) return null;
  const first = candles[0].c;
  const last = candles[candles.length - 1].c;
  if (!first || first === 0) return null;
  return ((last - first) / first) * 100;
}

/* ── Types ── */
interface WalletToken {
  mint: string;
  amount: number;
  rawAmount: string;
  decimals: number;
}

interface TokenListSheetProps {
  open: boolean;
  onClose: () => void;
  walletTokens: WalletToken[];
  mintToSong: Record<string, SongsResponse>;
  mintPrices: Record<string, number | null>;
  mintCandles: Record<string, Candle[]>;
  holdings: Record<string, { lots: unknown[]; totalQuantity: number }>;
  externalHoldings: Record<string, { mintAddress: string; quantity: number; source: 'external' | 'both' }>;
  solBalance: number | null;
  solPriceUsd: number | null;
  onOpenSwap?: (mint: string) => void;
}

const TokenListSheet: React.FC<TokenListSheetProps> = ({
  open,
  onClose,
  walletTokens,
  mintToSong,
  mintPrices,
  mintCandles,
  holdings,
  externalHoldings,
  solBalance,
  solPriceUsd,
  onOpenSwap,
}) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [expandedMint, setExpandedMint] = React.useState<string | null>(null);

  const solUsdValue = (solBalance ?? 0) * (solPriceUsd ?? 0);

  // Build unified list: SOL first, then wallet tokens sorted by USD value desc
  const tokenRows = React.useMemo(() => {
    const rows = walletTokens.map((token) => {
      const song = mintToSong[token.mint];
      const price = mintPrices[token.mint] ?? null;
      const usdValue = price != null ? price * token.amount : null;
      return { type: 'token' as const, token, song, price, usdValue };
    });
    rows.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));
    return rows;
  }, [walletTokens, mintToSong, mintPrices]);

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <span
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '0.7rem',
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          Your Holdings
        </span>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          <X size={14} />
        </button>
      </div>

      {/* List */}
      <div className="px-5 pb-8 flex flex-col gap-2">
        {/* SOL Row */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() =>
            setExpandedMint((prev) => (prev === SOL_MINT ? null : SOL_MINT))
          }
          className="flex flex-col w-full px-4 pt-4 pb-2 rounded-[20px] transition-all cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          whileHover={{
            background: 'rgba(255,255,255,0.05)',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex items-center gap-4 w-full">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="14" stroke={PRIMARY_GREEN} strokeWidth="2" />
                <text x="16" y="21" textAnchor="middle" fill={PRIMARY_GREEN} fontSize="14" fontWeight="bold">
                  &#9678;
                </text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">Solana</div>
              <div className="text-xs truncate text-white">
                SOL
              </div>
            </div>
            <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
              <div
                className="font-bold"
                style={{
                  fontFamily: orbitronFont,
                  fontSize: '0.9rem',
                  color: HEADLINE_GREEN,
                  letterSpacing: '-0.02em',
                }}
              >
                {(solBalance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </div>
              <div className="text-xs font-medium text-white">
                {solUsdValue > 0 ? formatCurrency(solUsdValue) : '—'}
              </div>
            </div>
          </div>

          <AnimatePresence>
            {expandedMint === SOL_MINT && (
              <TokenActionStrip
                isSong={false}
                onTrade={() => {}}
                onSwap={() => {
                  if (onOpenSwap) {
                    onOpenSwap(SOL_MINT);
                    onClose();
                  }
                }}
                onViewPage={() => {
                  navigator.clipboard.writeText(SOL_MINT).catch(() => {});
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>

        {/* Divider */}
        {tokenRows.length > 0 && (
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span
              className="text-[9px] font-black uppercase tracking-widest"
              style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'Archivo Black', sans-serif" }}
            >
              Tokens
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}

        {/* Token Rows */}
        {tokenRows.map((row) => {
          const { token, song, usdValue } = row;
          const candles = mintCandles[token.mint] ?? [];
          const pctChange = getPctChange(candles);
          const internalQty = song ? (holdings[song.id]?.totalQuantity ?? 0) : 0;
          const onChainRaw = Number(token.rawAmount);
          const isPartiallyExternal = internalQty > 0 && onChainRaw > internalQty;
          const isFullyExternal = internalQty === 0 && !!song;
          const isExpanded = expandedMint === token.mint;

          return (
            <motion.div
              key={token.mint}
              whileTap={{ scale: 0.98 }}
              onClick={() =>
                setExpandedMint((prev) => (prev === token.mint ? null : token.mint))
              }
              className="flex flex-col w-full px-4 pt-3.5 pb-2 rounded-[20px] transition-all cursor-pointer"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.05)',
                borderColor: 'rgba(255,255,255,0.1)',
              }}
            >
              {/* Row content */}
              <div className="flex items-center gap-4 w-full">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                  style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#1a1a1a' }}
                >
                  {song?.teaserImageUrl ? (
                    <img src={song.teaserImageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Coins size={20} style={{ color: '#555' }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-bold text-white truncate">
                      {song?.name ?? 'Unknown Token'}
                    </div>
                    {isPartiallyExternal && (
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: 'rgba(0, 255, 65, 0.15)',
                          color: '#00FF41',
                          border: '1px solid rgba(0, 255, 65, 0.25)',
                        }}
                      >
                        Partially External
                      </span>
                    )}
                    {isFullyExternal && (
                      <span
                        className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                        style={{
                          background: 'rgba(0, 255, 65, 0.12)',
                          color: '#00FF41',
                          border: '1px solid rgba(0, 255, 65, 0.2)',
                        }}
                      >
                        Held Externally
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-white">
                      {song?.symbol ?? truncateAddress(token.mint)}
                    </span>
                    {candles.length > 0 && (
                      <>
                        <MiniSparkline candles={candles} width={40} height={16} />
                        {pctChange !== null && (
                          <span
                            className="text-[9px] font-bold"
                            style={{
                              fontFamily: orbitronFont,
                              color: pctChange >= 0 ? '#00FF41' : '#ef4444',
                            }}
                          >
                            {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Balance + USD */}
                <div className="flex flex-col items-end gap-0.5 flex-shrink-0 min-w-[80px]">
                  <div
                    className="font-bold"
                    style={{
                      fontFamily: orbitronFont,
                      fontSize: '0.9rem',
                      color: HEADLINE_GREEN,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {token.amount.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                  <div className="text-xs font-medium text-white">
                    {usdValue != null ? formatCurrency(usdValue) : '—'}
                  </div>
                </div>
              </div>

              {/* Inline action picker */}
              <AnimatePresence>
                {isExpanded && (
                  <TokenActionStrip
                    isSong={!!song}
                    onTrade={() => {
                      if (song) {
                        navigate(`/song/${song.id}`);
                        onClose();
                      }
                    }}
                    onSwap={() => {
                      if (onOpenSwap) {
                        onOpenSwap(token.mint);
                        onClose();
                      }
                    }}
                    onViewPage={() => {
                      if (song) {
                        navigate(`/song/${song.id}`);
                        onClose();
                      } else {
                        navigator.clipboard.writeText(token.mint).catch(() => {});
                      }
                    }}
                  />
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {tokenRows.length === 0 && (
          <div className="text-center py-6">
            <p className="text-xs text-white">
              No tokens yet
            </p>
          </div>
        )}
      </div>
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
                background: BG,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '85vh',
                overflowY: 'auto',
              }}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1" onClick={onClose}>
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
                maxWidth: 520,
                width: 'calc(100% - 32px)',
                background: BG,
                border: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '80vh',
                overflowY: 'auto',
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

export default TokenListSheet;
