import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceDot, Area, AreaChart,
} from 'recharts';
import { Check } from 'lucide-react';
// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = { hidden: { opacity: 0, y: 40 }, visible: { opacity: 1, y: 0 } };

function FadeSection({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Section 1: Purchase Split Pie Chart ────────────────────────────────────

const SHOPIFY_PIE_DATA = [
  { name: 'Fan Tokens', value: 90, color: '#00FF41', dollar: '90% of purchase' },
  { name: 'Artist Allocation', value: 5, color: '#00D4FF', dollar: '5% of purchase' },
  { name: 'Treasury', value: 2, color: '#F59E0B', dollar: '2% of purchase' },
  { name: 'Funding', value: 3, color: '#3B82F6', dollar: '3% of purchase' },
];

const DIRECT_SOL_PIE_DATA = [
  { name: 'Fan Tokens', value: 92, color: '#00FF41', dollar: '92% of purchase' },
  { name: 'Artist Allocation', value: 5, color: '#00D4FF', dollar: '5% of purchase' },
  { name: 'Treasury', value: 1.5, color: '#F59E0B', dollar: '1.5% of purchase' },
  { name: 'Funding', value: 1.5, color: '#3B82F6', dollar: '1.5% of purchase' },
];

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value < 5) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="700">
      {value}%
    </text>
  );
};

function PurchaseSplitChart({ data, label }: { data: typeof SHOPIFY_PIE_DATA; label: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <FadeSection className="flex flex-col lg:flex-row items-center gap-10">
      <div ref={ref} className="w-full max-w-xs" style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              dataKey="value"
              labelLine={false}
              label={CustomPieLabel}
              isAnimationActive={inView}
              animationBegin={200}
              animationDuration={1000}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: any, n: any) => [`${v}%`, n]}
              contentStyle={{ background: '#0d0820', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#e0d7ff' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-center text-xs font-black uppercase tracking-widest mt-2" style={{ color: '#a78bfa' }}>
          {label}
        </p>
      </div>

      <div className="flex flex-col gap-3 flex-1">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: item.color }} />
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{item.name}</p>
              <p className="text-xs" style={{ color: 'rgba(220,214,240,0.5)' }}>{item.value}% of purchase</p>
            </div>
            <p className="text-base font-black" style={{ color: item.color, fontFamily: "'Inter', monospace" }}>
              {item.dollar}
            </p>
          </div>
        ))}
      </div>
    </FadeSection>
  );
}

// ─── Section 2: Edition Scarcity ─────────────────────────────────────────────

function EditionCard({ type, count, total, delay }: { type: 'ultra' | 'limited'; count: number; total: number; delay?: number }) {
  const isUltra = type === 'ultra';
  const neonColor = isUltra ? '#D946EF' : '#8B5CF6';

  return (
    <FadeSection delay={delay} className="flex-1">
      <div
        className="relative p-6 rounded-2xl h-full flex flex-col items-center text-center overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${neonColor}40`,
          boxShadow: `0 0 40px ${neonColor}20, inset 0 0 60px ${neonColor}08`,
        }}
      >
        {/* Glow overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top, ${neonColor}15 0%, transparent 60%)` }}
        />

        <p
          className="text-xs font-black uppercase tracking-[0.3em] mb-4"
          style={{ color: neonColor }}
        >
          {isUltra ? 'ULTRA-EXCLUSIVE' : 'LIMITED'}
        </p>

        <p
          className="text-6xl font-black mb-6"
          style={{
            background: `linear-gradient(135deg, #fff, ${neonColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          1/{total}
        </p>

        {/* Stacked edition cards */}
        <div className="relative mb-6" style={{ height: 80, width: 140 }}>
          {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-xl"
              style={{
                width: 100 + i * 4,
                height: 60,
                left: (140 - (100 + i * 4)) / 2,
                top: i * 4,
                background: `linear-gradient(135deg, rgba(139,92,246,0.${3 - Math.floor(i * 0.5)}) 0%, rgba(217,70,239,0.${2 - Math.floor(i * 0.3)}) 100%)`,
                border: `1px solid ${neonColor}${Math.max(10, 60 - i * 10).toString(16)}`,
                zIndex: total - i,
                boxShadow: i === 0 ? `0 0 16px ${neonColor}40` : 'none',
              }}
            >
              {i === 0 && (
                <div className="flex items-center justify-center h-full">
                  <span style={{ fontSize: '1.5rem' }}>🎵</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-xs leading-relaxed" style={{ color: 'rgba(220,214,240,0.55)' }}>
          {isUltra
            ? 'Artist Proof Editions · Numbered · Provenance on Solana'
            : 'Standard Editions · Numbered · Still Scarce'}
        </p>
      </div>
    </FadeSection>
  );
}

// ─── Section 3: Bonding Curve ─────────────────────────────────────────────────

function generateBondingCurve() {
  const points = [];
  for (let i = 0; i <= 100; i += 2) {
    const x = i;
    const y = 0.006 * Math.pow(1.038, i);
    points.push({ x, price: parseFloat(y.toFixed(4)) });
  }
  return points;
}

const CURVE_DATA = generateBondingCurve();

function BondingCurveChart() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <FadeSection>
      <div ref={ref} style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={CURVE_DATA} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <defs>
              <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="x"
              label={{ value: 'Tokens Purchased', position: 'insideBottom', fill: 'rgba(220,214,240,0.4)', fontSize: 11 }}
              tick={{ fill: 'rgba(220,214,240,0.35)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(220,214,240,0.35)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${v.toFixed(3)}`}
            />
            <Tooltip
              formatter={(v: any) => [`$${Number(v).toFixed(4)}`, 'Price']}
              labelFormatter={(l) => `Supply: ${l}%`}
              contentStyle={{ background: '#0d0820', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#e0d7ff', fontSize: 12 }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#8B5CF6"
              strokeWidth={2.5}
              fill="url(#priceGrad)"
              isAnimationActive={inView}
              animationBegin={300}
              animationDuration={1200}
            />
            <ReferenceDot x={20} y={CURVE_DATA[10]?.price ?? 0} r={6} fill="#00FF41" stroke="#fff" strokeWidth={2} label={{ value: 'Early $0.006', position: 'top', fill: '#00FF41', fontSize: 11, fontWeight: 700 }} />
            <ReferenceDot x={80} y={CURVE_DATA[40]?.price ?? 0} r={6} fill="#F97316" stroke="#fff" strokeWidth={2} label={{ value: 'Late $0.42', position: 'top', fill: '#F97316', fontSize: 11, fontWeight: 700 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-sm mt-4" style={{ color: 'rgba(220,214,240,0.5)' }}>
        Early fans pay less. Every new fan raises the price. Your tokens gain value as the artist grows.
      </p>
    </FadeSection>
  );
}

// ─── Section 4: Fee Flow Diagram ─────────────────────────────────────────────

const SHOPIFY_FLOWS = [
  { label: 'Fan Tokens', pct: '90%', dollars: 'Live SOL/USD price', color: '#00FF41', width: '90%' },
  { label: 'Artist Allocation', pct: '5%', dollars: 'Tokens + SOL to artist', color: '#00D4FF', width: '5%' },
  { label: 'Treasury', pct: '2%', dollars: 'Protocol treasury', color: '#F59E0B', width: '2%' },
  { label: 'Funding', pct: '3%', dollars: 'Platform ops', color: '#3B82F6', width: '3%' },
];

const DIRECT_SOL_FLOWS = [
  { label: 'Fan Tokens', pct: '92%', dollars: 'Live SOL/USD price', color: '#00FF41', width: '92%' },
  { label: 'Artist Allocation', pct: '5%', dollars: 'Tokens + SOL to artist', color: '#00D4FF', width: '5%' },
  { label: 'Treasury', pct: '1.5%', dollars: 'Protocol treasury', color: '#F59E0B', width: '1.5%' },
  { label: 'Funding', pct: '1.5%', dollars: 'Platform ops', color: '#3B82F6', width: '1.5%' },
];

function FeeFlowColumn({ flows, title, inView }: { flows: typeof SHOPIFY_FLOWS; title: string; inView: boolean }) {
  return (
    <div className="flex-1 flex flex-col gap-4">
      <p className="text-xs font-black uppercase tracking-widest text-center mb-2" style={{ color: '#a78bfa' }}>{title}</p>
      <div className="flex flex-col gap-2">
        {flows.map((flow, i) => (
          <motion.div
            key={i}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={inView ? { scaleX: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 + i * 0.1 }}
            style={{ transformOrigin: 'left' }}
          >
            <div className="flex items-center gap-2">
              <div
                className="h-2 rounded-full"
                style={{ width: flow.width, background: flow.color, boxShadow: `0 0 8px ${flow.color}80`, minWidth: 8 }}
              />
              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: flow.color }}>
                {flow.pct}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {flows.map((flow) => (
          <div key={flow.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: flow.color }} />
            <p className="text-xs font-bold" style={{ color: flow.color }}>{flow.label} {flow.dollars}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeeFlowDiagram() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <FadeSection>
      <div ref={ref} className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="flex flex-col lg:flex-row items-start gap-6 mb-6">
          <div
            className="px-5 py-3 rounded-xl text-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(236,72,153,0.2))', border: '1px solid rgba(139,92,246,0.4)' }}
          >
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'rgba(220,214,240,0.5)' }}>Fan Pays</p>
            <p className="text-2xl font-black text-white">Any amount</p>
          </div>

          <div className="flex-1 flex flex-col sm:flex-row gap-6">
            <FeeFlowColumn flows={SHOPIFY_FLOWS} title="Shopify (Apple Pay)" inView={inView} />
            <div className="hidden sm:block w-px" style={{ background: 'rgba(139,92,246,0.2)' }} />
            <FeeFlowColumn flows={DIRECT_SOL_FLOWS} title="Direct SOL (Phantom)" inView={inView} />
          </div>
        </div>

        <p className="text-xs text-center leading-relaxed" style={{ color: 'rgba(220,214,240,0.45)' }}>
          On every Song Coin trade: 2% artist + 1.5% infra + 1.5% treasury = 5% total &bull; On every NFT secondary sale: 0–20% artist royalty (set by artist) + 3% Lit Studio. Forever. Token price calculated live at SOL/USD oracle rate.
        </p>
      </div>
    </FadeSection>
  );
}

// ─── Section 4b: Revenue Streams ────────────────────────────────────────────

const REVENUE_STREAMS = [
  {
    title: 'Fan Token Allocation',
    description: '90% (Shopify/Apple Pay) or 92% (Direct SOL/Phantom) of every purchase goes directly to the buyer as song tokens. Token quantity is calculated live using the SOL/USD oracle price at the moment of purchase — no fixed amounts.',
    pct: '90–92%',
    accent: '#00FF41',
  },
  {
    title: 'Artist Allocation',
    description: '5% of every purchase goes directly to the song\'s artist as tokens and/or SOL, converted at market rate at time of purchase. Sent automatically within seconds of the fan completing checkout.',
    pct: '5%',
    accent: '#00D4FF',
  },
  {
    title: 'Creator Trading Fees',
    description: '2% creator fee on every bonding curve trade of your song token. Fees accumulate on-chain and are claimable at any time from your song\'s detail page.',
    pct: '2%',
    accent: '#8B5CF6',
  },
  {
    title: 'NFT Royalties',
    description: '10% royalty on secondary NFT sales, enforced by Metaplex on all supported marketplaces. Every time a collector resells your NFT, you earn — forever.',
    pct: '10%',
    accent: '#EC4899',
  },
];

function RevenueStreams() {
  return (
    <FadeSection>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REVENUE_STREAMS.map((stream, i) => (
          <motion.div
            key={stream.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
          >
            <div
              className="p-5 rounded-2xl h-full flex flex-col gap-3"
              style={{
                background: `linear-gradient(145deg, ${stream.accent}08 0%, rgba(255,255,255,0.02) 100%)`,
                border: `1px solid ${stream.accent}30`,
                boxShadow: `0 0 30px ${stream.accent}0d`,
              }}
            >
              {/* Header row */}
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${stream.accent}18`, border: `1px solid ${stream.accent}35` }}
                >
                  <Check size={14} strokeWidth={3} style={{ color: stream.accent }} />
                </div>
                <div className="flex items-baseline gap-2 min-w-0">
                  <span
                    className="text-xl font-black leading-none flex-shrink-0"
                    style={{ color: stream.accent, fontFamily: "'Inter', monospace" }}
                  >
                    {stream.pct}
                  </span>
                  <span className="text-sm font-bold text-white truncate">{stream.title}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs leading-relaxed flex-1" style={{ color: 'rgba(220,214,240,0.55)' }}>
                {stream.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </FadeSection>
  );
}

// ─── Section 5: Fan Club Tiers ────────────────────────────────────────────────

const TIERS = [
  {
    name: 'Studio',
    range: '1k–9,999 Song Coins',
    color: '#FFFF00',
    glow: '#e6e600',
    perks: ['Early song drops', '5% Song Coin bonus', 'Arena chat access'],
    badge: '⚡',
  },
  {
    name: 'Platinum',
    range: '10k–49,999 Song Coins',
    color: '#00D4FF',
    glow: '#0891b2',
    perks: ['Private previews', 'Artist AMAs', '12% Song Coin bonus'],
    badge: '💠',
  },
  {
    name: 'Diamond',
    range: '50k–249,999 Song Coins or 1+ NFT',
    color: '#a855f7',
    glow: '#7c3aed',
    perks: ['Co-write access', 'Revenue share', '22% Song Coin bonus'],
    badge: '💎',
  },
  {
    name: 'Legend',
    range: '250k+ Song Coins or 5+ NFTs',
    color: '#f59e0b',
    glow: '#d97706',
    perks: ['Executive credit', '1/1 NFT drops', '35% Song Coin bonus', 'Physical merch'],
    badge: '👑',
  },
];

function TierCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {TIERS.map((tier, i) => (
        <FadeSection key={tier.name} delay={i * 0.1}>
          <div
            className="p-5 rounded-2xl h-full"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${tier.glow}40`,
              boxShadow: `0 0 24px ${tier.glow}15`,
            }}
          >
            <div className="text-3xl mb-3">{tier.badge}</div>
            <p className="text-lg font-black mb-1" style={{ color: tier.glow }}>{tier.name}</p>
            <p className="text-xs mb-4" style={{ color: 'rgba(220,214,240,0.4)', fontFamily: "'Inter', monospace" }}>
              {tier.range}
            </p>
            <ul className="space-y-1.5">
              {tier.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-xs" style={{ color: 'rgba(220,214,240,0.65)' }}>
                  <span style={{ color: tier.glow, flexShrink: 0 }}>✓</span>
                  {perk}
                </li>
              ))}
            </ul>
          </div>
        </FadeSection>
      ))}
    </div>
  );
}

// ─── Section 6: Why Solana ────────────────────────────────────────────────────

const SOLANA_STATS = [
  { icon: '⚡', stat: '400ms', label: 'Transaction Finality', sub: 'Fast enough to feel like streaming' },
  { icon: '💸', stat: '<$0.01', label: 'Per Transaction', sub: 'Cheap enough to mint on every purchase' },
  { icon: '📊', stat: '65,000', label: 'TPS Throughput', sub: 'Scale for millions of fans worldwide' },
];

function SolanaStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {SOLANA_STATS.map((item, i) => (
        <FadeSection key={i} delay={i * 0.1}>
          <div
            className="p-6 rounded-2xl text-center"
            style={{
              background: 'linear-gradient(145deg, rgba(20, 241, 149, 0.05) 0%, rgba(139,92,246,0.08) 100%)',
              border: '1px solid rgba(20,241,149,0.15)',
            }}
          >
            <div className="text-3xl mb-3">{item.icon}</div>
            <p
              className="text-3xl font-black mb-1"
              style={{
                background: 'linear-gradient(90deg, #14F195, #9945FF)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {item.stat}
            </p>
            <p className="text-sm font-bold text-white mb-1">{item.label}</p>
            <p className="text-xs" style={{ color: 'rgba(220,214,240,0.45)' }}>{item.sub}</p>
          </div>
        </FadeSection>
      ))}
    </div>
  );
}

// ─── Section 7: Vision Quote ──────────────────────────────────────────────────

function VisionQuote() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.8 }}
      className="max-w-3xl mx-auto text-center px-6"
    >
      <div
        className="text-7xl font-black mb-6 opacity-40"
        style={{ color: '#8B5CF6', fontFamily: 'Georgia, serif', lineHeight: 1 }}
      >
        "
      </div>
      <blockquote
        className="text-xl sm:text-2xl leading-relaxed font-medium mb-8"
        style={{
          fontStyle: 'italic',
          color: 'rgba(220,214,240,0.85)',
          fontFamily: 'Georgia, serif',
        }}
      >
        Music Finance is the new frontier. Every song is a chart. Every fan is an investor. Every stream proves the thesis.
      </blockquote>
      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: '#8B5CF6' }}>
        — KAI VOSS, Founder & Sound Architect
      </p>
    </motion.div>
  );
}

// ─── Counter animation hook ───────────────────────────────────────────────────

function useCountUp(target: number, inView: boolean, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);
  return count;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const sectionBase = { padding: '80px 0' };

const TokenomicsPage: React.FC = () => {
  const [splitTab, setSplitTab] = useState<'shopify' | 'direct'>('shopify');

  return (
    <div className="min-h-screen" style={{ background: 'transparent', color: '#e0d7ff' }}>

      <div style={{ paddingTop: '80px' }}>
        {/* Header */}
        <div className="max-w-4xl mx-auto px-6 pt-12 pb-4 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div
              className="inline-block text-xs font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}
            >
              Whitepaper
            </div>
            <h1
              className="text-4xl sm:text-6xl font-black mb-4"
              style={{
                background: 'linear-gradient(135deg, #fff 30%, #a78bfa 65%, #f472b6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}
            >
              Lit Studio Tokenomics
            </h1>
            <p className="text-base sm:text-lg" style={{ color: 'rgba(220,214,240,0.5)' }}>
              How music becomes money for artists and fans.
            </p>
          </motion.div>
        </div>

        {/* ── 1. Purchase Split ── */}
        <section style={{ ...sectionBase, background: '#080512' }}>
          <div className="max-w-4xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">v20 Purchase Split</h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Every purchase is split transparently on-chain. Your share depends on how you pay — Shopify/Apple Pay or direct SOL via Phantom. The artist always gets 5%.
              </p>
            </FadeSection>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setSplitTab('shopify')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition ${
                  splitTab === 'shopify'
                    ? 'bg-[#a78bfa] text-black'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                Shopify (Apple Pay)
              </button>
              <button
                onClick={() => setSplitTab('direct')}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition ${
                  splitTab === 'direct'
                    ? 'bg-[#a78bfa] text-black'
                    : 'bg-white/5 text-white/50 hover:bg-white/10'
                }`}
              >
                Direct SOL (Phantom)
              </button>
            </div>

            {splitTab === 'shopify' ? (
              <PurchaseSplitChart data={SHOPIFY_PIE_DATA} label="SHOPIFY / APPLE PAY" />
            ) : (
              <PurchaseSplitChart data={DIRECT_SOL_PIE_DATA} label="DIRECT SOL / PHANTOM" />
            )}
          </div>
        </section>

        {/* ── 2. Edition Scarcity ── */}
        <section style={{ ...sectionBase, background: 'linear-gradient(180deg, #080512 0%, #0d0820 100%)' }}>
          <div className="max-w-4xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Edition Scarcity</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Limited editions create provable scarcity and collector value.
              </p>
            </FadeSection>
            <div className="flex flex-col sm:flex-row gap-4">
              <EditionCard type="ultra" count={1} total={5} delay={0} />
              <EditionCard type="limited" count={1} total={10} delay={0.1} />
            </div>
          </div>
        </section>

        {/* ── 3. Bonding Curve ── */}
        <section style={{ ...sectionBase, background: '#0d0820' }}>
          <div className="max-w-4xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Bonding Curve</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Price is programmatically set by supply. Early fans always win.
              </p>
            </FadeSection>
            <BondingCurveChart />
          </div>
        </section>

        {/* ── 4. Fee Flow ── */}
        <section style={{ ...sectionBase, background: 'linear-gradient(180deg, #0d0820 0%, #080512 100%)' }}>
          <div className="max-w-4xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Fee Flow</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Every transaction is transparent. No hidden fees, no middlemen taking 40%.
              </p>
            </FadeSection>
            <FeeFlowDiagram />
          </div>
        </section>

        {/* ── 4b. Revenue Streams ── */}
        <section style={{ ...sectionBase, background: '#080512' }}>
          <div className="max-w-4xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Earn From Every Angle</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Fans, artists, and the protocol all benefit. Fan token holders get upside from demand. Artists earn on purchases and trades. NFT royalties continue forever.
              </p>
            </FadeSection>
            <RevenueStreams />
          </div>
        </section>

        {/* ── 5. Fan Club Tiers ── */}
        <section style={{ ...sectionBase, background: 'linear-gradient(180deg, #080512 0%, #0d0820 100%)' }}>
          <div className="max-w-5xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Fan Club Tiers</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(220,214,240,0.5)' }}>
                The more you own, the more access you unlock. True fan economics.
              </p>
            </FadeSection>
            <TierCards />
          </div>
        </section>

        {/* ── 6. Why Solana ── */}
        <section style={{ ...sectionBase, background: 'linear-gradient(180deg, #080512 0%, #0d0820 100%)' }}>
          <div className="max-w-4xl mx-auto px-6">
            <FadeSection>
              <h2 className="text-2xl sm:text-3xl font-black mb-2 text-white">Why Solana</h2>
              <p className="text-sm mb-8" style={{ color: 'rgba(220,214,240,0.5)' }}>
                The only chain fast enough and cheap enough for music at scale.
              </p>
            </FadeSection>
            <SolanaStats />
          </div>
        </section>

        {/* ── 7. Vision Quote ── */}
        <section
          style={{
            ...sectionBase,
            background: '#0d0820',
            borderTop: '1px solid rgba(139,92,246,0.1)',
          }}
        >
          <VisionQuote />
        </section>

        {/* ── CTA ── */}
        <section style={{ ...sectionBase, background: 'linear-gradient(180deg, #0d0820 0%, #080512 100%)' }}>
          <div className="max-w-2xl mx-auto px-6 text-center">
            <FadeSection>
              <h2
                className="text-3xl sm:text-4xl font-black mb-6"
                style={{
                  background: 'linear-gradient(135deg, #fff 0%, #a78bfa 60%, #f472b6 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '-0.02em',
                }}
              >
                Start owning music today.
              </h2>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link
                  to="/"
                  className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                    color: 'white',
                    boxShadow: '0 0 32px rgba(139,92,246,0.5)',
                  }}
                >
                  Browse Songs
                </Link>
                <Link
                  to="/create"
                  className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(139,92,246,0.35)',
                    color: '#c4b5fd',
                  }}
                >
                  Launch Your Song
                </Link>
              </div>
              <p className="mt-8 text-sm" style={{ color: 'rgba(220,214,240,0.35)' }}>
                Learn more on the{' '}
                <Link to="/about" style={{ color: '#8b5cf6' }}>About page</Link>
              </p>
            </FadeSection>
          </div>
        </section>
      </div>
    </div>
  );
};

export default TokenomicsPage;
