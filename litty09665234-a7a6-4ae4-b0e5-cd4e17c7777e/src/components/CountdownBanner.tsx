import React, { useState, useEffect, useMemo } from 'react';

function getNextFriday(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilFriday = ((5 - day) + 7) % 7 || 7;
  const next = new Date(now);
  next.setUTCDate(now.getUTCDate() + daysUntilFriday);
  next.setUTCHours(0, 0, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 7);
  }
  return next;
}

interface TimeLeft {
  days: number;
  hrs: number;
  min: number;
  sec: number;
}

function computeTimeLeft(target: Date): TimeLeft {
  const diff = Math.max(0, target.getTime() - Date.now());
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hrs: Math.floor((totalSec % 86400) / 3600),
    min: Math.floor((totalSec % 3600) / 60),
    sec: totalSec % 60,
  };
}

const CYAN = '#00D4FF';
const CYAN_BORDER = 'rgba(0,212,255,0.5)';
const PURPLE = '#8B5CF6';

const CountdownBanner: React.FC = () => {
  const target = useMemo(() => getNextFriday(), []);
  const [time, setTime] = useState<TimeLeft>(computeTimeLeft(target));

  useEffect(() => {
    const id = setInterval(() => setTime(computeTimeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="relative px-4">
      <div
        className="relative overflow-hidden rounded-2xl px-4 sm:px-5 py-5 sm:py-6 text-center"
        style={{
          background: `linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(8,5,18,0.9) 50%, rgba(0,212,255,0.06) 100%)`,
          border: `1px solid ${CYAN_BORDER}`,
          boxShadow: `0 0 40px rgba(139,92,246,0.1), inset 0 0 40px rgba(0,212,255,0.04)`,
        }}
      >
        {/* Pulsing corner dots */}
        {[
          { top: 8, left: 8 },
          { top: 8, right: 8 },
          { bottom: 8, left: 8 },
          { bottom: 8, right: 8 },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              ...pos,
              background: CYAN,
              boxShadow: `0 0 8px ${CYAN}`,
              animation: `pulse-dot 2s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}

        {/* Header */}
        <p
          className="text-xs font-bold tracking-[0.25em] uppercase mb-4"
          style={{ color: CYAN, fontFamily: "'Inter', sans-serif" }}
        >
          {'🎵'} NEXT WEEKLY MUSIC DROP {'✨'}
        </p>

        {/* Timer */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4">
          {(['days', 'hrs', 'min', 'sec'] as const).map((unit, i) => (
            <React.Fragment key={unit}>
              {i > 0 && (
                <span
                  className="text-2xl sm:text-3xl font-black"
                  style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}
                >
                  :
                </span>
              )}
              <div className="flex flex-col items-center">
                <span
                  className="text-3xl sm:text-5xl font-black leading-none"
                  style={{
                    color: '#fff',
                    fontFamily: "'Inter', monospace",
                    textShadow: `0 0 20px rgba(0,212,255,0.5)`,
                  }}
                >
                  {pad(time[unit])}
                </span>
                <span
                  className="text-[10px] font-bold tracking-[0.15em] uppercase mt-1.5"
                  style={{ color: 'rgba(0,212,255,0.7)' }}
                >
                  {unit}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Subtitle */}
        <p
          className="text-xs sm:text-sm max-w-sm mx-auto"
          style={{ color: 'rgba(200,220,240,0.5)', fontFamily: "'Inter', sans-serif" }}
        >
          You're on the list. New track drops for Club Members first — stay tuned {'🎧'}
        </p>
      </div>

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};

export default CountdownBanner;
