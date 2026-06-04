import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { api } from '@/lib/api-client';
import { getManySupportTickets, subscribeManySupportTickets } from '@/lib/collections/supportTickets';
import type { SupportTicketsResponse } from '@/lib/collections/supportTickets';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Ticket,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  ChevronRight,
  LifeBuoy,
  ShieldAlert,
  Mail,
  User,
  Link as LinkIcon,
  FileText,
} from 'lucide-react';

const CARD_BG = 'rgba(15, 5, 30, 0.85)';
const PURPLE = '#8B5CF6';
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#f59e0b';

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

function statusBadge(status: string) {
  switch (status) {
    case 'open': return { color: AMBER, bg: 'rgba(245,158,11,0.12)', label: 'Open' };
    case 'in_progress': return { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', label: 'In Progress' };
    case 'resolved': return { color: GREEN, bg: 'rgba(16,185,129,0.12)', label: 'Resolved' };
    case 'closed': return { color: 'rgba(161,161,170,0.9)', bg: 'rgba(161,161,170,0.12)', label: 'Closed' };
    default: return { color: AMBER, bg: 'rgba(245,158,11,0.12)', label: status };
  }
}

// ─── Submit Ticket Form ─────────────────────────────────────────────────────

const TicketForm: React.FC = () => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isDmca, setIsDmca] = useState(false);
  const [claimantName, setClaimantName] = useState('');
  const [contentUrl, setContentUrl] = useState('');
  const [originalWorkUrl, setOriginalWorkUrl] = useState('');
  const [goodFaithStatement, setGoodFaithStatement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const body: any = {
        type: isDmca ? 'dmca' : 'support',
        subject: isDmca ? 'DMCA Takedown Request' : subject,
        message,
        userEmail,
      };

      if (isDmca) {
        body.claimantName = claimantName;
        body.contentUrl = contentUrl;
        body.originalWorkUrl = originalWorkUrl || undefined;
        body.goodFaithStatement = goodFaithStatement;
      }

      const result = await api.post<{ ticketId: string; status: string }>('/api/support/ticket', body);
      setSubmittedId(result.ticketId);
      toast.success('Ticket submitted successfully');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to submit ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedId) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <CheckCircle size={28} style={{ color: GREEN }} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Ticket Submitted</h3>
        <p className="text-sm mb-4" style={{ color: 'rgba(220,214,240,0.5)' }}>
          Your reference number is <span className="font-mono font-bold" style={{ color: PURPLE }}>{submittedId.slice(0, 8)}</span>
        </p>
        <button
          onClick={() => {
            setSubmittedId(null);
            setSubject('');
            setMessage('');
            setUserEmail('');
            setIsDmca(false);
            setClaimantName('');
            setContentUrl('');
            setOriginalWorkUrl('');
            setGoodFaithStatement(false);
          }}
          className="px-5 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
          <Mail size={12} />
          Email <span style={{ color: RED }}>*</span>
        </label>
        <input
          type="email"
          required
          value={userEmail}
          onChange={(e) => setUserEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
        />
      </div>

      {/* Subject */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
          <FileText size={12} />
          Subject {!isDmca && <span style={{ color: RED }}>*</span>}
        </label>
        <input
          type="text"
          required={!isDmca}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={isDmca ? 'Auto-filled for DMCA claims' : 'What do you need help with?'}
          disabled={isDmca}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff', opacity: isDmca ? 0.5 : 1 }}
        />
      </div>

      {/* Message */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
          <MessageSquare size={12} />
          Message {!isDmca && <span style={{ color: RED }}>*</span>}
        </label>
        <textarea
          required={!isDmca}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isDmca ? 'Describe the copyrighted work and your claim...' : 'Describe your issue in detail...'}
          rows={5}
          className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
          style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
        />
      </div>

      {/* DMCA toggle */}
      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
        <input
          type="checkbox"
          checked={isDmca}
          onChange={(e) => setIsDmca(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-xs" style={{ color: '#fca5a5' }}>
          <span className="font-bold">This is a copyright / DMCA takedown request</span>
          <span className="block mt-0.5" style={{ color: 'rgba(252,165,165,0.7)' }}>Check this to provide claimant details and content URLs</span>
        </span>
      </label>

      {isDmca && (
        <div className="space-y-4 p-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
              <User size={12} />
              Full Legal Name <span style={{ color: RED }}>*</span>
            </label>
            <input
              type="text"
              required={isDmca}
              value={claimantName}
              onChange={(e) => setClaimantName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
              <LinkIcon size={12} />
              Content URL <span style={{ color: RED }}>*</span>
            </label>
            <input
              type="url"
              required={isDmca}
              value={contentUrl}
              onChange={(e) => setContentUrl(e.target.value)}
              placeholder="https://litstudio.online/song/..."
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
              <LinkIcon size={12} />
              Original Work URL
            </label>
            <input
              type="url"
              value={originalWorkUrl}
              onChange={(e) => setOriginalWorkUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(139,92,246,0.2)', color: '#e0d7ff' }}
            />
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              required={isDmca}
              checked={goodFaithStatement}
              onChange={(e) => setGoodFaithStatement(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-xs" style={{ color: 'rgba(220,214,240,0.6)' }}>
              I have a good faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law.
            </span>
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all"
        style={{
          background: 'rgba(139,92,246,0.25)',
          color: '#e0d7ff',
          border: '1px solid rgba(139,92,246,0.4)',
          opacity: submitting ? 0.6 : 1,
          cursor: submitting ? 'not-allowed' : 'pointer',
        }}
      >
        <Send size={14} />
        {submitting ? 'Submitting...' : 'Submit Ticket'}
      </button>
    </form>
  );
};

// ─── My Tickets List ────────────────────────────────────────────────────────

const MyTicketsList: React.FC<{ userAddress: string }> = ({ userAddress }) => {
  const [tickets, setTickets] = useState<SupportTicketsResponse[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const filter = `where userAddress = '${userAddress}' order by createdAt desc`;
      const data = await getManySupportTickets(filter);
      if (!mounted) return;
      setTickets(data);
      subscribeManySupportTickets((updated) => {
        if (mounted) setTickets(updated ?? []);
      }, filter);
    })();
    return () => { mounted = false; };
  }, [userAddress]);

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <Ticket size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p className="text-sm" style={{ color: 'rgba(220,214,240,0.4)' }}>No tickets yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t) => {
        const badge = statusBadge(t.status);
        return (
          <div
            key={t.id}
            className="p-4 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>
                {t.type}
              </span>
            </div>
            <p className="text-sm font-bold text-white mb-1">{t.subject}</p>
            <p className="text-xs mb-2 line-clamp-2" style={{ color: 'rgba(220,214,240,0.5)' }}>{t.message}</p>
            <div className="flex items-center justify-between">
              <span className="text-[10px]" style={{ color: 'rgba(220,214,240,0.35)' }}>{formatTime(t.createdAt)}</span>
              {t.resolution && (
                <span className="text-[10px] font-medium" style={{ color: GREEN }}>Resolved</span>
              )}
            </div>
            {t.resolution && (
              <div className="mt-2 p-2.5 rounded-lg text-xs" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', color: '#a7f3d0' }}>
                <span className="font-bold">Resolution:</span> {t.resolution}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Main Support Page ──────────────────────────────────────────────────────

export const SupportPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'submit' | 'my-tickets'>('submit');

  return (
    <div className="min-h-[100dvh] pt-20 pb-24 px-4" style={{ background: 'transparent' }}>
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white mb-1">Support</h1>
          <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
            Get help or submit a DMCA takedown request
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('submit')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: activeTab === 'submit' ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${activeTab === 'submit' ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.1)'}`,
              color: activeTab === 'submit' ? '#e0d7ff' : 'rgba(220,214,240,0.4)',
            }}
          >
            <MessageSquare size={14} />
            Submit a Request
          </button>
          <button
            onClick={() => setActiveTab('my-tickets')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all"
            style={{
              background: activeTab === 'my-tickets' ? 'rgba(139,92,246,0.2)' : 'rgba(0,0,0,0.3)',
              border: `1px solid ${activeTab === 'my-tickets' ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.1)'}`,
              color: activeTab === 'my-tickets' ? '#e0d7ff' : 'rgba(220,214,240,0.4)',
            }}
          >
            <Ticket size={14} />
            My Tickets
          </button>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl" style={{ background: CARD_BG, border: '1px solid rgba(139,92,246,0.15)' }}>
          {activeTab === 'submit' && <TicketForm />}
          {activeTab === 'my-tickets' && (
            user?.address ? <MyTicketsList userAddress={user.address} /> : (
              <div className="text-center py-12">
                <p className="text-sm mb-4" style={{ color: 'rgba(220,214,240,0.5)' }}>Sign in to view your tickets</p>
                <button
                  onClick={() => navigate('/')}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(139,92,246,0.2)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}
                >
                  Back to Home
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};
