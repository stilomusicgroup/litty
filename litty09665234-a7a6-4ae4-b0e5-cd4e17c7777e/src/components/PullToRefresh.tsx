import { useEffect, useRef, useState, useCallback, ReactNode } from 'react';

const THRESHOLD = 80;        // px pull needed to trigger refresh
const MAX_PULL = 120;        // px max visual pull distance
const INDICATOR_SIZE = 44;   // px size of the circular indicator

interface PullToRefreshProps {
  children: ReactNode;
}

type Phase = 'idle' | 'pulling' | 'ready' | 'refreshing';

export function PullToRefresh({ children }: PullToRefreshProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const phaseRef = useRef<Phase>('idle');

  // Keep phaseRef in sync
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const canStartPull = useCallback(() => {
    // Only allow pull when scrolled to the very top
    return window.scrollY <= 0;
  }, []);

  const getPullFraction = (dist: number) => Math.min(dist / MAX_PULL, 1);

  const triggerRefresh = useCallback(() => {
    setPhase('refreshing');
    phaseRef.current = 'refreshing';
    // Small delay for the animation to complete before reload
    setTimeout(() => {
      window.location.reload();
    }, 400);
  }, []);

  const resetPull = useCallback(() => {
    setPhase('idle');
    setPullDistance(0);
    isDraggingRef.current = false;
    startYRef.current = null;
  }, []);

  // ─── Touch Events ───────────────────────────────────────────────────────────

  const onTouchStart = useCallback((e: TouchEvent) => {
    if (!canStartPull()) return;
    if (phaseRef.current === 'refreshing') return;
    startYRef.current = e.touches[0].clientY;
    isDraggingRef.current = false;
  }, [canStartPull]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (startYRef.current === null) return;
    if (phaseRef.current === 'refreshing') return;

    const deltaY = e.touches[0].clientY - startYRef.current;

    if (deltaY <= 0) {
      if (isDraggingRef.current) resetPull();
      return;
    }

    if (!canStartPull() && !isDraggingRef.current) return;

    isDraggingRef.current = true;

    // Suppress native scroll bounce while pulling
    e.preventDefault();

    const clamped = Math.min(deltaY, MAX_PULL);
    setPullDistance(clamped);
    setPhase(clamped >= THRESHOLD ? 'ready' : 'pulling');
  }, [canStartPull, resetPull]);

  const onTouchEnd = useCallback(() => {
    if (!isDraggingRef.current) return;
    if (phaseRef.current === 'ready') {
      triggerRefresh();
    } else {
      resetPull();
    }
  }, [triggerRefresh, resetPull]);

  // ─── Mouse Events (desktop drag) ────────────────────────────────────────────

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (!canStartPull()) return;
    if (phaseRef.current === 'refreshing') return;
    startYRef.current = e.clientY;
    isDraggingRef.current = false;
  }, [canStartPull]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (startYRef.current === null) return;
    if (phaseRef.current === 'refreshing') return;
    // Must be holding left mouse button
    if (!(e.buttons & 1)) {
      resetPull();
      return;
    }

    const deltaY = e.clientY - startYRef.current;

    if (deltaY <= 0) {
      if (isDraggingRef.current) resetPull();
      return;
    }

    if (!canStartPull() && !isDraggingRef.current) return;

    isDraggingRef.current = true;
    const clamped = Math.min(deltaY, MAX_PULL);
    setPullDistance(clamped);
    setPhase(clamped >= THRESHOLD ? 'ready' : 'pulling');
  }, [canStartPull, resetPull]);

  const onMouseUp = useCallback(() => {
    if (!isDraggingRef.current) return;
    if (phaseRef.current === 'ready') {
      triggerRefresh();
    } else {
      resetPull();
    }
  }, [triggerRefresh, resetPull]);

  useEffect(() => {
    const opts = { passive: false } as AddEventListenerOptions;
    document.addEventListener('touchstart', onTouchStart, opts);
    document.addEventListener('touchmove', onTouchMove, opts);
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd, onMouseDown, onMouseMove, onMouseUp]);

  // ─── Derived visuals ─────────────────────────────────────────────────────────

  const isVisible = phase !== 'idle';
  const fraction = phase === 'refreshing' ? 1 : getPullFraction(pullDistance);

  // Translate the indicator downward as user pulls
  const indicatorY = phase === 'refreshing'
    ? 16
    : Math.max(-INDICATOR_SIZE, (pullDistance / MAX_PULL) * (INDICATOR_SIZE + 16) - INDICATOR_SIZE);

  // Progress arc for the SVG ring
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - (phase === 'refreshing' ? 1 : fraction));

  // Color transitions: pulling → cyan, ready/refreshing → neon green
  const isReady = phase === 'ready' || phase === 'refreshing';

  return (
    <>
      {/* Pull indicator */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: `translateX(-50%) translateY(${indicatorY}px)`,
          width: INDICATOR_SIZE,
          height: INDICATOR_SIZE,
          zIndex: 10000,
          pointerEvents: 'none',
          opacity: isVisible ? 1 : 0,
          transition: phase === 'idle'
            ? 'opacity 0.2s ease, transform 0.3s cubic-bezier(0.34,1.56,0.64,1)'
            : phase === 'refreshing'
            ? 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)'
            : 'none',
          willChange: 'transform, opacity',
        }}
      >
        {/* Backdrop circle */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: isReady
              ? 'rgba(0, 255, 65, 0.12)'
              : 'rgba(0,212,255,0.10)',
            border: `1.5px solid ${isReady ? 'rgba(0, 255, 65, 0.45)' : 'rgba(0,212,255,0.35)'}`,
            backdropFilter: 'blur(8px)',
            transition: 'background 0.2s ease, border-color 0.2s ease',
            boxShadow: isReady
              ? '0 0 12px rgba(0, 255, 65, 0.3), inset 0 0 8px rgba(0, 255, 65, 0.1)'
              : '0 0 12px rgba(0,212,255,0.2), inset 0 0 8px rgba(0,212,255,0.08)',
          }}
        />

        {/* SVG progress ring */}
        <svg
          width={INDICATOR_SIZE}
          height={INDICATOR_SIZE}
          viewBox={`0 0 ${INDICATOR_SIZE} ${INDICATOR_SIZE}`}
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'rotate(-90deg)',
          }}
        >
          {/* Track ring */}
          <circle
            cx={INDICATOR_SIZE / 2}
            cy={INDICATOR_SIZE / 2}
            r={radius}
            fill="none"
            stroke={isReady ? 'rgba(0, 255, 65, 0.15)' : 'rgba(0,212,255,0.12)'}
            strokeWidth="2"
          />
          {/* Progress ring */}
          <circle
            cx={INDICATOR_SIZE / 2}
            cy={INDICATOR_SIZE / 2}
            r={radius}
            fill="none"
            stroke={isReady ? '#00FF41' : '#00D4FF'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: phase === 'refreshing' ? 'none' : 'stroke-dashoffset 0.05s linear, stroke 0.2s ease',
              filter: isReady
                ? 'drop-shadow(0 0 4px #00FF41)'
                : 'drop-shadow(0 0 3px #00D4FF)',
            }}
          />
        </svg>

        {/* Center icon: arrow or spinning ring */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {phase === 'refreshing' ? (
            /* Spinning arc when refreshing */
            <svg
              width={18}
              height={18}
              viewBox="0 0 18 18"
              style={{ animation: 'ptr-spin 0.7s linear infinite' }}
            >
              <circle
                cx="9"
                cy="9"
                r="7"
                fill="none"
                stroke="#00FF41"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="28 16"
                style={{ filter: 'drop-shadow(0 0 3px #00FF41)' }}
              />
            </svg>
          ) : (
            /* Arrow that rotates when ready */
            <svg
              width={16}
              height={16}
              viewBox="0 0 16 16"
              fill="none"
              style={{
                transform: isReady ? 'rotate(180deg)' : `rotate(${fraction * 180}deg)`,
                transition: 'transform 0.2s ease, color 0.2s ease',
                color: isReady ? '#00FF41' : '#00D4FF',
                filter: isReady
                  ? 'drop-shadow(0 0 3px #00FF41)'
                  : 'drop-shadow(0 0 2px #00D4FF)',
              }}
            >
              <path
                d="M8 3v9M4 8l4 4 4-4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes ptr-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {children}
    </>
  );
}
