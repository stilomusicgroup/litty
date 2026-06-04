import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getManyErrorLogs, subscribeManyErrorLogs, updateErrorLogs } from '@/lib/collections/errorLogs';
import type { ErrorLogsResponse } from '@/lib/collections/errorLogs';
import { toast } from 'sonner';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Search,
  Filter,
  Check,
  XCircle,
  Clock,
} from 'lucide-react';

const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';

function shortenAddress(addr: string) {
  if (!addr) return '--';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(ts: number) {
  if (!ts) return '--';
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function levelBadge(level: string) {
  switch (level) {
    case 'error': return { color: RED, bg: 'rgba(239,68,68,0.12)', icon: AlertTriangle };
    case 'warn': return { color: AMBER, bg: 'rgba(245,158,11,0.12)', icon: AlertCircle };
    case 'info': return { color: BLUE, bg: 'rgba(59,130,246,0.12)', icon: Info };
    default: return { color: BLUE, bg: 'rgba(59,130,246,0.12)', icon: Info };
  }
}

export const ErrorLogsSection: React.FC = () => {
  const [logs, setLogs] = useState<ErrorLogsResponse[]>([]);
  const [levelFilter, setLevelFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'frontend' | 'backend'>('all');
  const [search, setSearch] = useState('');
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [lastRefresh, setLastRefresh] = useState(Date.now());

  const fetchLogs = useCallback(async () => {
    const data = await getManyErrorLogs('order by createdAt desc limit 500');
    setLogs(data);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getManyErrorLogs('order by createdAt desc limit 500');
      if (!mounted) return;
      setLogs(data);
      subscribeManyErrorLogs((updated) => {
        if (mounted) setLogs(updated ?? []);
      }, 'order by createdAt desc limit 500');
    })();
    return () => { mounted = false; };
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(Date.now());
      fetchLogs();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filtered = useMemo(() => {
    let list = logs;
    if (levelFilter !== 'all') list = list.filter((l) => l.level === levelFilter);
    if (sourceFilter !== 'all') list = list.filter((l) => l.source === sourceFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((l) => l.message.toLowerCase().includes(q));
    }
    return list;
  }, [logs, levelFilter, sourceFilter, search]);

  const nowSec = Math.floor(Date.now() / 1000);
  const last24h = nowSec - 24 * 60 * 60;
  const totalLast24h = logs.filter((l) => l.createdAt >= last24h).length;
  const unresolvedCount = logs.filter((l) => !l.resolved).length;

  const handleResolve = async (id: string) => {
    setResolvingIds((prev) => new Set(prev).add(id));
    const success = await updateErrorLogs(id, { resolved: true });
    if (success) {
      toast.success('Marked as resolved');
    } else {
      toast.error('Failed to resolve');
    }
    setResolvingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleResolveAll = async () => {
    const unresolved = filtered.filter((l) => !l.resolved);
    if (unresolved.length === 0) {
      toast.info('No unresolved errors to mark');
      return;
    }
    setResolvingIds((prev) => {
      const next = new Set(prev);
      unresolved.forEach((l) => next.add(l.id));
      return next;
    });

    let resolved = 0;
    await Promise.all(
      unresolved.map(async (l) => {
        const success = await updateErrorLogs(l.id, { resolved: true });
        if (success) resolved++;
      })
    );

    toast.success(`Resolved ${resolved} error logs`);
    setResolvingIds(new Set());
  };

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <AlertTriangle size={18} style={{ color: RED }} />
          </div>
          <div>
            <p className="text-lg font-black text-white">{totalLast24h.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.4)' }}>Errors (24h)</p>
          </div>
        </div>
        <div className="p-4 rounded-xl flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <AlertCircle size={18} style={{ color: AMBER }} />
          </div>
          <div>
            <p className="text-lg font-black text-white">{unresolvedCount.toLocaleString()}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.4)' }}>Unresolved</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search errors..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
          >
            <option value="all">All Levels</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
          </select>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="px-3 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
          >
            <option value="all">All Sources</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>{filtered.length} results</span>
        <button
          onClick={handleResolveAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          style={{ background: 'rgba(16,185,129,0.15)', color: GREEN, border: '1px solid rgba(16,185,129,0.3)' }}
        >
          <Check size={12} />
          Mark All Resolved
        </button>
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {filtered.map((log) => {
          const badge = levelBadge(log.level);
          const Icon = badge.icon;
          const isResolving = resolvingIds.has(log.id);
          return (
            <div
              key={log.id}
              className="p-4 rounded-xl"
              style={{
                background: log.resolved ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${log.resolved ? 'rgba(16,185,129,0.1)' : 'rgba(139,92,246,0.1)'}`,
                opacity: log.resolved ? 0.7 : 1,
              }}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  <Icon size={14} style={{ color: badge.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: badge.bg, color: badge.color }}>
                      {log.level}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                      {log.source}
                    </span>
                    {log.resolved && (
                      <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: GREEN }}>
                        <CheckCircle size={10} /> Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white mb-1 break-words">{log.message}</p>
                  {log.context && (
                    <p className="text-xs mb-1 break-words" style={{ color: 'rgba(220,214,240,0.5)' }}>{log.context}</p>
                  )}
                  <div className="flex items-center gap-3 text-[10px]" style={{ color: 'rgba(220,214,240,0.35)' }}>
                    <span>{formatTime(log.createdAt)}</span>
                    {log.userAddress && <span>{shortenAddress(log.userAddress)}</span>}
                    <span>{log.environment}</span>
                  </div>
                </div>
                {!log.resolved && (
                  <button
                    onClick={() => handleResolve(log.id)}
                    disabled={isResolving}
                    className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    style={{
                      background: 'rgba(16,185,129,0.15)',
                      color: GREEN,
                      border: '1px solid rgba(16,185,129,0.3)',
                      opacity: isResolving ? 0.5 : 1,
                      cursor: isResolving ? 'not-allowed' : 'pointer',
                    }}
                  >
                    <Check size={12} />
                    {isResolving ? '...' : 'Resolve'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>No error logs found</div>
        )}
      </div>
    </div>
  );
};
