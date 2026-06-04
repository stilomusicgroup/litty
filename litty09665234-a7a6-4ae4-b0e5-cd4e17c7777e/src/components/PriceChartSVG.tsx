import React, { useMemo, useId } from 'react';

const GREEN = '#00FF41';
const RED = '#EF4444';
const PURPLE_GLOW = '#8B5CF6';

interface PriceChartSVGProps {
  songId: string;
  width?: number;
  height?: number;
  positive?: boolean;
  history?: number[];
  loading?: boolean;
}

function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function strHash(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const PriceChartSVG: React.FC<PriceChartSVGProps> = ({
  songId,
  width = 200,
  height = 80,
  positive: positiveProp,
  history,
  loading,
}) => {
  const chartData = useMemo(() => {
    const hasHistory = history && history.length >= 2;
    const points = hasHistory
      ? history
      : [50, 50]; // Flat baseline when no real data

    const first = points[0];
    const last = points[points.length - 1];
    const isPositive = last >= first;

    const mx = Math.max(...points);
    const mn = Math.min(...points);
    const range = mx - mn || 1;
    const padding = 10;
    const chartHeight = height - padding * 2;
    const chartWidth = width - 30;

    const coords = points.map((p, i) => ({
      x: (i / (points.length - 1)) * chartWidth + 8,
      y: padding + chartHeight - ((p - mn) / range) * chartHeight,
    }));

    return { coords, isPositive, hasHistory };
  }, [songId, width, height, history]);

  const { coords, isPositive, hasHistory } = chartData;
  const positive = positiveProp ?? isPositive;
  const color = positive ? GREEN : RED;
  const instanceId = useId();
  const gradId = `grad-${songId}-${instanceId}`;
  const glowId = `glow-${songId}-${instanceId}`;

  if (loading && (!history || history.length < 2)) {
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <rect x="0" y="0" width={width} height={height} rx="4" fill="rgba(255,255,255,0.04)" />
        <line x1="8" y1={height / 2} x2={width - 22} y2={height / 2} stroke="rgba(255,255,255,0.08)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // Honest empty state — flat green baseline, no fake RNG data
  const lineDash = hasHistory ? undefined : '3 3';
  const areaOpacity = hasHistory ? undefined : '0.15';

  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - 10).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - 10).toFixed(1)} Z`;

  const lastPoint = coords[coords.length - 1];
  const firstPoint = coords[0];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
        <filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path d={areaPath} fill={`url(#${gradId})`} opacity={areaOpacity} />

      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={lineDash}
        points={coords.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
        opacity="0.9"
      />

      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r="3.5"
        fill={color}
        filter={`url(#${glowId})`}
      />
      <circle cx={lastPoint.x} cy={lastPoint.y} r="2" fill={color} />

      <text
        x={firstPoint.x + 2}
        y={height - 2}
        fontSize="8"
        fill="rgba(255,255,255,0.35)"
        fontFamily="monospace"
      >
        1m
      </text>

      <text
        x={width - 8}
        y={height - 2}
        fontSize="8"
        fill="rgba(255,255,255,0.35)"
        fontFamily="monospace"
        textAnchor="end"
      >
        NOW
      </text>

      <circle cx={lastPoint.x} cy={lastPoint.y} r="4" fill={GREEN} opacity="0.9">
        <animate attributeName="opacity" values="0.9;0.3;0.9" dur="1.5s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
};

export default PriceChartSVG;
