import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Users, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api-client';

const NEON_GREEN = '#00FF41';
const POLL_INTERVAL_MS = 30_000;
const TOP_N = 20;

interface HolderEntry {
  owner: string;
  balance: number;
  percentage: number;
}

interface HoldersResponse {
  holders: HolderEntry[];
  totalHolders: number;
  totalSupply: number;
}

function truncateWallet(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatBalance(n: number): string {
  if (n === 0) return '0';
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

interface TokenHoldersProps {
  mint: string;
  symbol?: string;
}

const TokenHolders: React.FC<TokenHoldersProps> = ({ mint, symbol }) => {
  const [holders, setHolders] = useState<HolderEntry[]>([]);
  const [totalHolders, setTotalHolders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  async function fetchHolders(isInitial: boolean) {
    if (!mint) return;
    if (isInitial) {
      setLoading(true);
    } else {
      setUpdating(true);
    }
    try {
      const data = await api.get(`/api/songs/${mint}/holders`) as HoldersResponse;
      if (mountedRef.current) {
        setHolders(data.holders ?? []);
        setTotalHolders(data.totalHolders ?? 0);
        setError(null);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError('Could not load holders');
      }
    }
    if (mountedRef.current) {
      setLoading(false);
      setUpdating(false);
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    fetchHolders(true);

    intervalRef.current = setInterval(() => {
      fetchHolders(false);
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [mint]);

  const skeletonRows = Array.from({ length: 5 });

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(145deg, #060A06, #030503)',
        border: '1px solid rgba(0, 255, 65, 0.18)',
        boxShadow: '0 0 20px rgba(0, 255, 65, 0.04)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid rgba(0, 255, 65, 0.1)' }}
      >
        <div className="flex items-center gap-2">
          <Trophy size={13} style={{ color: NEON_GREEN }} />
          <span
            className="text-xs font-black tracking-widest uppercase"
            style={{ color: '#fff', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.1em' }}
          >
            Holders
          </span>
          {symbol && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded font-bold"
              style={{
                background: 'rgba(0, 255, 65, 0.1)',
                color: NEON_GREEN,
                fontFamily: "'Inter', monospace",
                border: '1px solid rgba(0, 255, 65, 0.2)',
              }}
            >
              ${symbol}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {updating && (
            <RefreshCw
              size={10}
              style={{ color: 'rgba(0, 255, 65, 0.5)', animation: 'spin 1s linear infinite' }}
            />
          )}
          {totalHolders > 0 && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}>
              {totalHolders.toLocaleString()} total
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ maxHeight: 360 }}>
          {skeletonRows.map((_, i) => (
            <div
              key={i}
              className="grid items-center px-4 py-3 border-b"
              style={{
                gridTemplateColumns: '32px 1fr auto auto',
                gap: '8px',
                borderColor: 'rgba(255,255,255,0.04)',
              }}
            >
              <div className="h-3 w-5 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-24 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-14 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <div className="h-3 w-8 rounded" style={{ background: 'rgba(255,255,255,0.06)' }} />
            </div>
          ))}
        </div>
      ) : holders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <Users size={20} style={{ color: 'rgba(0, 255, 65, 0.25)' }} />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {error ? error : 'No holders found'}
          </p>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div
            className="grid px-4 py-2"
            style={{
              gridTemplateColumns: '32px 1fr auto auto',
              gap: '8px',
              borderBottom: '1px solid rgba(255,255,255,0.04)',
            }}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>#</span>
            <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.25)' }}>Wallet</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-right" style={{ color: 'rgba(255,255,255,0.25)', minWidth: 72 }}>Balance</span>
            <span className="text-[9px] font-bold uppercase tracking-wider text-right" style={{ color: 'rgba(255,255,255,0.25)', minWidth: 40 }}>Share</span>
          </div>

          {/* Rows */}
          <div style={{ maxHeight: 360, overflowY: 'auto', scrollbarWidth: 'none' }}>
            {holders.slice(0, TOP_N).map((h, i) => {
              const rank = i + 1;
              const medalColor = rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'rgba(255,255,255,0.25)';
              return (
                <div
                  key={h.owner}
                  className="grid items-center px-4 py-2.5 border-b transition-colors hover:bg-white/[0.02]"
                  style={{
                    gridTemplateColumns: '32px 1fr auto auto',
                    gap: '8px',
                    borderColor: 'rgba(255,255,255,0.04)',
                  }}
                >
                  <span
                    className="text-xs font-black"
                    style={{ fontFamily: "'Inter', monospace", color: medalColor }}
                  >
                    {rank <= 3 ? (['🥇', '🥈', '🥉'] as const)[rank - 1] : rank}
                  </span>

                  <div className="min-w-0">
                    <span
                      className="text-xs font-mono block truncate"
                      style={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Inter', monospace" }}
                    >
                      {truncateWallet(h.owner)}
                    </span>
                    <div
                      className="mt-1 h-0.5 rounded-full overflow-hidden"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${h.percentage}%`,
                          background: `linear-gradient(90deg, ${NEON_GREEN}, #00D4FF)`,
                        }}
                      />
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-bold text-right"
                    style={{ fontFamily: "'Inter', monospace", color: NEON_GREEN, minWidth: 72 }}
                  >
                    {formatBalance(h.balance)}
                  </span>

                  <span
                    className="text-[10px] font-bold text-right"
                    style={{ fontFamily: "'Inter', monospace", color: 'rgba(255,255,255,0.4)', minWidth: 40 }}
                  >
                    {h.percentage.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>

          {error && (
            <div className="px-4 py-2">
              <p className="text-[9px]" style={{ color: 'rgba(255,80,80,0.6)', fontFamily: "'Inter', monospace" }}>
                Update failed — showing last known data
              </p>
            </div>
          )}

          <div className="px-4 py-2.5">
            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', monospace" }}>
              Live on-chain data · refreshes every 30s
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default TokenHolders;
