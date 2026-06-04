import React from 'react';
import { Skeleton } from '@/components/Skeleton';

interface DataPoint {
  label: string;
  value: number;
}

interface WalletBarChartProps {
  data: DataPoint[];
  color?: string;
  height?: number;
  loading?: boolean;
}

export const WalletBarChart: React.FC<WalletBarChartProps> = ({
  data,
  color = '#00FF66',
  height = 140,
  loading = false,
}) => {
  if (loading) {
    return <Skeleton height={height} borderRadius={12} />;
  }

  if (data.length === 0) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>No earnings data yet</span>
      </div>
    );
  }

  const max = Math.max(...data.map((d) => d.value), 0.001);

  return (
    <div style={{ height, position: 'relative', paddingBottom: 20 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 3,
          height: '100%',
        }}
      >
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                height: '100%',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(pct, 4)}%`,
                  background: color,
                  borderRadius: 3,
                  opacity: 0.5 + (pct / 100) * 0.5,
                  transition: 'height 0.4s ease',
                  boxShadow: pct > 50 ? `0 0 10px ${color}40` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          {data[0]?.label}
        </span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
          {data[data.length - 1]?.label}
        </span>
      </div>
    </div>
  );
};

export default WalletBarChart;
