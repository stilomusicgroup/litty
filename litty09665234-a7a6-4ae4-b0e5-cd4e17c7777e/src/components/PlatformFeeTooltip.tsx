import React, { useState } from 'react';
import { Info } from 'lucide-react';

const INFRASTRUCTURE_PERCENT = 3;
const INFRASTRUCTURE_MESSAGE = "3% platform fee (1.5% infrastructure + 1.5% treasury) supports continuous innovation, new tools for artists, and building real residual economies.";
const INFRASTRUCTURE_TOOLTIP = "The 3% platform fee (1.5% infrastructure + 1.5% treasury) funds ongoing development, platform sustainability, and long-term ecosystem growth so creators can build and create forever.";

interface PlatformFeeTooltipProps {
  compact?: boolean;
}

export const InfrastructureBadge: React.FC<PlatformFeeTooltipProps> = () => {
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
      style={{
        background: 'rgba(139,92,246,0.12)',
        border: '1px solid rgba(139,92,246,0.2)',
      }}
    >
      <span
        className="text-[10px] font-semibold"
        style={{ color: '#a78bfa' }}
      >
        {INFRASTRUCTURE_PERCENT}% fee
      </span>
      <span
        className="text-[10px]"
        style={{ color: 'rgba(220,214,240,0.4)' }}
      >
        supports Lit Studio
      </span>
    </div>
  );
};

export const InfrastructureTooltip: React.FC<PlatformFeeTooltipProps> = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="flex items-center gap-1 transition-all"
        style={{ color: 'rgba(139,92,246,0.6)' }}
      >
        <Info size={12} />
        <span
          className="text-[10px] font-semibold"
          style={{ color: '#a78bfa' }}
        >
          {INFRASTRUCTURE_PERCENT}% infrastructure
        </span>
      </button>

      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-64 p-3 rounded-xl"
          style={{
            background: 'linear-gradient(145deg, rgba(30,20,60,0.98) 0%, rgba(15,10,30,0.99) 100%)',
            border: '1px solid rgba(139,92,246,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.15)',
          }}
        >
          <div
            className="text-xs font-bold mb-1.5"
            style={{ color: '#c4b5fd' }}
          >
            {INFRASTRUCTURE_MESSAGE}
          </div>
          <div
            className="text-[10px] leading-relaxed"
            style={{ color: 'rgba(220,214,240,0.5)' }}
          >
            {INFRASTRUCTURE_TOOLTIP}
          </div>
          {/* Arrow */}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
            style={{
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid rgba(139,92,246,0.4)',
            }}
          />
        </div>
      )}
    </div>
  );
};

export const FeeBreakdown: React.FC<{ amount: string; feeAmount: string; total: string; type?: 'buy' | 'sell'; swapFee?: string; gasEstimate?: string }> = ({
  amount,
  feeAmount,
  total,
  type = 'buy',
  swapFee,
  gasEstimate,
}) => {
  const accentColor = type === 'buy' ? '#a78bfa' : '#f472b6';

  return (
    <div
      className="rounded-lg p-3 space-y-2"
      style={{
        background: 'rgba(0,0,0,0.25)',
        border: '1px solid rgba(139,92,246,0.15)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'rgba(220,214,240,0.5)' }}>
          {type === 'buy' ? 'You pay' : 'You receive'}
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: '#e0d7ff', fontFamily: "'Inter', monospace" }}
        >
          {amount}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-[11px]" style={{ color: 'rgba(220,214,240,0.5)' }}>
            Infrastructure (1.5%) + Treasury (1.5%)
          </span>
          <InfrastructureTooltip compact />
        </div>
        <span
          className="text-xs font-semibold"
          style={{ color: accentColor, fontFamily: "'Inter', monospace" }}
        >
          {feeAmount}
        </span>
      </div>
      {swapFee && (
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'rgba(220,214,240,0.5)' }}>
            Swap fee (0.5%)
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: accentColor, fontFamily: "'Inter', monospace" }}
          >
            {swapFee}
          </span>
        </div>
      )}
      {gasEstimate && (
        <div className="flex items-center justify-between">
          <span className="text-[11px]" style={{ color: 'rgba(220,214,240,0.5)' }}>
            Estimated gas
          </span>
          <span
            className="text-xs font-semibold"
            style={{ color: '#a78bfa', fontFamily: "'Inter', monospace" }}
          >
            {gasEstimate}
          </span>
        </div>
      )}
      <div
        className="flex items-center justify-between pt-1"
        style={{ borderTop: '1px solid rgba(139,92,246,0.1)' }}
      >
        <span className="text-[11px] font-semibold" style={{ color: '#e0d7ff' }}>
          {type === 'buy' ? 'Total' : 'You receive'}
        </span>
        <span
          className="text-sm font-black"
          style={{ color: '#fff', fontFamily: "'Inter', monospace" }}
        >
          {total}
        </span>
      </div>
    </div>
  );
};

export default InfrastructureTooltip;
