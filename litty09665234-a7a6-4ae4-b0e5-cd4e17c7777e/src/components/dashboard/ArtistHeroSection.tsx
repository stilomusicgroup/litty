import React from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Edit3, LogOut } from 'lucide-react';
import type { ArtistsResponse } from '@/lib/collections/artists';

const NEON_GREEN = '#00FF41';
const PURPLE = '#A855F7';

export const ArtistHeroSection: React.FC<{
  artist: ArtistsResponse;
  followerCount: number;
  songCount: number;
  onEdit: () => void;
  onLogout: () => void;
}> = ({ artist, followerCount, songCount, onEdit, onLogout }) => {
  const avatarLetter = (artist.name?.[0] ?? '?').toUpperCase();

  return (
    <div className="relative mb-8">
      {/* Hero banner with scanline + gradient orbs */}
      <div className="w-full rounded-3xl overflow-hidden relative" style={{ height: 180 }}>
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, #050505 0%, #0a0a0a 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.03) 2px, rgba(0, 255, 65, 0.03) 3px)',
            animation: 'scanline 4s linear infinite',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 50%, rgba(0, 255, 65, 0.08) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 30%, rgba(168,85,247,0.06) 0%, transparent 50%)
            `,
          }}
        />
        {/* Neon scan-line sweep */}
        <motion.div
          className="absolute left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${NEON_GREEN}, transparent)`,
            opacity: 0.4,
            boxShadow: `0 0 12px ${NEON_GREEN}`,
          }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      </div>

      {/* Avatar + name centered, overlapping banner */}
      <div className="flex flex-col items-center -mt-14 relative z-10">
        <motion.div
          className="relative"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div
            className="w-28 h-28 rounded-full overflow-hidden flex items-center justify-center text-4xl font-black"
            style={{
              background: `linear-gradient(135deg, ${NEON_GREEN}40, ${PURPLE}20)`,
              border: `3px solid ${NEON_GREEN}`,
              boxShadow: `0 0 30px rgba(0, 255, 65, 0.5), 0 0 60px rgba(0, 255, 65, 0.2)`,
              color: '#fff',
              animation: 'floatGlow 3s ease-in-out infinite',
            }}
          >
            {artist.profileImage ? (
              <img src={artist.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span style={{ textShadow: `0 0 20px ${NEON_GREEN}` }}>{avatarLetter}</span>
            )}
          </div>
          {artist.isVerified && (
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: '#050505', border: `2px solid ${NEON_GREEN}` }}
            >
              <BadgeCheck size={16} style={{ color: NEON_GREEN }} />
            </div>
          )}
        </motion.div>

        <h1
          className="text-2xl font-black mt-3"
          style={{
            fontFamily: "'Archivo Black', monospace",
            color: '#fff',
            textShadow: `0 0 20px ${NEON_GREEN}60, 0 0 40px ${NEON_GREEN}30`,
            letterSpacing: '0.04em',
          }}
        >
          {artist.name}
        </h1>

        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
          <span
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Archivo Black', monospace",
            }}
          >
            {followerCount.toLocaleString()} Followers
          </span>
          <span
            className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Archivo Black', monospace",
            }}
          >
            {songCount} Songs
          </span>
        </div>

        {/* Edit / Logout */}
        <div className="flex items-center gap-2 mt-3">
          <motion.button
            onClick={onEdit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            <Edit3 size={12} />
            Edit
          </motion.button>
          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center justify-center w-9 h-9 rounded-xl"
            style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.18)',
              color: 'rgba(239,68,68,0.75)',
            }}
          >
            <LogOut size={13} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ArtistHeroSection;
