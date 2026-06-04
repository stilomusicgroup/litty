import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManyReposts } from '@/lib/collections/reposts';
import type { RepostsResponse } from '@/lib/collections/reposts';
import { subscribeManyFollows } from '@/lib/collections/follows';
import type { FollowsResponse } from '@/lib/collections/follows';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { motion } from 'framer-motion';
import { Trophy, Repeat2, Users, Music } from 'lucide-react';

const AMBER = '#f59e0b';
const CYAN = '#00D4FF';
const MAGENTA = '#EC4899';
const NEON_GREEN = '#00FF41';

// ─── Rank badge ───────────────────────────────────────────────────────────────
function RankBadge({ rank }: { rank: number }) {
  const styles: Record<number, { bg: string; color: string; shadow: string }> = {
    1: { bg: 'linear-gradient(135deg, #FFD700, #FFA500)', color: '#1a1a00', shadow: 'rgba(255,215,0,0.5)' },
    2: { bg: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)', color: '#1a1a1a', shadow: 'rgba(192,192,192,0.4)' },
    3: { bg: 'linear-gradient(135deg, #CD7F32, #B87333)', color: '#1a0e00', shadow: 'rgba(205,127,50,0.4)' },
  };
  const s = styles[rank] ?? { bg: 'rgba(139,92,246,0.18)', color: '#c4b5fd', shadow: 'transparent' };
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
      style={{
        background: s.bg,
        color: s.color,
        fontFamily: "'Inter', monospace",
        boxShadow: rank <= 3 ? `0 0 14px ${s.shadow}` : 'none',
      }}
    >
      {rank}
    </div>
  );
}

// ─── Wallet display helper ────────────────────────────────────────────────────
function shortWallet(addr: string) {
  if (!addr) return '???';
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

// ─── Leaderboard row ──────────────────────────────────────────────────────────
function LeaderRow({
  rank,
  address,
  label,
  score,
  scoreLabel,
  color,
  delay,
  onClick,
}: {
  rank: number;
  address: string;
  label: string;
  score: number;
  scoreLabel: string;
  color: string;
  delay: number;
  onClick?: () => void;
}) {
  const hue = address ? (address.charCodeAt(2) * 7) % 360 : 270;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.055)',
      }}
      onClick={onClick}
      onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = `${color}12`; el.style.borderColor = `${color}33`; }}
      onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = 'rgba(255,255,255,0.025)'; el.style.borderColor = 'rgba(255,255,255,0.055)'; }}
    >
      <RankBadge rank={rank} />

      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 65%, 22%), hsl(${(hue + 90) % 360}, 65%, 15%))`,
          border: `1px solid hsl(${hue}, 65%, 35%)`,
          color: `hsl(${hue}, 80%, 75%)`,
          fontFamily: "'Archivo Black', monospace",
        }}
      >
        {address.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: '#fff', fontFamily: "'Inter', sans-serif" }}>
          {label}
        </p>
        <p className="text-[10px] font-mono truncate" style={{ color: 'rgba(220,214,240,0.35)' }}>
          {shortWallet(address)}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className="text-sm font-black" style={{ color, fontFamily: "'Inter', monospace", textShadow: `0 0 8px ${color}55` }}>
          {score.toLocaleString()}
        </p>
        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(220,214,240,0.35)', fontFamily: "'Inter', sans-serif" }}>
          {scoreLabel}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Section panel ────────────────────────────────────────────────────────────
function LeaderSection({
  title,
  emoji,
  icon,
  color,
  children,
  delay,
}: {
  title: string;
  emoji: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.38 }}
      className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(10,5,25,0.8)', border: `1px solid ${color}22`, boxShadow: `0 0 30px ${color}15` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${color}18`, background: `${color}08` }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, border: `1px solid ${color}40`, color }}
        >
          {icon}
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ fontFamily: "'Archivo Black', sans-serif", background: `linear-gradient(90deg, ${color}, #fff8)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            {emoji} {title}
          </h2>
        </div>
      </div>
      <div className="p-3 space-y-2">
        {children}
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
const LeaderboardPage: React.FC = () => {
  const navigate = useNavigate();

  // Reposts by user (use as "Top Reposters" / Top Streamers fallback)
  const { data: allReposts } = useRealtimeData<RepostsResponse[]>(
    subscribeManyReposts,
    true,
    '',
  );

  // Follows by artist (use for "Top Artists by Followers")
  const { data: allFollows } = useRealtimeData<FollowsResponse[]>(
    subscribeManyFollows,
    true,
    '',
  );

  // Song details for top artists section
  const { data: allDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    true,
    'where approved = true',
  );

  // ── Top Reposters (as "Top Streamers" fallback) ───────────────────────────
  const topReposters = useMemo(() => {
    if (!allReposts) return [];
    const counts: Record<string, number> = {};
    allReposts.forEach(r => {
      counts[r.reposterAddress] = (counts[r.reposterAddress] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([addr, count]) => ({ address: addr, score: count }));
  }, [allReposts]);

  // ── Top Artists by Followers ──────────────────────────────────────────────
  const topArtistsByFollowers = useMemo(() => {
    if (!allFollows) return [];
    const counts: Record<string, number> = {};
    allFollows.forEach((f: FollowsResponse) => {
      if (f.artistAddress) counts[f.artistAddress] = (counts[f.artistAddress] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([addr, count]) => ({ address: addr, score: count }));
  }, [allFollows]);

  // ── Top Artists by Song Count ─────────────────────────────────────────────
  const topArtistsBySongs = useMemo(() => {
    if (!allDetails) return [];
    const counts: Record<string, number> = {};
    allDetails.forEach(d => {
      if (d.artistAddress) counts[d.artistAddress] = (counts[d.artistAddress] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([addr, count]) => ({ address: addr, score: count }));
  }, [allDetails]);

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: 'transparent',
        position: 'relative',
      }}
    >
      {/* Ambient blobs */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', left: '10%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,72,153,0.04) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0, 255, 65, 0.03) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `linear-gradient(rgba(245,158,11,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(236,72,153,0.014) 1px, transparent 1px)`, backgroundSize: '44px 44px' }} />

      <div className="relative z-10">
        
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mb-8 text-center"
          >
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: `${AMBER}18`, border: `1.5px solid ${AMBER}55`, boxShadow: `0 0 24px ${AMBER}30` }}>
                <Trophy size={22} style={{ color: AMBER, filter: `drop-shadow(0 0 8px ${AMBER})` }} />
              </div>
            </div>
            <h1
              className="text-3xl sm:text-5xl font-black tracking-widest uppercase"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                background: `linear-gradient(90deg, ${AMBER}, #fff 60%, ${MAGENTA})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              🏆 Leaderboard
            </h1>
            <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
              The most active community members on Lit Studios
            </p>
          </motion.div>

          {/* Two-column layout on desktop, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Column 1: Top Reposters */}
            <LeaderSection
              title="Top Reposters"
              emoji="🔁"
              icon={<Repeat2 size={16} />}
              color={NEON_GREEN}
              delay={0.08}
            >
              {topReposters.length === 0 ? (
                <div className="py-8 text-center" style={{ color: 'rgba(220,214,240,0.35)' }}>
                  <Repeat2 size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No reposts yet — be the first!</p>
                </div>
              ) : (
                topReposters.map(({ address, score }, i) => (
                  <LeaderRow
                    key={address}
                    rank={i + 1}
                    address={address}
                    label={shortWallet(address)}
                    score={score}
                    scoreLabel="reposts"
                    color={NEON_GREEN}
                    delay={0.1 + i * 0.04}
                    onClick={() => navigate(`/artist/${address}`)}
                  />
                ))
              )}
            </LeaderSection>

            {/* Column 2: Top Artists by Followers */}
            <LeaderSection
              title="Top Artists"
              emoji="🎤"
              icon={<Users size={16} />}
              color={MAGENTA}
              delay={0.12}
            >
              {topArtistsByFollowers.length > 0 ? (
                topArtistsByFollowers.map(({ address, score }, i) => (
                  <LeaderRow
                    key={address}
                    rank={i + 1}
                    address={address}
                    label={shortWallet(address)}
                    score={score}
                    scoreLabel="followers"
                    color={MAGENTA}
                    delay={0.14 + i * 0.04}
                    onClick={() => navigate(`/artist/${address}`)}
                  />
                ))
              ) : topArtistsBySongs.length > 0 ? (
                topArtistsBySongs.map(({ address, score }, i) => (
                  <LeaderRow
                    key={address}
                    rank={i + 1}
                    address={address}
                    label={shortWallet(address)}
                    score={score}
                    scoreLabel="songs"
                    color={MAGENTA}
                    delay={0.14 + i * 0.04}
                    onClick={() => navigate(`/artist/${address}`)}
                  />
                ))
              ) : (
                <div className="py-8 text-center" style={{ color: 'rgba(220,214,240,0.35)' }}>
                  <Music size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No artists yet.</p>
                </div>
              )}
            </LeaderSection>

          </div>

          {/* Bottom info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 text-center"
          >
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'Inter', sans-serif" }}>
              Rankings update in real-time · Earn your spot by creating, reposting, and engaging with the community
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LeaderboardPage;
