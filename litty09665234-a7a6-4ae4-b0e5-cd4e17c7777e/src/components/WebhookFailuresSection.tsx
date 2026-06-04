import React, { useState, useEffect, useMemo } from 'react';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { RefreshCw, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const PURPLE = '#8B5CF6';
const RED = '#EF4444';
const GREEN = '#10B981';
const AMBER = '#F59E0B';

interface WebhookFailureRecord {
  id: string;
  webhookSource: string;
  path: string;
  failureReason: string;
  errorMessage: string;
  headers: string;
  bodyPreview: string;
  timestamp: number;
  alertSent: boolean;
}

function formatTs(ts: number): string {
  if (!ts) return '--';
  return new Date(ts * 1000).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function reasonLabel(reason: string): string {
  const map: Record<string, string> = {
    invalid_hmac: 'Invalid HMAC',
    missing_hmac_header: 'Missing HMAC Header',
    missing_secret: 'Missing Secret',
    hmac_verify_error: 'HMAC Verify Error',
    json_parse_error: 'JSON Parse Error',
    invalid_signature: 'Invalid Signature',
    missing_signature_header: 'Missing Signature Header',
  };
  return map[reason] ?? reason;
}

function reasonColor(reason: string): string {
  if (reason.includes('missing_secret')) return AMBER;
  if (reason.includes('invalid')) return RED;
  if (reason.includes('missing')) return AMBER;
  return RED;
}

const ExpandableRow: React.FC<{ failure: WebhookFailureRecord }> = ({ failure }) => {
  const [expanded, setExpanded] = useState(false);

  let parsedHeaders: Record<string, string> = {};
  try { parsedHeaders = JSON.parse(failure.headers); } catch { /* noop */ }

  return (
    <>
      <tr
        style={{ borderBottom: '1px solid rgba(139,92,246,0.08)', cursor: 'pointer' }}
        onClick={() => setExpanded(e => !e)}
      >
        <td className="py-3 px-3 text-xs font-mono whitespace-nowrap" style={{ color: 'rgba(220,214,240,0.55)' }}>
          {formatTs(failure.timestamp)}
        </td>
        <td className="py-3 px-3">
          <span
            className="text-xs font-bold px-2 py-1 rounded-md uppercase"
            style={{
              background: failure.webhookSource === 'shopify'
                ? 'rgba(16,185,129,0.12)'
                : 'rgba(99,102,241,0.12)',
              color: failure.webhookSource === 'shopify' ? GREEN : '#818cf8',
              border: `1px solid ${failure.webhookSource === 'shopify' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)'}`,
            }}
          >
            {failure.webhookSource}
          </span>
        </td>
        <td className="py-3 px-3 text-xs font-mono" style={{ color: 'rgba(220,214,240,0.6)' }}>
          {failure.path}
        </td>
        <td className="py-3 px-3">
          <span
            className="text-xs font-semibold px-2 py-1 rounded-md"
            style={{
              background: `${reasonColor(failure.failureReason)}18`,
              color: reasonColor(failure.failureReason),
              border: `1px solid ${reasonColor(failure.failureReason)}30`,
            }}
          >
            {reasonLabel(failure.failureReason)}
          </span>
        </td>
        <td className="py-3 px-3 text-xs max-w-xs" style={{ color: 'rgba(220,214,240,0.5)' }}>
          <span className="truncate block" style={{ maxWidth: 200 }}>
            {failure.errorMessage.slice(0, 80)}{failure.errorMessage.length > 80 ? '…' : ''}
          </span>
        </td>
        <td className="py-3 px-3 text-center">
          {failure.alertSent
            ? <CheckCircle size={14} style={{ color: GREEN, display: 'inline' }} />
            : <Clock size={14} style={{ color: 'rgba(220,214,240,0.3)', display: 'inline' }} />}
        </td>
        <td className="py-3 px-3 text-right">
          {expanded
            ? <ChevronUp size={14} style={{ color: PURPLE, display: 'inline' }} />
            : <ChevronDown size={14} style={{ color: 'rgba(220,214,240,0.3)', display: 'inline' }} />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: 'rgba(139,92,246,0.04)', borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
          <td colSpan={7} className="px-4 pb-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-semibold mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Full Error</p>
                <pre
                  className="p-3 rounded-lg overflow-x-auto text-xs"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: '#fca5a5',
                    fontFamily: "'JetBrains Mono', monospace",
                    border: '1px solid rgba(239,68,68,0.15)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {failure.errorMessage}
                </pre>
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Headers</p>
                <pre
                  className="p-3 rounded-lg overflow-x-auto text-xs"
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    color: '#a5b4fc',
                    fontFamily: "'JetBrains Mono', monospace",
                    border: '1px solid rgba(99,102,241,0.15)',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {JSON.stringify(parsedHeaders, null, 2)}
                </pre>
              </div>
              {failure.bodyPreview && (
                <div className="md:col-span-2">
                  <p className="font-semibold mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Body Preview (first 200 chars)</p>
                  <pre
                    className="p-3 rounded-lg overflow-x-auto text-xs"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      color: '#d4d4d4',
                      fontFamily: "'JetBrains Mono', monospace",
                      border: '1px solid rgba(255,255,255,0.08)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {failure.bodyPreview}
                  </pre>
                </div>
              )}
              <div>
                <p className="font-semibold mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Failure ID</p>
                <p className="font-mono text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>{failure.id}</p>
              </div>
              <div>
                <p className="font-semibold mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Alert Sent</p>
                <p className="text-xs" style={{ color: failure.alertSent ? GREEN : 'rgba(220,214,240,0.4)' }}>
                  {failure.alertSent ? 'Yes — Discord notified' : 'No (below threshold or URL not set)'}
                </p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

const WebhookFailuresSection: React.FC<{ token: string; walletAddress: string }> = ({ token, walletAddress }) => {
  const [failures, setFailures] = useState<WebhookFailureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<'all' | 'shopify'>('all');
  const [reasonFilter, setReasonFilter] = useState<string>('all');

  const fetchFailures = async () => {
    setLoading(true);
    setError(null);
    try {
      const authApi = createAuthenticatedApiClient(token, walletAddress);
      const data = await authApi.get<{ failures: WebhookFailureRecord[] }>('/api/admin/webhook-failures');
      setFailures(data?.failures ?? []);
    } catch (err: any) {
      console.error('Failed to fetch webhook failures:', err);
      setError(err?.message ?? 'Failed to load webhook failures');
      toast.error('Failed to load webhook failures');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFailures(); }, [token, walletAddress]);

  const uniqueReasons = useMemo(() => {
    const s = new Set(failures.map(f => f.failureReason));
    return Array.from(s);
  }, [failures]);

  const filtered = useMemo(() => {
    let list = failures;
    if (sourceFilter !== 'all') list = list.filter(f => f.webhookSource === sourceFilter);
    if (reasonFilter !== 'all') list = list.filter(f => f.failureReason === reasonFilter);
    return list;
  }, [failures, sourceFilter, reasonFilter]);

  const recentCount = useMemo(() => {
    const tenMinAgo = Math.floor(Date.now() / 1000) - 10 * 60;
    return failures.filter(f => f.timestamp > tenMinAgo).length;
  }, [failures]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={20} className="animate-spin mr-3" style={{ color: PURPLE }} />
        <span className="text-sm" style={{ color: 'rgba(220,214,240,0.4)' }}>Loading webhook failures...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <AlertTriangle size={24} style={{ color: RED }} />
        <p className="text-sm" style={{ color: RED }}>{error}</p>
        <button
          onClick={fetchFailures}
          className="text-xs px-4 py-2 rounded-lg font-semibold"
          style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black" style={{ color: '#e0d7ff' }}>Webhook Failures</h2>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(220,214,240,0.4)' }}>
            Last 100 failures · {failures.length} total
            {recentCount > 0 && (
              <span
                className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: `${RED}20`, color: RED, border: `1px solid ${RED}30` }}
              >
                {recentCount} in last 10 min
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchFailures}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg font-semibold transition-all"
          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['all', 'shopify'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSourceFilter(s)}
            className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all capitalize"
            style={{
              background: sourceFilter === s ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.2)',
              color: sourceFilter === s ? '#e0d7ff' : 'rgba(220,214,240,0.4)',
              border: `1px solid ${sourceFilter === s ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.08)'}`,
            }}
          >
            {s === 'all' ? 'All Sources' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <select
          value={reasonFilter}
          onChange={e => setReasonFilter(e.target.value)}
          className="text-xs px-3 py-1.5 rounded-lg font-semibold"
          style={{
            background: 'rgba(0,0,0,0.3)',
            color: 'rgba(220,214,240,0.6)',
            border: '1px solid rgba(139,92,246,0.15)',
            outline: 'none',
          }}
        >
          <option value="all">All Reasons</option>
          {uniqueReasons.map(r => (
            <option key={r} value={r}>{reasonLabel(r)}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <CheckCircle size={32} style={{ color: GREEN, opacity: 0.6 }} />
          <p className="text-sm font-semibold" style={{ color: 'rgba(220,214,240,0.5)' }}>
            {failures.length === 0 ? 'No webhook failures recorded' : 'No failures match current filters'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(139,92,246,0.12)' }}>
          <table className="w-full text-left" style={{ borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(139,92,246,0.15)', background: 'rgba(139,92,246,0.06)' }}>
                <th className="py-2.5 px-3 text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.4)' }}>Timestamp</th>
                <th className="py-2.5 px-3 text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.4)' }}>Source</th>
                <th className="py-2.5 px-3 text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.4)' }}>Path</th>
                <th className="py-2.5 px-3 text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.4)' }}>Reason</th>
                <th className="py-2.5 px-3 text-xs font-semibold" style={{ color: 'rgba(220,214,240,0.4)' }}>Error</th>
                <th className="py-2.5 px-3 text-xs font-semibold text-center" style={{ color: 'rgba(220,214,240,0.4)' }}>Alerted</th>
                <th className="py-2.5 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(failure => (
                <ExpandableRow key={failure.id} failure={failure} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Discord config note */}
      <div
        className="mt-4 flex items-start gap-2 p-3 rounded-lg text-xs"
        style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
      >
        <AlertTriangle size={13} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
        <p style={{ color: 'rgba(220,214,240,0.5)' }}>
          Discord alerts fire when ≥ 3 failures occur within 10 minutes. Requires{' '}
          <code className="px-1 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.3)', color: '#fbbf24' }}>
            DISCORD_WEBHOOK_URL
          </code>{' '}
          secret to be set in Cloud settings.
        </p>
      </div>
    </div>
  );
};

export default WebhookFailuresSection;
