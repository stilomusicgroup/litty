import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowLeftRight, ExternalLink } from 'lucide-react';
import { orbitronFont } from '@/theme';

const PRIMARY_GREEN = '#00FF41';

interface TokenActionStripProps {
  isSong: boolean;
  onTrade: () => void;
  onSwap: () => void;
  onViewPage: () => void;
}

const TokenActionStrip: React.FC<TokenActionStripProps> = ({
  isSong,
  onTrade,
  onSwap,
  onViewPage,
}) => {
  const actions = [
    {
      label: 'Trade',
      icon: TrendingUp,
      onClick: onTrade,
      show: isSong,
    },
    {
      label: 'Swap',
      icon: ArrowLeftRight,
      onClick: onSwap,
      show: true,
    },
    {
      label: 'View',
      icon: ExternalLink,
      onClick: onViewPage,
      show: true,
    },
  ].filter((a) => a.show);

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="overflow-hidden"
    >
      <div className="flex items-center justify-center gap-3 px-2 py-3 mt-1">
        {actions.map((action) => (
          <motion.button
            key={action.label}
            whileTap={{ scale: 0.88 }}
            onClick={(e) => {
              e.stopPropagation();
              action.onClick();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full transition-all"
            style={{
              background: 'transparent',
              border: `1.5px solid ${PRIMARY_GREEN}`,
            }}
            whileHover={{
              background: 'rgba(0, 255, 65, 0.08)',
              boxShadow: '0 0 12px rgba(0, 255, 65, 0.15)',
            }}
          >
            <action.icon size={14} style={{ color: PRIMARY_GREEN }} strokeWidth={2.5} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider"
              style={{ color: PRIMARY_GREEN, fontFamily: orbitronFont }}
            >
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
};

export default TokenActionStrip;
