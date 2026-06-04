/**
 * TickerStrip — reusable live ticker bar with scrolling marquee and timeframe buttons.
 * Used on every page via PageLayout. Has desktop and mobile variants.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { useTickerSongs } from '@/hooks/useTickerSongs';
import { orbitronFont } from '@/theme';

// ─── Timeframe tabs ────────────────────────────────────────────────────────────
export type TimeTab = '1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL';
export const TIME_TABS: TimeTab[] = ['1H', '1D', '1W', '1M', '1Y', 'ALL'];

interface TickerStripProps {
  activeTab?: TimeTab;
  onTabChange?: (tab: TimeTab) => void;
  showTimeframeButtons?: boolean;
}

/**
 * Desktop variant — padding 8px 32px, 13px marquee text, desktopTickerScroll animation.
 */
export function TickerStripDesktop({
  activeTab = '1D',
  onTabChange,
  showTimeframeButtons = true,
}: TickerStripProps) {
  const { songs, loading } = useTickerSongs();
  const [timerStr, setTimerStr] = useState('00:00:00');

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setTimerStr(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tickerText = useMemo(() => {
    if (loading || songs.length === 0) {
      return 'Loading live market data\u2026 \u00A0\u00A0\u00A0 Loading live market data\u2026 \u00A0\u00A0\u00A0 Loading live market data\u2026';
    }
    return songs
      .slice(0, 12)
      .map((s) => {
        const sym = s.symbol?.startsWith('$') ? s.symbol : `$${s.symbol ?? 'TOKEN'}`;
        if (s.isNewRelease) {
          return `\u2728 NEW \u2014 ${sym}${s.name ? ` \u2014 ${s.name}` : ''}`;
        }
        const progress = s.bondingProgress !== null ? `${Math.round(s.bondingProgress)}% bonding curve` : 'bonding';
        return `\uD83D\uDD25 ${sym} \u2014 ${progress}`;
      })
      .join(' \u00A0\u00A0\u00A0\u00A0 ');
  }, [songs, loading]);

  // Triplicate for seamless loop
  const fullText = `${tickerText} \u00A0\u00A0\u00A0\u00A0 ${tickerText} \u00A0\u00A0\u00A0\u00A0 ${tickerText}`;

  return (
    <div style={{
      background: '#0A1A0A',
      padding: '8px 32px',
      paddingTop: 'max(8px, env(safe-area-inset-top))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Left: LIVE pill + marquee */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', marginRight: 16 }}>
        <span style={{
          background: '#00FF41', color: '#000',
          fontSize: 10, fontWeight: 900,
          padding: '3px 10px', borderRadius: 20,
          marginRight: 12, flexShrink: 0,
          fontFamily: "'Archivo Black', sans-serif",
        }}>
          LIVE
        </span>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            whiteSpace: 'nowrap',
            fontSize: 13,
            color: '#fff',
            fontFamily: "'Inter', monospace",
            animation: 'desktopTickerScroll 18s linear infinite',
            display: 'inline-block',
          }}>
            {fullText}
          </div>
        </div>
      </div>

      {/* Right: timeframe buttons + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {showTimeframeButtons && onTabChange && (
          <div style={{ display: 'flex', gap: 4, marginRight: 8 }}>
            {TIME_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 9, padding: '3px 7px',
                  borderRadius: 4, border: 'none', cursor: 'pointer',
                  background: activeTab === tab ? '#1a3a1a' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#555',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
        <Clock size={13} color="#888" />
        <span style={{ fontSize: 11, color: '#888', fontFamily: orbitronFont, fontWeight: 500 }}>
          {timerStr}
        </span>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes desktopTickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Mobile variant — padding 8px 16px, 12px marquee text, tickerScroll animation.
 * No timeframe buttons on mobile (fits in chart area).
 */
export function TickerStripMobile({
  activeTab = '1D',
  onTabChange,
  showTimeframeButtons = false,
}: TickerStripProps) {
  const { songs, loading } = useTickerSongs();
  const [timerStr, setTimerStr] = useState('00:00:00');

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(elapsed / 3600).toString().padStart(2, '0');
      const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
      const s = (elapsed % 60).toString().padStart(2, '0');
      setTimerStr(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const tickerText = useMemo(() => {
    if (loading || songs.length === 0) {
      return 'Loading live market data\u2026 \u00A0\u00A0\u00A0 Loading live market data\u2026 \u00A0\u00A0\u00A0 Loading live market data\u2026';
    }
    return songs
      .slice(0, 12)
      .map((s) => {
        const sym = s.symbol?.startsWith('$') ? s.symbol : `$${s.symbol ?? 'TOKEN'}`;
        if (s.isNewRelease) {
          return `\u2728 NEW \u2014 ${sym}${s.name ? ` \u2014 ${s.name}` : ''}`;
        }
        const progress = s.bondingProgress !== null ? `${Math.round(s.bondingProgress)}% bonding curve` : 'bonding';
        return `\uD83D\uDD25 ${sym} \u2014 ${progress}`;
      })
      .join(' \u00A0\u00A0\u00A0\u00A0 ');
  }, [songs, loading]);

  // Triplicate for seamless loop
  const fullText = `${tickerText} \u00A0\u00A0\u00A0\u00A0 ${tickerText} \u00A0\u00A0\u00A0\u00A0 ${tickerText}`;

  return (
    <div style={{
      background: '#0A1A0A',
      padding: '8px 16px',
      paddingTop: 'max(8px, env(safe-area-inset-top))',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      width: '100%',
    }}>
      {/* Left: LIVE pill + marquee */}
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', marginRight: 8 }}>
        <span style={{
          background: '#00FF41', color: '#000',
          fontSize: 10, fontWeight: 900,
          padding: '3px 8px', borderRadius: 20,
          marginRight: 8, flexShrink: 0,
          fontFamily: "'Archivo Black', sans-serif",
        }}>
          LIVE
        </span>
        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{
            whiteSpace: 'nowrap',
            fontSize: 12,
            color: '#fff',
            fontFamily: "'Inter', monospace",
            animation: 'tickerScroll 18s linear infinite',
            display: 'inline-block',
          }}>
            {fullText}
          </div>
        </div>
      </div>

      {/* Right: timeframe buttons + clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {showTimeframeButtons && onTabChange && (
          <div style={{ display: 'flex', gap: 3, marginRight: 4 }}>
            {TIME_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => onTabChange(tab)}
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 9,
                  padding: '3px 6px',
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: activeTab === tab ? '#1a3a1a' : 'transparent',
                  color: activeTab === tab ? '#fff' : '#555',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        )}
        <Clock size={12} color="#888" />
        <span style={{
          fontSize: 10, color: '#888',
          fontFamily: orbitronFont, fontWeight: 500,
        }}>
          {timerStr}
        </span>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
      `}</style>
    </div>
  );
}
