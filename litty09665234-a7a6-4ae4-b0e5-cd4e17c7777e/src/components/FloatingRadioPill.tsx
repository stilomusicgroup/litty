import React from 'react';

interface FloatingRadioPillProps {
  onClick?: () => void;
}

const FloatingRadioPill: React.FC<FloatingRadioPillProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-16 md:bottom-6 right-3 z-[400] flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-full transition-all active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #00FF41, #00E607, #00B305)',
        boxShadow: '0 4px 24px rgba(0, 255, 65, 0.45), 0 0 40px rgba(0, 255, 65, 0.2)',
        border: '1px solid rgba(0, 255, 65, 0.6)',
        minHeight: '36px',
        minWidth: '36px',
      }}
    >
      {/* Live dot */}
      <div
        className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0"
        style={{
          background: '#ffffff',
          boxShadow: '0 0 6px #ffffff',
          animation: 'pulse-dot 2s ease-in-out infinite',
        }}
      />
      <span
        className="text-[10px] sm:text-xs font-bold text-black whitespace-nowrap"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {'🎵'} RADIO LIT {'✨'}
      </span>
    </button>
  );
};

export default FloatingRadioPill;
