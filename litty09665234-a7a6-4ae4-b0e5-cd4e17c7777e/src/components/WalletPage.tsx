import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowDownLeft,
  QrCode,
  Send,
  ArrowLeftRight,
  Copy,
  Check,
  Music,
  Bell,
  ChevronRight,
  Coins,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-privy-auth';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { getManyUserTokenLotsLots, type UserTokenLotsLotsResponse } from '@/lib/collections/userTokenLots';
import { getSongs, getManySongs, type SongsResponse } from '@/lib/collections/songs';
import { fetchPumpFunPrice } from '@/hooks/usePumpFunPrice';
import type { Candle } from '@/hooks/useSongCandles';
import { api } from '@/lib/api-client';
import { USDC } from '@/lib/constants';
import { orbitronFont } from '@/theme';
import ReceiveModal from '@/components/ReceiveModal';
import SendSolModal from '@/components/SendSolModal';
import OnrampModal from '@/components/OnrampModal';
import SwapBottomSheet from '@/components/SwapBottomSheet';
import TokenListSheet from '@/components/TokenListSheet';
import TokenActionStrip from '@/components/TokenActionStrip';
import PortfolioChart, { type PortfolioSnapshot } from '@/components/PortfolioChart';
import {
  getManyPortfolioHistorySnapshots,
  setPortfolioHistorySnapshots,
} from '@/lib/collections/portfolioHistory';

const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';
const BG = '#000000';

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return addr.slice(0, 4) + '...' + addr.slice(-4);
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);

/* ── Mini sparkline ── */
function MiniSparkline({ candles, width = 60, height = 24 }: { candles: Candle[]; width?: number; height?: number }) {
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

function getPctChange(candles: Candle[]): number | null {
  if (!candles.length) return null;
  const first = candles[0].c;
  const last = candles[candles.length - 1].c;
  if (!first || first === 0) return null;
  return ((last - first) / first) * 100;
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { user, login, loading: authLoading } = useAuth();
  const { solBalance, solPriceUsd, loading: solLoading } = useSolanaWallet();

  const [lots, setLots] = useState<UserTokenLotsLotsResponse[]>([]);
  const [songsMap, setSongsMap] = useState<Record<string, SongsResponse>>({});
  const [lotsLoading, setLotsLoading] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [onrampOpen, setOnrampOpen] = useState(false);
  const [showSwap, setShowSwap] = useState(false);
  const [tokenListOpen, setTokenListOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tokenPrices, setTokenPrices] = useState<Record<string, number | null>>({});
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);

  /* ── All wallet SPL tokens (new token list source) ── */
  const [walletTokens, setWalletTokens] = useState<Array<{ mint: string; amount: number; rawAmount: string; decimals: number }>>([]);
  const [allSongsList, setAllSongsList] = useState<SongsResponse[]>([]);
  const [mintPrices, setMintPrices] = useState<Record<string, number | null>>({});
  const [mintCandles, setMintCandles] = useState<Record<string, Candle[]>>({});
  const [swapFromMint, setSwapFromMint] = useState<string | undefined>(undefined);
  const [expandedMint, setExpandedMint] = useState<string | null>(null);

  /* ── External SPL token scanning ── */
  const [externalHoldings, setExternalHoldings] = useState<Record<string, { mintAddress: string; quantity: number; source: 'external' | 'both' }>>({});
  const [externalLoading, setExternalLoading] = useState(false);

  /* ── Fetch token lots & song metadata ── */
  useEffect(() => {
    if (!user?.address) return;
    let cancelled = false;
    setLotsLoading(true);

    const fetchData = async () => {
      try {
        const data = await getManyUserTokenLotsLots(user.address);
        if (cancelled) return;
        setLots(data);

        const uniqueSongIds = [...new Set(data.map((l) => l.songId))];
        const songResults = await Promise.all(uniqueSongIds.map((id) => getSongs(id)));
        if (cancelled) return;

        const map: Record<string, SongsResponse> = {};
        songResults.forEach((s) => {
          if (s) map[s.id] = s;
        });
        setSongsMap(map);
      } catch (e) {
        console.error('Failed to fetch holdings:', e);
      } finally {
        if (!cancelled) setLotsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [user?.address]);

  /* ── Fetch externally held SPL tokens ── */
  useEffect(() => {
    if (!user?.address) return;
    let cancelled = false;
    setExternalLoading(true);

    const fetchExternal = async () => {
      try {
        // 1. Scan wallet on-chain
        const res = await api.get<{ tokens: Array<{ mint: string; amount: number; rawAmount: string; decimals: number }> }>(
          `/api/wallet/${user.address}/tokens`
        );
        if (cancelled) return;
        const onchainTokens = res?.tokens ?? [];
        setWalletTokens(onchainTokens);
        if (onchainTokens.length === 0) {
          setExternalHoldings({});
          setExternalLoading(false);
          return;
        }

        // 2. Load songs catalog to cross-reference mints
        const allSongs = await getManySongs();
        if (cancelled) return;
        setAllSongsList(allSongs);

        // Build mint -> songId map
        const mintToSong: Record<string, string> = {};
        allSongs.forEach((s) => {
          if (s.mintAddress) {
            mintToSong[s.mintAddress] = s.id;
          }
        });

        // 3. Determine which on-chain tokens are Lit Studio songs but NOT in userTokenLots
        const internalMints = new Set<string>();
        lots.forEach((l) => {
          if (l.tokenMint) internalMints.add(l.tokenMint);
        });

        const ext: Record<string, { mintAddress: string; quantity: number; source: 'external' | 'both' }> = {};
        for (const t of onchainTokens) {
          const songId = mintToSong[t.mint];
          if (!songId) continue; // Not a Lit Studio token

          const alreadyInternal = internalMints.has(t.mint);
          const rawQty = Number(t.rawAmount);

          if (alreadyInternal) {
            // Token exists both externally and internally — merge into 'both'
            const internalQty = holdings[songId]?.totalQuantity ?? 0;
            if (rawQty > internalQty) {
              ext[songId] = {
                mintAddress: t.mint,
                quantity: rawQty,
                source: 'both',
              };
            }
          } else {
            // Purely external
            ext[songId] = {
              mintAddress: t.mint,
              quantity: rawQty,
              source: 'external',
            };
          }
        }

        if (!cancelled) {
          setExternalHoldings(ext);
          // Also fetch song metadata for external tokens
          const externalSongIds = Object.keys(ext);
          if (externalSongIds.length > 0) {
            const songResults = await Promise.all(externalSongIds.map((id) => getSongs(id)));
            if (!cancelled) {
              setSongsMap((prev) => {
                const next = { ...prev };
                songResults.forEach((s) => {
                  if (s) next[s.id] = s;
                });
                return next;
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch external tokens:', e);
      } finally {
        if (!cancelled) setExternalLoading(false);
      }
    };

    fetchExternal();
    return () => {
      cancelled = true;
    };
  }, [user?.address, lots]);

  /* ── Fetch prices for all wallet tokens ── */
  useEffect(() => {
    if (walletTokens.length === 0) {
      setMintPrices({});
      return;
    }
    let cancelled = false;

    const poll = async () => {
      const next: Record<string, number | null> = {};
      await Promise.all(
        walletTokens.map(async (t) => {
          try {
            const result = await fetchPumpFunPrice(t.mint);
            next[t.mint] = result?.priceUsd ?? null;
          } catch {
            next[t.mint] = null;
          }
        })
      );
      if (!cancelled) setMintPrices(next);
    };

    poll();
    const t = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [walletTokens]);

  /* ── Fetch candles for platform song tokens ── */
  useEffect(() => {
    if (walletTokens.length === 0 || allSongsList.length === 0) return;
    let cancelled = false;

    const mintToSongObj: Record<string, string> = {};
    allSongsList.forEach((s) => {
      if (s.mintAddress) mintToSongObj[s.mintAddress] = s.id;
    });

    const platformMints = walletTokens
      .filter((t) => mintToSongObj[t.mint])
      .map((t) => t.mint);

    if (platformMints.length === 0) return;

    const fetchCandles = async () => {
      const next: Record<string, Candle[]> = {};
      await Promise.all(
        platformMints.map(async (mint) => {
          try {
            const data = await api.get<{ candles: Candle[] }>(`/api/songs/${mint}/candles?tf=1d`);
            next[mint] = Array.isArray(data?.candles) ? data.candles : [];
          } catch {
            next[mint] = [];
          }
        })
      );
      if (!cancelled) setMintCandles(next);
    };

    fetchCandles();
    return () => {
      cancelled = true;
    };
  }, [walletTokens, allSongsList]);

  /* ── Group lots by songId ── */
  const holdings = useMemo(() => {
    const acc: Record<string, { lots: UserTokenLotsLotsResponse[]; totalQuantity: number }> = {};
    lots.forEach((lot) => {
      if (!acc[lot.songId]) acc[lot.songId] = { lots: [], totalQuantity: 0 };
      acc[lot.songId].lots.push(lot);
      acc[lot.songId].totalQuantity += lot.remainingQuantity;
    });
    return acc;
  }, [lots]);

  const uniqueSongIds = useMemo(() => Object.keys(holdings), [holdings]);
  const externalSongIds = useMemo(() => Object.keys(externalHoldings), [externalHoldings]);
  const allSongIds = useMemo(
    () => [...new Set([...uniqueSongIds, ...externalSongIds])],
    [uniqueSongIds, externalSongIds]
  );

  const mintToSong = useMemo(() => {
    const map: Record<string, SongsResponse> = {};
    allSongsList.forEach((s) => {
      if (s.mintAddress) map[s.mintAddress] = s;
    });
    return map;
  }, [allSongsList]);

  /* ── Poll token prices for hero net-worth total ── */
  useEffect(() => {
    if (allSongIds.length === 0) {
      setTokenPrices({});
      return;
    }
    let cancelled = false;

    const poll = async () => {
      const next: Record<string, number | null> = {};
      await Promise.all(
        allSongIds.map(async (songId) => {
          const mint = holdings[songId]?.lots[0]?.tokenMint ?? externalHoldings[songId]?.mintAddress;
          if (!mint) {
            next[songId] = null;
            return;
          }
          try {
            const result = await fetchPumpFunPrice(mint);
            next[songId] = result?.priceUsd ?? null;
          } catch {
            next[songId] = null;
          }
        })
      );
      if (!cancelled) setTokenPrices(next);
    };

    poll();
    const t = setInterval(poll, 15_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [allSongIds, holdings, externalHoldings]);

  /* ── Net worth ── */
  const solValue = (solBalance || 0) * (solPriceUsd || 0);
  const totalTokenValue = useMemo(() => {
    let sum = 0;
    // Internal holdings
    uniqueSongIds.forEach((id) => {
      const price = tokenPrices[id];
      if (price == null) return;
      sum += price * (holdings[id].totalQuantity / 1_000_000);
    });
    // External holdings
    externalSongIds.forEach((id) => {
      const price = tokenPrices[id];
      if (price == null) return;
      sum += price * (externalHoldings[id].quantity / 1_000_000);
    });
    return sum;
  }, [uniqueSongIds, externalSongIds, tokenPrices, holdings, externalHoldings]);

  const totalNetWorth = solValue + totalTokenValue;

  /* ── Fetch portfolio history snapshots ── */
  useEffect(() => {
    if (!user?.address) return;
    let cancelled = false;

    const fetchSnapshots = async () => {
      try {
        const data = await getManyPortfolioHistorySnapshots(user.address);
        if (cancelled) return;
        setSnapshots(data);
      } catch (e) {
        console.error('Failed to fetch portfolio snapshots:', e);
      }
    };

    fetchSnapshots();
    return () => {
      cancelled = true;
    };
  }, [user?.address]);

  /* ── Save today's portfolio snapshot (deduped by day) ── */
  useEffect(() => {
    if (!user?.address || solLoading || lotsLoading) return;
    if (totalNetWorth <= 0 && (solBalance || 0) <= 0) return;

    const saveSnapshot = async () => {
      const now = new Date();
      const snapshotId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      try {
        const existing = await getManyPortfolioHistorySnapshots(
          user.address,
          `where id = '${snapshotId}'`
        );
        if (existing && existing.length > 0) return;

        const success = await setPortfolioHistorySnapshots(user.address, snapshotId, {
          valueUsd: Math.round(totalNetWorth * 100),
          solValue: Math.round(solValue * 100),
          tokenValue: Math.round(totalTokenValue * 100),
          timestamp: Math.floor(Date.now() / 1000),
        });

        if (success) {
          const updated = await getManyPortfolioHistorySnapshots(user.address);
          setSnapshots(updated);
        }
      } catch (e) {
        console.error('Failed to save portfolio snapshot:', e);
      }
    };

    saveSnapshot();
  }, [user?.address, totalNetWorth, solValue, totalTokenValue, solLoading, lotsLoading, solBalance]);

  /* ── Auth loading ── */
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: BG }}
      >
        <div
          className="text-sm animate-pulse"
          style={{ color: HEADLINE_GREEN, fontFamily: orbitronFont, letterSpacing: '0.15em' }}
        >
          CONNECTING...
        </div>
      </div>
    );
  }

  /* ── Not logged in ── */
  if (!user) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6 px-6"
        style={{ background: BG }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: '#111111',
            border: `2px solid ${PRIMARY_GREEN}`,
          }}
        >
          <Music size={28} style={{ color: PRIMARY_GREEN }} />
        </div>
        <div className="text-center">
          <h1
            className="text-xl font-black mb-2 text-white"
            style={{ fontFamily: orbitronFont, letterSpacing: '0.12em' }}
          >
            LIT STUDIO WALLET
          </h1>
          <p className="text-sm mb-6 text-[#bcbcbc]">Connect your wallet to view your holdings.</p>
          <button
            onClick={() => {
              try {
                login();
              } catch (err) {
                console.error('WalletPage login failed:', err);
              }
            }}
            className="px-8 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all active:scale-95"
            style={{
              background: PRIMARY_GREEN,
              color: '#000',
              fontFamily: orbitronFont,
            }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  const walletAddress = user.address;

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: BG,
        color: '#ffffff',
      }}
    >
      <div className="max-w-[540px] mx-auto px-5 pt-6 pb-24">
        {/* ── Left Column (mobile: full width, desktop: 420px) ── */}
        <div>
          {/* ── Header ── */}
          <div className="flex items-center justify-between mb-7 relative z-10">
            <div className="flex items-center gap-3.5">
              <div
                className="w-[62px] h-[62px] rounded-full flex items-center justify-center overflow-hidden"
                style={{
                  border: `2px solid ${PRIMARY_GREEN}`,
                  padding: '2px',
                }}
              >
                <div
                  className="w-full h-full rounded-full flex items-center justify-center text-lg font-bold text-white"
                  style={{
                    background: '#1a1a1a',
                  }}
                >
                  {walletAddress[0]?.toUpperCase() ?? '?'}
                </div>
              </div>
              <div
                className="text-lg font-bold text-white tracking-wide"
                style={{ fontFamily: orbitronFont }}
              >
                LIT STUDIO WALLET
              </div>
            </div>
            <div className="flex items-center gap-4 text-[#bcbcbc]">
              <Bell size={22} className="cursor-pointer hover:text-white transition-colors" />
            </div>
          </div>

          {/* ── Hero Card ── */}
          <div
            className="relative overflow-hidden rounded-2xl px-7 py-8 mb-8"
            style={{
              backgroundImage: `url('https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a203ab52558974b276c433f')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center right',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              boxShadow: '0 0 40px rgba(0, 255, 65, 0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Gradient overlay for text readability */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
              }}
            />

            <div className="relative z-10">
              <div
                className="uppercase tracking-[0.2em] text-[11px] font-bold mb-3"
                style={{
                  color: PRIMARY_GREEN,
                  fontFamily: "'Inter', sans-serif",
                  letterSpacing: '0.22em',
                }}
              >
                Total Net Worth
              </div>
              <div
                className="text-white font-extrabold leading-none mb-6"
                style={{
                  fontFamily: orbitronFont,
                  fontSize: 'clamp(32px, 9vw, 52px)',
                  letterSpacing: '-2px',
                  fontWeight: 700,
                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                }}
              >
                {formatCurrency(totalNetWorth)}
              </div>

              <div className="flex items-center gap-3.5">
                <button
                  onClick={handleCopyAddress}
                  className="flex-1 h-[52px] rounded-full flex items-center justify-between px-5 transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(0,0,0,0.45)',
                    border: '1px solid rgba(0, 255, 65, 0.25)',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '14px',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <span style={{ fontFamily: orbitronFont, letterSpacing: '-0.02em' }}>{truncateAddress(walletAddress)}</span>
                  {copied ? (
                    <Check size={18} strokeWidth={3} style={{ color: PRIMARY_GREEN }} />
                  ) : (
                    <Copy size={18} strokeWidth={2.5} style={{ color: PRIMARY_GREEN }} />
                  )}
                </button>
                <button
                  onClick={() => setReceiveOpen(true)}
                  className="w-[52px] h-[52px] rounded-[18px] flex items-center justify-center transition-all active:scale-[0.98]"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(0, 255, 65, 0.25)',
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <QrCode size={22} style={{ color: PRIMARY_GREEN }} />
                </button>
              </div>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Deposit', icon: ArrowDownLeft, onClick: () => setOnrampOpen(true) },
              { label: 'Receive', icon: QrCode, onClick: () => setReceiveOpen(true) },
              { label: 'Send', icon: Send, onClick: () => setSendOpen(true) },
              { label: 'Swap', icon: ArrowLeftRight, onClick: () => setShowSwap(true) },
            ].map((action) => (
              <div key={action.label} className="flex flex-col items-center gap-3.5">
                <button
                  onClick={action.onClick}
                  className="w-[60px] h-[60px] rounded-full flex items-center justify-center transition-transform active:scale-95"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(18px)',
                  }}
                >
                  <action.icon size={28} style={{ color: PRIMARY_GREEN }} strokeWidth={2} />
                </button>
                <span className="text-[15px] font-medium text-[#d6d6d6]">{action.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right Column (Tokens + Currencies + Portfolio) ── */}
        <div>
          {/* ── Your Tokens Section ── */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div
                className="font-extrabold"
                style={{ fontSize: '26px', letterSpacing: '-1px', color: HEADLINE_GREEN }}
              >
                Your Tokens
              </div>
              {walletTokens.length > 0 && (
                <button
                  onClick={() => setTokenListOpen(true)}
                  className="font-semibold text-sm flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: HEADLINE_GREEN }}
                >
                  View All Holdings <ChevronRight size={16} />
                </button>
              )}
            </div>

            {externalLoading ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-[100px] rounded-[28px] animate-pulse"
                    style={{
                      background: '#111111',
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}
                  />
                ))}
              </div>
            ) : walletTokens.length === 0 ? (
              <div
                className="text-center py-10 rounded-[28px]"
                style={{
                  background: '#0f130f',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(22px)',
                }}
              >
                <Music size={28} className="mx-auto mb-3 text-[#555555]" />
                <p className="text-sm text-[#8f8f8f] mb-4">No tokens yet — buy your first song token to get started</p>
                <button
                  onClick={() => navigate('/stream')}
                  className="px-5 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95"
                  style={{
                    background: PRIMARY_GREEN,
                    color: '#000',
                    fontFamily: orbitronFont,
                  }}
                >
                  Explore Drops
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {walletTokens.slice(0, 4).map((token) => {
                  const song = mintToSong[token.mint];
                  const balance = token.amount;
                  const price = mintPrices[token.mint] ?? null;
                  const usdValue = price != null ? price * balance : null;
                  const candles = mintCandles[token.mint] ?? [];
                  const pctChange = getPctChange(candles);
                  const internalQty = song ? (holdings[song.id]?.totalQuantity ?? 0) : 0;
                  const onChainRaw = Number(token.rawAmount);
                  const isPartiallyExternal = internalQty > 0 && onChainRaw > internalQty;
                  const isFullyExternal = internalQty === 0 && !!song;
                  const isSwappable = !!song || token.mint === USDC;

                  const isExpanded = expandedMint === token.mint;

                  return (
                    <motion.div
                      key={token.mint}
                      whileTap={{ scale: 0.98 }}
                      onClick={() =>
                        setExpandedMint((prev) => (prev === token.mint ? null : token.mint))
                      }
                      className="rounded-[28px] px-5 pt-4 pb-2 flex flex-col cursor-pointer transition-transform hover:scale-[1.01]"
                      style={{
                        background: '#0f130f',
                        border: '1px solid rgba(255,255,255,0.08)',
                        backdropFilter: 'blur(22px)',
                      }}
                    >
                      {/* Row content */}
                      <div className="flex items-center justify-between gap-3 w-full">
                        {/* Left: Icon + Info */}
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                            style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                          >
                            {song?.teaserImageUrl ? (
                              <img src={song.teaserImageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Coins size={20} className="text-[#555]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-bold text-white truncate">
                                {song?.name ?? 'Unknown Token'}
                              </div>
                              {isPartiallyExternal && (
                                <span
                                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
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
                                  className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
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
                            <div className="text-xs text-[#8f8f8f] truncate">
                              {song?.symbol ?? truncateAddress(token.mint)} · {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                            </div>
                          </div>
                        </div>

                        {/* Center: Sparkline + %change */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <MiniSparkline candles={candles} width={50} height={20} />
                          {pctChange !== null && (
                            <span
                              className="text-[10px] font-bold"
                              style={{
                                fontFamily: orbitronFont,
                                color: pctChange >= 0 ? '#00FF41' : '#ef4444',
                              }}
                            >
                              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                            </span>
                          )}
                        </div>

                        {/* Right: Balance + USD + Swap */}
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 min-w-[80px]">
                          <div
                            className="font-bold"
                            style={{
                              fontFamily: orbitronFont,
                              fontSize: '0.95rem',
                              color: HEADLINE_GREEN,
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {balance.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                          </div>
                          <div className="text-xs text-white font-medium">
                            {usdValue != null ? formatCurrency(usdValue) : '—'}
                          </div>
                          {isSwappable && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSwapFromMint(token.mint);
                                setShowSwap(true);
                              }}
                              className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all active:scale-95"
                              style={{ borderColor: PRIMARY_GREEN, color: PRIMARY_GREEN }}
                            >
                              Swap
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inline action picker */}
                      <AnimatePresence>
                        {isExpanded && (
                          <TokenActionStrip
                            isSong={!!song}
                            onTrade={() => {
                              if (song) navigate(`/song/${song.id}`);
                            }}
                            onSwap={() => {
                              setSwapFromMint(token.mint);
                              setShowSwap(true);
                            }}
                            onViewPage={() => {
                              if (song) {
                                navigate(`/song/${song.id}`);
                              } else {
                                navigator.clipboard.writeText(token.mint).catch(() => {});
                                toast.success('Mint address copied');
                              }
                            }}
                          />
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Portfolio History Chart ── */}
          <PortfolioChart snapshots={snapshots} />
        </div>
      </div>

      {/* ── Modals ── */}
      {receiveOpen && <ReceiveModal address={walletAddress} onClose={() => setReceiveOpen(false)} />}
      {sendOpen && (
        <SendSolModal
          walletAddress={walletAddress}
          solBalance={solBalance}
          solPriceUsd={solPriceUsd}
          onClose={() => setSendOpen(false)}
        />
      )}
      {onrampOpen && (
        <OnrampModal
          open={onrampOpen}
          onClose={() => setOnrampOpen(false)}
          onReceive={() => setReceiveOpen(true)}
          onSwap={() => setShowSwap(true)}
          onConnectWallet={login}
          walletAddress={walletAddress}
        />
      )}
      {showSwap && (
        <SwapBottomSheet
          open={showSwap}
          onClose={() => {
            setShowSwap(false);
            setSwapFromMint(undefined);
          }}
          defaultInputMint={swapFromMint}
        />
      )}
      <TokenListSheet
        open={tokenListOpen}
        onClose={() => setTokenListOpen(false)}
        walletTokens={walletTokens}
        mintToSong={mintToSong}
        mintPrices={mintPrices}
        mintCandles={mintCandles}
        holdings={holdings}
        externalHoldings={externalHoldings}
        solBalance={solBalance}
        solPriceUsd={solPriceUsd}
        onOpenSwap={(mint) => {
          setSwapFromMint(mint);
          setShowSwap(true);
        }}
      />
    </div>
  );
}
