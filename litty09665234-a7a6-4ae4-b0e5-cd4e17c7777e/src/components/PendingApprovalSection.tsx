import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  CheckCircle, XCircle, Clock, Music, ChevronDown, ChevronUp,
  Loader2, RefreshCw, AlertTriangle, Disc3,
} from 'lucide-react';

const BG_CARD = 'rgba(15, 5, 30, 0.85)';
const GREEN = '#10B981';
const RED = '#EF4444';
const AMBER = '#F59E0B';
const PURPLE = '#8B5CF6';
const MUTED = 'rgba(220, 214, 240, 0.45)';

interface PendingSong {
  id: string;
  title: string;
  artist: string;
  artistAddress: string;
  genre?: string;
  tokenSymbol?: string;
  launchMode?: string;
  coverImage?: string;
  audioUrl?: string;
  submittedAt?: number;
  approvalStatus?: string;
  onchainSymbol?: string;
  onchainName?: string;
  artistEmail?: string;
}

function relativeTime(ts?: number): string {
  if (!ts) return 'Unknown';
  const seconds = Math.floor(Date.now() / 1000) - ts;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

type ActionType = 'approve' | 'reject' | 'changes' | null;

interface SongCardProps {
  song: PendingSong;
  onAction: (songId: string, action: ActionType, payload?: Record<string, string>) => Promise<void>;
  removing: boolean;
}

const SongCard: React.FC<SongCardProps> = ({ song, onAction, removing }) => {
  const [expanded, setExpanded] = useState<ActionType>(null);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [changesMsg, setChangesMsg] = useState('');
  const [launchMode, setLaunchMode] = useState<'auto' | 'manual'>(
    (song.launchMode as 'auto' | 'manual') ?? 'manual'
  );

  const toggleExpand = (type: ActionType) => {
    setExpanded(prev => (prev === type ? null : type));
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (expanded === 'approve') {
        await onAction(song.id, 'approve', { launchMode });
      } else if (expanded === 'reject') {
        if (!rejectReason.trim()) { toast.error('Please enter a rejection reason'); return; }
        await onAction(song.id, 'reject', { reason: rejectReason.trim() });
      } else if (expanded === 'changes') {
        if (!changesMsg.trim()) { toast.error('Please enter the changes requested'); return; }
        await onAction(song.id, 'changes', { message: changesMsg.trim() });
      }
    } finally {
      setLoading(false);
    }
  };

  const displaySymbol = song.tokenSymbol ?? song.onchainSymbol;

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.35)',
        border: '1px solid rgba(139,92,246,0.18)',
        borderRadius: '1rem',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        opacity: removing ? 0 : 1,
        transform: removing ? 'translateX(40px)' : 'translateX(0)',
        overflow: 'hidden',
      }}
    >
      {/* Main card row */}
      <div className="flex gap-3 p-4">
        {/* Cover art */}
        <div className="flex-shrink-0">
          {song.coverImage ? (
            <img
              src={song.coverImage}
              alt={song.title}
              style={{ width: 80, height: 80, borderRadius: '0.6rem', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: '0.6rem', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))',
            }}>
              <Music size={28} style={{ color: '#a78bfa' }} />
            </div>
          )}
        </div>

        {/* Center info */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-white truncate" style={{ fontSize: 15 }}>{song.title || 'Untitled'}</p>
          <p className="text-sm truncate" style={{ color: MUTED }}>{song.artist || 'Unknown Artist'}</p>

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {song.genre && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }}>
                {song.genre}
              </span>
            )}
            {displaySymbol && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(220,214,240,0.7)' }}>
                ${displaySymbol}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{
                background: launchMode === 'auto' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                color: launchMode === 'auto' ? GREEN : AMBER,
              }}>
              {(song.launchMode ?? 'manual').toUpperCase()}
            </span>
          </div>

          <p className="text-[10px] mt-1" style={{ color: 'rgba(220,214,240,0.3)' }}>
            <Clock size={9} className="inline mr-1" />
            Submitted {relativeTime(song.submittedAt)}
          </p>
        </div>

        {/* Audio preview */}
        {song.audioUrl && (
          <div className="flex-shrink-0 self-center hidden sm:block">
            <audio controls style={{ width: 160, height: 32 }} src={song.audioUrl} preload="none" />
          </div>
        )}
      </div>

      {/* Audio on mobile */}
      {song.audioUrl && (
        <div className="px-4 pb-3 sm:hidden">
          <audio controls style={{ width: '100%', height: 32 }} src={song.audioUrl} preload="none" />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-3">
        <button
          onClick={() => toggleExpand('approve')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold flex-1 justify-center transition-all"
          style={{
            background: expanded === 'approve' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.08)',
            color: GREEN,
            border: `1px solid ${expanded === 'approve' ? 'rgba(16,185,129,0.4)' : 'rgba(16,185,129,0.2)'}`,
            minHeight: 40,
          }}>
          <CheckCircle size={13} /> Approve
          {expanded === 'approve' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        <button
          onClick={() => toggleExpand('reject')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold flex-1 justify-center transition-all"
          style={{
            background: expanded === 'reject' ? 'rgba(239,68,68,0.18)' : 'rgba(239,68,68,0.07)',
            color: RED,
            border: `1px solid ${expanded === 'reject' ? 'rgba(239,68,68,0.4)' : 'rgba(239,68,68,0.18)'}`,
            minHeight: 40,
          }}>
          <XCircle size={13} /> Reject
          {expanded === 'reject' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>

        <button
          onClick={() => toggleExpand('changes')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold flex-1 justify-center transition-all"
          style={{
            background: expanded === 'changes' ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.07)',
            color: AMBER,
            border: `1px solid ${expanded === 'changes' ? 'rgba(245,158,11,0.4)' : 'rgba(245,158,11,0.18)'}`,
            minHeight: 40,
          }}>
          ✏️ Changes
          {expanded === 'changes' ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
        </button>
      </div>

      {/* Expandable action panels */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }} className="px-4 py-3">
          {expanded === 'approve' && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>Launch Mode</p>
              <div className="flex gap-2 mb-3">
                {(['auto', 'manual'] as const).map(mode => (
                  <button key={mode} onClick={() => setLaunchMode(mode)}
                    className="px-4 py-2 rounded-lg text-xs font-bold transition-all capitalize flex-1"
                    style={{
                      background: launchMode === mode
                        ? (mode === 'auto' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)')
                        : 'rgba(0,0,0,0.3)',
                      color: launchMode === mode ? (mode === 'auto' ? GREEN : AMBER) : 'rgba(220,214,240,0.4)',
                      border: `1px solid ${launchMode === mode
                        ? (mode === 'auto' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)')
                        : 'rgba(139,92,246,0.1)'}`,
                      minHeight: 36,
                    }}>
                    {mode === 'auto' ? '⚡ Auto Launch' : '🎛 Manual'}
                  </button>
                ))}
              </div>
              <p className="text-[10px] mb-3" style={{ color: 'rgba(220,214,240,0.35)' }}>
                {launchMode === 'auto'
                  ? 'Token will be created on-chain immediately upon approval.'
                  : 'Token launch must be triggered separately after approval.'}
              </p>
              <button onClick={handleConfirm} disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(16,185,129,0.2)', color: GREEN, border: '1px solid rgba(16,185,129,0.35)', minHeight: 44 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {loading ? 'Approving...' : 'Confirm Approve'}
              </button>
            </div>
          )}

          {expanded === 'reject' && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>Rejection Reason</p>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Explain why this submission was rejected..."
                rows={3}
                className="w-full rounded-lg text-sm outline-none resize-none mb-3 p-3"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#e0d7ff',
                }}
              />
              <button onClick={handleConfirm} disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(239,68,68,0.18)', color: RED, border: '1px solid rgba(239,68,68,0.35)', minHeight: 44 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                {loading ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          )}

          {expanded === 'changes' && (
            <div>
              <p className="text-xs font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>Changes Requested</p>
              <textarea
                value={changesMsg}
                onChange={e => setChangesMsg(e.target.value)}
                placeholder="Describe what changes the artist needs to make..."
                rows={3}
                className="w-full rounded-lg text-sm outline-none resize-none mb-3 p-3"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  color: '#e0d7ff',
                }}
              />
              <button onClick={handleConfirm} disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2"
                style={{ background: 'rgba(245,158,11,0.15)', color: AMBER, border: '1px solid rgba(245,158,11,0.35)', minHeight: 44 }}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                ✏️ {loading ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface PendingApprovalSectionProps {
  onCountChange?: (count: number) => void;
}

const PendingApprovalSection: React.FC<PendingApprovalSectionProps> = ({ onCountChange }) => {
  const { user } = useAuth();
  const [songs, setSongs] = useState<PendingSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPending = useCallback(async () => {
    if (!user?.address) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const authApi = createAuthenticatedApiClient(token, user.address);
      const result = await authApi.get('/api/admin/pending-songs') as { songs: PendingSong[]; total: number };
      setSongs(result.songs ?? []);
      onCountChange?.(result.total ?? 0);
    } catch (err: any) {
      console.error('[PendingApproval] fetch error:', err);
      toast.error('Failed to load pending songs');
    } finally {
      setLoading(false);
    }
  }, [user, onCountChange]);

  useEffect(() => {
    fetchPending();
    intervalRef.current = setInterval(fetchPending, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPending]);

  const handleAction = useCallback(async (
    songId: string,
    action: ActionType,
    payload?: Record<string, string>
  ) => {
    if (!user?.address) { toast.error('Not authenticated'); return; }
    const token = await getIdToken();
    if (!token) { toast.error('No auth token'); return; }
    const authApi = createAuthenticatedApiClient(token, user.address);

    let path = '';
    let body: Record<string, string> = payload ?? {};
    if (action === 'approve') path = `/api/admin/songs/${songId}/approve`;
    else if (action === 'reject') path = `/api/admin/songs/${songId}/reject`;
    else if (action === 'changes') path = `/api/admin/songs/${songId}/request-changes`;
    else return;

    await authApi.post(path, body);

    const labels: Record<NonNullable<ActionType>, string> = {
      approve: 'Song approved!',
      reject: 'Song rejected',
      changes: 'Changes requested',
    };
    toast.success(labels[action!]);

    // Fade-out animation then remove
    setRemovingIds(prev => new Set(prev).add(songId));
    setTimeout(() => {
      setSongs(prev => prev.filter(s => s.id !== songId));
      setRemovingIds(prev => { const n = new Set(prev); n.delete(songId); return n; });
      onCountChange?.(songs.length - 1);
    }, 420);
  }, [user, songs.length, onCountChange]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-2xl p-4 animate-pulse"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)', height: 120 }} />
        ))}
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <CheckCircle size={28} style={{ color: GREEN }} />
        </div>
        <div className="text-center">
          <p className="font-bold text-white mb-1">All clear!</p>
          <p className="text-sm" style={{ color: 'rgba(220,214,240,0.4)' }}>No songs pending review</p>
        </div>
        <button onClick={fetchPending}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'rgba(139,92,246,0.12)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', minHeight: 40 }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: AMBER }} />
          <span className="text-sm font-bold" style={{ color: AMBER }}>
            {songs.length} song{songs.length !== 1 ? 's' : ''} awaiting review
          </span>
        </div>
        <button onClick={fetchPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
          style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)', minHeight: 36 }}>
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {songs.map(song => (
          <SongCard
            key={song.id}
            song={song}
            onAction={handleAction}
            removing={removingIds.has(song.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PendingApprovalSection;
