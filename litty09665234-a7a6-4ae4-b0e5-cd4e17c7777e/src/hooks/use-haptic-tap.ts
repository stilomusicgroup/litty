import { useCallback } from 'react';

export interface HapticTapProps {
  onTapStart: () => void;
  whileTap: { scale: number };
  transition: { duration: number };
}

export function useHapticTap(scale = 0.97): HapticTapProps {
  const onTapStart = useCallback(() => {
    navigator.vibrate?.(5);
  }, []);

  return {
    onTapStart,
    whileTap: { scale },
    transition: { duration: 0.1 },
  };
}
