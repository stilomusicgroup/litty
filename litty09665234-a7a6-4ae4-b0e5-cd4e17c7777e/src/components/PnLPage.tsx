/**
 * PnLPage — Realized Profit & Loss dashboard for Lit Studio trades.
 *
 * Shows aggregate PnL across all tokens, per-token breakdowns, and a
 * chronological trade history. Integrates with userRealizedPnL collection.
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import {
  useUserPnL,
  useUserLots,
  type UserRealizedPnLEventsResponse,
} from '@/hooks/use-cost-basis';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs, type SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails, type SongDetailsResponse } from '@/lib/collections/songDetails';
import { TrendingUp, TrendingDown, ArrowLeft, ExternalLink, BarChart3, Activity } from 'lucide-react';
import RiskDisclaimerBanner from '@/components/RiskDisclaimerBanner';

// ── Design Tokens ────────────────────────────────────────────────────────────
const G = '#00FF66';
const BG = '#0A0A0A';
const SURF = '#0f130f';
const SURF2 = '#1A1A1A';
const BORDER = '#252525';
const T1 = '#FFFFFF';
const T2 = '#A3A3A3';
const T3 = '#555555';
const RED = '#ef4444';
const NEON_GREEN = '#00FF41';
const NEON_RED = '#FF3333';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatSOL(lamports: number): string {
  const sol = lamports / 1_000_000_000;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  if (sol >= 0.001) return `${sol.toFixed(4)} SOL`;
  return `${sol.toFixed(6)} SOL`;
}

function formatUSDC(micro: number): string {
  const usdc = micro / 1_000_000;
  return `$${usdc.toFixed(2)}`;
}

function formatProceeds(amount: number, currency: string): string {
  if (currency === 'SOL') return formatSOL(amount);
  if (currency === 'USDC') return formatUSDC(amount);
  return `${amount} ${currency}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: SURF,
        borderRadius: 12,
        border: `1px solid ${BORDER}`,
        padding: '16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span
          style={{
            fontSize: 8,
            color: T3,
            fontFamily: "'Archivo Black',sans-serif",
            letterSpacing: '0.15em',
          }}
        >
          {label}
        </span>
        <span style={{ color }}>{icon}</span>
      </div>
      <span
        style={{
          fontSize: 18,
          fontWeight: 900,
          color,
          fontFamily: "'Archivo Black',sans-serif",
          letterSpacing: '-0.5px',
          wordBreak: 'break-word',
        }}
      >
        {value}
      </span>
    </div>
  );
}

// ── Token Breakdown Row ──────────────────────────────────────────────────────
function TokenBreakdownRow({
  symbol,
  songName,
  totalPnL,
  count,
  avgPnL,
}: {
  symbol: string;
  songName: string;
  totalPnL: number;
  count: number;
  avgPnL: number;
}) {
  const isProfit = totalPnL >= 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        marginBottom: 6,
        background: SURF,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          flexShrink: 0,
          background: isProfit ? 'rgba(0,255,102,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isProfit ? 'rgba(0,255,102,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isProfit ? (
          <TrendingUp size={16} style={{ color: NEON_GREEN }} />
        ) : (
          <TrendingDown size={16} style={{ color: NEON_RED }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "'Archivo Black',sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: T1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {songName}
        </div>
        <div style={{ fontSize: 9, color: T3, fontFamily: 'monospace' }}>
          {symbol} &middot; {count} trade{count !== 1 ? 's' : ''}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: isProfit ? NEON_GREEN : NEON_RED,
            fontFamily: 'monospace',
          }}
        >
          {isProfit ? '+' : ''}
          {formatSOL(totalPnL)}
        </div>
        <div style={{ fontSize: 9, color: T3, fontFamily: 'monospace', marginTop: 2 }}>
          avg {isProfit ? '+' : ''}
          {formatSOL(avgPnL)}
        </div>
      </div>
    </div>
  );
}

// ── Trade History Row ────────────────────────────────────────────────────────
function TradeHistoryRow({
  event,
  songName,
}: {
  event: UserRealizedPnLEventsResponse;
  songName: string;
}) {
  const isProfit = event.realizedPnL >= 0;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '13px 14px',
        marginBottom: 6,
        background: SURF,
        borderRadius: 10,
        border: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: isProfit ? 'rgba(0,255,102,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${isProfit ? 'rgba(0,255,102,0.2)' : 'rgba(239,68,68,0.2)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {isProfit ? (
          <TrendingUp size={14} style={{ color: NEON_GREEN }} />
        ) : (
          <TrendingDown size={14} style={{ color: NEON_RED }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T1, marginBottom: 2 }}>
          {songName}{' '}
          <span style={{ color: isProfit ? NEON_GREEN : NEON_RED }}>
            {isProfit ? '+' : ''}
            {formatSOL(event.realizedPnL)}
          </span>
        </div>
        <div style={{ fontSize: 10, color: T3, fontFamily: 'monospace' }}>
          Sold {formatNumber(event.totalSoldQuantity)} tokens &middot; Cost {formatProceeds(event.totalCostBasis, event.currency)} &middot; Proceeds{' '}
          {formatProceeds(event.totalSaleProceeds, event.currency)}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: T2, fontFamily: 'monospace' }}>
          {formatDate(event.realizedAt)}
        </div>
        <div style={{ fontSize: 9, color: T3, marginTop: 2 }}>{formatTime(event.realizedAt)}</div>
        {event.txSignature && (
          <a
            href={`https://solscan.io/tx/${event.txSignature}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 2, marginTop: 4 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={10} style={{ color: G }} />
            <span style={{ fontSize: 8, color: G }}>TX</span>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function PnLPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;

  const { events, loading: eventsLoading } = useUserPnL(walletAddress ?? undefined);
  const { lots, loading: lotsLoading } = useUserLots(walletAddress ?? undefined);

  const { data: allSongs } = useRealtimeData<SongsResponse[]>(subscribeManySongs, true);
  const { data: allDetails } = useRealtimeData<SongDetailsResponse[]>(subscribeManySongDetails, true);

  const songsMap = useMemo(() => {
    const map: Record<string, SongsResponse> = {};
    if (allSongs) {
      for (const s of allSongs) map[s.id] = s;
    }
    return map;
  }, [allSongs]);

  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    if (allDetails) {
      for (const d of allDetails) map[d.id] = d;
    }
    return map;
  }, [allDetails]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalPnL = (events ?? []).reduce((sum, e) => sum + (e.realizedPnL ?? 0), 0);
    const count = (events ?? []).length;
    const best = count > 0 ? Math.max(...events.map((e) => e.realizedPnL)) : 0;
    const worst = count > 0 ? Math.min(...events.map((e) => e.realizedPnL)) : 0;
    return { totalPnL, count, best, worst };
  }, [events]);

  // Per-token breakdown
  const tokenBreakdown = useMemo(() => {
    const byToken: Record<
      string,
      { symbol: string; songName: string; totalPnL: number; count: number }
    > = {};
    for (const e of events ?? []) {
      const key = e.tokenMint;
      if (!byToken[key]) {
        const song = songsMap[e.songId];
        const details = detailsMap[e.songId];
        byToken[key] = {
          symbol: e.songSymbol ? `$${e.songSymbol}` : '$TOKEN',
          songName: details?.title ?? song?.name ?? e.songName ?? 'Unknown',
          totalPnL: 0,
          count: 0,
        };
      }
      byToken[key].totalPnL += e.realizedPnL;
      byToken[key].count += 1;
    }
    return Object.values(byToken).sort((a, b) => Math.abs(b.totalPnL) - Math.abs(a.totalPnL));
  }, [events, songsMap, detailsMap]);

  // Open lots summary
  const openLotsSummary = useMemo(() => {
    const byToken: Record<string, { symbol: string; songName: string; remaining: number; costBasis: number }> = {};
    for (const lot of lots ?? []) {
      if (lot.remainingQuantity <= 0) continue;
      const key = lot.tokenMint;
      if (!byToken[key]) {
        const song = songsMap[lot.songId];
        const details = detailsMap[lot.songId];
        byToken[key] = {
          symbol: lot.songSymbol ? `$${lot.songSymbol}` : '$TOKEN',
          songName: details?.title ?? song?.name ?? lot.songName ?? 'Unknown',
          remaining: 0,
          costBasis: 0,
        };
      }
      byToken[key].remaining += lot.remainingQuantity;
      const portionCost = (lot.remainingQuantity / lot.quantity) * lot.costBasisAmount;
      byToken[key].costBasis += portionCost;
    }
    return Object.values(byToken).sort((a, b) => b.remaining - a.remaining);
  }, [lots, songsMap, detailsMap]);

  const isLoading = eventsLoading || lotsLoading;

  if (!user) {
    return (
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          background: BG,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          padding: '0 20px',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'linear-gradient(135deg,#0a2a14,#050f0a)',
              border: `2.5px solid ${G}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              margin: '0 auto 16px',
            }}
          >
            📊
          </div>
          <h1
            style={{
              fontFamily: "'Archivo Black',sans-serif",
              fontSize: 22,
              fontWeight: 900,
              color: T1,
              margin: '0 0 8px',
              letterSpacing: '0.12em',
            }}
          >
            REALIZED PnL
          </h1>
          <p style={{ fontSize: 13, color: T2, margin: '0 0 32px', fontFamily: "'Inter',sans-serif" }}>
            Connect your wallet to view your trade history
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: 390,
        margin: '0 auto',
        minHeight: '100vh',
        background: BG,
        color: T1,
        fontFamily: "'Inter',sans-serif",
        paddingBottom: 140,
      }}
    >
      <RiskDisclaimerBanner />
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg,#0a2214 0%,#0A0A0A 100%)',
          padding: '24px 20px 20px',
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => navigate('/wallet')}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: SURF2,
              border: `1px solid ${BORDER}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} style={{ color: T1 }} />
          </button>
          <div>
            <h1
              style={{
                fontFamily: "'Archivo Black',sans-serif",
                fontSize: 18,
                fontWeight: 900,
                color: T1,
                letterSpacing: '0.1em',
              }}
            >
              REALIZED PnL
            </h1>
            <p style={{ fontSize: 11, color: T3, marginTop: 2 }}>
              Track your trading performance
            </p>
          </div>
        </div>

        {/* Total PnL hero */}
        <div
          style={{
            background: SURF,
            borderRadius: 12,
            border: `1px solid ${BORDER}`,
            padding: '18px 16px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 8,
              color: T3,
              fontFamily: "'Archivo Black',sans-serif",
              letterSpacing: '0.2em',
              marginBottom: 6,
            }}
          >
            TOTAL REALIZED PnL
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              color: stats.totalPnL >= 0 ? NEON_GREEN : NEON_RED,
              fontFamily: "'Archivo Black',sans-serif",
              letterSpacing: '-1px',
            }}
          >
            {stats.totalPnL >= 0 ? '+' : ''}
            {formatSOL(stats.totalPnL)}
          </div>
          <div style={{ fontSize: 11, color: T3, marginTop: 4 }}>
            Across {stats.count} closed trade{stats.count !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* Summary cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 20,
          }}
        >
          <SummaryCard
            label="TOTAL TRADES"
            value={String(stats.count)}
            color={T1}
            icon={<Activity size={14} />}
          />
          <SummaryCard
            label="BEST TRADE"
            value={`+${formatSOL(stats.best)}`}
            color={NEON_GREEN}
            icon={<TrendingUp size={14} />}
          />
          <SummaryCard
            label="WORST TRADE"
            value={`${formatSOL(stats.worst)}`}
            color={NEON_RED}
            icon={<TrendingDown size={14} />}
          />
          <SummaryCard
            label="OPEN LOTS"
            value={String(openLotsSummary.length)}
            color={G}
            icon={<BarChart3 size={14} />}
          />
        </div>

        {/* Per-token breakdown */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: "'Archivo Black',sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: G,
                letterSpacing: '0.15em',
              }}
            >
              PER-TOKEN BREAKDOWN
            </span>
          </div>
          {isLoading ? (
            <div style={{ fontSize: 11, color: T3, padding: '12px 0' }}>Loading...</div>
          ) : tokenBreakdown.length === 0 ? (
            <div style={{ fontSize: 11, color: T3, padding: '12px 0' }}>
              No closed trades yet
            </div>
          ) : (
            tokenBreakdown.map((t, i) => (
              <TokenBreakdownRow
                key={i}
                symbol={t.symbol}
                songName={t.songName}
                totalPnL={t.totalPnL}
                count={t.count}
                avgPnL={t.count > 0 ? t.totalPnL / t.count : 0}
              />
            ))
          )}
        </div>

        {/* Open lots */}
        {openLotsSummary.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontFamily: "'Archivo Black',sans-serif",
                  fontSize: 10,
                  fontWeight: 700,
                  color: G,
                  letterSpacing: '0.15em',
                }}
              >
                OPEN POSITIONS
              </span>
            </div>
            {openLotsSummary.map((pos, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '11px 14px',
                  marginBottom: 6,
                  background: SURF,
                  borderRadius: 10,
                  border: `1px solid ${BORDER}`,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "'Archivo Black',sans-serif",
                      fontSize: 11,
                      fontWeight: 700,
                      color: T1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pos.songName}
                  </div>
                  <div style={{ fontSize: 9, color: T3, fontFamily: 'monospace' }}>
                    {pos.symbol}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T1, fontFamily: 'monospace' }}>
                    {formatNumber(pos.remaining)} tokens
                  </div>
                  <div style={{ fontSize: 9, color: T3, fontFamily: 'monospace', marginTop: 2 }}>
                    basis {formatSOL(pos.costBasis)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Trade history */}
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <span
              style={{
                fontFamily: "'Archivo Black',sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: G,
                letterSpacing: '0.15em',
              }}
            >
              TRADE HISTORY
            </span>
          </div>
          {isLoading ? (
            <div style={{ fontSize: 11, color: T3, padding: '12px 0' }}>Loading history...</div>
          ) : (events ?? []).length === 0 ? (
            <div style={{ fontSize: 11, color: T3, padding: '12px 0' }}>
              No trades recorded yet
            </div>
          ) : (
            (events ?? []).map((event, i) => {
              const song = songsMap[event.songId];
              const details = detailsMap[event.songId];
              const name = details?.title ?? song?.name ?? event.songName ?? 'Unknown';
              return <TradeHistoryRow key={i} event={event} songName={name} />;
            })
          )}
        </div>
      </div>
    </div>
  );
}
