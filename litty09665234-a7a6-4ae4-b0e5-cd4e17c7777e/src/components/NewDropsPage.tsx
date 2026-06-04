import React, { useMemo } from 'react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { isSeedSong } from '@/utils/songFilters';
import { deduplicateSongs } from '@/utils/deduplicateSongs';
import SongCard from '@/components/SongCard';
import { useListLiveData } from '@/hooks/use-list-live-data';
import { motion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';

const CYAN = '#00D4FF';
const BLUE = '#60a5fa';

const NewDropsPage: React.FC = () => {
  const { data: rawSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
    '',
  );

  const { data: rawDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    true,
    'where approved = true',
  );

  const songs = useMemo(() => {
    const filtered = (rawSongs ?? []).filter(s => !isSeedSong(s as any) && !s.hidden);
    return deduplicateSongs(filtered);
  }, [rawSongs]);

  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    (rawDetails ?? []).filter(d => !isSeedSong(d as any)).forEach(d => { map[d.id] = d; });
    return map;
  }, [rawDetails]);

  // Live bonding curve + price data for all songs
  const { liveData } = useListLiveData(songs);

  // Filter: publicly visible songs (approved SPL/streaming/NFT), sorted newest first
  const newDrops = useMemo(() => {
    return songs
      .filter(s => {
        const detail = detailsMap[s.id];
        if (!detail || !detail.approved) return false;
        // Visible asset conditions
        if (s.assetType === 'streaming') return s.mintStatus === 'live' || !s.mintStatus;
        if (s.assetType === 'nft') return true;
        if (s.assetType === 'spl') return s.mintStatus !== 'cold' || s.hasSplToken;
        // Default: if approved, show it
        return true;
      })
      .sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0));
  }, [songs, detailsMap]);

  return (
    <div
      className="min-h-screen pb-32"
      style={{
        background: 'transparent',
        position: 'relative',
      }}
    >
      {/* Background glow */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '8%', left: '20%', width: 450, height: 450, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 65%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,255,0.04) 0%, transparent 65%)', filter: 'blur(60px)' }} />
      </div>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, backgroundImage: `linear-gradient(rgba(96,165,250,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.014) 1px, transparent 1px)`, backgroundSize: '44px 44px' }} />

      <div className="relative z-10">
        
        <div className="max-w-5xl mx-auto px-4 pt-10 pb-10">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="mb-8 flex items-center gap-4"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${BLUE}18`, border: `1.5px solid ${BLUE}55`, boxShadow: `0 0 22px ${BLUE}25` }}
            >
              <Sparkles size={22} style={{ color: BLUE, filter: `drop-shadow(0 0 8px ${BLUE})` }} />
            </div>
            <div>
              <h1
                className="text-3xl sm:text-4xl font-black tracking-widest uppercase leading-none"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  background: `linear-gradient(90deg, ${BLUE}, ${CYAN})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                🆕 New Drops
              </h1>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                The freshest music on Lit Studios — newest first
              </p>
            </div>
          </motion.div>

          {/* Stats strip */}
          {newDrops.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.35 }}
              className="flex items-center gap-3 mb-6"
            >
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: `${BLUE}12`, border: `1px solid ${BLUE}30`, color: BLUE }}
              >
                <Clock size={13} />
                <span className="text-xs font-bold" style={{ fontFamily: "'Inter', sans-serif" }}>
                  {newDrops.length} track{newDrops.length !== 1 ? 's' : ''} available
                </span>
              </div>
            </motion.div>
          )}

          {/* Song Grid */}
          {newDrops.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="py-24 rounded-2xl text-center"
              style={{ background: 'rgba(30,20,60,0.4)', border: `1px solid ${BLUE}15` }}
            >
              <Sparkles size={48} className="mx-auto mb-4" style={{ color: `${BLUE}44` }} />
              <p className="text-lg font-bold mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>No drops yet</p>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.35)' }}>New music will appear here once approved.</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {newDrops.map((song, i) => {
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
                      bondingProgress={liveData[song.id]?.bondingProgress ?? null}
                      priceSol={liveData[song.id]?.priceSol ?? null}
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

export default NewDropsPage;
