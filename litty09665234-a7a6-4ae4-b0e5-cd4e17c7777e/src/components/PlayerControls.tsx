import React from 'react';
import { SkipBack, Play, Pause, SkipForward, Clock } from 'lucide-react';

interface PlayerControlsProps {
  isPlaying: boolean;
  progress: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const GREEN = '#00FF41';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const PlayerControls: React.FC<PlayerControlsProps> = ({
  isPlaying,
  progress,
  duration,
  onTogglePlay,
  onSeek,
  onPrev,
  onNext,
}) => {
  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  return (
    <div className="px-4">
      <div className="py-4">
        {/* Top row: TRACKLIST label | controls | Drip */}
        <div className="flex items-center justify-between mb-4">
          <button
            className="text-xs font-bold uppercase tracking-[0.15em]"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            TRACKLIST
          </button>

          <div className="flex items-center gap-5">
            <button onClick={onPrev} className="opacity-60 hover:opacity-100 transition-opacity p-2" style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkipBack size={22} color="#fff" fill="#fff" />
            </button>
            <button
              onClick={onTogglePlay}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
              style={{
                background: GREEN,
                boxShadow: `0 0 20px rgba(0, 255, 65, 0.4)`,
              }}
            >
              {isPlaying ? (
                <Pause size={22} color="#080512" fill="#080512" />
              ) : (
                <Play size={22} color="#080512" fill="#080512" style={{ marginLeft: 2 }} />
              )}
            </button>
            <button onClick={onNext} className="opacity-60 hover:opacity-100 transition-opacity p-2" style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SkipForward size={22} color="#fff" fill="#fff" />
            </button>
          </div>

          <div className="flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            <Clock size={12} />
            <span className="text-xs font-semibold">Drip</span>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="w-full h-2 rounded-full cursor-pointer relative group"
          style={{ background: 'rgba(255,255,255,0.08)' }}
          onClick={handleScrubberClick}
        >
          <div
            className="h-full rounded-full relative transition-all"
            style={{
              width: `${progressPct}%`,
              background: GREEN,
              boxShadow: `0 0 6px rgba(0, 255, 65, 0.5)`,
            }}
          >
            {/* Scrubber dot */}
            <div
              className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                background: '#fff',
                boxShadow: `0 0 8px ${GREEN}`,
                transform: 'translate(50%, -50%)',
              }}
            />
          </div>
        </div>

        {/* Time labels */}
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}>
            {formatTime(progress)}
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default PlayerControls;
