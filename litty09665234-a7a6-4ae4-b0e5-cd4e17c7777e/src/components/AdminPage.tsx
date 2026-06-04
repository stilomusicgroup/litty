import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import { ADMIN_ADDRESS, TREASURY_WALLET, OPERATIONS_WALLET, PLATFORM_PAUSED } from '@/lib/constants';
import {
  getManySongs, subscribeManySongs,
  getAllSongsTreasuryFees, getAllSongsInfraFees,
  subscribeAllSongsTreasuryFees, subscribeAllSongsInfraFees,
} from '@/lib/collections/songs';
import {
  getAllPackPurchasesTreasuryFees, getAllPackPurchasesInfraFees,
  subscribeAllPackPurchasesTreasuryFees, subscribeAllPackPurchasesInfraFees,
} from '@/lib/collections/packPurchases';
import {
  runSolBalanceQueryForCommonQueries, runUsdcBalanceQueryForCommonQueries,
} from '@/lib/collections/commonQueries';
import { getManySongDetails, subscribeManySongDetails } from '@/lib/collections/songDetails';
import { getManyPurchases, subscribeManyPurchases } from '@/lib/collections/purchases';
import { getManyPackPurchases, subscribeManyPackPurchases } from '@/lib/collections/packPurchases';
import type { PackPurchasesResponse } from '@/lib/collections/packPurchases';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import PendingApprovalSection from '@/components/PendingApprovalSection';
import { Shield, Music, ShoppingCart, CheckCircle, XCircle, AlertCircle, RefreshCw, Check, Search, Loader2, ExternalLink, ChevronDown, ChevronUp, Play, Pause, Zap, ClipboardCheck, Trash2, Wallet, Server, AlertTriangle, BarChart3, Headphones, Bug, Eye, EyeOff, ArrowUpDown } from 'lucide-react';
import { StreamAnalyticsSection } from '@/components/admin/StreamAnalyticsSection';
import { SupportTicketsSection } from '@/components/admin/SupportTicketsSection';
import { ErrorLogsSection } from '@/components/admin/ErrorLogsSection';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const BG = 'transparent';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const RED = '#EF4444';
const CARD_BG = 'rgba(15, 5, 30, 0.85)';

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

// ─── Song Management ────────────────────────────────────────────────────────
const SongManagementSection: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [songs, setSongs] = useState<any[]>([]);
  const [details, setDetails] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState<'all' | 'pending' | 'live' | 'hidden'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      if (user) {
        try { const t = await getIdToken(); setToken(t ?? ''); } catch {}
      }
    })();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getManySongs('order by tarobase_created_at desc limit 200');
      const d = await getManySongDetails('order by tarobase_created_at desc limit 200');
      if (!mounted) return;
      setSongs(s);
      const map: Record<string, any> = {};
      d.forEach(x => { map[x.id] = x; });
      setDetails(map);
      subscribeManySongs((updated) => { if (mounted) setSongs(updated ?? []); }, 'order by tarobase_created_at desc limit 200');
      subscribeManySongDetails((updated) => {
        if (!mounted) return;
        const m: Record<string, any> = {};
        (updated ?? []).forEach(x => { m[x.id] = x; });
        setDetails(m);
      }, 'order by tarobase_created_at desc limit 200');
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = songs;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => {
        const d = details[s.id];
        return (d?.title ?? s.name ?? '').toLowerCase().includes(q) || (d?.artist ?? '').toLowerCase().includes(q);
      });
    }
    if (filter === 'pending') list = list.filter(s => !details[s.id]?.approved);
    if (filter === 'live') list = list.filter(s => details[s.id]?.approved);
    if (filter === 'hidden') list = list.filter(s => s.hidden === true);
    return list;
  }, [songs, search, filter, details]);

  const handleApprove = async (songId: string, approved: boolean) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      await authApi.post(`/api/admin/songs/${songId}/set-approved`, { approved });
      toast.success(approved ? 'Song approved!' : 'Song rejected');
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleHidden = async (songId: string, hidden: boolean) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      await authApi.post(`/api/admin/songs/${songId}/set-hidden`, { hidden });
      toast.success(hidden ? 'Song hidden from public listings' : 'Song is now visible');
    } catch {
      toast.error('Failed to update visibility');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search songs..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }} />
        </div>
        {(['all', 'pending', 'live', 'hidden'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all"
            style={{
              background: filter === f ? 'rgba(139,92,246,0.25)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${filter === f ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.1)'}`,
              color: filter === f ? '#e0d7ff' : 'rgba(220,214,240,0.4)', minHeight: '48px',
            }}>{f}</button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(song => {
          const d = details[song.id];
          const approved = d?.approved ?? false;
          const hasDetails = !!d;
          return (
            <div key={song.id} className="p-4 rounded-xl" style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${approved ? 'rgba(16,185,129,0.2)' : hasDetails ? 'rgba(234,179,8,0.2)' : 'rgba(139,92,246,0.1)'}`,
            }}>
              <div className="flex items-center gap-3 mb-3">
                {d?.coverImage
                  ? <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0"><img src={d.coverImage} alt="" className="w-full h-full object-cover block" /></div>
                  : <div className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                      <Music size={18} style={{ color: '#a78bfa' }} />
                    </div>}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{d?.title ?? song.name ?? 'Untitled'}</p>
                  <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>{d?.artist ?? 'Unknown Artist'}</p>
                </div>
                {song.hidden === true && (
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}><EyeOff size={10} /> Hidden</span>
                )}
                {approved
                  ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(16,185,129,0.12)', color: GREEN }}><CheckCircle size={10} /> Live</span>
                  : hasDetails
                    ? <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(234,179,8,0.12)', color: '#eab308' }}><AlertCircle size={10} /> Pending</span>
                    : <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}><RefreshCw size={10} /> No Details</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {!approved && hasDetails && (
                  <>
                    <button onClick={() => handleApprove(song.id, true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial"
                      style={{ background: 'rgba(16,185,129,0.15)', color: GREEN, border: '1px solid rgba(16,185,129,0.3)', minHeight: '44px' }}>
                      <Check size={14} /> Approve
                    </button>
                    <button onClick={() => handleApprove(song.id, false)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial"
                      style={{ background: 'rgba(239,68,68,0.1)', color: RED, border: '1px solid rgba(239,68,68,0.2)', minHeight: '44px' }}>
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}
                {approved && (
                  <button onClick={() => handleApprove(song.id, false)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial"
                    style={{ background: 'rgba(239,68,68,0.1)', color: RED, border: '1px solid rgba(239,68,68,0.2)', minHeight: '44px' }}>
                    <XCircle size={14} /> Revoke
                  </button>
                )}
                <button
                  onClick={() => handleHidden(song.id, !song.hidden)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-initial"
                  style={{
                    background: song.hidden ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.06)',
                    color: song.hidden ? '#a78bfa' : 'rgba(220,214,240,0.6)',
                    border: song.hidden ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(255,255,255,0.1)',
                    minHeight: '44px',
                  }}
                >
                  {song.hidden ? <EyeOff size={14} /> : <Eye size={14} />}
                  {song.hidden ? 'Unhide' : 'Hide'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>No songs found</div>
        )}
      </div>
    </div>
  );
};

// ─── Orders (Fulfillment Dashboard) ────────────────────────────────────────
const OrdersSection: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState<string>('');
  const [packPurchases, setPackPurchases] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'partial' | 'failed' | 'needs_review'>('all');
  const [viewMode, setViewMode] = useState<'grouped' | 'all'>('grouped');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [retryingOrders, setRetryingOrders] = useState<Set<string>>(new Set());
  const [deletingOrders, setDeletingOrders] = useState<Set<string>>(new Set());
  const [clearingAll, setClearingAll] = useState(false);

  useEffect(() => {
    async function fetchToken() {
      if (user) {
        try {
          const t = await getIdToken();
          setToken(t ?? '');
        } catch (err) {
          console.error('Failed to get auth token:', err);
        }
      }
    }
    fetchToken();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const pp = await getManyPackPurchases('order by createdAt desc limit 200');
      if (!mounted) return;
      setPackPurchases(pp);
      subscribeManyPackPurchases((updated) => { if (mounted) setPackPurchases(updated ?? []); }, 'order by createdAt desc limit 200');
    })();
    return () => { mounted = false };
  }, []);

  // Group by shopifyOrderId
  const groupedOrders = useMemo(() => {
    const groups = new Map<string, any[]>();
    packPurchases.forEach(p => {
      const orderId = p.shopifyOrderId || p.id;
      if (!groups.has(orderId)) groups.set(orderId, []);
      groups.get(orderId)!.push(p);
    });
    // Sort each group by createdAt desc, and sort groups by most recent
    const result: { orderId: string; records: any[] }[] = [];
    groups.forEach((records, orderId) => {
      records.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      result.push({ orderId, records });
    });
    result.sort((a, b) => (b.records[0]?.createdAt ?? 0) - (a.records[0]?.createdAt ?? 0));
    return result;
  }, [packPurchases]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return groupedOrders;
    return groupedOrders.filter(group =>
      group.records.some(r => r.status === statusFilter)
    );
  }, [groupedOrders, statusFilter]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) { next.delete(orderId); } else { next.add(orderId); }
      return next;
    });
  };

  const handleRetry = async (purchaseId: string, orderId: string) => {
    if (!token || !user?.address) {
      toast.error('Not authenticated');
      return;
    }
    setRetryingOrders(prev => new Set(prev).add(orderId));
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      const result = await authApi.post(`/api/admin/purchases/repair/${purchaseId}`, {});
      console.log('[Retry Result]', JSON.stringify(result, null, 2));
      toast.success(`Repair initiated for ${purchaseId}`);
    } catch (err: any) {
      console.error('[Retry Error]', err);
      const errorMessage = err?.data?.message || err?.message || 'Unknown error';
      toast.error(`Retry failed: ${errorMessage}`);
    } finally {
      setRetryingOrders(prev => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleDeleteOne = async (purchaseId: string) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    setDeletingOrders(prev => new Set(prev).add(purchaseId));
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      await authApi.delete(`/api/admin/purchases/${purchaseId}`);
      toast.success(`Purchase ${purchaseId.slice(0, 8)}... deleted`);
    } catch (err: any) {
      toast.error(`Delete failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setDeletingOrders(prev => { const n = new Set(prev); n.delete(purchaseId); return n; });
    }
  };

  const handleClearAll = async () => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    setClearingAll(true);
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      const result: any = await authApi.delete('/api/admin/purchases');
      toast.success(`Cleared ${result?.deleted ?? 0} purchase records`);
    } catch (err: any) {
      toast.error(`Clear failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setClearingAll(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied!');
  };

  const AMBER = '#f59e0b';

  const statusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={8} />;
      case 'failed': return <XCircle size={8} />;
      case 'cancelled': return <XCircle size={8} />;
      case 'needs_review': return <AlertCircle size={8} />;
      case 'partial': return <AlertCircle size={8} />;
      default: return <AlertCircle size={8} />;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return GREEN;
      case 'failed': return RED;
      case 'cancelled': return 'rgba(161,161,170,0.9)';
      case 'needs_review': return AMBER;
      case 'partial': return '#eab308';
      default: return '#eab308';
    }
  };

  const parseReconciliation = (raw?: string) => {
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  };

  const nftExplorerUrl = (nftId: string) => `https://mainnet.helius-rpc.com/v0/compression/${nftId}`;

  const allRecordsFlat = useMemo(() => {
    const all: any[] = [];
    groupedOrders.forEach(g => g.records.forEach(r => all.push(r)));
    return all;
  }, [groupedOrders]);

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {(['all', 'completed', 'pending', 'partial', 'failed', 'needs_review'] as const).map(f => (
          <button key={f} onClick={() => setStatusFilter(f)} className="px-3 py-2 rounded-xl text-xs font-bold capitalize transition-all"
            style={{
              background: f === 'needs_review' && statusFilter === f
                ? 'rgba(245,158,11,0.25)'
                : f === 'needs_review'
                  ? 'rgba(245,158,11,0.1)'
                  : statusFilter === f ? 'rgba(139,92,246,0.25)' : 'rgba(0,0,0,0.3)',
              border: f === 'needs_review'
                ? `1px solid ${statusFilter === f ? 'rgba(245,158,11,0.6)' : 'rgba(245,158,11,0.35)'}`
                : `1px solid ${statusFilter === f ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.1)'}`,
              color: f === 'needs_review' ? '#fbbf24' : statusFilter === f ? '#e0d7ff' : 'rgba(220,214,240,0.4)',
              minHeight: '48px',
            }}>{f === 'needs_review' ? '⚠ Needs Review' : f}</button>
        ))}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setViewMode(v => v === 'grouped' ? 'all' : 'grouped')}
            className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(139,92,246,0.2)',
              color: '#e0d7ff', minHeight: '48px',
            }}>
            {viewMode === 'grouped' ? 'Show All Records' : 'Group by Order'}
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={clearingAll || packPurchases.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: clearingAll ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: clearingAll ? 'rgba(239,68,68,0.4)' : '#ef4444',
                  minHeight: '48px',
                  cursor: clearingAll || packPurchases.length === 0 ? 'not-allowed' : 'pointer',
                }}>
                {clearingAll ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {clearingAll ? 'Clearing...' : 'Clear All'}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent style={{ background: 'rgba(15,5,30,0.97)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <AlertDialogHeader>
                <AlertDialogTitle style={{ color: '#ef4444' }}>Delete ALL purchase records?</AlertDialogTitle>
                <AlertDialogDescription style={{ color: 'rgba(220,214,240,0.6)' }}>
                  This will permanently delete all {packPurchases.length} pack purchase records from the database.
                  This action cannot be undone. Use this only to wipe test data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAll}
                  style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none' }}>
                  Yes, delete all
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Orders', value: groupedOrders.length, color: '#a78bfa' },
          { label: 'Completed', value: groupedOrders.filter(g => g.records[0]?.status === 'completed').length, color: GREEN },
          { label: 'Partial', value: groupedOrders.filter(g => g.records.some(r => r.status === 'partial')).length, color: '#eab308' },
          { label: 'Needs Review', value: groupedOrders.filter(g => g.records.some(r => r.status === 'needs_review')).length, color: '#f59e0b' },
        ].map(stat => (
          <div key={stat.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <div className="text-xl font-black" style={{ color: stat.color, fontFamily: "'Inter', monospace" }}>{stat.value}</div>
            <div className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {viewMode === 'grouped' ? (
          filtered.map(group => {
            const latestRecord = group.records[0];
            const reconciled = parseReconciliation(latestRecord.paymentReconciliation);
            const artistPayout = latestRecord.artistPayoutStatus;
            const solPrice = latestRecord.solPriceAtPurchase;
            const artistUSD = latestRecord.artistPayoutUSD;
            const isExpanded = expandedOrders.has(group.orderId);
            const needsRetry = latestRecord.status === 'partial' || latestRecord.status === 'failed' || latestRecord.status === 'pending' || latestRecord.status === 'needs_review';
            const isRetrying = retryingOrders.has(group.orderId);

            return (
              <div key={group.orderId} className="rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${statusColor(latestRecord.status) === GREEN ? 'rgba(16,185,129,0.2)' : statusColor(latestRecord.status) === RED ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}` }}>
                {/* Header row - always visible */}
                <div className="p-4 cursor-pointer" onClick={() => toggleExpand(group.orderId)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold truncate" style={{ color: '#e0d7ff' }}>
                          Order #{group.orderId}
                        </span>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                          style={{
                            background: `${statusColor(latestRecord.status)}18`,
                            color: statusColor(latestRecord.status),
                          }}>
                          {statusIcon(latestRecord.status)} {latestRecord.status}
                        </span>
                        {group.records.length > 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                            {group.records.length} records
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={12} style={{ color: 'rgba(220,214,240,0.3)' }} /> : <ChevronDown size={12} style={{ color: 'rgba(220,214,240,0.3)' }} />}
                      </div>
                      {latestRecord.status === 'needs_review' && (latestRecord as any).needsReviewReason && (
                        <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg mb-1 text-[11px]"
                          style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                          <AlertCircle size={11} className="flex-shrink-0 mt-px" />
                          <span className="break-all">{(latestRecord as any).needsReviewReason}</span>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>
                        <span>Pack: {latestRecord.packName ?? '--'}</span>
                        <span>Buyer: {shortenAddress(latestRecord.buyerAddress ?? '--')}</span>
                        {latestRecord.buyerEmail && <span>{latestRecord.buyerEmail}</span>}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1" style={{ color: 'rgba(220,214,240,0.35)' }}>
                        <span style={{ color: PURPLE }}>
                          {(Number(latestRecord.artistPayoutSOL) / 1e9).toFixed(4)} SOL
                        </span>
                        {latestRecord.tokenAmount && <span>{Number(latestRecord.tokenAmount).toLocaleString()} tokens</span>}
                        {artistUSD && <span>Artist: ${(Number(artistUSD) / 100).toFixed(2)}</span>}
                        {solPrice && <span>SOL@${(Number(solPrice) / 100).toFixed(2)}</span>}
                        {artistPayout && (
                          <span className={artistPayout === 'paid' ? '' : 'text-yellow-400'}>
                            Payout: {artistPayout}
                          </span>
                        )}
                      </div>
                      {reconciled && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.entries(reconciled).map(([key, val]) => (
                            <span key={key} className="px-2 py-0.5 rounded text-[10px] font-mono"
                              style={{
                                background: val === 'success' ? 'rgba(16,185,129,0.1)' : val === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                                color: val === 'success' ? GREEN : val === 'failed' ? RED : '#eab308',
                              }}>
                              {key === 'nftMint' && val === 'success' ? (
                                <a href={nftExplorerUrl(latestRecord.nftTxHashes ?? '')} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:underline" onClick={e => e.stopPropagation()}>
                                  {key}: {val as string} <ExternalLink size={8} />
                                </a>
                              ) : (
                                <>{key}: {val as string}</>
                              )}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {needsRetry && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRetry(latestRecord.id, group.orderId); }}
                          disabled={isRetrying}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                          style={{
                            background: isRetrying ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.2)',
                            color: isRetrying ? 'rgba(167,139,250,0.5)' : '#a78bfa',
                            border: '1px solid rgba(139,92,246,0.3)',
                            minHeight: '32px',
                          }}>
                          {isRetrying ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                          {isRetrying ? 'Retrying...' : 'Retry Fulfill'}
                        </button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            disabled={deletingOrders.has(latestRecord.id)}
                            className="flex items-center justify-center rounded-lg transition-all"
                            style={{
                              background: 'rgba(239,68,68,0.1)',
                              border: '1px solid rgba(239,68,68,0.25)',
                              color: deletingOrders.has(latestRecord.id) ? 'rgba(239,68,68,0.3)' : '#ef4444',
                              minHeight: '32px', minWidth: '32px',
                            }}>
                            {deletingOrders.has(latestRecord.id)
                              ? <Loader2 size={10} className="animate-spin" />
                              : <Trash2 size={10} />}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent style={{ background: 'rgba(15,5,30,0.97)', border: '1px solid rgba(239,68,68,0.35)' }}>
                          <AlertDialogHeader>
                            <AlertDialogTitle style={{ color: '#ef4444' }}>Delete purchase record?</AlertDialogTitle>
                            <AlertDialogDescription style={{ color: 'rgba(220,214,240,0.6)' }}>
                              This will permanently delete purchase record <span className="font-mono text-[11px]">{latestRecord.id}</span> (Order #{group.orderId}).
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteOne(latestRecord.id)}
                              style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none' }}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <span className="text-[10px]" style={{ color: 'rgba(220,214,240,0.25)' }}>{formatTime(latestRecord.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t" style={{ borderColor: 'rgba(139,92,246,0.1)' }}>
                    <div className="pt-3">
                      <p className="text-[10px] font-bold mb-2" style={{ color: 'rgba(220,214,240,0.5)' }}>
                        All Purchase Records ({group.records.length}):
                      </p>
                      {group.records.map((record: any, idx: number) => {
                        const rec = parseReconciliation(record.paymentReconciliation);
                        return (
                          <div key={record.id} className="p-3 rounded-lg mb-2 text-xs" style={{
                            background: idx === 0 ? 'rgba(139,92,246,0.05)' : 'rgba(0,0,0,0.2)',
                            border: `1px solid ${idx === 0 ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)'}`,
                          }}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-mono" style={{ color: 'rgba(220,214,240,0.6)' }}>{record.id}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                                style={{
                                  background: `${statusColor(record.status)}18`,
                                  color: statusColor(record.status),
                                }}>
                                {record.status}
                              </span>
                            </div>
                            {rec && (
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {Object.entries(rec).map(([key, val]) => (
                                  <span key={key} className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                                    style={{
                                      background: val === 'success' ? 'rgba(16,185,129,0.1)' : val === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                                      color: val === 'success' ? GREEN : val === 'failed' ? RED : '#eab308',
                                    }}>
                                    {key}: {val as string}
                                  </span>
                                ))}
                              </div>
                            )}
                            {!rec && record.status !== 'completed' && (
                              <span className="text-[9px] italic" style={{ color: 'rgba(220,214,240,0.3)' }}>
                                No reconciliation data — fulfillment may not have started
                              </span>
                            )}
                            {record.nftTxHashes && record.paymentReconciliation && parseReconciliation(record.paymentReconciliation)?.nftMint === 'success' && (
                              <a href={nftExplorerUrl(record.nftTxHashes)} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-1 text-[9px] hover:underline" style={{ color: GREEN }}>
                                View NFT on Explorer <ExternalLink size={8} />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          /* Flat view - show all records individually */
          allRecordsFlat.filter(r => {
            if (statusFilter === 'all') return true;
            return r.status === statusFilter;
          }).map(record => {
            const reconciled = parseReconciliation(record.paymentReconciliation);
            const artistPayout = record.artistPayoutStatus;
            const solPrice = record.solPriceAtPurchase;
            const artistUSD = record.artistPayoutUSD;
            const needsRetry = record.status === 'partial' || record.status === 'failed' || record.status === 'pending' || record.status === 'needs_review';
            const isRetrying = retryingOrders.has(record.shopifyOrderId ?? record.id);

            return (
              <div key={record.id} className="p-4 rounded-xl" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${statusColor(record.status) === GREEN ? 'rgba(16,185,129,0.2)' : statusColor(record.status) === RED ? 'rgba(239,68,68,0.2)' : 'rgba(234,179,8,0.2)'}` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate" style={{ color: '#e0d7ff' }}>
                        Order #{record.shopifyOrderId ?? record.id}
                      </span>
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0"
                        style={{
                          background: `${statusColor(record.status)}18`,
                          color: statusColor(record.status),
                        }}>
                        {statusIcon(record.status)} {record.status}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'rgba(220,214,240,0.3)' }}>{record.id.slice(0, 16)}...</span>
                    </div>
                    {record.status === 'needs_review' && (record as any).needsReviewReason && (
                      <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg mb-1 text-[11px]"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                        <AlertCircle size={11} className="flex-shrink-0 mt-px" />
                        <span className="break-all">{(record as any).needsReviewReason}</span>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>
                      <span>Pack: {record.packName ?? '--'}</span>
                      <span>Buyer: {shortenAddress(record.buyerAddress ?? '--')}</span>
                      {record.buyerEmail && <span>{record.buyerEmail}</span>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mt-1" style={{ color: 'rgba(220,214,240,0.35)' }}>
                      <span style={{ color: PURPLE }}>
                        {(Number(record.artistPayoutSOL) / 1e9).toFixed(4)} SOL
                      </span>
                      {record.tokenAmount && <span>{Number(record.tokenAmount).toLocaleString()} tokens</span>}
                      {artistUSD && <span>Artist: ${(Number(artistUSD) / 100).toFixed(2)}</span>}
                      {solPrice && <span>SOL@${(Number(solPrice) / 100).toFixed(2)}</span>}
                      {artistPayout && (
                        <span className={artistPayout === 'paid' ? '' : 'text-yellow-400'}>
                          Payout: {artistPayout}
                        </span>
                      )}
                    </div>
                    {reconciled && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(reconciled).map(([key, val]) => (
                          <span key={key} className="px-2 py-0.5 rounded text-[10px] font-mono"
                            style={{
                              background: val === 'success' ? 'rgba(16,185,129,0.1)' : val === 'failed' ? 'rgba(239,68,68,0.1)' : 'rgba(234,179,8,0.1)',
                              color: val === 'success' ? GREEN : val === 'failed' ? RED : '#eab308',
                            }}>
                            {key === 'nftMint' && val === 'success' ? (
                              <a href={nftExplorerUrl(record.nftTxHashes ?? '')} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:underline">
                                {key}: {val as string} <ExternalLink size={8} />
                              </a>
                            ) : (
                              <>{key}: {val as string}</>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {!reconciled && record.status !== 'completed' && record.status !== 'pending_wallet' && (
                      <div className="mt-2 px-2 py-1 rounded text-[10px]" style={{ background: 'rgba(234,179,8,0.05)', color: '#eab308', border: '1px solid rgba(234,179,8,0.15)' }}>
                        ⚠ No reconciliation data — fulfillment pipeline did not complete or was never triggered
                      </div>
                    )}
                    {record.nftTxHashes && reconciled?.nftMint === 'success' && (
                      <a href={nftExplorerUrl(record.nftTxHashes)} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 mt-2 text-xs hover:underline" style={{ color: GREEN }}>
                        🔗 View NFT on Helius Explorer <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {needsRetry && (
                      <button
                        onClick={() => handleRetry(record.id, record.shopifyOrderId ?? record.id)}
                        disabled={isRetrying}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                        style={{
                          background: isRetrying ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.2)',
                          color: isRetrying ? 'rgba(167,139,250,0.5)' : '#a78bfa',
                          border: '1px solid rgba(139,92,246,0.3)',
                          minHeight: '32px',
                        }}>
                        {isRetrying ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} />}
                        {isRetrying ? 'Retrying...' : 'Retry'}
                      </button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={deletingOrders.has(record.id)}
                          className="flex items-center justify-center rounded-lg transition-all"
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: deletingOrders.has(record.id) ? 'rgba(239,68,68,0.3)' : '#ef4444',
                            minHeight: '32px', minWidth: '32px',
                          }}>
                          {deletingOrders.has(record.id)
                            ? <Loader2 size={10} className="animate-spin" />
                            : <Trash2 size={10} />}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent style={{ background: 'rgba(15,5,30,0.97)', border: '1px solid rgba(239,68,68,0.35)' }}>
                        <AlertDialogHeader>
                          <AlertDialogTitle style={{ color: '#ef4444' }}>Delete purchase record?</AlertDialogTitle>
                          <AlertDialogDescription style={{ color: 'rgba(220,214,240,0.6)' }}>
                            This will permanently delete purchase record <span className="font-mono text-[11px]">{record.id}</span>.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}>
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOne(record.id)}
                            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none' }}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <span className="text-[10px]" style={{ color: 'rgba(220,214,240,0.25)' }}>{formatTime(record.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {(viewMode === 'grouped' ? filtered.length : allRecordsFlat.filter(r => {
          if (statusFilter === 'all') return true;
          return r.status === statusFilter;
        }).length) === 0 && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>No orders found</div>
        )}
      </div>
    </div>
  );
};

// ─── Stuck Orders Section ───────────────────────────────────────────────────
const StepBadge: React.FC<{ label: string; value: boolean | undefined }> = ({ label, value }) => {
  let bg = 'rgba(100,100,100,0.15)';
  let color = 'rgba(220,214,240,0.35)';
  let icon = '—';
  if (value === true) { bg = 'rgba(16,185,129,0.12)'; color = GREEN; icon = '✓'; }
  if (value === false) { bg = 'rgba(239,68,68,0.12)'; color = RED; icon = '✗'; }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold"
      style={{ background: bg, color }}>
      {icon} {label}
    </span>
  );
};

const StuckOrdersSection: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [purchases, setPurchases] = useState<PackPurchasesResponse[]>([]);
  const [resumingIds, setResumingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      if (user) {
        try { const t = await getIdToken(); setToken(t ?? ''); } catch {}
      }
    })();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getManyPackPurchases('order by createdAt desc limit 300');
      if (!mounted) return;
      const stuck = (data ?? []).filter(p =>
        p.status !== 'cancelled' && (
          p.status === 'needs_review' ||
          p.status === 'partial' ||
          p.stepTokens === false || p.stepPayout === false ||
          p.stepNft === false || p.stepNotify === false ||
          (p.stepTokens == null && p.status !== 'completed') ||
          (p.stepPayout == null && p.status !== 'completed')
        )
      );
      setPurchases(stuck);
    })();
    subscribeManyPackPurchases((updated) => {
      if (!mounted) return;
      const stuck = (updated ?? []).filter(p =>
        p.status !== 'cancelled' && (
          p.status === 'needs_review' ||
          p.status === 'partial' ||
          p.stepTokens === false || p.stepPayout === false ||
          p.stepNft === false || p.stepNotify === false ||
          (p.stepTokens == null && p.status !== 'completed') ||
          (p.stepPayout == null && p.status !== 'completed')
        )
      );
      setPurchases(stuck);
    }, 'order by createdAt desc limit 300');
    return () => { mounted = false; };
  }, []);

  const handleResume = async (p: PackPurchasesResponse) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    setResumingIds(prev => new Set(prev).add(p.id));
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      const result: any = await authApi.post(`/api/admin/purchases/${p.id}/resume`, {});
      const completed = result?.stepsCompleted?.length ?? 0;
      toast.success(`Resumed — ${completed} step${completed !== 1 ? 's' : ''} completed`);
    } catch (err: any) {
      toast.error(`Resume failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setResumingIds(prev => { const n = new Set(prev); n.delete(p.id); return n; });
    }
  };

  const handleDeleteOne = async (purchaseId: string) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    setDeletingIds(prev => new Set(prev).add(purchaseId));
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      await authApi.delete(`/api/admin/purchases/${purchaseId}`);
      toast.success(`Order ${purchaseId.slice(0, 8)}... cancelled`);
    } catch (err: any) {
      toast.error(`Cancel failed: ${err?.message ?? 'Unknown error'}`);
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(purchaseId); return n; });
    }
  };

  const failedPurchases = purchases.filter(p => p.status === 'failed');

  const handleClearAllFailed = async () => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    if (failedPurchases.length === 0) return;
    setBulkDeleting(true);
    let succeeded = 0;
    let failed = 0;
    const authApi = createAuthenticatedApiClient(token, user.address);
    await Promise.all(
      failedPurchases.map(async p => {
        try {
          await authApi.delete(`/api/admin/purchases/${p.id}`);
          succeeded++;
        } catch {
          failed++;
        }
      })
    );
    setBulkDeleting(false);
    if (failed === 0) {
      toast.success(`Cancelled ${succeeded} failed order${succeeded !== 1 ? 's' : ''}`);
    } else {
      toast.error(`${succeeded} cancelled, ${failed} failed`);
    }
  };

  return (
    <div>
      {/* Header row with count and bulk action */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle size={14} style={{ color: purchases.length > 0 ? '#eab308' : 'rgba(255,255,255,0.3)' }} />
          <span className="text-sm font-bold" style={{ color: purchases.length > 0 ? '#eab308' : 'rgba(255,255,255,0.3)' }}>
            {purchases.length > 0
              ? `${purchases.length} stuck order${purchases.length !== 1 ? 's' : ''} found`
              : 'No stuck orders — all fulfillments healthy'}
          </span>
        </div>

        {failedPurchases.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{
                  background: bulkDeleting ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.35)',
                  color: bulkDeleting ? 'rgba(239,68,68,0.4)' : '#ef4444',
                  minHeight: '36px',
                  cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                }}>
                {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                {bulkDeleting ? 'Cancelling...' : `Cancel All Failed (${failedPurchases.length})`}
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent style={{ background: 'rgba(15,5,30,0.97)', border: '1px solid rgba(239,68,68,0.35)' }}>
              <AlertDialogHeader>
                <AlertDialogTitle style={{ color: '#ef4444' }}>
                  Cancel {failedPurchases.length} permanently failed order{failedPurchases.length !== 1 ? 's' : ''}?
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div style={{ color: 'rgba(220,214,240,0.6)' }}>
                    <p className="mb-3">
                      Only orders with <span className="font-mono text-[11px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>failed</span> status
                      will be cancelled. Other statuses (pending, retrying, partial_failure, etc.) must be cancelled one at a time.
                      Records are tombstoned (not deleted) so Shopify retries are handled safely.
                    </p>
                    <div className="max-h-48 overflow-y-auto rounded-lg p-2 space-y-1"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(239,68,68,0.15)' }}>
                      {failedPurchases.map(p => (
                        <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono" style={{ color: 'rgba(220,214,240,0.5)' }}>{p.id.slice(0, 20)}...</span>
                          {p.purchaseAmountUsd != null && (
                            <span style={{ color: 'rgba(220,214,240,0.35)' }}>${Number(p.purchaseAmountUsd).toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleClearAllFailed}
                  style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none' }}>
                  Cancel {failedPurchases.length} Failed Orders
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {purchases.length === 0 ? null : (
        <div className="space-y-3">
          {purchases.map(p => {
            const isResuming = resumingIds.has(p.id);
            const isDeleting = deletingIds.has(p.id);
            return (
              <div key={p.id} className="p-4 rounded-xl" style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid rgba(234,179,8,0.2)',
              }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold" style={{ color: '#e0d7ff' }}>
                        {p.packName ?? 'Unknown Pack'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                          background: p.status === 'needs_review' ? 'rgba(245,158,11,0.15)' : 'rgba(234,179,8,0.12)',
                          color: p.status === 'needs_review' ? '#f59e0b' : '#eab308',
                          border: p.status === 'needs_review' ? '1px solid rgba(245,158,11,0.4)' : 'none',
                        }}>
                        {p.status === 'needs_review' ? '⚠ needs_review' : p.status}
                      </span>
                      {p.purchaseAmountUsd != null && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                          ${Number(p.purchaseAmountUsd).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {p.status === 'needs_review' && (p as any).needsReviewReason && (
                      <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg mb-1 text-[11px]"
                        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', color: '#fbbf24' }}>
                        <AlertCircle size={11} className="flex-shrink-0 mt-px" />
                        <span className="break-all">{(p as any).needsReviewReason}</span>
                      </div>
                    )}
                    <div className="text-xs mb-1" style={{ color: 'rgba(220,214,240,0.5)' }}>
                      {p.buyerEmail && <span className="mr-3">{p.buyerEmail}</span>}
                      {p.shopifyOrderId && <span className="mr-3">Order #{p.shopifyOrderId}</span>}
                      {p.tokenAmount ? <span>~{Number(p.tokenAmount).toLocaleString()} tokens</span> : null}
                    </div>
                    <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.3)' }}>
                      {formatTime(p.createdAt)} · ID: {p.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleResume(p)}
                      disabled={isResuming}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: isResuming ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.2)',
                        color: isResuming ? 'rgba(167,139,250,0.4)' : '#a78bfa',
                        border: '1px solid rgba(139,92,246,0.3)',
                        minHeight: '36px',
                      }}
                    >
                      {isResuming ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      {isResuming ? 'Resuming...' : 'Resume'}
                    </button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          disabled={isDeleting}
                          className="flex items-center justify-center rounded-lg transition-all"
                          style={{
                            background: 'rgba(239,68,68,0.1)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: isDeleting ? 'rgba(239,68,68,0.3)' : '#ef4444',
                            minHeight: '36px', minWidth: '36px',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                          }}>
                          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent style={{ background: 'rgba(15,5,30,0.97)', border: '1px solid rgba(239,68,68,0.35)' }}>
                        <AlertDialogHeader>
                          <AlertDialogTitle style={{ color: '#ef4444' }}>Cancel order?</AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div style={{ color: 'rgba(220,214,240,0.6)' }}>
                              <div className="space-y-1 mb-3">
                                <div className="flex gap-2 text-xs">
                                  <span style={{ color: 'rgba(220,214,240,0.4)' }}>Order ID:</span>
                                  <span className="font-mono" style={{ color: '#e0d7ff' }}>{p.id}</span>
                                </div>
                                {p.purchaseAmountUsd != null && (
                                  <div className="flex gap-2 text-xs">
                                    <span style={{ color: 'rgba(220,214,240,0.4)' }}>Amount:</span>
                                    <span style={{ color: '#e0d7ff' }}>${Number(p.purchaseAmountUsd).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex gap-2 text-xs">
                                  <span style={{ color: 'rgba(220,214,240,0.4)' }}>Status:</span>
                                  <span style={{ color: '#eab308' }}>{p.status}</span>
                                </div>
                              </div>
                              <p className="text-xs">This will mark the order as cancelled (tombstone). The record is preserved so Shopify retries are safely blocked.</p>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}>
                            Go back
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteOne(p.id)}
                            style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none' }}>
                            Cancel order
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <StepBadge label="Tokens" value={p.stepTokens} />
                  <StepBadge label="Payout" value={p.stepPayout} />
                  <StepBadge label="NFT" value={p.stepNft} />
                  <StepBadge label="Notify" value={p.stepNotify} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Fee Record & Wallet Monitor ────────────────────────────────────────────
interface FeeRecord {
  id: string;
  recipient: string;
  solAmt: number;
  tarobase_created_at: number;
  tarobase_transaction_hash?: string;
  source: 'song' | 'pack';
}

interface WalletMonitorSectionProps {
  walletAddress: string;
  title: string;
  icon: React.ReactNode;
  songsFeeFetcher: (id: string, filter?: string) => Promise<any[]>;
  songsFeeSubscriber: (cb: (data: any[]) => void, id: string, filter?: string) => Promise<() => Promise<void>>;
  packFeeFetcher: (id: string, filter?: string) => Promise<any[]>;
  packFeeSubscriber: (cb: (data: any[]) => void, id: string, filter?: string) => Promise<() => Promise<void>>;
}

const WalletMonitorSection: React.FC<WalletMonitorSectionProps> = ({
  walletAddress, title, icon,
  songsFeeFetcher, songsFeeSubscriber, packFeeFetcher, packFeeSubscriber,
}) => {
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBalances = async () => {
    setRefreshing(true);
    try {
      const sol = await runSolBalanceQueryForCommonQueries('main', { walletAddress });
      const usdc = await runUsdcBalanceQueryForCommonQueries('main', { walletAddress });
      setSolBalance(sol);
      setUsdcBalance(usdc);
    } catch (err) {
      console.error('Balance fetch error:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [songsFees, packFees] = await Promise.all([
        songsFeeFetcher('', 'order by tarobase_created_at desc limit 200'),
        packFeeFetcher('', 'order by tarobase_created_at desc limit 200'),
      ]);
      if (!mounted) return;
      const combined: FeeRecord[] = [
        ...(songsFees ?? []).map((f: any) => ({ ...f, source: 'song' as const })),
        ...(packFees ?? []).map((f: any) => ({ ...f, source: 'pack' as const })),
      ];
      combined.sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0));
      setFees(combined);
      fetchBalances();
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubSongs: (() => Promise<void>) | null = null;
    let unsubPacks: (() => Promise<void>) | null = null;

    (async () => {
      unsubSongs = await songsFeeSubscriber((updated) => {
        if (!mounted) return;
        setFees(prev => {
          const others = prev.filter(f => f.source !== 'song');
          const mapped = (updated ?? []).map((f: any) => ({ ...f, source: 'song' as const }));
          const combined = [...others, ...mapped];
          combined.sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0));
          return combined;
        });
      }, '', 'order by tarobase_created_at desc limit 200');
      unsubPacks = await packFeeSubscriber((updated) => {
        if (!mounted) return;
        setFees(prev => {
          const others = prev.filter(f => f.source !== 'pack');
          const mapped = (updated ?? []).map((f: any) => ({ ...f, source: 'pack' as const }));
          const combined = [...others, ...mapped];
          combined.sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0));
          return combined;
        });
      }, '', 'order by tarobase_created_at desc limit 200');
    })();

    return () => {
      mounted = false;
      unsubSongs?.().catch(() => {});
      unsubPacks?.().catch(() => {});
    };
  }, []);

  const totalFeesSol = fees.reduce((sum, f) => sum + (f.solAmt ?? 0), 0) / 1e9;
  const txCount = fees.length;
  const avgFee = txCount > 0 ? totalFeesSol / txCount : 0;

  return (
    <div>
      {/* Wallet Card */}
      <div className="p-4 rounded-xl mb-4" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {icon}
            <span className="text-sm font-bold" style={{ color: '#e0d7ff' }}>{title}</span>
          </div>
          <button onClick={fetchBalances} disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa', minHeight: '32px' }}>
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-mono text-xs" style={{ color: 'rgba(220,214,240,0.6)' }}>{shortenAddress(walletAddress)}</span>
          <button onClick={() => { navigator.clipboard.writeText(walletAddress); toast.success('Copied!'); }}
            className="p-1 rounded transition-all hover:bg-white/5" style={{ color: 'rgba(220,214,240,0.4)' }}>
            <ClipboardCheck size={12} />
          </button>
          <a href={`https://solscan.io/account/${walletAddress}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs hover:underline" style={{ color: PURPLE }}>
            Solscan <ExternalLink size={10} />
          </a>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <div className="text-lg font-black" style={{ color: '#a78bfa', fontFamily: "'Inter', monospace" }}>
              {solBalance !== null ? `${(solBalance / 1e9).toFixed(4)} SOL` : '—'}
            </div>
            <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>SOL Balance</div>
          </div>
          <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <div className="text-lg font-black" style={{ color: '#a78bfa', fontFamily: "'Inter', monospace" }}>
              {usdcBalance !== null ? `${(usdcBalance / 1e6).toFixed(2)} USDC` : '—'}
            </div>
            <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>USDC Balance</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}>
          <div className="text-xl font-black" style={{ color: GREEN, fontFamily: "'Inter', monospace" }}>{totalFeesSol.toFixed(4)}</div>
          <div className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Total Fees (SOL)</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}>
          <div className="text-xl font-black" style={{ color: '#a78bfa', fontFamily: "'Inter', monospace" }}>{txCount}</div>
          <div className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Transactions</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}>
          <div className="text-xl font-black" style={{ color: '#e0d7ff', fontFamily: "'Inter', monospace" }}>{avgFee.toFixed(6)}</div>
          <div className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Avg Fee (SOL)</div>
        </div>
      </div>

      {/* Fee History */}
      <div>
        <p className="text-xs font-bold mb-3" style={{ color: 'rgba(220,214,240,0.5)' }}>Fee History</p>
        <div className="space-y-2">
          {fees.map(fee => (
            <div key={`${fee.source}-${fee.id}`} className="p-3 rounded-xl flex items-center justify-between gap-3"
              style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(139,92,246,0.08)' }}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold" style={{ color: '#e0d7ff' }}>
                    {(fee.solAmt / 1e9).toFixed(6)} SOL
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                    style={{
                      background: fee.source === 'song' ? 'rgba(139,92,246,0.12)' : 'rgba(16,185,129,0.12)',
                      color: fee.source === 'song' ? '#a78bfa' : GREEN,
                    }}>
                    {fee.source === 'song' ? 'Song Trade' : 'Pack Purchase'}
                  </span>
                </div>
                <div className="text-[10px]" style={{ color: 'rgba(220,214,240,0.35)' }}>
                  {formatTime(fee.tarobase_created_at)}
                </div>
              </div>
              {fee.tarobase_transaction_hash && (
                <a href={`https://solscan.io/tx/${fee.tarobase_transaction_hash}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] hover:underline flex-shrink-0" style={{ color: PURPLE }}>
                  Tx <ExternalLink size={9} />
                </a>
              )}
            </div>
          ))}
          {fees.length === 0 && (
            <div className="text-center py-8" style={{ color: 'rgba(255,255,255,0.25)' }}>No fee transactions yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Emergency Controls ─────────────────────────────────────────────────────
const EmergencyControlsSection: React.FC = () => {
  const { user } = useAuth();
  const [token, setToken] = useState('');
  const [songs, setSongs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [swapTogglingIds, setSwapTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      if (user) {
        try { const t = await getIdToken(); setToken(t ?? ''); } catch {}
      }
    })();
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const s = await getManySongs('order by tarobase_created_at desc limit 200');
      if (!mounted) return;
      setSongs(s);
      subscribeManySongs((updated) => { if (mounted) setSongs(updated ?? []); }, 'order by tarobase_created_at desc limit 200');
    })();
    return () => { mounted = false; };
  }, []);

  const handleTogglePause = async (songId: string, currentPaused: boolean) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    setTogglingIds(prev => new Set(prev).add(songId));
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      await authApi.post(`/api/admin/songs/${songId}/set-paused`, { paused: !currentPaused });
      toast.success(`Song ${!currentPaused ? 'paused' : 'unpaused'}`);
    } catch {
      toast.error('Failed to update');
    } finally {
      setTogglingIds(prev => { const n = new Set(prev); n.delete(songId); return n; });
    }
  };

  const handleToggleSwapEligible = async (songId: string, currentEligible: boolean) => {
    if (!token || !user?.address) { toast.error('Not authenticated'); return; }
    setSwapTogglingIds(prev => new Set(prev).add(songId));
    try {
      const authApi = createAuthenticatedApiClient(token, user.address);
      await authApi.post(`/api/admin/songs/${songId}/set-swap-eligible`, { swapEligible: !currentEligible });
      toast.success(`Song ${!currentEligible ? 'added to' : 'removed from'} swap list`);
    } catch {
      toast.error('Failed to update swap eligibility');
    } finally {
      setSwapTogglingIds(prev => { const n = new Set(prev); n.delete(songId); return n; });
    }
  };

  const filtered = songs.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name ?? '').toLowerCase().includes(q) || (s.symbol ?? '').toLowerCase().includes(q);
  });

  const isGloballyPaused = String(PLATFORM_PAUSED) === 'true';

  return (
    <div>
      {/* Global pause status */}
      <div className="p-4 rounded-xl mb-6" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${isGloballyPaused ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.2)'}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: isGloballyPaused ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)', border: `1px solid ${isGloballyPaused ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}` }}>
            {isGloballyPaused ? <Pause size={18} style={{ color: '#ef4444' }} /> : <Play size={18} style={{ color: '#10B981' }} />}
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: '#e0d7ff' }}>Global Platform Pause</p>
            <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>
              {isGloballyPaused ? 'All trading is currently paused platform-wide.' : 'Platform is active. Trading is allowed.'}
            </p>
          </div>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold" style={{
            background: isGloballyPaused ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.12)',
            color: isGloballyPaused ? '#ef4444' : '#10B981',
            border: `1px solid ${isGloballyPaused ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.25)'}`,
          }}>
            {isGloballyPaused ? 'PAUSED' : 'ACTIVE'}
          </span>
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'rgba(220,214,240,0.35)' }}>
          <AlertTriangle size={10} className="inline mr-1" />
          This constant is managed via backend configuration and cannot be toggled from the frontend.
        </p>
      </div>

      {/* Per-song pause controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search songs..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }} />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(song => {
          const isPaused = song.paused === true;
          const isToggling = togglingIds.has(song.id);
          const isSwapEligible = song.swapEligible === true;
          const isSwapToggling = swapTogglingIds.has(song.id);
          return (
            <div key={song.id} className="p-4 rounded-xl flex items-center justify-between gap-3" style={{
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${isPaused ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.15)'}`,
            }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isPaused ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)' }}>
                  <Music size={16} style={{ color: isPaused ? '#ef4444' : '#10B981' }} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{song.name ?? 'Untitled'}</p>
                  <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>${song.symbol ?? 'TOKEN'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{
                  background: isPaused ? 'rgba(239,68,68,0.12)' : 'rgba(16,185,129,0.1)',
                  color: isPaused ? '#ef4444' : '#10B981',
                }}>
                  {isPaused ? 'Paused' : 'Active'}
                </span>
                <button
                  onClick={() => handleToggleSwapEligible(song.id, isSwapEligible)}
                  disabled={isSwapToggling}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: isSwapEligible ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255,255,255,0.05)',
                    color: isSwapEligible ? '#00FF41' : 'rgba(255,255,255,0.4)',
                    border: `1px solid ${isSwapEligible ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255,255,255,0.1)'}`,
                    minHeight: '36px',
                    opacity: isSwapToggling ? 0.5 : 1,
                    cursor: isSwapToggling ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSwapToggling ? <Loader2 size={12} className="animate-spin" /> : <ArrowUpDown size={12} />}
                  {isSwapToggling ? 'Updating...' : isSwapEligible ? 'Swap On' : 'Swap Off'}
                </button>
                <button
                  onClick={() => handleTogglePause(song.id, isPaused)}
                  disabled={isToggling}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: isPaused ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                    color: isPaused ? '#10B981' : '#ef4444',
                    border: `1px solid ${isPaused ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                    minHeight: '36px',
                    opacity: isToggling ? 0.5 : 1,
                    cursor: isToggling ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isToggling ? <Loader2 size={12} className="animate-spin" /> : isPaused ? <Play size={12} /> : <Pause size={12} />}
                  {isToggling ? 'Updating...' : isPaused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>No songs found</div>
        )}
      </div>
    </div>
  );
};

// ─── Main AdminPage ─────────────────────────────────────────────────────────
const AdminPage: React.FC = () => {
  const { loading, user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'songs' | 'orders' | 'stuck' | 'pending' | 'treasury' | 'infra' | 'emergency' | 'streamAnalytics' | 'support' | 'errorLogs'>('songs');
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate('/');
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="animate-pulse text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
    </div>;
  }

  if (user?.address !== ADMIN_ADDRESS) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: BG }}>
        <div className="text-center px-4">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Shield size={28} style={{ color: RED }} />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Access Denied</h2>
          <p className="text-sm mb-6" style={{ color: 'rgba(220,214,240,0.5)' }}>Only the admin wallet can access this page.</p>
          <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
            Back to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: BG }}>
            <div className="container pt-24 pb-24 px-4 max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)' }}>
              <Shield size={18} style={{ color: PURPLE }} />
            </div>
            <div>
              <h1 className="text-3xl font-black" style={{ background: 'linear-gradient(135deg, #e0d7ff, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Admin
              </h1>
              <p className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Manage songs and view purchases</p>
            <div className="flex flex-wrap gap-2 mt-1">
            <button
              onClick={() => navigate('/admin/failed-fulfillments')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
            >
              <AlertCircle size={11} />
              Failed Fulfillments Retry Queue
            </button>
            <button
              onClick={() => navigate('/admin/trending')}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all hover:opacity-80"
              style={{ background: 'rgba(0, 255, 65, 0.08)', border: '1px solid rgba(0, 255, 65, 0.25)', color: '#00FF41' }}
            >
              <Zap size={11} />
              Curated Trending
            </button>
            </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { key: 'songs' as const, label: 'Songs', icon: <Music size={14} /> },
            { key: 'orders' as const, label: 'Orders', icon: <ShoppingCart size={14} /> },
            { key: 'stuck' as const, label: 'Stuck Orders', icon: <AlertCircle size={14} /> },
            { key: 'pending' as const, label: 'Pending', icon: <ClipboardCheck size={14} />, badge: pendingCount },
            { key: 'treasury' as const, label: 'Treasury', icon: <Wallet size={14} /> },
            { key: 'infra' as const, label: 'Infrastructure', icon: <Server size={14} /> },
            { key: 'emergency' as const, label: 'Emergency', icon: <AlertTriangle size={14} /> },
            { key: 'streamAnalytics' as const, label: 'Stream Analytics', icon: <BarChart3 size={14} /> },
            { key: 'support' as const, label: 'Support & DMCA', icon: <Headphones size={14} /> },
            { key: 'errorLogs' as const, label: 'Error Logs', icon: <Bug size={14} /> },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all relative"
              style={{
                background: activeTab === tab.key ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${activeTab === tab.key ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.1)'}`,
                color: activeTab === tab.key ? '#e0d7ff' : 'rgba(220,214,240,0.4)', minHeight: '48px',
              }}>
              {tab.icon}{tab.label}
              {'badge' in tab && (tab.badge ?? 0) > 0 && (
                <span style={{
                  background: '#EF4444',
                  color: '#fff',
                  borderRadius: '9999px',
                  fontSize: 10,
                  fontWeight: 800,
                  minWidth: 18,
                  height: 18,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 5px',
                  lineHeight: 1,
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 rounded-2xl" style={{ background: CARD_BG, border: '1px solid rgba(139,92,246,0.15)' }}>
          {activeTab === 'songs' && <SongManagementSection />}
          {activeTab === 'orders' && <OrdersSection />}
          {activeTab === 'stuck' && <StuckOrdersSection />}
          {activeTab === 'pending' && (
            <PendingApprovalSection onCountChange={setPendingCount} />
          )}
          {activeTab === 'treasury' && (
            <WalletMonitorSection
              walletAddress={TREASURY_WALLET}
              title="Treasury Wallet"
              icon={<Wallet size={16} style={{ color: PURPLE }} />}
              songsFeeFetcher={getAllSongsTreasuryFees}
              songsFeeSubscriber={subscribeAllSongsTreasuryFees}
              packFeeFetcher={getAllPackPurchasesTreasuryFees}
              packFeeSubscriber={subscribeAllPackPurchasesTreasuryFees}
            />
          )}
          {activeTab === 'infra' && (
            <WalletMonitorSection
              walletAddress={OPERATIONS_WALLET}
              title="Infrastructure Wallet"
              icon={<Server size={16} style={{ color: PURPLE }} />}
              songsFeeFetcher={getAllSongsInfraFees}
              songsFeeSubscriber={subscribeAllSongsInfraFees}
              packFeeFetcher={getAllPackPurchasesInfraFees}
              packFeeSubscriber={subscribeAllPackPurchasesInfraFees}
            />
          )}
          {activeTab === 'emergency' && <EmergencyControlsSection />}
          {activeTab === 'streamAnalytics' && <StreamAnalyticsSection />}
          {activeTab === 'support' && <SupportTicketsSection />}
          {activeTab === 'errorLogs' && <ErrorLogsSection />}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
