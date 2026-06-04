import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/hooks/use-theme';

interface SectionBannerProps {
  titleBefore?: string;
  accentWord?: string;
  titleAfter?: string;
  subtitle: string;
  imageUrl: string;
  ctaText?: string;
  ctaIcon?: React.ReactNode;
  ctaPath?: string;
}

const INTERACTION_GREEN = '#00FF41';

export const SectionBanner: React.FC<SectionBannerProps> = ({
  titleBefore,
  accentWord,
  titleAfter,
  subtitle,
  imageUrl,
  ctaText,
  ctaIcon,
  ctaPath,
}) => {
  const navigate = useNavigate();
  const { mode } = useTheme();
  const isDark = mode === 'dark';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full overflow-hidden rounded-2xl"
      style={{
        height: 'clamp(120px, 16vw, 160px)',
        background: '#000000',
        minHeight: 120,
        maxHeight: 160,
      }}
    >
      {/* Background image — positioned to the right */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ objectPosition: '75% center' }}
        loading="lazy"
      />

      {/* Gradient mask — strong fade so image stays subtle / background-like */}
      <div
        className="absolute inset-0"
        style={{
          background: isDark
            ? 'linear-gradient(to right, #000000 0%, #000000 45%, rgba(0,0,0,0.85) 58%, rgba(0,0,0,0.4) 75%, transparent 100%)'
            : 'linear-gradient(to right, #f5f5f5 0%, #f5f5f5 45%, rgba(245,245,245,0.85) 58%, rgba(245,245,245,0.4) 75%, transparent 100%)',
        }}
      />

      {/* Text content */}
      <div className="relative z-10 flex flex-col justify-center h-full px-5 sm:px-6 py-4 max-w-[55%]">
        <h2
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: 'clamp(1.1rem, 2vw, 1.5rem)',
            fontWeight: 900,
            letterSpacing: '0.02em',
            lineHeight: 1.15,
            color: isDark ? '#ffffff' : '#1a2744',
            marginBottom: 6,
          }}
        >
          {titleBefore}
          {accentWord && (
            <span style={{ color: INTERACTION_GREEN }}>{accentWord}</span>
          )}
          {titleAfter}
        </h2>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(0.7rem, 1.1vw, 0.8125rem)',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,39,68,0.6)',
            lineHeight: 1.4,
            marginBottom: ctaText ? 12 : 0,
            maxWidth: 280,
          }}
        >
          {subtitle}
        </p>
        {ctaText && ctaPath && (
          <button
            onClick={() => navigate(ctaPath)}
            className="inline-flex items-center gap-2 rounded-xl transition-all active:scale-95 hover:scale-105 w-fit"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '0.65rem',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '8px 16px',
              background: 'transparent',
              color: INTERACTION_GREEN,
              border: `1px solid ${INTERACTION_GREEN}`,
              borderRadius: '10px',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'rgba(0, 255, 65, 0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
          >
            {ctaIcon}
            {ctaText}
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default SectionBanner;
