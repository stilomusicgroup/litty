import React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

interface HapticWrapperProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  scale?: number;
}

export function HapticWrapper({ children, scale = 0.97, ...props }: HapticWrapperProps) {
  return (
    <motion.div
      whileTap={{ scale }}
      onTapStart={() => navigator.vibrate?.(5)}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
