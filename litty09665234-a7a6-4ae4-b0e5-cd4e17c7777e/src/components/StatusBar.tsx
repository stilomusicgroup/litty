import React from 'react';

// ─── StatusBar Component ──────────────────────────────────────────────────────
// Fixed bottom bar showing network status, SOL price, TPS, and system health.

const StatusBar: React.FC = () => {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '36px',
        background: '#0f130f',
        borderTop: '1px solid #252525',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '16px',
        paddingRight: '16px',
        zIndex: 49,
        gap: '0',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {/* Left cluster — hidden on mobile */}
      <div className="hidden sm:flex items-center gap-4" style={{ flex: '0 0 auto' }}>
        {/* SOL Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '9px',
            fontWeight: 700,
            color: '#A1A1AA',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>SOL PRICE</span>
          <span style={{
            fontFamily: "'Inter', monospace",
            fontSize: '11px',
            fontWeight: 700,
            color: '#FFFFFF',
          }}>$148.32</span>
        </div>

        <div style={{ width: '1px', height: '14px', background: '#252525' }} />

        {/* Network */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '9px',
            fontWeight: 700,
            color: '#A1A1AA',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>NETWORK</span>
          <span style={{
            fontFamily: "'Inter', monospace",
            fontSize: '11px',
            fontWeight: 700,
            color: '#FFFFFF',
          }}>SOLANA</span>
        </div>

        <div style={{ width: '1px', height: '14px', background: '#252525' }} />

        {/* TPS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '9px',
            fontWeight: 700,
            color: '#A1A1AA',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>TPS</span>
          <span style={{
            fontFamily: "'Inter', monospace",
            fontSize: '11px',
            fontWeight: 700,
            color: '#FFFFFF',
          }}>4,218</span>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: Status indicator — always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 auto' }}>
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: '#00FF66',
          boxShadow: '0 0 6px rgba(0,255,102,0.8)',
          animation: 'statusPulse 2.5s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '9px',
          fontWeight: 700,
          color: '#00FF66',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>ALL SYSTEMS OPERATIONAL</span>
      </div>

      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px rgba(0,255,102,0.8); }
          50% { opacity: 0.6; box-shadow: 0 0 2px rgba(0,255,102,0.3); }
        }
      `}</style>
    </div>
  );
};

export default StatusBar;
