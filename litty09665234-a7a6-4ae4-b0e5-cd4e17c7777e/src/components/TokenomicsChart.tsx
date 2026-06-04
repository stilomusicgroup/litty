import React from 'react';

const NEON_GREEN = '#00FF41';
const NEON_CYAN = '#00D4FF';
const NEON_PURPLE = '#BF00FF';
const SILVER = '#C0C0C0';

interface Segment {
  label: string;
  percentage: number;
  dollarAmount: string;
  color: string;
  glowColor: string;
}

const segments: Segment[] = [
  { label: 'Artist Cash', percentage: 69, dollarAmount: '$6.21', color: NEON_GREEN, glowColor: 'rgba(0, 255, 65, 0.4)' },
  { label: 'Buyer Tokens', percentage: 12, dollarAmount: '$1.08', color: NEON_CYAN, glowColor: 'rgba(0,212,255,0.4)' },
  { label: 'Artist Tokens', percentage: 8, dollarAmount: '$0.72', color: NEON_PURPLE, glowColor: 'rgba(191,0,255,0.4)' },
  { label: 'Infrastructure', percentage: 10, dollarAmount: '$0.90', color: '#3B82F6', glowColor: 'rgba(59,130,246,0.4)' },
  { label: 'Treasury', percentage: 1, dollarAmount: '$0.09', color: SILVER, glowColor: 'rgba(192,192,192,0.4)' },
];

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

const DonutChart: React.FC = () => {
  const cx = 100;
  const cy = 100;
  const outerR = 80;
  const innerR = 50;

  // Precompute start/end angles to avoid reassigning during render
  const angleRanges: { start: number; end: number }[] = [];
  let currentAngle = 0;
  for (const seg of segments) {
    const startAngle = currentAngle;
    const endAngle = currentAngle + (seg.percentage / 100) * 360;
    angleRanges.push({ start: startAngle, end: endAngle });
    currentAngle = endAngle;
  }

  return (
    <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-56 sm:h-56 mx-auto">
      {segments.map((seg, i) => {
        const { start: startAngle, end: endAngle } = angleRanges[i];

        const outerPath = describeArc(cx, cy, outerR, startAngle, endAngle);
        const innerPath = describeArc(cx, cy, innerR, startAngle, endAngle);
        const largeArc = (seg.percentage / 100) * 360 > 180 ? '1' : '0';

        const d = `${outerPath} L ${cx + innerR * Math.cos(((endAngle - 90) * Math.PI) / 180)} ${cy + innerR * Math.sin(((endAngle - 90) * Math.PI) / 180)} A ${innerR} ${innerR} 0 ${largeArc} 1 ${cx + innerR * Math.cos(((startAngle - 90) * Math.PI) / 180)} ${cy + innerR * Math.sin(((startAngle - 90) * Math.PI) / 180)} Z`;

        return (
          <path
            key={i}
            d={d}
            fill={seg.color}
            style={{
              filter: `drop-shadow(0 0 6px ${seg.glowColor})`,
              transition: 'opacity 0.2s',
            }}
            opacity={0.85}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          />
        );
      })}
      {/* Center text */}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '22px',
          fontWeight: 900,
          fill: '#FFFFFF',
          textShadow: `0 0 10px ${NEON_GREEN}`,
        }}
      >
        $9
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontFamily: "'Inter', monospace",
          fontSize: '8px',
          fontWeight: 700,
          fill: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
      >
        Total
      </text>
    </svg>
  );
};

const TokenomicsChart: React.FC = () => {
  return (
    <div
      className="rounded-2xl p-4 sm:p-6"
      style={{
        background: 'linear-gradient(145deg, rgba(15,15,25,0.95) 0%, rgba(10,10,20,0.98) 100%)',
        border: `1.5px solid rgba(0, 255, 65, 0.25)`,
        boxShadow: `0 0 20px rgba(0, 255, 65, 0.08), 0 0 40px rgba(0,212,255,0.04), inset 0 0 20px rgba(0, 255, 65, 0.02)`,
        backdropFilter: 'blur(20px)',
      }}
    >
      <DonutChart />

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                background: seg.color,
                boxShadow: `0 0 8px ${seg.glowColor}`,
              }}
            />
            <div>
              <p
                className="text-[11px] font-bold"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  color: '#FFFFFF',
                  letterSpacing: '0.05em',
                }}
              >
                {seg.label}
              </p>
              <p
                className="text-[10px]"
                style={{
                  fontFamily: "'Inter', monospace",
                  color: seg.color,
                  textShadow: `0 0 4px ${seg.glowColor}`,
                }}
              >
                {seg.percentage}% — {seg.dollarAmount}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TokenomicsChart;
