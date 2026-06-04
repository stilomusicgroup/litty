import React, { useMemo } from 'react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { isSeedSong } from '@/utils/songFilters';
import SongCard from '@/components/SongCard';
import { useListLiveData } from '@/hooks/use-list-live-data';
import { motion } from 'framer-motion';
import { Rocket } from 'lucide-react';

const CYAN = '#22d3ee';
const CYAN2 = '#00D4FF';

const BeamUpPage: React.FC = () => {
  const { data: rawSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
    "where beamUpEnabled = true AND assetType = 'spl' AND mintStatus = 'cold'",
  );

  const { data: rawDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    true,
    '',
  );

  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    (rawDetails ?? []).filter(d => !isSeedSong(d as any)).forEach(d => { map[d.id] = d; });
    return map;
  }, [rawDetails]);

  const beamUpSongs = useMemo(() => {
    return (rawSongs ?? []).filter(s => !isSeedSong(s as any));
  }, [rawSongs]);

  const { liveData: beamUpLiveData } = useListLiveData(beamUpSongs);

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: 'transparent',
        position: 'relative',
      }}
    >
      {/* Background fx */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '5%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        <div style={{ position: 'absolute', bottom: '25%', right: '15%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `linear-gradient(rgba(34,211,238,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.015) 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />

      <div className="relative z-10">
        
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mb-6"
          >
            <div className="flex items-center gap-4 mb-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${CYAN}18`, border: `1.5px solid ${CYAN}55`, boxShadow: `0 0 22px ${CYAN}30` }}
              >
                <Rocket size={22} style={{ color: CYAN, filter: `drop-shadow(0 0 8px ${CYAN})` }} />
              </div>
              <div>
                <h1
                  className="text-3xl sm:text-4xl font-black tracking-widest uppercase leading-none"
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    background: `linear-gradient(90deg, ${CYAN}, ${CYAN2})`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  🚀 Beam Up
                </h1>
                <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                  Cold SPL songs waiting for fans to beam them up
                </p>
              </div>
            </div>

            {/* Info card */}
            <div
              className="p-4 rounded-2xl"
              style={{ background: `${CYAN}0d`, border: `1px solid ${CYAN}25` }}
            >
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: "'Inter', sans-serif" }}>
                These songs are in <strong style={{ color: CYAN }}>cold launch mode</strong> — they need fan support before their SPL token launches on Pump.fun. Find a track you believe in and beam it up to help it graduate to a live bonding curve.
              </p>
              {beamUpSongs.length > 0 && (
                <p className="text-xs mt-2 font-bold" style={{ color: CYAN, fontFamily: "'Archivo Black', sans-serif" }}>
                  {beamUpSongs.length} song{beamUpSongs.length !== 1 ? 's' : ''} waiting for launch
                </p>
              )}
            </div>
          </motion.div>

          {/* Song Grid */}
          {beamUpSongs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="py-24 rounded-2xl text-center"
              style={{ background: 'rgba(10,20,30,0.5)', border: `1px solid ${CYAN}18` }}
            >
              <Rocket size={48} className="mx-auto mb-4" style={{ color: `${CYAN}44` }} />
              <p className="text-lg font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>No songs in beam-up mode</p>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.35)' }}>
                Cold SPL songs with beam-up enabled will appear here.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {beamUpSongs.map((song, i) => {
                const detail = detailsMap[song.id] ?? null;
                return (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * Math.min(i, 12), duration: 0.3 }}
                  >
                    <SongCard
                      song={song}
                      details={detail}
                      bondingProgress={beamUpLiveData[song.id]?.bondingProgress ?? null}
                      priceSol={beamUpLiveData[song.id]?.priceSol ?? null}
                    />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BeamUpPage;
