import React, { useEffect, useState } from 'react';
import { hapticTap } from '@/utils/haptic';

/**
 * Apple Pay mark SVG — official-style Apple logo + "Pay" text
 * Rendered inline so no external assets are needed.
 */
const ApplePayMark: React.FC<{ height?: number }> = ({ height = 20 }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-2 0 174 106"
    height={height}
    width={Math.round(height * (174 / 106))}
    aria-label="Apple Pay"
    role="img"
    style={{ flexShrink: 0, overflow: 'visible' }}
  >
    <g fill="#fff">
      {/* Apple logo */}
      <path d="M40.58 12.3c2.63-3.3 4.42-7.9 3.93-12.3-3.82.16-8.44 2.54-11.18 5.74-2.45 2.82-4.6 7.53-4.02 11.97 4.26.33 8.61-2.16 11.27-5.41z" />
      <path d="M44.46 18.07c-6.23-.37-11.53 3.54-14.5 3.54-2.97 0-7.56-3.35-12.43-3.26-6.4.09-12.3 3.72-15.6 9.46-6.65 11.53-1.7 28.63 4.78 38.01 3.17 4.6 6.95 9.74 11.92 9.56 4.78-.18 6.58-3.08 12.35-3.08 5.77 0 7.38 3.08 12.35 2.99 5.14-.09 8.44-4.69 11.61-9.3 3.63-5.31 5.12-10.46 5.21-10.73-.09-.09-10.01-3.82-10.1-15.24-.09-9.56 7.81-14.14 8.17-14.42-4.46-6.58-11.4-7.31-13.87-7.53z" />
      {/* "Pay" text */}
      <path d="M88.64 4.15c10.86 0 18.42 7.49 18.42 18.39S99.63 41 88.51 41H76.77v20.93h-8.63V4.15zm-11.87 30h9.74c7.56 0 11.87-4.08 11.87-10.58s-4.31-10.55-11.83-10.55h-9.78z" />
      <path d="M109.63 49.04c0-7.11 5.45-11.47 15.11-12.04l11.13-.66v-3.08c0-4.52-3.04-7.23-8.12-7.23-4.82 0-7.87 2.41-8.6 6.11h-7.87c.47-7.56 6.48-13.17 16.76-13.17 9.84 0 16.17 5.24 16.17 13.38v28.01h-7.99v-6.68h-.18c-2.38 4.52-7.56 7.36-12.97 7.36-8.06 0-13.44-4.96-13.44-12.0zm26.24-3.63v-3.15l-10.01.63c-4.99.33-7.83 2.5-7.83 5.99 0 3.58 2.97 5.93 7.49 5.93 5.89 0 10.35-4.05 10.35-9.4z" />
      <path d="M150.83 76.82v-6.77c.57.14 1.83.14 2.47.14 3.54 0 5.45-1.49 6.62-5.31l.71-2.28-14.42-40.8h9.04l9.98 32.88h.14l9.98-32.88h8.83L169.2 65.5c-3.26 9.23-7.01 12.2-14.86 12.2-.64 0-2.94-.09-3.51-.23v-.65z" />
    </g>
  </svg>
);

/**
 * A smaller "card" icon for the Pay with Card variant
 */
const CardIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

interface ApplePayButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: 'large' | 'small';
  variant?: 'apple-pay' | 'card';
  className?: string;
  price?: string;
}

function canMakeApplePayPayments(): boolean {
  if (typeof window === 'undefined') return false;
  const ApplePaySession = (window as any).ApplePaySession;
  return !!ApplePaySession && typeof ApplePaySession.canMakePayments === 'function' && ApplePaySession.canMakePayments();
}

const ApplePayButton: React.FC<ApplePayButtonProps> = ({
  onClick,
  disabled = false,
  size = 'large',
  variant = 'apple-pay',
  className = '',
  price,
}) => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    setAvailable(canMakeApplePayPayments());
  }, []);

  // If Apple Pay is not available, don't render anything
  if (variant === 'apple-pay' && !available) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    hapticTap();
    onClick();
  };

  if (variant === 'card') {
    const isLarge = size === 'large';
    return (
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`flex items-center justify-center gap-2 font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        style={{
          width: '100%',
          padding: isLarge ? '14px 20px' : '8px 14px',
          borderRadius: isLarge ? '14px' : '10px',
          fontSize: isLarge ? '14px' : '12px',
          background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
          border: disabled ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.15)',
          color: disabled ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={e => {
          if (disabled) return;
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.25)';
        }}
        onMouseLeave={e => {
          if (disabled) return;
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)';
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.15)';
        }}
      >
        <CardIcon size={isLarge ? 18 : 14} />
        <span>Pay with Card</span>
        {price && (
          <span style={{ opacity: 0.5, fontFamily: "'Inter', monospace" }}>{price}</span>
        )}
      </button>
    );
  }

  // Apple Pay variant
  const isLarge = size === 'large';
  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        width: '100%',
        padding: isLarge ? '16px 24px' : '10px 16px',
        borderRadius: isLarge ? '14px' : '10px',
        background: disabled ? '#0a0a0a' : '#000000',
        border: disabled ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.12)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: isLarge
          ? '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset'
          : '0 2px 10px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={e => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
        (e.currentTarget as HTMLElement).style.boxShadow = isLarge
          ? '0 6px 24px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset'
          : '0 4px 14px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={e => {
        if (disabled) return;
        (e.currentTarget as HTMLElement).style.background = '#000000';
        (e.currentTarget as HTMLElement).style.boxShadow = isLarge
          ? '0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset'
          : '0 2px 10px rgba(0,0,0,0.3)';
      }}
      aria-label="Buy with Apple Pay"
    >
      <ApplePayMark height={isLarge ? 24 : 18} />
    </button>
  );
};

export default ApplePayButton;
