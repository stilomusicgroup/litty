import React, { useState, useEffect, useMemo } from 'react';
import { getManySupportTickets, subscribeManySupportTickets, updateSupportTickets } from '@/lib/collections/supportTickets';
import type { SupportTicketsResponse } from '@/lib/collections/supportTickets';
import { toast } from 'sonner';
import {
  Ticket,
  ShieldAlert,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Search,
  Save,
  AlertCircle,
} from 'lucide-react';

const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#f59e0b';
const PURPLE = '#8B5CF6';

function shortenAddress(addr: string) {
  if (!addr) return 'Anonymous';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatTime(ts: number) {
  if (!ts) return '--';
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function statusBadge(status: string) {
  switch (status) {
    case 'open': return { color: AMBER, bg: 'rgba(245,158,11,0.12)', label: 'Open' };
    case 'in_progress': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'In Progress' };
    case 'resolved': return { color: GREEN, bg: 'rgba(16,185,129,0.12)', label: 'Resolved' };
    case 'closed': return { color: 'rgba(161,161,170,0.9)', bg: 'rgba(161,161,170,0.12)', label: 'Closed' };
    default: return { color: AMBER, bg: 'rgba(245,158,11,0.12)', label: status };
  }
}

function priorityBadge(priority: string) {
  switch (priority) {
    case 'high': return { color: RED, bg: 'rgba(239,68,68,0.12)', label: 'High' };
    case 'normal': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'Normal' };
    case 'low': return { color: GREEN, bg: 'rgba(16,185,129,0.12)', label: 'Low' };
    default: return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: priority };
  }
}

export const SupportTicketsSection: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketsResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'resolved'>('all');
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketsResponse | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getManySupportTickets('order by createdAt desc limit 100');
      if (!mounted) return;
      setTickets(data);
      subscribeManySupportTickets((updated) => {
        if (mounted) setTickets(updated ?? []);
      }, 'order by createdAt desc limit 100');
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let list = tickets;
    if (activeTab === 'open') list = list.filter((t) => t.status === 'open' || t.status === 'in_progress');
    if (activeTab === 'resolved') list = list.filter((t) => t.status === 'resolved' || t.status === 'closed');
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.subject.toLowerCase().includes(q) ||
        t.message.toLowerCase().includes(q) ||
        (t.userEmail?.toLowerCase().includes(q))
      );
    }
    return list;
  }, [tickets, activeTab, search]);

  const openCount = useMemo(() => tickets.filter((t) => t.status === 'open').length, [tickets]);

  const handleSave = async () => {
    if (!selectedTicket) return;
    setSaving(true);

    const success = await updateSupportTickets(selectedTicket.id, {
      status: selectedTicket.status,
      priority: selectedTicket.priority,
      adminNotes: selectedTicket.adminNotes,
      resolution: selectedTicket.resolution,
    });

    if (success) {
      toast.success('Ticket updated');
      setSelectedTicket(null);
    } else {
      toast.error('Failed to update ticket');
    }
    setSaving(false);
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {([
          { key: 'all' as const, label: 'All Tickets' },
          { key: 'open' as const, label: 'Open' },
          { key: 'resolved' as const, label: 'Resolved' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all relative"
            style={{
              background: activeTab === tab.key ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${activeTab === tab.key ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.1)'}`,
              color: activeTab === tab.key ? '#e0d7ff' : 'rgba(220,214,240,0.4)',
            }}
          >
            {tab.label}
            {tab.key === 'all' && openCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-black" style={{ background: RED, color: '#fff' }}>
                {openCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tickets..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
        />
      </div>

      {/* Ticket List */}
      <div className="space-y-2">
        {filtered.map((t) => {
          const s = statusBadge(t.status);
          const p = priorityBadge(t.priority);
          return (
            <button
              key={t.id}
              onClick={() => setSelectedTicket(t)}
              className="w-full text-left p-4 rounded-xl transition-all hover:opacity-90"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: s.bg, color: s.color }}>
                  {s.label}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                  {t.type}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: p.bg, color: p.color }}>
                  {p.label}
                </span>
              </div>
              <p className="text-sm font-bold text-white mb-1">{t.subject}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: 'rgba(220,214,240,0.4)' }}>
                  {t.userAddress ? shortenAddress(t.userAddress) : t.userEmail || 'Anonymous'} &middot; {formatTime(t.createdAt)}
                </span>
                <ChevronRight size={14} style={{ color: 'rgba(220,214,240,0.3)' }} />
              </div>
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'rgba(255,255,255,0.3)' }}>No tickets found</div>
        )}
      </div>

      {/* Detail Panel (modal-like overlay) */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-5 sm:p-6 max-h-[80vh] overflow-y-auto" style={{ background: 'rgba(15,5,30,0.98)', border: '1px solid rgba(139,92,246,0.2)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-white">Ticket Details</h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <XCircle size={16} style={{ color: 'rgba(220,214,240,0.5)' }} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: statusBadge(selectedTicket.status).bg, color: statusBadge(selectedTicket.status).color }}>
                  {statusBadge(selectedTicket.status).label}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                  {selectedTicket.type}
                </span>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Subject</p>
                <p className="text-sm font-bold text-white">{selectedTicket.subject}</p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Message</p>
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'rgba(220,214,240,0.8)' }}>{selectedTicket.message}</p>
              </div>

              {selectedTicket.type === 'dmca' && (
                <div className="p-3 rounded-xl space-y-2" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                  <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#fca5a5' }}>DMCA Details</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div><span style={{ color: 'rgba(220,214,240,0.5)' }}>Claimant:</span> <span className="text-white">{selectedTicket.claimantName || '--'}</span></div>
                    <div><span style={{ color: 'rgba(220,214,240,0.5)' }}>Email:</span> <span className="text-white">{selectedTicket.userEmail || '--'}</span></div>
                    <div><span style={{ color: 'rgba(220,214,240,0.5)' }}>Content URL:</span> <span className="text-white break-all">{selectedTicket.contentUrl || '--'}</span></div>
                    <div><span style={{ color: 'rgba(220,214,240,0.5)' }}>Original Work:</span> <span className="text-white break-all">{selectedTicket.originalWorkUrl || '--'}</span></div>
                    <div><span style={{ color: 'rgba(220,214,240,0.5)' }}>Good Faith:</span> <span className="text-white">{selectedTicket.goodFaithStatement ? 'Yes' : 'No'}</span></div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Status</p>
                  <select
                    value={selectedTicket.status}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Priority</p>
                  <select
                    value={selectedTicket.priority}
                    onChange={(e) => setSelectedTicket({ ...selectedTicket, priority: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Admin Notes</p>
                <textarea
                  value={selectedTicket.adminNotes || ''}
                  onChange={(e) => setSelectedTicket({ ...selectedTicket, adminNotes: e.target.value })}
                  placeholder="Internal notes..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
                />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(220,214,240,0.4)' }}>Resolution (shown to user)</p>
                <textarea
                  value={selectedTicket.resolution || ''}
                  onChange={(e) => setSelectedTicket({ ...selectedTicket, resolution: e.target.value })}
                  placeholder="Resolution message..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: 'rgba(139,92,246,0.25)',
                  color: '#e0d7ff',
                  border: '1px solid rgba(139,92,246,0.4)',
                  opacity: saving ? 0.6 : 1,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                <Save size={14} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
