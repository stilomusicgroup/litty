import React from 'react';
import { BadgeCheck } from 'lucide-react';

interface VerifiedBadgeProps {
  isVerified: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: 14,
  md: 18,
  lg: 22,
};

const VerifiedBadge: React.FC<VerifiedBadgeProps> = ({ isVerified, size = 'md' }) => {
  if (!isVerified) return null;

  const px = SIZES[size];

  return (
    <span
      title="Verified Artist"
      style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
    >
      <BadgeCheck
        size={px}
        style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0,212,255,0.5))' }}
        aria-label="Verified Artist"
      />
    </span>
  );
};

export default VerifiedBadge;
