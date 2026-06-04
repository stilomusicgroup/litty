/**
 * TradeSlippage — reusable slippage settings panel + localStorage persistence.
 *
 * Usage:
 *   const [slipBps, setSlipBps] = useSlippage();
 *   <SlippagePanel slipBps={slipBps} onChange={setSlipBps} />
 */

import React, { useState, useCallback } from 'react';
import { Settings2, X } from 'lucide-react';

const STORAGE_KEY = 'poof_trade_slip_bps';
const DEFAULT_BPS = 500; // 5%
const PRESETS = [100, 500, 1000, 2500] as const; // 1%, 5%, 10%, 25%

function readSlipFromStorage(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const n = parseInt(raw, 10);
      if (!isNaN(n) && n >= 0 && n <= 10000) return n;
    }
  } catch {}
  return DEFAULT_BPS;
}

function writeSlipToStorage(bps: number) {
  try { localStorage.setItem(STORAGE_KEY, String(bps)); } catch {}
}

/** Call this hook at the top level of a Buy/Sell modal to get slip state. */
export function useSlippage(): [number, (bps: number) => void] {
  const [slipBps, setSlipBpsRaw] = useState<number>(() => readSlipFromStorage());
  const setSlipBps = useCallback((bps: number) => {
    setSlipBpsRaw(bps);
    writeSlipToStorage(bps);
  }, []);
  return [slipBps, setSlipBps];
}

interface SlippagePanelProps {
  slipBps: number;
  onChange: (bps: number) => void;
  onClose: () => void;
}

const NEON_GREEN = '#00FF41';

const SlippagePanel: React.FC<SlippagePanelProps> = ({ slipBps, onChange, onClose }) => {
  const [customRaw, setCustomRaw] = useState('');
  const isCustom = !PRESETS.includes(slipBps as any);

  const handleCustomChange = (val: string) => {
    setCustomRaw(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 50) {
      onChange(Math.round(num * 100));
    }
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(6,10,6,0.98)',
        border: '1px solid rgba(0, 255, 65, 0.3)',
        boxShadow: '0 0 32px rgba(0, 255, 65, 0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings2 size={13} style={{ color: NEON_GREEN }} />
          <span
            className="text-xs font-black tracking-widest uppercase"
            style={{ color: '#fff', fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.1em' }}
          >
            Slippage
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)' }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex gap-2 mb-3">
        {PRESETS.map(bps => {
          const pct = (bps / 100).toFixed(0);
          const isActive = slipBps === bps;
          return (
            <button
              key={bps}
              onClick={() => { onChange(bps); setCustomRaw(''); }}
              className="flex-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: isActive ? 'rgba(0, 255, 65, 0.18)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? 'rgba(0, 255, 65, 0.6)' : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? NEON_GREEN : 'rgba(255,255,255,0.5)',
                boxShadow: isActive ? '0 0 10px rgba(0, 255, 65, 0.2)' : 'none',
              }}
            >
              {pct}%
            </button>
          );
        })}
      </div>

      {/* Custom input */}
      <div className="relative">
        <input
          type="number"
          min={0}
          max={50}
          step={0.1}
          value={isCustom && !customRaw ? (slipBps / 100).toFixed(2) : customRaw}
          onChange={(e) => handleCustomChange(e.target.value)}
          placeholder="Custom %"
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
          style={{
            background: isCustom ? 'rgba(0, 255, 65, 0.06)' : 'rgba(0,0,0,0.3)',
            border: `1px solid ${isCustom ? 'rgba(0, 255, 65, 0.4)' : 'rgba(255,255,255,0.08)'}`,
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            paddingRight: '2.5rem',
          }}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          %
        </span>
      </div>

      {/* Current value summary */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Current slippage</span>
        <span
          className="text-xs font-black"
          style={{
            fontFamily: "'Inter', sans-serif",
            color: slipBps > 2500 ? '#FF3F4B' : slipBps > 1000 ? '#FFA500' : NEON_GREEN,
          }}
        >
          {(slipBps / 100).toFixed(2)}% {slipBps > 2500 ? '⚠' : ''}
        </span>
      </div>
    </div>
  );
};

export default SlippagePanel;
