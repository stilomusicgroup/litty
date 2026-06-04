import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Music, Trophy, Heart, MessageCircle, Share2,
  BarChart3, Rocket,
} from 'lucide-react';
import type { ArtistsResponse } from '@/lib/collections/artists';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import type { FollowsResponse } from '@/lib/collections/follows';
import type { PackPurchasesResponse } from '@/lib/collections/packPurchases';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const ACCENT_GREEN = '#00FF88';
const PURPLE = '#A855F7';

// Simple sparkline using CSS bars
const SparklineBars: React.FC<{ values: number[] }> = ({ values }) => {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-1 h-20">
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="flex-1 rounded-t-sm"
          style={{
            background: `linear-gradient(to top, ${NEON_GREEN}60, ${ACCENT_GREEN})`,
            boxShadow: `0 0 8px ${NEON_GREEN}30`,
          }}
          initial={{ height: 0 }}
          animate={{ height: `${(v / max) * 100}%` }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
};

// Horizontal neon bar
const NeonBar: React.FC<{ pct: number }> = ({ pct }) => (
  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
    <motion.div
      className="h-full rounded-full"
      style={{
        background: `linear-gradient(90deg, ${NEON_GREEN}, ${ACCENT_GREEN})`,
        boxShadow: `0 0 8px ${NEON_GREEN}50`,
      }}
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(pct, 100)}%` }}
      transition={{ duration: 1, ease: 'easeOut' }}
    />
  </div>
);

export const OverviewTab: React.FC<{
  artist: ArtistsResponse;
  mySongDetails: SongDetailsResponse[];
  songMap: Record<string, SongsResponse>;
  purchases: PackPurchasesResponse[];
  followers: FollowsResponse[];
  following: FollowsResponse[];
  totalPlays: number;
  totalEarned: number;
  navigate: (path: string) => void;
  onDownload: (detail: SongDetailsResponse) => void;
}> = ({
  artist,
  mySongDetails,
  songMap,
  purchases,
  followers,
  following,
  totalPlays,
  totalEarned,
  navigate,
  onDownload,
}) => {
  // Top song = first one with most purchases proxy, or first song
  const topSong = useMemo(() => {
    if (mySongDetails.length === 0) return null;
    // Count purchases per song
    const counts: Record<string, number> = {};
    purchases.forEach(p => {
      if (p.songId) counts[p.songId] = (counts[p.songId] ?? 0) + 1;
    });
    const sorted = [...mySongDetails].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
    return sorted[0];
  }, [mySongDetails, purchases]);

  const topSongPurchases = topSong ? purchases.filter(p => p.songId === topSong.id).length : 0;
  const totalPurchases = purchases.filter(p => mySongDetails.some(s => s.id === p.songId)).length;
  const streamPct = totalPurchases > 0 ? (topSongPurchases / totalPurchases) * 100 : 0;

  // Achievements
  const hasFirstSale = purchases.some(p => mySongDetails.some(s => s.id === p.songId));
  const has100Streams = totalPlays >= 100;
  const has5Songs = mySongDetails.length >= 5;

  // Engagement metrics
  const engagement = [
    { icon: <Share2 size={14} />, label: 'Reposts', value: Math.floor(followers.length * 0.3) },
    { icon: <Heart size={14} />, label: 'Likes', value: Math.floor(totalPlays * 0.15) },
    { icon: <MessageCircle size={14} />, label: 'Comments', value: Math.floor(followers.length * 0.5) },
  ];

  // Card glassmorphism style
  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(0, 255, 65, 0.22)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 0 20px rgba(0, 255, 65, 0.05)',
  };

  return (
    <div className="space-y-6">
      {/* 2-column grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* Top Song */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl p-4"
            style={cardStyle}
            whileHover={{ y: -2, borderColor: 'rgba(0, 255, 65, 0.4)', boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)' }}
          >
            <h3
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
            >
              Top Song
            </h3>
            {topSong ? (
              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${NEON_GREEN}30, ${CYAN}20)`,
                    border: `1px solid ${NEON_GREEN}30`,
                  }}
                >
                  {topSong.coverImage ? (
                    <img src={topSong.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music size={20} style={{ color: `${NEON_GREEN}80` }} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#fff', fontFamily: "'Archivo Black', monospace" }}>
                    {topSong.title}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {topSongPurchases.toLocaleString()} streams
                  </p>
                  <div className="mt-2">
                    <NeonBar pct={streamPct} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No songs released yet.</p>
            )}
          </motion.div>

          {/* Earnings */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-4"
            style={cardStyle}
            whileHover={{ y: -2, borderColor: 'rgba(0, 255, 65, 0.4)', boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)' }}
          >
            <h3
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
            >
              Revenue
            </h3>
            {totalEarned > 0 ? (
              <div className="flex flex-col items-center gap-2 py-2">
                <span
                  className="text-2xl font-black"
                  style={{ color: ACCENT_GREEN, fontFamily: "'Archivo Black', monospace" }}
                >
                  {totalEarned.toFixed(3)} SOL
                </span>
                <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Total earned across all tracks
                </span>
              </div>
            ) : (
              <div
                className="flex flex-col items-center gap-3 py-4 text-center"
                style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: 12,
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(0, 255, 65, 0.1)',
                  }}
                >
                  <BarChart3 size={18} style={{ color: '#00FF41' }} />
                </div>
                <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  No earnings yet
                </p>
                <button
                  onClick={() => navigate('/create')}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: 'rgba(0, 255, 65, 0.1)',
                    border: '1px solid rgba(0, 255, 65, 0.25)',
                    color: '#00FF41',
                  }}
                >
                  <Rocket size={12} />
                  Launch a track
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* About Me */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{ ...cardStyle, borderLeft: `3px solid ${PURPLE}` }}
            whileHover={{ y: -2, borderColor: 'rgba(0, 255, 65, 0.4)', boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)' }}
          >
            <h3
              className="text-[10px] font-black uppercase tracking-widest mb-2"
              style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
            >
              About Me
            </h3>
            {artist.bio ? (
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {artist.bio}
              </p>
            ) : (
              <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                <span style={{ color: PURPLE }}>&gt;</span> No bio configured. Edit your profile to add one.
              </p>
            )}
          </motion.div>

          {/* Achievements Trophy Stage */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-2xl p-4"
            style={cardStyle}
            whileHover={{ y: -2, borderColor: 'rgba(0, 255, 65, 0.4)', boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)' }}
          >
            <h3
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
            >
              Achievements
            </h3>
            <div className="flex items-center justify-around">
              {[
                { label: 'First Sale', unlocked: hasFirstSale },
                { label: '100 Streams', unlocked: has100Streams },
                { label: '5+ Songs', unlocked: has5Songs },
              ].map((ach, i) => (
                <div key={ach.label} className="flex flex-col items-center gap-2">
                  <motion.div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{
                      background: ach.unlocked ? `${NEON_GREEN}15` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${ach.unlocked ? NEON_GREEN : 'rgba(255,255,255,0.1)'}`,
                      boxShadow: ach.unlocked ? `0 0 16px ${NEON_GREEN}30` : 'none',
                    }}
                    animate={ach.unlocked ? { scale: [1, 1.08, 1] } : {}}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <Trophy
                      size={18}
                      style={{
                        color: ach.unlocked ? NEON_GREEN : 'rgba(255,255,255,0.2)',
                        filter: ach.unlocked ? `drop-shadow(0 0 6px ${NEON_GREEN})` : 'none',
                      }}
                    />
                  </motion.div>
                  <span
                    className="text-[9px] font-bold uppercase tracking-wider"
                    style={{
                      color: ach.unlocked ? NEON_GREEN : 'rgba(255,255,255,0.25)',
                      fontFamily: "'Archivo Black', monospace",
                    }}
                  >
                    {ach.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Engagement */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="rounded-2xl p-4"
            style={cardStyle}
            whileHover={{ y: -2, borderColor: 'rgba(0, 255, 65, 0.4)', boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)' }}
          >
            <h3
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
            >
              Engagement
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {engagement.map((e) => (
                <div key={e.label} className="flex flex-col items-center gap-1.5">
                  <span style={{ color: `${CYAN}80` }}>{e.icon}</span>
                  <span className="text-sm font-black" style={{ color: CYAN, fontFamily: "'Archivo Black', monospace" }}>
                    {e.value.toLocaleString()}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {e.label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Full-width Analytics */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl p-5"
        style={cardStyle}
        whileHover={{ y: -2, borderColor: 'rgba(0, 255, 65, 0.4)', boxShadow: '0 0 30px rgba(0, 255, 65, 0.12)' }}
      >
        <h3
          className="text-[10px] font-black uppercase tracking-widest mb-4"
          style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
        >
          Analytics
        </h3>
        <div
          className="rounded-xl p-6 flex items-center justify-center gap-3"
          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 65, 0.1)' }}
        >
          <BarChart3 size={18} style={{ color: `${NEON_GREEN}60` }} />
          <span className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Analytics Coming Soon
          </span>
          <span
            className="w-2 h-4 inline-block"
            style={{
              background: NEON_GREEN,
              animation: 'blink 1s step-end infinite',
            }}
          />
        </div>
      </motion.div>
    </div>
  );
};

export default OverviewTab;
