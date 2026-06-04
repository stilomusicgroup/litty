import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music2, Disc3, Heart, Play, ShoppingBag, Wallet, ListPlus,
  ChevronDown, ChevronUp, Send, ArrowDownLeft, Plus, Repeat,
  TrendingUp, TrendingDown, BarChart3, PieChart, Activity,
  Coins, Eye, User, Clock, ChevronRight, Menu, X,
  Pause, SkipForward, SkipBack, Zap, Globe,
  Sparkles, Target, ArrowUpRight, ArrowDownRight, Layers,
  Check, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs, runGetTokenBalanceQueryForSongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribeManyNftMints } from '@/lib/collections/nftMints';
import type { NftMintsResponse } from '@/lib/collections/nftMints';
import FanTierBadge, { calculateTier } from '@/components/FanTierBadge';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import { useWishlist } from '@/hooks/useWishlist';
import { usePlayer } from '@/contexts/PlayerContext';
import { isSeedSong } from '@/utils/songFilters';
import { useSolPrice } from '@/hooks/useJupiterPrice';
import { TAROBASE_CONFIG } from '@/lib/config';
import { api } from '@/lib/api-client';
import '@/styles/neon.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const C_GREEN = '#00FF41';
const C_RED = '#FF2D2D';
const C_BG = '#000000';
const C_CARD = '#0a0a0a';
const C_TEXT = '#ffffff';
const C_MUTED = '#666666';
const C_BORDER = 'rgba(0, 255, 65, 0.12)';
const C_BORDER_HOVER = 'rgba(0, 255, 65, 0.35)';
const C_DIVIDER = 'rgba(255,255,255,0.04)';
const C_SOL_PURPLE = '#9945FF';
const C_USDC_BLUE = '#2775CA';

const SOL_MINT = 'So11111111111111111111111111111111111111112';

// ─── Types ───────────────────────────────────────────────────────────────────

interface OwnedTrackItem {
  song: SongsResponse;
  details: SongDetailsResponse | null;
  splBalance: number;
  nftCount: number;
  mintAddress: string;
}

interface ActivityItem {
  type: 'buy' | 'sell' | 'send' | 'receive' | 'unknown';
  tokenName: string;
  tokenSymbol: string;
  description: string;
  amount: string;
  amountColor: string;
  timeAgo: string;
  signature: string;
  isPositive: boolean;
}

type DashboardTab = 'overview' | 'assets' | 'tokens' | 'activity' | 'stake';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function abbreviateAddress(addr: string): string {
  if (!addr || addr.length < 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatUSD(value: number): string {
  if (value >= 1000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(6)}`;
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// ─── SVG Chart Components ────────────────────────────────────────────────────

const DonutChart: React.FC<{
  segments: { label: string; value: number; color: string }[];
  centerLabel: string;
  centerValue: string;
  size?: number;
  innerRadius?: number;
}> = ({ segments, centerLabel, centerValue, size = 120, innerRadius = 42 }) => {
  const total = segments.reduce((s, seg) => s + Math.max(seg.value, 0), 0);
  const outerRadius = size / 2 - 4;
  const center = size / 2;

  if (total === 0) {
    return (
      <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PieChart size={24} style={{ color: C_MUTED, opacity: 0.3 }} />
      </div>
    );
  }

  const paths: { d: string; color: string }[] = [];
  let currentAngle = -Math.PI / 2;

  segments.forEach((seg) => {
    if (seg.value <= 0) return;
    const angle = (seg.value / total) * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    const largeArc = angle > Math.PI ? 1 : 0;

    const x1s = center + outerRadius * Math.cos(startAngle);
    const y1s = center + outerRadius * Math.sin(startAngle);
    const x1e = center + innerRadius * Math.cos(startAngle);
    const y1e = center + innerRadius * Math.sin(startAngle);
    const x2s = center + outerRadius * Math.cos(endAngle);
    const y2s = center + outerRadius * Math.sin(endAngle);
    const x2e = center + innerRadius * Math.cos(endAngle);
    const y2e = center + innerRadius * Math.sin(endAngle);

    const d = `M ${x1s} ${y1s} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2s} ${y2s} L ${x2e} ${y2e} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1e} ${y1e} Z`;
    paths.push({ d, color: seg.color });
    currentAngle = endAngle;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity={0.85}>
          <animate attributeName="opacity" from="0.3" to="0.85" dur="0.6s" fill="freeze" />
        </path>
      ))}
      <text x={center} y={center - 6} textAnchor="middle" fill={C_MUTED} fontSize="7" fontFamily="'Archivo Black', sans-serif" fontWeight="700">
        {centerLabel}
      </text>
      <text x={center} y={center + 10} textAnchor="middle" fill={C_TEXT} fontSize="9" fontWeight="800" fontFamily="'Archivo Black', sans-serif">
        {centerValue}
      </text>
    </svg>
  );
};

const LineChart: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showGrid?: boolean;
}> = ({ data, width = 500, height = 140, color = C_GREEN, showGrid = true }) => {
  if (data.length < 2) {
    return (
      <div style={{ width: '100%', height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <BarChart3 size={28} style={{ color: C_MUTED, opacity: 0.2 }} />
      </div>
    );
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = { top: 12, right: 12, bottom: 12, left: 12 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((v - min) / range) * chartH,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;
  const isUp = data[data.length - 1] >= data[0];
  const lineColor = isUp ? color : C_RED;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {showGrid && (
        <>
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = padding.top + chartH * (1 - pct);
            return (
              <line key={pct} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
            );
          })}
        </>
      )}
      <defs>
        <linearGradient id="lc-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#lc-grad)" />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={lineColor}>
        <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

const Sparkline: React.FC<{ data: number[]; color?: string; width?: number; height?: number }> = ({
  data, color = C_GREEN, width = 64, height = 24,
}) => {
  if (data.length < 2) return <div style={{ width, height }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 2) - 1}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
};

// ─── Multi-token price hook ──────────────────────────────────────────────────

interface TokenPriceEntry {
  price: number | null;
  change24h: number | null;
  isPositive: boolean;
  history: number[];
}

function useMultiTokenPrices(mintAddresses: string[], enabled: boolean): Record<string, TokenPriceEntry> {
  const [prices, setPrices] = useState<Record<string, TokenPriceEntry>>({});
  const prevMintsRef = useRef<string>('');

  useEffect(() => {
    if (!enabled || mintAddresses.length === 0) return;
    const mintsKey = mintAddresses.join(',');
    if (mintsKey === prevMintsRef.current) return;
    prevMintsRef.current = mintsKey;

    let cancelled = false;
    const firstPrices = new Map<string, number>();

    const poll = async () => {
      try {
        const results = await Promise.all(
          mintAddresses.map(async (mint) => {
            try {
              const data = await api.get<{ priceUsd: number | null; source: string | null }>(
                `/api/token-price?mint=${encodeURIComponent(mint)}`
              );
              return { mint, price: data?.priceUsd ?? null };
            } catch {
              return { mint, price: null };
            }
          })
        );
        if (cancelled) return;

        setPrices((prev) => {
          const next = { ...prev };
          results.forEach(({ mint, price }) => {
            if (price == null) {
              if (!next[mint]) next[mint] = { price: null, change24h: null, isPositive: true, history: prev[mint]?.history ?? [] };
              return;
            }
            if (!firstPrices.has(mint)) firstPrices.set(mint, price);
            const first = firstPrices.get(mint) ?? price;
            const change = first > 0 ? ((price - first) / first) * 100 : null;
            const prevHistory = prev[mint]?.history ?? [];
            const history = [...prevHistory, price].slice(-30);
            next[mint] = {
              price,
              change24h: change,
              isPositive: price >= first,
              history,
            };
          });
          return next;
        });
      } catch {
        // silent
      }
    };

    poll();
    const timer = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [mintAddresses.join(','), enabled]);

  // Initialize empty entries on mount
  useEffect(() => {
    if (!enabled) return;
    setPrices((prev) => {
      const next = { ...prev };
      mintAddresses.forEach((mint) => {
        if (!next[mint]) next[mint] = { price: null, change24h: null, isPositive: true, history: [] };
      });
      return next;
    });
  }, [mintAddresses.join(','), enabled]);

  return prices;
}

// ─── SOL balance hook with connection ────────────────────────────────────────

function useSolBalancePolling(walletAddress: string | null) {
  const [solBalance, setSolBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!walletAddress || !TAROBASE_CONFIG.rpcUrl) return;
    let cancelled = false;

    const rpcUrl = TAROBASE_CONFIG.rpcUrl;
    const fetchBalance = async () => {
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [walletAddress] }),
        });
        const data = await res.json();
        if (!cancelled && data?.result?.value != null) {
          setSolBalance(data.result.value / 1_000_000_000);
        }
      } catch { /* ignore */ }
    };

    fetchBalance();
    const timer = setInterval(fetchBalance, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [walletAddress]);

  return solBalance;
}

// ─── Activity feed hook ──────────────────────────────────────────────────────

function useBlockchainActivity(
  walletAddress: string | null,
  songsMap: Record<string, SongsResponse>,
  enabled: boolean
): ActivityItem[] {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    if (!walletAddress || !enabled || !TAROBASE_CONFIG.rpcUrl) return;
    let cancelled = false;

    const rpcUrl = TAROBASE_CONFIG.rpcUrl;
    const fetchActivities = async () => {
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1,
            method: 'getSignaturesForAddress',
            params: [walletAddress, { limit: 20 }],
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        const signatures = data?.result ?? [];

        const results: ActivityItem[] = [];

        // Fetch transaction details in batches
        for (const sig of signatures.slice(0, 15)) {
          const txRes = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: 1,
              method: 'getTransaction',
              params: [sig.signature, { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed' }],
            }),
          });
          const txData = await txRes.json();
          const tx = txData?.result;
          if (!tx) continue;

          const blockTime = tx.blockTime ?? 0;
          const meta = tx.meta;
          if (!meta) continue;

          // Check for token transfers in innerInstructions
          const innerInstructions = meta.innerInstructions ?? [];
          let foundTokenTransfer = false;

          for (const ixGroup of innerInstructions) {
            for (const ix of ixGroup.instructions) {
              if (ix.program === 'spl-token' && ix.parsed?.type === 'transfer') {
                const parsed = ix.parsed;
                const info = parsed.info;
                if (info.destination === walletAddress || info.source === walletAddress) {
                  const isReceive = info.destination === walletAddress;
                  const mintAddr = info.mint ?? '';
                  const amount = info.tokenAmount?.uiAmount ?? 0;
                  const decimals = info.tokenAmount?.decimals ?? 0;

                  // Cross-reference mint with songs
                  let tokenName = 'SPL Token';
                  let tokenSymbol = 'TOKEN';
                  Object.values(songsMap).forEach((song) => {
                    if (song.mintAddress === mintAddr) {
                      tokenName = song.name;
                      tokenSymbol = song.symbol ?? tokenName.slice(0, 6).toUpperCase();
                    }
                  });

                  results.push({
                    type: isReceive ? 'receive' : 'send',
                    tokenName,
                    tokenSymbol,
                    description: `${isReceive ? 'Received' : 'Sent'} ${amount.toFixed(decimals > 0 ? Math.min(decimals, 2) : 0)} $${tokenSymbol}`,
                    amount: `${isReceive ? '+' : '-'}${amount.toFixed(decimals > 0 ? Math.min(decimals, 2) : 0)} ${tokenSymbol}`,
                    amountColor: isReceive ? C_GREEN : C_RED,
                    timeAgo: timeAgo(blockTime),
                    signature: sig.signature,
                    isPositive: isReceive,
                  });
                  foundTokenTransfer = true;
                  break;
                }
              }
            }
            if (foundTokenTransfer) break;
          }

          // Fallback: SOL transfer
          if (!foundTokenTransfer && meta.postBalance != null && meta.preBalance != null) {
            const diff = (meta.postBalance - meta.preBalance) / 1_000_000_000;
            if (Math.abs(diff) > 0.0001) {
              const isReceive = diff > 0;
              results.push({
                type: isReceive ? 'receive' : 'send',
                tokenName: 'SOL',
                tokenSymbol: 'SOL',
                description: `${isReceive ? 'Received' : 'Sent'} ${Math.abs(diff).toFixed(4)} SOL`,
                amount: `${isReceive ? '+' : '-'}${Math.abs(diff).toFixed(4)} SOL`,
                amountColor: isReceive ? C_GREEN : C_RED,
                timeAgo: timeAgo(blockTime),
                signature: sig.signature,
                isPositive: isReceive,
              });
            }
          }

          if (results.length >= 10) break;
        }

        if (!cancelled) setActivities(results);
      } catch { /* ignore */ }
    };

    fetchActivities();
  }, [walletAddress, enabled, songsMap]);

  return activities;
}

// ─── Connect Wallet State ─────────────────────────────────────────────────────

const ConnectWalletState: React.FC<{ login: () => void }> = ({ login }) => (
  <div style={{ minHeight: '100vh', background: C_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
      <div
        style={{
          width: 80, height: 80, borderRadius: 20,
          background: 'rgba(0, 255, 65, 0.06)',
          border: '1px solid rgba(0, 255, 65, 0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}
      >
        <Wallet size={36} style={{ color: `${C_GREEN}80` }} />
      </div>
      <h2 style={{
        fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 12, textAlign: 'center',
        fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Connect Your Wallet
      </h2>
      <p style={{ fontSize: 13, color: C_MUTED, marginBottom: 28, maxWidth: 300, lineHeight: 1.6, fontFamily: "'Inter', sans-serif", textAlign: 'center' }}>
        Sign in to see your owned tracks and collection dashboard.
      </p>
      <button onClick={login} style={{
        borderRadius: 14, cursor: 'pointer', padding: '12px 36px', display: 'block', margin: '0 auto',
        background: C_GREEN, color: '#000', border: 'none', fontWeight: 900,
        fontFamily: "'Archivo Black', sans-serif", fontSize: 11, letterSpacing: '0.1em',
      }}>
        Sign In
      </button>
    </motion.div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CollectionPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;

  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [playlistTarget, setPlaylistTarget] = useState<{ songId: string; title: string; artist?: string; coverImage?: string } | null>(null);
  const [showWishlist, setShowWishlist] = useState(false);
  const [chartTimeframe, setChartTimeframe] = useState<string>('24H');

  const { wishlist, toggleWishlist } = useWishlist();
  const { playSong, currentSong, isPlaying, togglePlay, skipNext, skipPrev } = usePlayer();
  const { price: solPrice, priceStr: solPriceStr } = useSolPrice();

  // Real SOL balance with 30s polling
  const solBalance = useSolBalancePolling(walletAddress);

  // Data subscriptions
  const { data: allSongs } = useRealtimeData<SongsResponse[]>(subscribeManySongs, true);
  const { data: allDetails } = useRealtimeData<SongDetailsResponse[]>(subscribeManySongDetails, true);
  const { data: allNftMints } = useRealtimeData<NftMintsResponse[]>(subscribeManyNftMints, true);

  const songsMap = useMemo(() => {
    const map: Record<string, SongsResponse> = {};
    (allSongs ?? []).filter(s => !isSeedSong(s as any)).forEach(s => { map[s.id] = s; });
    return map;
  }, [allSongs]);

  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    (allDetails ?? []).filter(d => !isSeedSong(d as any)).forEach(d => { map[d.id] = d; });
    return map;
  }, [allDetails]);

  const userNftsBySong = useMemo(() => {
    const map: Record<string, NftMintsResponse[]> = {};
    if (!walletAddress) return map;
    (allNftMints ?? [])
      .filter(n => n.owner === walletAddress)
      .forEach(n => {
        if (!map[n.songId]) map[n.songId] = [];
        map[n.songId].push(n);
      });
    return map;
  }, [allNftMints, walletAddress]);

  const allSongsList = useMemo(() => (allSongs ?? []).filter(s => !isSeedSong(s as any)), [allSongs]);
  const songIdsKey = useMemo(() => allSongsList.map(s => s.id).join(','), [allSongsList]);
  const collectionsReady = !!allSongs && !!allDetails && !!allNftMints;

  // Token balances query
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [balancesLoading, setBalancesLoading] = useState(true);
  const songsRef = useRef(allSongsList);
  useEffect(() => { songsRef.current = allSongsList; }, [allSongsList]);

  const fetchAllBalances = useCallback(async () => {
    const current = songsRef.current;
    if (!walletAddress || !isAuthenticated || current.length === 0) {
      setBalancesLoading(false);
      return;
    }
    const results: Record<string, number> = {};
    await Promise.allSettled(
      current.map(async (song) => {
        try {
          const bal = await runGetTokenBalanceQueryForSongs(song.id, { walletAddress });
          results[song.id] = bal ?? 0;
        } catch {
          results[song.id] = 0;
        }
      })
    );
    setBalances(results);
    setBalancesLoading(false);
  }, [songIdsKey, walletAddress, isAuthenticated]);

  useEffect(() => { fetchAllBalances(); }, [fetchAllBalances]);

  // Compute owned tracks - filter by mintAddress, skip songs without one
  const ownedTracks = useMemo<OwnedTrackItem[]>(() => {
    if (!walletAddress || !collectionsReady) return [];
    const songIds = new Set<string>();
    Object.entries(balances).forEach(([id, bal]) => { if (bal > 0) songIds.add(id); });
    Object.keys(userNftsBySong).forEach(id => songIds.add(id));

    return Array.from(songIds)
      .map(songId => {
        const song = allSongsList.find(s => s.id === songId);
        if (!song) return null;
        if (!song.mintAddress) {
          console.warn(`[CollectionPage] Song ${songId} has no mintAddress, skipping`);
          return null;
        }
        return {
          song,
          details: detailsMap[songId] ?? null,
          splBalance: balances[songId] ?? 0,
          nftCount: (userNftsBySong[songId] ?? []).length,
          mintAddress: song.mintAddress,
        } as OwnedTrackItem;
      })
      .filter((x): x is OwnedTrackItem => x !== null)
      .sort((a, b) => b.splBalance - a.splBalance);
  }, [balances, userNftsBySong, allSongsList, detailsMap, walletAddress, collectionsReady]);

  // Multi-token price hook for all owned tracks
  const ownedMintAddresses = useMemo(() => {
    const mints = ownedTracks.map(t => t.mintAddress);
    // Also include SOL mint for consistency
    if (!mints.includes(SOL_MINT)) mints.push(SOL_MINT);
    return mints;
  }, [ownedTracks]);

  const tokenPrices = useMultiTokenPrices(
    ownedMintAddresses,
    isAuthenticated && ownedMintAddresses.length > 0
  );

  // Real portfolio total: sum of (splBalance * tokenPriceUsd) + solBalance * solPriceUsd
  const solUsdValue = (solBalance ?? 0) * (solPrice ?? 0);

  const tokenUsdValue = useMemo(() => {
    return ownedTracks.reduce((sum, t) => {
      const priceEntry = tokenPrices[t.mintAddress];
      const price = priceEntry?.price ?? 0;
      return sum + t.splBalance * price;
    }, 0);
  }, [ownedTracks, tokenPrices]);

  const totalPortfolioUsd = solUsdValue + tokenUsdValue;

  // Real asset allocation
  const allocationSegments = useMemo(() => {
    const total = totalPortfolioUsd || 1;
    const musicPct = (tokenUsdValue / total) * 100;
    const solPct = (solUsdValue / total) * 100;
    return [
      { label: 'Music Tokens', value: musicPct, color: C_GREEN },
      { label: 'SOL', value: solPct, color: C_SOL_PURPLE },
      { label: 'USDC', value: 0, color: C_USDC_BLUE },
      { label: 'Other', value: 0, color: '#6B7280' },
    ];
  }, [solUsdValue, tokenUsdValue, totalPortfolioUsd]);

  // Portfolio history from accumulated token prices
  const portfolioHistory = useMemo(() => {
    if (ownedTracks.length === 0) return [];
    // Build history from accumulated price data of owned tokens
    const maxLength = Math.max(...ownedTracks.map(t => tokenPrices[t.mintAddress]?.history.length ?? 0));
    if (maxLength < 2) return [];

    const data: number[] = [];
    for (let i = 0; i < maxLength; i++) {
      let val = 0;
      ownedTracks.forEach(t => {
        const hist = tokenPrices[t.mintAddress]?.history ?? [];
        if (hist[i] != null) val += t.splBalance * hist[i];
      });
      // Add SOL value (constant for simplicity since we don't have SOL history in this hook)
      val += (solBalance ?? 0) * (solPrice ?? 0);
      data.push(val);
    }
    // If only one point, duplicate
    if (data.length === 1) data.push(data[0]);
    return data;
  }, [ownedTracks, tokenPrices, solBalance, solPrice]);

  // Real blockchain activity feed
  const blockchainActivities = useBlockchainActivity(
    walletAddress,
    songsMap,
    isAuthenticated && collectionsReady
  );

  const isLoading = !collectionsReady || balancesLoading;

  const handlePlayTrack = useCallback((item: OwnedTrackItem) => {
    const details = item.details;
    const audioUrl = details?.audioUrl || details?.audiusStreamUrl || item.song.audiusStreamUrl;
    if (!audioUrl) return;
    playSong({
      songId: item.song.id, title: details?.title ?? item.song.name,
      artist: details?.artist ?? 'Unknown', coverImage: details?.coverImage,
      audioUrl, audiusStreamUrl: details?.audiusStreamUrl ?? item.song.audiusStreamUrl,
      duration: details?.duration, symbol: item.song.symbol,
    });
  }, [playSong]);

  const handleOpenAddToPlaylist = useCallback((item: OwnedTrackItem) => {
    const title = item.details?.title ?? item.song.name;
    setPlaylistTarget({ songId: item.song.id, title, artist: item.details?.artist, coverImage: item.details?.coverImage });
  }, []);

  // ─── Tab config ──────────────────────────────────────────────────────────
  const tabs: { key: DashboardTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'assets', label: 'Assets' },
    { key: 'tokens', label: 'Tokens' },
    { key: 'activity', label: 'Activity' },
    { key: 'stake', label: 'Stake' },
  ];

  const activities = blockchainActivities.length > 0 ? blockchainActivities : [];
  const usdcBalance = 0;
  const usdcUsdValue = usdcBalance;

  const totalReturnUsd = ownedTracks.reduce((sum, t) => {
    const p = tokenPrices[t.mintAddress];
    if (p?.change24h != null && p.price != null) {
      return sum + t.splBalance * p.price * (p.change24h / 100);
    }
    return sum;
  }, 0);

  const totalReturnPct = totalPortfolioUsd > 0 ? (totalReturnUsd / (totalPortfolioUsd - totalReturnUsd)) * 100 : 0;

  // ─── Unauthenticated ──────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <ConnectWalletState login={login} />;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        .cp-page { background: ${C_BG}; min-height: 100vh; font-family: 'Inter', sans-serif; color: ${C_TEXT}; }
        .cp-scroll { overflow-y: auto; }
        .cp-scroll::-webkit-scrollbar { width: 0; height: 0; }

        .cp-tab-btn {
          font-family: 'Archivo Black', sans-serif;
          font-size: 11px;
          transition: all 0.2s ease;
          cursor: pointer;
          white-space: nowrap;
        }
        .cp-tab-active {
          background: rgba(0, 255, 65, 0.1);
          border: 1px solid rgba(0, 255, 65, 0.3) !important;
          color: ${C_GREEN} !important;
          font-weight: 700;
        }
        .cp-tab-inactive {
          background: transparent;
          border: 1px solid transparent;
          color: #444;
        }

        .cp-card {
          background: ${C_CARD};
          border: 1px solid ${C_BORDER};
          border-radius: 12px;
        }

        .cp-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .cp-section-title {
          font-family: 'Archivo Black', sans-serif;
          font-size: 10px;
          font-weight: 800;
          color: ${C_GREEN};
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .cp-view-all {
          font-family: 'Archivo Black', sans-serif;
          font-size: 11px;
          font-weight: 700;
          color: ${C_GREEN};
          background: none;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .cp-activity-row {
          display: flex;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid ${C_DIVIDER};
          height: 52px;
        }
        .cp-position-row {
          display: flex;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid ${C_DIVIDER};
          transition: background 0.15s ease;
        }
        .cp-position-row:hover { background: rgba(0, 255, 65, 0.03); }

        .cp-h-scroll {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 8px;
        }
        .cp-h-scroll::-webkit-scrollbar { height: 0; }

        .cp-asset-card {
          flex: 0 0 150px;
          background: ${C_CARD};
          border: 1px solid ${C_BORDER};
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .cp-asset-card:hover {
          transform: translateY(-2px);
          border-color: ${C_BORDER_HOVER};
          box-shadow: 0 4px 16px rgba(0, 255, 65, 0.1);
        }

        .cp-carousel-dot { transition: all 0.2s ease; }
        .cp-carousel-dot-active { width: 20px; height: 4px; border-radius: 2px; background: ${C_GREEN}; }
        .cp-carousel-dot-inactive { width: 4px; height: 4px; border-radius: 50%; background: #333; }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 4px rgba(0, 255, 65, 0.3), 0 0 12px rgba(0, 255, 65, 0.1); }
          50% { box-shadow: 0 0 8px rgba(0, 255, 65, 0.5), 0 0 24px rgba(0, 255, 65, 0.2); }
        }
        .glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }

        @keyframes coin-spin {
          0% { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .coin-spin { animation: coin-spin 3s linear infinite; }

        .cp-stake-banner {
          background: linear-gradient(135deg, rgba(0, 255, 65, 0.08), rgba(0,50,20,0.4));
          border: 1px solid rgba(0, 255, 65, 0.25);
          border-radius: 16px;
          padding: 16px;
        }

        @media (max-width: 768px) {
          .cp-desktop-only { display: none !important; }
        }
        @media (min-width: 769px) {
          .cp-mobile-only { display: none !important; }
        }
      `}</style>

      <div className="cp-page">
        
        <div className="cp-scroll" style={{ maxWidth: 480, margin: '0 auto', paddingTop: 56, paddingBottom: 80, paddingLeft: 16, paddingRight: 16 }}>

          {/* ─── TAB BAR ─── */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 0', overflowX: 'auto' }}>
            {tabs.map(({ key, label }) => (
              <button
                key={key}
                className={`cp-tab-btn ${activeTab === key ? 'cp-tab-active' : 'cp-tab-inactive'}`}
                onClick={() => handleTabChange(key)}
                style={{ padding: '6px 14px', borderRadius: 20 }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* OVERVIEW TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

                {/* SECTION 1 — PROFILE HEADER */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: '50%',
                    border: `2px solid ${C_GREEN}`,
                    background: 'rgba(0, 255, 65, 0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 24, flexShrink: 0,
                  }}>
                    {user ? (
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'rgba(0, 255, 65, 0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Archivo Black', sans-serif", fontSize: 14, fontWeight: 700, color: C_GREEN,
                      }}>
                        {abbreviateAddress(user.address).replace('...', '')}
                      </div>
                    ) : (
                      <span style={{ fontSize: 24 }}>\uD83D\uDEF8</span>
                    )}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        fontFamily: "'Archivo Black', sans-serif", fontSize: 18, fontWeight: 900,
                        color: C_TEXT,
                      }}>
                        {user?.address ? abbreviateAddress(user.address) : 'Collector'}
                      </span>
                      <div style={{
                        width: 14, height: 14, borderRadius: '50%',
                        background: C_GREEN,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Check size={9} fill="#000" style={{ color: '#000' }} />
                      </div>
                    </div>
                    <span style={{
                      fontFamily: "'Inter', sans-serif", fontSize: 12, color: C_MUTED,
                    }}>
                      @{abbreviateAddress(walletAddress ?? '')}
                    </span>
                  </div>
                </div>

                {/* SECTION 2 — STATS ROW */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
                  alignItems: 'center', marginBottom: 16,
                  background: C_CARD, border: `1px solid ${C_BORDER}`, borderRadius: 12, padding: '12px 0',
                }}>
                  <div style={{ textAlign: 'center', padding: '0 4px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 8, color: C_MUTED, letterSpacing: '0.15em', marginBottom: 4 }}>
                      PORTFOLIO VALUE
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, fontWeight: 900, color: C_TEXT }}>
                      {totalPortfolioUsd > 0 ? formatUSD(totalPortfolioUsd) : '$0.00'}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ textAlign: 'center', padding: '0 4px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 8, color: C_MUTED, letterSpacing: '0.15em', marginBottom: 4 }}>
                      TOTAL RETURN
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, fontWeight: 900, color: C_GREEN }}>
                      {totalReturnPct !== 0 ? `${totalReturnPct >= 0 ? '+' : ''}${totalReturnPct.toFixed(1)}%` : '+0.0%'}
                    </div>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.06)' }} />
                  <div style={{ textAlign: 'center', padding: '0 4px' }}>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 8, color: C_MUTED, letterSpacing: '0.15em', marginBottom: 4 }}>
                      UNREALIZED PNL
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 16, fontWeight: 900, color: C_GREEN }}>
                      {totalReturnUsd !== 0 ? `${totalReturnUsd >= 0 ? '+' : ''}${formatUSD(Math.abs(totalReturnUsd))}` : '+$0.00'}
                    </div>
                  </div>
                </div>

                {/* SECTION 3 — BALANCE CARDS */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {/* SOL Balance */}
                  <div className="cp-card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #9945FF, #14F195)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 10 }}>&#x25CE;</span>
                      </div>
                      <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 700, color: C_MUTED }}>SOL</span>
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, fontWeight: 900, color: C_TEXT }}>
                      {(solBalance ?? 0).toFixed(4)} SOL
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C_MUTED, marginTop: 2 }}>
                      {solPrice != null ? formatUSD(solUsdValue) : '—'}
                    </div>
                  </div>
                  {/* USDC Balance */}
                  <div className="cp-card" style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%',
                        background: C_USDC_BLUE,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>$</span>
                      </div>
                      <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 9, fontWeight: 700, color: C_MUTED }}>USDC</span>
                    </div>
                    <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, fontWeight: 900, color: C_TEXT }}>
                      {usdcBalance.toFixed(2)} USDC
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: C_MUTED, marginTop: 2 }}>
                      {formatUSD(usdcUsdValue)}
                    </div>
                  </div>
                </div>

                {/* SECTION 4 — SEND / RECEIVE / BUY */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  <button style={{
                    flex: 1, height: 40, borderRadius: 20,
                    background: C_CARD, border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    color: C_TEXT, fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                    <Send size={12} />
                    SEND
                  </button>
                  <button style={{
                    flex: 1, height: 40, borderRadius: 20,
                    background: C_CARD, border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    color: C_TEXT, fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 700,
                    cursor: 'pointer',
                  }}>
                    <ArrowDownLeft size={12} />
                    RECEIVE
                  </button>
                  <button style={{
                    flex: 1, height: 40, borderRadius: 20,
                    background: C_GREEN, border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    color: '#000', fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 900,
                    cursor: 'pointer',
                    boxShadow: '0 0 12px rgba(0, 255, 65, 0.4)',
                  }}>
                    BUY
                  </button>
                </div>

                {/* SECTION 5 — RECENT ACTIVITY */}
                <div style={{ marginBottom: 20 }}>
                  <div className="cp-section-header">
                    <span className="cp-section-title">RECENT ACTIVITY</span>
                    <button className="cp-view-all" onClick={() => handleTabChange('activity')}>
                      VIEW ALL <ChevronRight size={12} />
                    </button>
                  </div>
                  {isLoading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: C_MUTED, fontFamily: "'Inter', sans-serif", fontSize: 12 }}>
                      Loading activity...
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="cp-card" style={{ padding: 24, textAlign: 'center' }}>
                      <Activity size={20} style={{ color: `${C_GREEN}33`, marginBottom: 8 }} />
                      <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 700, color: C_MUTED }}>
                        No activity yet
                      </p>
                    </div>
                  ) : (
                    activities.slice(0, 5).map((act, i) => (
                      <a
                        key={`${act.signature}-${i}`}
                        href={`https://solscan.io/tx/${act.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <div className="cp-activity-row">
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: act.isPositive ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,45,45,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginRight: 12,
                          }}>
                            {act.isPositive ? (
                              <ArrowDownLeft size={14} style={{ color: C_GREEN }} />
                            ) : (
                              <ArrowUpRight size={14} style={{ color: C_RED }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, fontWeight: 700, color: C_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {act.tokenName}
                            </p>
                            <p style={{ fontSize: 11, color: C_MUTED }}>{act.description}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, fontWeight: 700, color: act.amountColor }}>
                              {act.amount}
                            </p>
                            <p style={{ fontSize: 10, color: C_MUTED }}>{act.timeAgo}</p>
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>

                {/* SECTION 6 — STAKE BANNER */}
                <div className="cp-stake-banner glow-pulse" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 800, color: C_GREEN, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                        STAKE YOUR MUSIC TOKENS
                      </div>
                      <div style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 22, fontWeight: 900, color: C_TEXT, lineHeight: 1, marginBottom: 6 }}>
                        EARN REWARDS
                      </div>
                      <p style={{ fontSize: 12, color: C_MUTED, fontFamily: "'Inter', sans-serif", marginBottom: 12 }}>
                        Stake eligible tokens and earn up to 24.8% APY
                      </p>
                      <button onClick={() => handleTabChange('stake')} style={{
                        background: C_GREEN, color: '#000', border: 'none', borderRadius: 20,
                        padding: '8px 24px', fontSize: 11, fontWeight: 900,
                        fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.1em',
                        cursor: 'pointer', width: '100%',
                      }}>
                        STAKE NOW
                      </button>
                    </div>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%',
                      background: 'rgba(0, 255, 65, 0.15)',
                      border: `1px solid ${C_GREEN}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <div className="coin-spin">
                        <Zap size={22} style={{ color: C_GREEN }} fill={C_GREEN} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 7 — PORTFOLIO PERFORMANCE CHART */}
                <div className="cp-card" style={{ padding: 14, marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span className="cp-section-title" style={{ marginBottom: 0 }}>PORTFOLIO PERFORMANCE</span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['24H', '7D', '30D', 'ALL'].map(tf => (
                        <button key={tf} onClick={() => setChartTimeframe(tf)} style={{
                          padding: '4px 8px', borderRadius: 6, fontSize: 9,
                          fontFamily: "'Archivo Black', sans-serif", fontWeight: 700,
                          background: chartTimeframe === tf ? 'rgba(0, 255, 65, 0.15)' : 'transparent',
                          border: `1px solid ${chartTimeframe === tf ? 'rgba(0, 255, 65, 0.3)' : 'transparent'}`,
                          color: chartTimeframe === tf ? C_GREEN : C_MUTED,
                          cursor: 'pointer', transition: 'all 0.15s ease',
                        }}>
                          {tf}
                        </button>
                      ))}
                    </div>
                  </div>
                  <LineChart data={portfolioHistory} width={500} height={120} />
                </div>

                {/* SECTION 8 — ASSET ALLOCATION DONUT */}
                <div className="cp-card" style={{ padding: 14, marginBottom: 20 }}>
                  <span className="cp-section-title" style={{ display: 'block', marginBottom: 12 }}>ASSET ALLOCATION</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <DonutChart
                      segments={allocationSegments}
                      centerLabel="Total Assets"
                      centerValue={totalPortfolioUsd > 0 ? formatUSD(totalPortfolioUsd) : '$0.00'}
                      size={120}
                      innerRadius={42}
                    />
                    <div style={{ flex: 1 }}>
                      {allocationSegments.map(seg => {
                        if (seg.value <= 0 && seg.label !== 'Music Tokens' && seg.label !== 'SOL') return null;
                        return (
                          <div key={seg.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
                              <span style={{ fontSize: 12, color: C_MUTED, fontFamily: "'Inter', sans-serif" }}>{seg.label}</span>
                            </div>
                            <span style={{ fontSize: 11, color: C_MUTED, fontFamily: "'Archivo Black', sans-serif" }}>
                              {seg.value.toFixed(1)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 9 — YOUR MUSIC ASSETS (horizontal scroll) */}
                <div style={{ marginBottom: 20 }}>
                  <div className="cp-section-header">
                    <span className="cp-section-title">YOUR MUSIC ASSETS</span>
                    <button className="cp-view-all" onClick={() => handleTabChange('assets')}>
                      VIEW ALL <ChevronRight size={12} />
                    </button>
                  </div>
                  {isLoading ? (
                    <div style={{ padding: 24, textAlign: 'center', color: C_MUTED, fontSize: 12 }}>Loading...</div>
                  ) : ownedTracks.length === 0 ? (
                    <div className="cp-card" style={{ padding: 32, textAlign: 'center' }}>
                      <Disc3 size={28} style={{ color: `${C_GREEN}33`, marginBottom: 12 }} />
                      <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, fontWeight: 800, color: C_TEXT, marginBottom: 8 }}>
                        No Music Assets Yet
                      </p>
                      <Link to="/" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: C_GREEN, color: '#000', border: 'none', borderRadius: 10,
                        padding: '8px 16px', fontSize: 10, fontWeight: 900,
                        fontFamily: "'Archivo Black', sans-serif", textDecoration: 'none',
                      }}>
                        <ShoppingBag size={12} /> BROWSE
                      </Link>
                    </div>
                  ) : (
                    <div className="cp-h-scroll">
                      {ownedTracks.slice(0, 8).map((item, i) => {
                        const title = item.details?.title ?? item.song.name;
                        const coverImage = item.details?.coverImage;
                        const priceEntry = tokenPrices[item.mintAddress];
                        const tokenPrice = priceEntry?.price ?? 0;
                        const usdValue = item.splBalance * tokenPrice;
                        const change24h = priceEntry?.change24h;
                        const changePositive = priceEntry?.isPositive ?? true;

                        return (
                          <motion.div
                            key={item.song.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="cp-asset-card"
                            onClick={() => navigate(`/song/${item.song.id}`)}
                          >
                            <div style={{ width: '100%', aspectRatio: '1', background: 'rgba(0, 255, 65, 0.04)', position: 'relative', overflow: 'hidden' }}>
                              {coverImage ? (
                                <img src={coverImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <Music2 size={24} style={{ color: `${C_GREEN}22` }} />
                                </div>
                              )}
                            </div>
                            <div style={{ padding: 10 }}>
                              <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 700, color: C_TEXT, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {title}
                              </p>
                              <p style={{ fontSize: 10, color: C_MUTED, marginBottom: 6 }}>
                                {item.song.symbol ?? item.song.name}
                              </p>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 11, fontWeight: 700, color: C_TEXT }}>
                                  {formatUSD(usdValue)}
                                </span>
                                {change24h != null && (
                                  <span style={{
                                    fontSize: 10, fontWeight: 700,
                                    color: changePositive ? C_GREEN : C_RED,
                                  }}>
                                    {changePositive ? '+' : ''}{change24h.toFixed(1)}%
                                  </span>
                                )}
                                {change24h == null && (
                                  <span style={{ fontSize: 10, color: C_MUTED }}>--</span>
                                )}
                              </div>
                              <p style={{ fontSize: 9, color: C_MUTED }}>
                                {item.splBalance.toFixed(1)} tokens
                              </p>
                              {usdValue > 0 && (
                                <p style={{ fontSize: 10, fontWeight: 700, color: C_TEXT, marginTop: 2 }}>
                                  {formatUSD(usdValue)}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SECTION 10 — TOKEN POSITIONS TABLE */}
                <div className="cp-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C_DIVIDER}` }}>
                    <div className="cp-section-header" style={{ marginBottom: 0 }}>
                      <span className="cp-section-title">TOKEN POSITIONS</span>
                      <button className="cp-view-all" onClick={() => handleTabChange('tokens')}>
                        VIEW ALL <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                  {ownedTracks.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: C_MUTED }}>
                      No token positions
                    </div>
                  ) : (
                    ownedTracks.slice(0, 5).map((item) => {
                      const title = item.details?.title ?? item.song.name;
                      const symbol = item.song.symbol ?? title.slice(0, 6).toUpperCase();
                      const priceEntry = tokenPrices[item.mintAddress];
                      const currentPrice = priceEntry?.price ?? 0;
                      const change24h = priceEntry?.change24h;
                      const changePositive = priceEntry?.isPositive ?? true;
                      const usdValue = item.splBalance * currentPrice;

                      return (
                        <div key={item.song.id} className="cp-position-row" style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: 'rgba(0, 255, 65, 0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Music2 size={16} style={{ color: C_GREEN }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, fontWeight: 700, color: C_TEXT }}>
                                ${symbol}
                              </p>
                              <p style={{ fontSize: 10, color: C_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {title.slice(0, 20)}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 11, color: C_MUTED, fontFamily: 'monospace' }}>
                              {item.splBalance.toFixed(1)}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, fontWeight: 700, color: C_TEXT }}>
                                {formatUSD(usdValue)}
                              </span>
                              {change24h != null && (
                                <span style={{
                                  fontSize: 10, fontWeight: 700,
                                  color: changePositive ? C_GREEN : C_RED,
                                }}>
                                  {changePositive ? '+' : ''}{change24h.toFixed(1)}%
                                </span>
                              )}
                              {change24h == null && (
                                <span style={{ fontSize: 10, color: C_MUTED }}>--</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ASSETS TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {activeTab === 'assets' && (
              <motion.div key="assets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <span className="cp-section-title" style={{ display: 'block', marginBottom: 14 }}>ALL MUSIC ASSETS</span>
                {isLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: C_MUTED, fontSize: 12 }}>Loading...</div>
                ) : ownedTracks.length === 0 ? (
                  <div className="cp-card" style={{ padding: 48, textAlign: 'center' }}>
                    <Disc3 size={36} style={{ color: `${C_GREEN}33`, marginBottom: 12 }} />
                    <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 14, fontWeight: 800, color: C_TEXT, marginBottom: 8 }}>No Music Assets</p>
                    <Link to="/" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: C_GREEN, color: '#000', border: 'none', borderRadius: 10,
                      padding: '8px 16px', fontSize: 10, fontWeight: 900,
                      fontFamily: "'Archivo Black', sans-serif", textDecoration: 'none',
                    }}>
                      <ShoppingBag size={12} /> BROWSE
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    {ownedTracks.map((item, i) => {
                      const title = item.details?.title ?? item.song.name;
                      const coverImage = item.details?.coverImage;
                      const tier = calculateTier(item.splBalance, item.nftCount);
                      const priceEntry = tokenPrices[item.mintAddress];
                      const usdValue = item.splBalance * (priceEntry?.price ?? 0);

                      return (
                        <motion.div key={item.song.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className="cp-card" style={{ cursor: 'pointer', overflow: 'hidden' }}
                          onClick={() => navigate(`/song/${item.song.id}`)}
                        >
                          <div style={{ position: 'relative', aspectRatio: '1', background: 'rgba(0, 255, 65, 0.04)' }}>
                            {coverImage ? (
                              <img src={coverImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Music2 size={32} style={{ color: `${C_GREEN}22` }} />
                              </div>
                            )}
                            <div style={{ position: 'absolute', bottom: 6, left: 6 }}>
                              <FanTierBadge tier={tier} size="sm" />
                            </div>
                          </div>
                          <div style={{ padding: 10 }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: C_TEXT, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 10, color: C_MUTED }}>{item.splBalance.toFixed(1)} tokens</span>
                              <span style={{ fontSize: 11, fontWeight: 800, color: C_TEXT }}>{formatUSD(usdValue)}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* TOKENS TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {activeTab === 'tokens' && (
              <motion.div key="tokens" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {/* Token summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'TOTAL TOKENS', value: ownedTracks.length, icon: Coins },
                    { label: 'NFT MINTS', value: ownedTracks.reduce((s, t) => s + t.nftCount, 0), icon: Disc3 },
                    { label: 'TOTAL VALUE', value: formatUSD(tokenUsdValue), icon: TrendingUp },
                  ].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="cp-card" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8, color: C_MUTED }}>
                        <Icon size={12} />
                        <span style={{ fontSize: 8, fontFamily: "'Archivo Black', sans-serif", fontWeight: 700, letterSpacing: '0.1em' }}>{label}</span>
                      </div>
                      <p style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, fontSize: 18, color: C_GREEN, margin: 0, lineHeight: 1 }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Full token positions table */}
                <div className="cp-card" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: `1px solid ${C_DIVIDER}` }}>
                    <span className="cp-section-title">ALL TOKEN POSITIONS</span>
                  </div>
                  {ownedTracks.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: C_MUTED }}>No token positions</div>
                  ) : (
                    ownedTracks.map((item) => {
                      const title = item.details?.title ?? item.song.name;
                      const symbol = item.song.symbol ?? title.slice(0, 6).toUpperCase();
                      const priceEntry = tokenPrices[item.mintAddress];
                      const currentPrice = priceEntry?.price ?? 0;
                      const change24h = priceEntry?.change24h;
                      const changePositive = priceEntry?.isPositive ?? true;
                      const usdValue = item.splBalance * currentPrice;

                      return (
                        <div key={item.song.id} className="cp-position-row" style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: 'rgba(0, 255, 65, 0.08)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0,
                            }}>
                              <Music2 size={16} style={{ color: C_GREEN }} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, fontWeight: 700, color: C_TEXT }}>
                                ${symbol}
                              </p>
                              <p style={{ fontSize: 10, color: C_MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {title.slice(0, 20)}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 11, color: C_MUTED, fontFamily: 'monospace' }}>
                              {item.splBalance.toFixed(1)}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                              <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, fontWeight: 700, color: C_TEXT }}>
                                {formatUSD(usdValue)}
                              </span>
                              {change24h != null && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: changePositive ? C_GREEN : C_RED }}>
                                  {changePositive ? '+' : ''}{change24h.toFixed(1)}%
                                </span>
                              )}
                              {change24h == null && (
                                <span style={{ fontSize: 10, color: C_MUTED }}>--</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ACTIVITY TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {activeTab === 'activity' && (
              <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <span className="cp-section-title" style={{ display: 'block', marginBottom: 14 }}>RECENT ACTIVITY</span>
                {isLoading ? (
                  <div style={{ padding: 24, textAlign: 'center', color: C_MUTED, fontSize: 12 }}>Loading activity...</div>
                ) : activities.length === 0 ? (
                  <div className="cp-card" style={{ padding: 32, textAlign: 'center' }}>
                    <Activity size={28} style={{ color: `${C_GREEN}33`, marginBottom: 12 }} />
                    <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, fontWeight: 700, color: C_MUTED, marginBottom: 8 }}>
                      No activity yet
                    </p>
                    <p style={{ fontSize: 12, color: C_MUTED }}>Transaction history will appear here.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    {activities.map((act, i) => (
                      <a
                        key={`${act.signature}-${i}`}
                        href={`https://solscan.io/tx/${act.signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', display: 'block' }}
                      >
                        <div className="cp-activity-row">
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: act.isPositive ? 'rgba(0, 255, 65, 0.12)' : 'rgba(255,45,45,0.12)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0, marginRight: 12,
                          }}>
                            {act.isPositive ? (
                              <ArrowDownLeft size={14} style={{ color: C_GREEN }} />
                            ) : (
                              <ArrowUpRight size={14} style={{ color: C_RED }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 13, fontWeight: 700, color: C_TEXT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {act.tokenName}
                            </p>
                            <p style={{ fontSize: 11, color: C_MUTED }}>{act.description}</p>
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                            <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 12, fontWeight: 700, color: act.amountColor }}>
                              {act.amount}
                            </p>
                            <p style={{ fontSize: 10, color: C_MUTED }}>{act.timeAgo}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* STAKE TAB */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <AnimatePresence mode="wait">
            {activeTab === 'stake' && (
              <motion.div key="stake" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                <span className="cp-section-title" style={{ display: 'block', marginBottom: 14 }}>STAKE & EARN</span>

                {/* Staking Hero */}
                <div className="cp-stake-banner glow-pulse" style={{ padding: 24, textAlign: 'center', marginBottom: 20 }}>
                  <Sparkles size={28} style={{ color: C_GREEN, marginBottom: 12 }} />
                  <h2 style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 18, fontWeight: 900, color: C_TEXT, marginBottom: 8 }}>
                    Stake Your Music Tokens
                  </h2>
                  <p style={{ fontSize: 12, color: C_MUTED, marginBottom: 16, maxWidth: 280, margin: '0 auto 16px' }}>
                    Earn rewards by staking your music tokens. Higher tier fans get boosted APY.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginBottom: 20 }}>
                    {[
                      { label: 'EST. APY', value: '18.5%' },
                      { label: 'STAKED', value: '0' },
                      { label: 'EARNED', value: '0' },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p style={{ fontSize: 8, color: C_MUTED, fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.1em', marginBottom: 4 }}>{label}</p>
                        <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 20, fontWeight: 900, color: C_GREEN, lineHeight: 1 }}>{value}</p>
                      </div>
                    ))}
                  </div>
                  <button style={{
                    background: C_GREEN, color: '#000', border: 'none', borderRadius: 12,
                    padding: '10px 32px', fontSize: 11, fontWeight: 900,
                    fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.1em',
                    cursor: 'pointer',
                    boxShadow: '0 0 16px rgba(0, 255, 65, 0.3)',
                  }}>
                    STAKE NOW
                  </button>
                </div>

                {/* Staking Tiers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {[
                    { tier: 'BRONZE', apy: '12%', min: '100', color: '#FFBF00' },
                    { tier: 'SILVER', apy: '15%', min: '500', color: '#C0C0C0' },
                    { tier: 'GOLD', apy: '18.5%', min: '1,000', color: '#FFD700' },
                    { tier: 'DIAMOND', apy: '25%', min: '5,000', color: '#a855f7' },
                  ].map(({ tier, apy, min, color }) => (
                    <div key={tier} className="cp-card" style={{ padding: 14, borderTop: `2px solid ${color}` }}>
                      <p style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: 10, fontWeight: 800, color, marginBottom: 6 }}>{tier}</p>
                      <p style={{ fontSize: 20, fontWeight: 900, color: C_TEXT, fontFamily: "'Archivo Black', sans-serif", lineHeight: 1 }}>{apy}</p>
                      <p style={{ fontSize: 9, color: C_MUTED, marginTop: 4 }}>APY</p>
                      <p style={{ fontSize: 10, color: C_MUTED, marginTop: 8 }}>Min: {min} tokens</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Playlist Modal */}
      {playlistTarget && (
        <AddToPlaylistModal
          songId={playlistTarget.songId} title={playlistTarget.title}
          artist={playlistTarget.artist} coverImage={playlistTarget.coverImage}
          isOpen={!!playlistTarget} onClose={() => setPlaylistTarget(null)}
        />
      )}
    </>
  );
};

export default CollectionPage;
