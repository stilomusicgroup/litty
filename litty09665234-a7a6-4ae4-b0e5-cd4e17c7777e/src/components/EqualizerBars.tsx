import React from 'react';

interface EqualizerBarsProps {
  isPlaying?: boolean;
  color?: string;
  size?: 'sm' | 'md';
}

const EqualizerBars: React.FC<EqualizerBarsProps> = ({
  isPlaying = true,
  color = '#a78bfa',
  size = 'sm',
}) => {
  const h = size === 'sm' ? 14 : 20;
  const w = size === 'sm' ? 3 : 4;
  const gap = size === 'sm' ? 2 : 3;

  if (!isPlaying) {
    // Static bars when paused
    return (
      <div
        className="flex items-end flex-shrink-0"
        style={{ gap, height: h, width: 3 * w + 2 * gap }}
        aria-label="Paused"
      >
        {[0.5, 0.35, 0.65].map((frac, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: h * frac,
              borderRadius: 2,
              background: color,
              opacity: 0.4,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes eq-bar-1 {
          0%, 100% { height: 30%; }
          25% { height: 90%; }
          50% { height: 55%; }
          75% { height: 70%; }
        }
        @keyframes eq-bar-2 {
          0%, 100% { height: 80%; }
          20% { height: 40%; }
          60% { height: 100%; }
          80% { height: 50%; }
        }
        @keyframes eq-bar-3 {
          0%, 100% { height: 55%; }
          35% { height: 80%; }
          65% { height: 25%; }
          85% { height: 95%; }
        }
      `}</style>
      <div
        className="flex items-end flex-shrink-0"
        style={{ gap, height: h, width: 3 * w + 2 * gap }}
        aria-label="Playing"
      >
        {(['eq-bar-1', 'eq-bar-2', 'eq-bar-3'] as const).map((anim, i) => (
          <div
            key={i}
            style={{
              width: w,
              height: '55%',
              borderRadius: 2,
              background: color,
              animation: `${anim} ${0.8 + i * 0.15}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>
    </>
  );
};

export default EqualizerBars;
