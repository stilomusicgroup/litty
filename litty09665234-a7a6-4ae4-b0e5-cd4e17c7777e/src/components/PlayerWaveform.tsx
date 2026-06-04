import React, { useMemo } from 'react';

const ACCENT = '#00FF66';
const WAVEFORM_HEIGHTS = [
  35, 55, 80, 45, 70, 90, 60, 40, 75, 95, 50, 65, 85, 55, 45,
  70, 88, 42, 68, 82, 50, 72, 60, 38, 78, 92, 55, 48, 65, 80,
  42, 70, 55, 85, 38, 62, 90, 48, 72, 58,
];

interface PlayerWaveformProps {
  progress: number; // 0–100
  className?: string;
}

export function PlayerWaveform({ progress, className }: PlayerWaveformProps) {
  const splitIndex = useMemo(
    () => Math.floor((progress / 100) * WAVEFORM_HEIGHTS.length),
    [progress]
  );

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 32,
      }}
    >
      {WAVEFORM_HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: `${h}%`,
            borderRadius: 2,
            background: i < splitIndex ? ACCENT : 'rgba(255,255,255,0.18)',
            transition: 'background 0.15s ease',
            flexShrink: 0,
          }}
        />
      ))}
    </div>
  );
}
