import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManyFailedFulfillments } from '@/lib/collections/failedFulfillments';
import type { FailedFulfillmentsResponse } from '@/lib/collections/failedFulfillments';
import { ADMIN_ADDRESS } from '@/lib/constants';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  AlertTriangle, RefreshCw, Trash2, CheckCircle2, Clock,
  ChevronDown, ChevronUp, ArrowLeft, ShoppingBag, Zap,
  User, DollarSign, Package, Info,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shortAddr(addr: string) {
  if (!addr || addr.length < 10) return addr || '—';
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatTs(ts?: number) {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function stageColor(stage: string): string {
  if (stage === 'fee-transfer') return '#f97316';
  if (stage === 'airdrop') return '#ef4444';
  if (stage === 'both') return '#dc2626';
  return '#a78bfa';
}

function sourceLabel(source: string): string {
  if (source === 'shopify') return 'Shopify';
  if (source === 'direct-sol') return 'Direct SOL';
  return source;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  record: FailedFulfillmentsResponse;
  onRetry: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  retrying: boolean;
  deleting: boolean;
}

function FulfillmentRow({ record, onRetry, onDelete, retrying, deleting }: RowProps) {
  const [expanded, setExpanded] = useState(false);

  const usdDisplay = record.usdAmount
    ? `$${(record.usdAmount / 100).toFixed(2)}`
    : '—';

  return (
    <div
      style={{
        background: 'rgba(10, 5, 20, 0.85)',
        border: '1px solid rgba(239, 68, 68, 0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Failure stage badge */}
        <div
          className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest"
          style={{
            background: `${stageColor(record.failureStage)}22`,
            border: `1px solid ${stageColor(record.failureStage)}55`,
            color: stageColor(record.failureStage),
          }}
        >
          {record.failureStage}
        </div>

        {/* Source badge */}
        <div
          className="flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{
            background: record.purchaseSource === 'shopify'
              ? 'rgba(139, 92, 246, 0.15)'
              : 'rgba(0, 212, 255, 0.1)',
            border: `1px solid ${record.purchaseSource === 'shopify' ? 'rgba(139,92,246,0.3)' : 'rgba(0,212,255,0.3)'}`,
            color: record.purchaseSource === 'shopify' ? '#a78bfa' : '#00D4FF',
          }}
        >
          {record.purchaseSource === 'shopify' ? <ShoppingBag size={9} /> : <Zap size={9} />}
          {sourceLabel(record.purchaseSource)}
        </div>

        {/* Purchase ID */}
        <span
          className="flex-1 text-xs truncate font-mono"
          style={{ color: 'rgba(255,255,255,0.5)', minWidth: 0 }}
          title={record.purchaseId}
        >
          {record.purchaseId}
        </span>

        {/* USD amount */}
        <span className="text-sm font-black flex-shrink-0" style={{ color: '#00FF41' }}>
          {usdDisplay}
        </span>

        {/* Retry count */}
        <span
          className="text-[10px] font-bold flex-shrink-0"
          style={{ color: record.retryCount > 0 ? '#f97316' : 'rgba(255,255,255,0.3)' }}
        >
          {record.retryCount > 0 ? `×${record.retryCount} retried` : 'no retries'}
        </span>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex-shrink-0 p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Quick info bar */}
      <div
        className="flex items-center gap-4 px-4 pb-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <span className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <User size={10} />
          {shortAddr(record.buyerAddress)}
        </span>
        <span className="text-[11px] flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Package size={10} />
          {record.songId}
        </span>
        <span className="text-[11px] flex items-center gap-1 ml-auto" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <Clock size={10} />
          {formatTs(record.createdAt)}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-2 space-y-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div
            className="rounded-lg p-3 text-xs font-mono break-words"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(239,68,68,0.15)',
              color: '#fca5a5',
              lineHeight: 1.6,
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>failureReason: </span>
            {record.failureReason || '—'}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div style={{ color: 'rgba(255,255,255,0.4)' }}>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>Buyer</span>
              <br />
              <span className="font-mono" style={{ color: '#bbf7d0' }}>{record.buyerAddress || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>Pack ID</span>
              <br />
              <span className="font-mono" style={{ color: '#bbf7d0' }}>{record.packId || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>Song ID</span>
              <br />
              <span className="font-mono" style={{ color: '#bbf7d0' }}>{record.songId || '—'}</span>
            </div>
            <div>
              <span style={{ color: 'rgba(255,255,255,0.25)' }}>Last Retry</span>
              <br />
              <span style={{ color: '#e0e0e0' }}>{formatTs(record.lastRetryAt)}</span>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onRetry(record.id)}
              disabled={retrying || deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: 'linear-gradient(135deg, #00FF41, #00D4FF)',
                color: '#000',
                boxShadow: retrying ? 'none' : '0 0 16px rgba(0, 255, 65, 0.3)',
              }}
            >
              <RefreshCw size={12} className={retrying ? 'animate-spin' : ''} />
              {retrying ? 'Retrying…' : 'Retry Fulfillment'}
            </button>

            <button
              onClick={() => onDelete(record.id)}
              disabled={retrying || deleting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 disabled:opacity-40"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#fca5a5',
              }}
            >
              <Trash2 size={12} className={deleting ? 'animate-spin' : ''} />
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FailedFulfillmentsPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [actionState, setActionState] = useState<Record<string, 'retrying' | 'deleting'>>({});

  const isAdmin = user?.address === ADMIN_ADDRESS;

  const { data: records, loading } = useRealtimeData<FailedFulfillmentsResponse[]>(
    subscribeManyFailedFulfillments,
    isAdmin,
    'order by createdAt desc limit 100',
  );

  // Filter to unresolved only (resolvedAt null/0)
  const unresolved = (records ?? []).filter(r => !r.resolvedAt);
  const resolved = (records ?? []).filter(r => !!r.resolvedAt);

  const getAuthClient = useCallback(async () => {
    const token = await getIdToken();
    if (!token || !user?.address) throw new Error('Not authenticated');
    return createAuthenticatedApiClient(token, user.address);
  }, [user]);

  const handleRetry = useCallback(async (fulfillmentId: string) => {
    setActionState(s => ({ ...s, [fulfillmentId]: 'retrying' }));
    try {
      const authApi = await getAuthClient();
      const result = await authApi.post('/api/admin/retry-fulfillment', { fulfillmentId }) as any;
      if (result?.resolved) {
        toast.success(`Fulfillment resolved! Status: ${result.finalStatus}`);
      } else {
        toast.error(`Retry attempted but still failing. Check webhookFailures.`);
      }
    } catch (err) {
      toast.error(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionState(s => {
        const n = { ...s };
        delete n[fulfillmentId];
        return n;
      });
    }
  }, [getAuthClient]);

  const handleDelete = useCallback(async (fulfillmentId: string) => {
    setActionState(s => ({ ...s, [fulfillmentId]: 'deleting' }));
    try {
      const authApi = await getAuthClient();
      await authApi.delete(`/api/admin/failed-fulfillments/${fulfillmentId}`);
      toast.success('Record deleted.');
    } catch (err) {
      toast.error(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setActionState(s => {
        const n = { ...s };
        delete n[fulfillmentId];
        return n;
      });
    }
  }, [getAuthClient]);

  // Auth guards
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#050510' }}>
        <div className="w-6 h-6 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#050510' }}>
        <AlertTriangle size={32} style={{ color: '#f97316' }} />
        <p className="text-white font-bold">Sign in required</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: '#050510' }}>
        <AlertTriangle size={32} style={{ color: '#ef4444' }} />
        <p className="text-white font-bold">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24" style={{ background: '#050510' }}>
      
      <div className="container pt-20 max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center gap-2 text-xs mb-4 transition-opacity hover:opacity-70"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            <ArrowLeft size={12} />
            Back to Admin
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertTriangle size={18} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h1
                className="text-2xl font-black"
                style={{ color: '#fff', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.04em' }}
              >
                Failed Fulfillments
              </h1>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                All-or-nothing retry queue — purchases where fee transfer or airdrop failed
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-3 mt-4">
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}
            >
              <AlertTriangle size={12} />
              {unresolved.length} unresolved
            </div>
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(0, 255, 65, 0.07)', border: '1px solid rgba(0, 255, 65, 0.15)', color: '#86efac' }}
            >
              <CheckCircle2 size={12} />
              {resolved.length} resolved
            </div>
          </div>
        </div>

        {/* Info box */}
        <div
          className="flex gap-3 p-4 rounded-xl mb-6 text-xs"
          style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', color: 'rgba(251,191,36,0.8)' }}
        >
          <Info size={14} className="flex-shrink-0 mt-0.5" />
          <div>
            <strong>Atomicity policy:</strong> records appear here when either the fee transfer OR the token airdrop
            failed during pack fulfillment. Use "Retry" to re-run the full pipeline (idempotent — skips
            already-completed steps). Use "Delete" when you have resolved the issue manually off-platform.
          </div>
        </div>

        {/* Unresolved records */}
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <div className="w-5 h-5 rounded-full border-2 border-red-500 border-t-transparent animate-spin" />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Loading records…</span>
          </div>
        ) : unresolved.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
            style={{ background: 'rgba(10,5,20,0.6)', border: '1px solid rgba(0, 255, 65, 0.1)' }}
          >
            <CheckCircle2 size={32} style={{ color: '#00FF41' }} />
            <p className="text-sm font-bold" style={{ color: '#86efac' }}>No unresolved failed fulfillments</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>All fulfillments are healthy</p>
          </div>
        ) : (
          <div className="space-y-3">
            {unresolved.map(record => (
              <FulfillmentRow
                key={record.id}
                record={record}
                onRetry={handleRetry}
                onDelete={handleDelete}
                retrying={actionState[record.id] === 'retrying'}
                deleting={actionState[record.id] === 'deleting'}
              />
            ))}
          </div>
        )}

        {/* Recently resolved (collapsed, last 5) */}
        {resolved.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xs font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Recently Resolved ({resolved.length})
            </h2>
            <div className="space-y-2">
              {resolved.slice(0, 5).map(record => (
                <div
                  key={record.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs"
                  style={{ background: 'rgba(10,5,20,0.5)', border: '1px solid rgba(0, 255, 65, 0.1)' }}
                >
                  <CheckCircle2 size={12} style={{ color: '#00FF41', flexShrink: 0 }} />
                  <span className="font-mono truncate flex-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {record.purchaseId}
                  </span>
                  <span style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>
                    {formatTs(record.resolvedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
