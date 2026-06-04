import React, { useMemo } from 'react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManyPackPurchases } from '@/lib/collections/packPurchases';
import type { PackPurchasesResponse } from '@/lib/collections/packPurchases';
import {
  DollarSign,
  TrendingUp,
  Coins,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCcw,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ArtistEarningsTabProps {
  artistAddress: string;
  songIds: string[];
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = status ?? 'unknown';

  const config: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
    paid: {
      label: 'Paid',
      bg: 'rgba(0, 255, 65, 0.1)',
      color: '#00FF41',
      icon: <CheckCircle size={10} />,
    },
    pending: {
      label: 'Pending',
      bg: 'rgba(251,191,36,0.1)',
      color: '#fbbf24',
      icon: <Clock size={10} />,
    },
    retrying: {
      label: 'Retrying',
      bg: 'rgba(96,165,250,0.1)',
      color: '#60a5fa',
      icon: <RefreshCcw size={10} />,
    },
    failed: {
      label: 'Failed',
      bg: 'rgba(248,113,113,0.1)',
      color: '#f87171',
      icon: <AlertCircle size={10} />,
    },
  };

  const c = config[s] ?? { label: s, bg: 'rgba(255,255,255,0.05)', color: 'rgba(220,214,240,0.4)', icon: null };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}40` }}
    >
      {c.icon}
      {c.label}
    </span>
  );
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid ${color}25`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}30` }}
      >
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs mb-0.5" style={{ color: 'rgba(220,214,240,0.45)' }}>{label}</p>
        <p
          className="text-xl font-black leading-none"
          style={{ color, fontFamily: "'Inter', monospace" }}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[10px] mt-1" style={{ color: 'rgba(220,214,240,0.35)' }}>{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Static info card ─────────────────────────────────────────────────────────

function InfoCard({
  icon,
  title,
  pct,
  description,
  color,
}: {
  icon: string;
  title: string;
  pct: string;
  description: string;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: `1px solid ${color}20`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span
          className="text-base font-black"
          style={{ color, fontFamily: "'Archivo Black', monospace" }}
        >
          {pct}
        </span>
        <span className="text-sm font-bold text-white">{title}</span>
      </div>
      <p className="text-xs leading-relaxed" style={{ color: 'rgba(220,214,240,0.5)' }}>
        {description}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ArtistEarningsTab: React.FC<ArtistEarningsTabProps> = ({ artistAddress, songIds }) => {
  // Query packPurchases — policy filters to only this artist's songs
  // We query for all purchases but filter client-side by songId
  const { data: purchases } = useRealtimeData<PackPurchasesResponse[]>(
    subscribeManyPackPurchases,
    songIds.length > 0,
    `order by createdAt desc limit 200`,
  );

  // Filter to only this artist's songs
  const artistPurchases = useMemo(() => {
    const songSet = new Set(songIds);
    return (purchases ?? []).filter(p => p.songId && songSet.has(p.songId));
  }, [purchases, songIds]);

  // Paid payouts
  const paidPayouts = useMemo(
    () => artistPurchases.filter(p => p.artistPayoutStatus === 'paid'),
    [artistPurchases],
  );

  // Pending / retrying
  const pendingCount = useMemo(
    () => artistPurchases.filter(p => p.artistPayoutStatus === 'pending' || p.artistPayoutStatus === 'retrying').length,
    [artistPurchases],
  );

  // Totals
  const totalUSD = useMemo(
    () => paidPayouts.reduce((sum, p) => sum + (p.artistPayoutUSD ?? 0), 0) / 100,
    [paidPayouts],
  );

  const totalSOL = useMemo(
    () => paidPayouts.reduce((sum, p) => sum + (p.artistPayoutSOL ?? 0), 0) / 1e9,
    [paidPayouts],
  );

  const formatDate = (unix: number) => {
    return new Date(unix * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 py-4">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <SummaryCard
          icon={<DollarSign size={16} />}
          label="Total Earned (USD)"
          value={`$${totalUSD.toFixed(2)}`}
          sub={`${paidPayouts.length} paid pack${paidPayouts.length !== 1 ? 's' : ''}`}
          color="#00FF41"
        />
        <SummaryCard
          icon={<Coins size={16} />}
          label="Total Earned (SOL)"
          value={`${totalSOL.toFixed(4)} SOL`}
          sub="converted at purchase price"
          color="#9945FF"
        />
        <SummaryCard
          icon={<Clock size={16} />}
          label="Pending Payouts"
          value={String(pendingCount)}
          sub="processing on-chain"
          color="#fbbf24"
        />
      </div>

      {/* ── Wallet link ── */}
      <a
        href={`https://solscan.io/account/${artistAddress}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-xs font-semibold transition-colors"
        style={{ color: 'rgba(153,69,255,0.7)', textDecoration: 'none' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#9945FF')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(153,69,255,0.7)')}
      >
        <ExternalLink size={13} />
        View wallet on Solscan
      </a>

      {/* ── Fiat Pack Payouts Table ── */}
      <div>
        <h3
          className="text-sm font-black mb-3 uppercase tracking-widest"
          style={{ color: 'rgba(220,214,240,0.5)', fontFamily: "'Archivo Black', monospace" }}
        >
          Pack Payout History
        </h3>

        {artistPurchases.length === 0 ? (
          <div
            className="py-10 rounded-2xl text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="text-sm" style={{ color: 'rgba(220,214,240,0.35)' }}>
              No pack purchases yet for your songs.
            </p>
          </div>
        ) : (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ border: '1px solid rgba(139,92,246,0.15)' }}
          >
            {/* Table header */}
            <div
              className="grid text-[10px] font-black uppercase tracking-widest px-4 py-2.5"
              style={{
                background: 'rgba(139,92,246,0.08)',
                color: 'rgba(220,214,240,0.4)',
                gridTemplateColumns: '1fr 80px 80px 70px',
                fontFamily: "'Archivo Black', monospace",
              }}
            >
              <span>Pack / Date</span>
              <span className="text-right">USD</span>
              <span className="text-right">SOL</span>
              <span className="text-right">Status</span>
            </div>

            {/* Table rows */}
            <div className="divide-y" style={{ borderColor: 'rgba(139,92,246,0.08)' }}>
              {artistPurchases.slice(0, 50).map((p) => (
                <div
                  key={p.id}
                  className="grid items-center px-4 py-3 text-xs"
                  style={{ gridTemplateColumns: '1fr 80px 80px 70px' }}
                >
                  {/* Pack name + date */}
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{p.packName}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(220,214,240,0.35)' }}>
                      {formatDate(p.createdAt)}
                    </p>
                    {p.artistPayoutTxHash && (
                      <a
                        href={`https://solscan.io/tx/${p.artistPayoutTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-mono"
                        style={{ color: 'rgba(153,69,255,0.6)' }}
                      >
                        {p.artistPayoutTxHash.slice(0, 12)}…
                      </a>
                    )}
                  </div>

                  {/* USD */}
                  <p
                    className="text-right font-bold"
                    style={{ color: '#00FF41', fontFamily: "'Inter', monospace" }}
                  >
                    {p.artistPayoutUSD != null ? `$${(p.artistPayoutUSD / 100).toFixed(2)}` : '—'}
                  </p>

                  {/* SOL */}
                  <p
                    className="text-right font-bold"
                    style={{ color: '#9945FF', fontFamily: "'Inter', monospace" }}
                  >
                    {p.artistPayoutSOL != null ? `${(p.artistPayoutSOL / 1e9).toFixed(4)}` : '—'}
                  </p>

                  {/* Status */}
                  <div className="flex justify-end">
                    <StatusBadge status={p.artistPayoutStatus} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Trading Fees (static info) ── */}
      <div>
        <h3
          className="text-sm font-black mb-3 uppercase tracking-widest"
          style={{ color: 'rgba(220,214,240,0.5)', fontFamily: "'Archivo Black', monospace" }}
        >
          Trading Fees
        </h3>
        <InfoCard
          icon="📈"
          title="Creator Fee"
          pct="2%"
          description="You earn 2% on every trade of your song token on the PumpFun bonding curve. These fees accumulate in your creator account and can be claimed from the song detail page using the Collect Fees button."
          color="#00FF41"
        />
      </div>

      {/* ── NFT Royalties (static info) ── */}
      <div>
        <h3
          className="text-sm font-black mb-3 uppercase tracking-widest"
          style={{ color: 'rgba(220,214,240,0.5)', fontFamily: "'Archivo Black', monospace" }}
        >
          NFT Royalties
        </h3>
        <InfoCard
          icon="🎨"
          title="Secondary Sale Royalty"
          pct="10%"
          description="Every NFT minted for your songs carries a 10% royalty on secondary sales, enforced by Metaplex on supported marketplaces. Royalty metadata is embedded in the NFT at mint time."
          color="#f472b6"
        />
      </div>
    </div>
  );
};

export default ArtistEarningsTab;
