import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface RiskDisclaimerBannerProps {
  className?: string;
  style?: React.CSSProperties;
}

const RiskDisclaimerBanner: React.FC<RiskDisclaimerBannerProps> = ({ className = '', style }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium ${className}`}
      style={{
        background: 'rgba(234, 179, 8, 0.08)',
        borderBottom: '1px solid rgba(234, 179, 8, 0.2)',
        color: '#fbbf24',
        ...style,
      }}
    >
      <AlertTriangle size={14} className="flex-shrink-0" style={{ color: '#fbbf24' }} />
      <span className="flex-1">
        Song tokens are speculative digital assets. Prices can be volatile. This is not investment advice.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 p-1 rounded transition-colors hover:bg-white/5"
        aria-label="Dismiss disclaimer"
      >
        <X size={14} style={{ color: 'rgba(251, 191, 36, 0.7)' }} />
      </button>
    </div>
  );
};

export default RiskDisclaimerBanner;
