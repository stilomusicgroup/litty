import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';

interface RotatingBannerProps {
  songDetails: SongDetailsResponse[];
}

interface Slide {
  emoji: string;
  headline: string;
  sub: string;
  cta: string;
  ctaPath: string;
  gradient: string;
}

function buildSlides(songDetails: SongDetailsResponse[]): Slide[] {
  const latestSong = songDetails[0];
  const topMover = songDetails[Math.floor(Math.random() * Math.max(1, songDetails.length))];

  return [
    {
      emoji: '🔥',
      headline: latestSong
        ? `${latestSong.artist} just dropped "${latestSong.title}"`
        : 'New music is dropping daily on Lit Studios',
      sub: 'Be an early supporter and earn more Song Coins',
      cta: 'Listen & Buy',
      ctaPath: latestSong ? `/song/${latestSong.id}` : '/discover',
      gradient: 'linear-gradient(145deg, #0a1a0e 0%, #060a06 100%)',
    },
    {
      emoji: '⚡',
      headline: 'Buy early and earn more Song Coins',
      sub: 'The bonding curve rewards early supporters — lower price, more coins per dollar',
      cta: 'Browse Drops',
      ctaPath: '/discover',
      gradient: 'linear-gradient(145deg, #0a1a0e 0%, rgba(0, 255, 65, 0.08) 50%, #060a06 100%)',
    },
    {
      emoji: '📈',
      headline: topMover
        ? `"${topMover.title}" is trending right now`
        : 'Song Coins are trading live on-chain',
      sub: 'Real-time bonding curve pricing — buy, sell, and trade like a crypto pro',
      cta: 'Buy the Dip',
      ctaPath: topMover ? `/song/${topMover.id}` : '/hot100',
      gradient: 'linear-gradient(145deg, #060a06 0%, #0a1a0e 100%)',
    },
    {
      emoji: '🎵',
      headline: songDetails.length > 0
        ? `${songDetails.length} songs available this week`
        : 'New songs dropping every week',
      sub: '92% goes to your token allocation • 5% to the artist • 2% on every trade forever',
      cta: 'Explore All',
      ctaPath: '/discover',
      gradient: 'linear-gradient(145deg, #0a1a0e 0%, #060a06 100%)',
    },
  ];
}

const INTERVAL_MS = 4000;

const RotatingBanner: React.FC<RotatingBannerProps> = ({ songDetails }) => {
  const navigate = useNavigate();
  const slides = buildSlides(songDetails);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % slides.length);
    }, INTERVAL_MS);
  };

  useEffect(() => {
    if (!paused) startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, slides.length]);

  const slide = slides[current];

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background: slide.gradient,
        border: '1px solid rgba(0, 255, 65, 0.2)',
        minHeight: '120px',
        transition: 'background 0.6s ease',
        touchAction: 'pan-y',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Subtle grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(0, 255, 65, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="relative z-10 flex flex-col sm:flex-row items-center gap-4 p-5 sm:p-6"
        >
          {/* Emoji */}
          <div className="text-4xl sm:text-5xl flex-shrink-0 select-none">{slide.emoji}</div>

          {/* Text */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <h3 className="text-sm sm:text-base font-black text-white leading-snug mb-1 line-clamp-2">
              {slide.headline}
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed line-clamp-2" style={{ color: 'rgba(134,239,172,0.55)' }}>
              {slide.sub}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate(slide.ctaPath)}
            className="flex-shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all active:scale-[0.97]"
            style={{
              background: 'linear-gradient(135deg, #00FF41, #00FF41)',
              color: '#000',
              boxShadow: '0 0 16px rgba(0, 255, 65, 0.5), 0 0 30px rgba(0, 255, 65, 0.2)',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              whiteSpace: 'nowrap',
            }}
          >
            {slide.cta}
          </button>
        </motion.div>
      </AnimatePresence>

      {/* Dot indicators */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 pb-3">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => { setCurrent(i); startTimer(); }}
            className="transition-all duration-300"
            style={{
              width: i === current ? '18px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: i === current ? '#00FF41' : 'rgba(0, 255, 65, 0.3)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default RotatingBanner;
