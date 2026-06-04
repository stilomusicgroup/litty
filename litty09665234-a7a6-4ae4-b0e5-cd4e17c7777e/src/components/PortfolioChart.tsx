import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { orbitronFont } from '@/theme';

const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';

export interface PortfolioSnapshot {
  valueUsd: number;
  solValue: number;
  tokenValue: number;
  timestamp: number;
  id: string;
}

interface PortfolioChartProps {
  snapshots: PortfolioSnapshot[];
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

function formatDate(ts: number): string {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-xl px-4 py-3"
        style={{
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <div className="text-xs text-[#8f8f8f] mb-1">{label}</div>
        <div className="text-lg font-extrabold text-white">{formatCurrency(payload[0].value)}</div>
      </div>
    );
  }
  return null;
};

export default function PortfolioChart({ snapshots }: PortfolioChartProps) {
  const sorted = React.useMemo(() => {
    return [...snapshots].sort((a, b) => a.timestamp - b.timestamp);
  }, [snapshots]);

  const data = React.useMemo(() => {
    return sorted.map((s) => ({
      date: formatDate(s.timestamp),
      value: s.valueUsd / 100,
      fullTimestamp: s.timestamp,
    }));
  }, [sorted]);

  const hasData = data.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      <div
        className="mb-4 font-extrabold tracking-tight"
        style={{ fontSize: '32px', color: HEADLINE_GREEN }}
      >
        Portfolio History
      </div>

      <div
        className="rounded-[28px] px-5 py-6"
        style={{
          background: '#0f130f',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(22px)',
        }}
      >
        {hasData ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PRIMARY_GREEN} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PRIMARY_GREEN} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8f8f8f', fontSize: 11, fontWeight: 500 }}
                minTickGap={30}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#8f8f8f', fontSize: 11, fontWeight: 500 }}
                tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#ffffff"
                strokeWidth={2}
                fill="url(#portfolioGradient)"
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <TrendingUp size={28} className="text-[#555555]" />
            <p className="text-sm text-[#8f8f8f] text-center px-4">
              Portfolio history will appear here as you use your wallet
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
