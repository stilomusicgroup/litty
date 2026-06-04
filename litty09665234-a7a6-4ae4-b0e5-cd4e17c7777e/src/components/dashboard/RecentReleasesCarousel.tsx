import React from 'react';
import { motion } from 'framer-motion';
import { Music, Play } from 'lucide-react';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import type { SongsResponse } from '@/lib/collections/songs';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';

export const RecentReleasesCarousel: React.FC<{
  songs: SongDetailsResponse[];
  songMap: Record<string, SongsResponse>;
  onSongClick: (songId: string) => void;
}> = ({ songs, songMap, onSongClick }) => {
  if (songs.length === 0) return null;

  return (
    <div className="mb-6">
      <div
        className="flex items-center gap-2 mb-3 pl-1"
        style={{ borderLeft: `3px solid ${NEON_GREEN}` }}
      >
        <h2
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ fontFamily: "'Archivo Black', monospace", color: 'rgba(255,255,255,0.5)' }}
        >
          Recent Releases
        </h2>
      </div>

      <div
        className="flex gap-3 overflow-x-auto pb-2"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* hide webkit scrollbar */}
        <style>{`
          .releases-scroll::-webkit-scrollbar { display: none; }
        `}</style>
        <div className="releases-scroll flex gap-3">
          {songs.slice(0, 12).map((song, i) => {
            const s = songMap[song.id];
            return (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.04 }}
                className="flex-shrink-0 w-36 cursor-pointer group"
                onClick={() => onSongClick(song.id)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Cover with neon corner accents */}
                <div
                  className="relative w-36 h-36 rounded-xl overflow-hidden mb-2"
                  style={{
                    border: '1px solid rgba(0, 255, 65, 0.15)',
                    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
                  }}
                >
                  {song.coverImage ? (
                    <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${NEON_GREEN}20, ${CYAN}10)`,
                      }}
                    >
                      <Music size={24} style={{ color: `${NEON_GREEN}50` }} />
                    </div>
                  )}
                  {/* Neon corner accents */}
                  <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: NEON_GREEN }} />
                  <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: NEON_GREEN }} />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: NEON_GREEN }} />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: NEON_GREEN }} />

                  {/* Play overlay */}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(0,0,0,0.5)' }}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center"
                      style={{ background: NEON_GREEN, boxShadow: `0 0 16px ${NEON_GREEN}60` }}
                    >
                      <Play size={14} fill={NEON_GREEN} style={{ color: '#000', marginLeft: 2 }} />
                    </div>
                  </div>
                </div>

                <p
                  className="text-xs font-bold truncate"
                  style={{ color: '#fff', fontFamily: "'Archivo Black', monospace" }}
                >
                  {song.title}
                </p>
                <p className="text-[9px] truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {s?.symbol ?? song.tokenSymbol ?? ''}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RecentReleasesCarousel;
