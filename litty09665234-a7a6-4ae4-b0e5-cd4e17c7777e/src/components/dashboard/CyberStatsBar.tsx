import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Users, Music, Coins, TrendingUp } from 'lucide-react';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const ACCENT_GREEN = '#00FF88';
const PURPLE = '#A855F7';

function useAnimatedCounter(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf: number;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

export const CyberStatsBar: React.FC<{
  totalPlays: number;
  followerCount: number;
  totalEarned: number;
  songsReleased: number;
  topTokenPrice?: number;
}> = ({ totalPlays, followerCount, totalEarned, songsReleased, topTokenPrice }) => {
  const playsCount = useAnimatedCounter(totalPlays);
  const followersCount = useAnimatedCounter(followerCount);
  const earnedCount = useAnimatedCounter(Math.floor(totalEarned * 100) / 100);
  const songsCount = useAnimatedCounter(songsReleased);

  const stats = [
    { label: 'Total Streams', value: playsCount.toLocaleString(), color: NEON_GREEN, icon: <Play size={14} /> },
    { label: 'Followers', value: followersCount.toLocaleString(), color: ACCENT_GREEN, icon: <Users size={14} /> },
    { label: 'Songs', value: songsCount.toLocaleString(), color: CYAN, icon: <Music size={14} /> },
    { label: 'Total Earned', value: `${earnedCount.toFixed(2)} SOL`, color: NEON_GREEN, icon: <Coins size={14} /> },
    {
      label: 'Top Token Price',
      value: topTokenPrice && topTokenPrice > 0 ? `${topTokenPrice.toFixed(3)} SOL` : '—',
      color: PURPLE,
      icon: <TrendingUp size={14} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-6">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.05, type: 'spring', stiffness: 300, damping: 22 }}
          className="rounded-xl p-3 flex flex-col items-center text-center"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid rgba(0, 255, 65, 0.22)`,
            backdropFilter: 'blur(12px)',
            boxShadow: `0 0 20px rgba(0, 255, 65, 0.05)`,
          }}
          whileHover={{
            y: -2,
            borderColor: 'rgba(0, 255, 65, 0.4)',
            boxShadow: `0 0 30px ${s.color}15`,
          }}
        >
          <div
            className="flex items-center justify-center w-6 h-6 rounded-full mb-1.5"
            style={{
              background: `${s.color}12`,
              border: `1px solid ${s.color}30`,
              color: s.color,
            }}
          >
            {s.icon}
          </div>
          <div
            className="text-lg font-black"
            style={{ color: s.color, fontFamily: "'Archivo Black', monospace" }}
          >
            {s.value}
          </div>
          <div
            className="text-[9px] uppercase tracking-wider mt-1"
            style={{
              color: 'rgba(255,255,255,0.4)',
              fontFamily: "'Archivo Black', monospace",
            }}
          >
            {s.label}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default CyberStatsBar;
