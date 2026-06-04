import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  duration?: number;
  delay?: number;
  enabled?: boolean;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function useCountUp(target: number, options: UseCountUpOptions = {}) {
  const { duration = 1800, delay = 0, enabled = true } = options;
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);
  const rafId = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof target !== 'number' || Number.isNaN(target)) return;

    if (hasAnimated.current) {
      setDisplayValue(target);
      return;
    }

    hasAnimated.current = true;
    const startTime = performance.now() + delay;

    const tick = (now: number) => {
      if (now < startTime) {
        rafId.current = requestAnimationFrame(tick);
        return;
      }
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      setDisplayValue(target * eased);
      if (progress < 1) {
        rafId.current = requestAnimationFrame(tick);
      }
    };

    rafId.current = requestAnimationFrame(tick);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [target, duration, delay, enabled]);

  return displayValue;
}
