import { PageLayout } from '@/components/poof-ui';
import { Zap, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NEON_GREEN = '#00FF41';
const NEON_CYAN = '#00D4FF';
const NEON_PURPLE = '#BF00FF';

// v20 tokenomics: 92% fan / 5% artist / 1.5% infra / 1.5% treasury
// Dollar amounts are NOT shown — all token amounts are calculated live by the SOL/USD oracle.
interface TierBreakdown {
  id: string;
  name: string;
  price: number;
  nftCount: number;
  gradient: string;
  borderColor: string;
  glowColor: string;
}

const TIERS: TierBreakdown[] = [
  {
    id: 'studio',
    name: 'Studio',
    price: 10.99,
    nftCount: 1,
    gradient: 'linear-gradient(135deg, #e6e600, #FFFF00)',
    borderColor: '#FFFF00',
    glowColor: 'rgba(255,255,0,0.6)',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    price: 39.99,
    nftCount: 2,
    gradient: 'linear-gradient(135deg, #0891b2, #00D4FF)',
    borderColor: '#00D4FF',
    glowColor: 'rgba(0,212,255,0.5)',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    price: 69.99,
    nftCount: 3,
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    borderColor: '#a855f7',
    glowColor: 'rgba(168,85,247,0.7)',
  },
  {
    id: 'legend',
    name: 'Legend',
    price: 99.99,
    nftCount: 5,
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.8)',
  },
];

const SegmentedBar: React.FC = () => (
  <div className="w-full h-3 rounded-full overflow-hidden flex mb-3" style={{ gap: '1px' }}>
    <div style={{ width: '92%', background: '#00FF41', boxShadow: '0 0 8px rgba(0, 255, 65, 0.4)' }} />
    <div style={{ width: '5%', background: '#00D4FF', boxShadow: '0 0 8px rgba(0,212,255,0.4)' }} />
    <div style={{ width: '1.5%', background: '#9CA3AF' }} />
    <div style={{ width: '1.5%', background: '#8B5CF6' }} />
  </div>
);

const BarLegend: React.FC = () => {
  const items = [
    { emoji: '🪙', label: 'Fan tokens', color: '#00FF41', pct: '92%' },
    { emoji: '🎤', label: 'Artist', color: '#00D4FF', pct: '5%' },
    { emoji: '⚙️', label: 'Infrastructure', color: '#9CA3AF', pct: '1.5%' },
    { emoji: '🏛', label: 'Treasury', color: '#8B5CF6', pct: '1.5%' },
  ];
  return (
    <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span style={{ fontSize: '12px' }}>{item.emoji}</span>
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
          <span className="text-[11px] font-bold font-mono" style={{ color: item.color }}>{item.pct}</span>
        </div>
      ))}
    </div>
  );
};

const TierCard: React.FC<{ tier: TierBreakdown }> = ({ tier }) => (
  <div
    className="rounded-xl overflow-hidden"
    style={{
      background: 'linear-gradient(145deg, rgba(20,12,40,0.99) 0%, rgba(10,5,25,0.99) 100%)',
      border: `1px solid ${tier.borderColor}30`,
      boxShadow: `0 0 12px ${tier.glowColor}20`,
    }}
  >
    {/* Top accent bar */}
    <div className="h-1 w-full" style={{ background: tier.gradient }} />

    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
          style={{
            background: tier.gradient,
            color: '#fff',
            border: `1px solid ${tier.borderColor}`,
            boxShadow: `0 0 8px ${tier.glowColor}`,
            fontFamily: "'Archivo Black', sans-serif",
          }}
        >
          {tier.name[0]}
        </div>
        <div>
          <h3 className="text-sm font-black text-white" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
            {tier.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono" style={{ color: tier.borderColor }}>${tier.price.toFixed(2)}</span>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{tier.nftCount} NFT{tier.nftCount > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* v20 Percentage breakdown */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>🪙 Fan tokens</span>
          <span className="font-mono font-bold" style={{ color: '#00FF41' }}>92%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>🎤 Artist allocation</span>
          <span className="font-mono font-bold" style={{ color: '#00D4FF' }}>5%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>⚙️ Infrastructure</span>
          <span className="font-mono font-bold" style={{ color: '#9CA3AF' }}>1.5%</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>🏛 Treasury</span>
          <span className="font-mono font-bold" style={{ color: '#8B5CF6' }}>1.5%</span>
        </div>
      </div>

      {/* Segmented bar */}
      <SegmentedBar />

      {/* Note */}
      <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.3)' }}>
        Token amounts calculated live at SOL/USD oracle price
      </p>
    </div>
  </div>
);

export default function TransparencyPage() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Back button + Title */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm mb-4 transition-colors hover:text-white"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Archivo Black', sans-serif" }}
          >
            <ArrowLeft size={14} />
            Back
          </button>

          <div className="text-center mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-3"
              style={{
                background: 'rgba(0, 255, 65, 0.08)',
                border: '1px solid rgba(0, 255, 65, 0.2)',
                boxShadow: '0 0 10px rgba(0, 255, 65, 0.15)',
              }}
            >
              <Zap size={10} color={NEON_GREEN} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: NEON_GREEN }}>
                Full Transparency
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Archivo Black', sans-serif" }}>
              Where Your Money Goes
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              v20 tokenomics — percentage breakdown of every song token purchase
            </p>
          </div>
        </div>

        {/* Tier cards */}
        <div className="space-y-4">
          {TIERS.map((tier) => (
            <TierCard key={tier.id} tier={tier} />
          ))}
        </div>

        {/* Segmented bar summary */}
        <div
          className="rounded-xl p-4"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <SegmentedBar />
          <BarLegend />
        </div>

        {/* Footer */}
        <div className="text-center space-y-2 pt-2">
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <span style={{ color: '#00FF41', fontWeight: 700 }}>92%</span> to the fan,{' '}
            <span style={{ color: '#00D4FF', fontWeight: 700 }}>5%</span> to the artist,{' '}
            <span style={{ color: '#9CA3AF', fontWeight: 700 }}>3%</span> platform (1.5% infra + 1.5% treasury).
            Token amounts are set live by the SOL/USD oracle — no fixed numbers.
            Artists also earn 1.5% perpetual trading fees on every swap.
          </p>
          <p
            className="text-xs font-black uppercase tracking-widest"
            style={{
              color: NEON_CYAN,
              textShadow: '0 0 8px rgba(0,212,255,0.3)',
              fontFamily: "'Archivo Black', sans-serif",
            }}
          >
            Transparent &bull; Sustainable &bull; Artist-First
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
