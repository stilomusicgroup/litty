/**
 * AlbumDropsCarousel — horizontal scrollable carousel of album drops
 * Shown on the homepage ABOVE the singles feed.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getManyAlbums } from '@/lib/collections/albums';
import type { AlbumsResponse } from '@/lib/collections/albums';
import { getManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { getManyArtists } from '@/lib/collections/artists';
import type { ArtistsResponse } from '@/lib/collections/artists';
import {
  runGetBondingCurveProgressQueryForAlbums,
  runGetTokenBalanceQueryForAlbums,
} from '@/lib/collections/albums';
import { useAuth } from '@/hooks/use-privy-auth';
import { Disc3, Zap, Music } from 'lucide-react';
import { triggerHapticFeedback } from '@/utils/haptic';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const PURPLE = '#8B5CF6';

interface AlbumCardProps {
  album: AlbumsResponse;
  artistName: string;
  filledSlots: number;
  bondingProgress: number;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album, artistName, filledSlots, bondingProgress }) => {
  const navigate = useNavigate();

  return (
    <div
      className="flex-shrink-0 w-44 cursor-pointer select-none"
      style={{ scrollSnapAlign: 'start' }}
      onClick={() => { triggerHapticFeedback(); navigate(`/album/${album.id}/vault`); }}
    >
      {/* Cover */}
      <div
        className="relative w-44 h-44 rounded-2xl overflow-hidden mb-3"
        style={{
          background: 'linear-gradient(135deg, rgba(30,10,60,0.9), rgba(10,4,20,0.95))',
          border: '1px solid rgba(139,92,246,0.2)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        }}
      >
        {album.coverArtUrl ? (
          <img src={album.coverArtUrl} alt={album.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Disc3 size={40} style={{ color: 'rgba(139,92,246,0.3)' }} />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(8,5,18,0.9) 0%, rgba(8,5,18,0.2) 50%, transparent 100%)' }}
        />

        {/* Slot count badge */}
        <div
          className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
          style={{
            background: 'rgba(0,0,0,0.8)',
            border: '1px solid rgba(139,92,246,0.3)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <Music size={9} style={{ color: PURPLE }} />
          <span
            className="text-[9px] font-bold"
            style={{ color: '#c4b5fd', fontFamily: "'Inter', monospace" }}
          >
            {filledSlots}/{album.slotCount}
          </span>
        </div>

        {/* Symbol badge */}
        {album.symbol && (
          <div
            className="absolute top-2 right-2 px-2 py-0.5 rounded-full"
            style={{
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              backdropFilter: 'blur(6px)',
            }}
          >
            <span
              className="text-[9px] font-black"
              style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}
            >
              ${album.symbol}
            </span>
          </div>
        )}
      </div>

      {/* Info (frosted glass) */}
      <div
        className="px-2 py-1.5 rounded-xl mb-2"
        style={{
          background: 'rgba(255, 255, 255, 0.4)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        <p
          className="text-sm font-bold truncate leading-tight mb-0.5"
          style={{ color: '#1a1a2e' }}
        >
          {album.name}
        </p>
        <p
          className="text-xs truncate mb-1"
          style={{ color: 'rgba(100, 80, 140, 0.7)' }}
        >
          {artistName}
        </p>

        {/* BUY button */}
        <button
          className="w-full py-2 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0,212,255,0.1))',
            border: '1px solid rgba(0, 255, 65, 0.25)',
            color: NEON_GREEN,
          }}
        onClick={(e) => {
          e.stopPropagation();
          triggerHapticFeedback();
          window.location.href = `/album/${album.id}/vault`;
        }}
      >
        <Zap size={11} />
        BUY
      </button>
      </div>
    </div>
  );
};

// ─── Main Carousel ────────────────────────────────────────────────────────────

const AlbumDropsCarousel: React.FC = () => {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<AlbumsResponse[]>([]);
  const [artistMap, setArtistMap] = useState<Record<string, ArtistsResponse>>({});
  const [filledSlotsMap, setFilledSlotsMap] = useState<Record<string, number>>({});
  const [bondingMap, setBondingMap] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      try {
        const all = await getManyAlbums('order by tarobase_created_at desc limit 50');
        setAlbums(all);
      } catch { /* noop */ }
    })();
  }, []);

  useEffect(() => {
    if (!albums.length) return;
    (async () => {
      // Fetch artists
      try {
        const artists = await getManyArtists('order by tarobase_created_at desc limit 50');
        const map: Record<string, ArtistsResponse> = {};
        artists.forEach(a => { map[a.id] = a; });
        setArtistMap(map);
      } catch { /* noop */ }

      // Fetch bonding progress and filled slots for each album
      const bondingResults: Record<string, number> = {};
      const slotsResults: Record<string, number> = {};
      await Promise.all(
        albums.map(async (album) => {
          try {
            const p = await runGetBondingCurveProgressQueryForAlbums(album.id);
            bondingResults[album.id] = p ?? 0;
          } catch { bondingResults[album.id] = 0; }

          try {
            const songs = await getManySongs(`where albumId = '${album.id}'`);
            slotsResults[album.id] = songs.length;
          } catch { slotsResults[album.id] = 0; }
        })
      );
      setBondingMap(bondingResults);
      setFilledSlotsMap(slotsResults);
    })();
  }, [albums]);

  if (!albums.length) return null;

  return (
    <div className="pb-4 sm:pb-6 md:max-w-4xl md:mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-1 sm:px-3">
        <h2
          className="text-sm sm:text-base font-black"
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: CYAN,
            textShadow: `0 0 6px rgba(0,212,255,0.9), 0 0 15px rgba(0,212,255,0.6), 0 0 30px rgba(0,212,255,0.3)`,
          }}
        >
          Album Drops
        </h2>
        <span
          className="text-xs"
          style={{
            fontFamily: "'Inter', monospace",
            color: 'rgba(0,212,255,0.5)',
          }}
        >
          {albums.length} project{albums.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Carousel */}
      <div className="overflow-x-hidden" style={{ paddingBottom: '12px' }}>
        <div
          className="flex gap-3 overflow-x-auto px-1 sm:px-3"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            paddingTop: '6px',
            paddingBottom: '16px',
          } as React.CSSProperties}
        >
          {albums.map(album => {
            const artistRecord = artistMap[album.creator];
            const artistName = artistRecord?.name
              ?? (album.creator ? `${album.creator.slice(0, 6)}...${album.creator.slice(-4)}` : 'Unknown');
            return (
              <AlbumCard
                key={album.id}
                album={album}
                artistName={artistName}
                filledSlots={filledSlotsMap[album.id] ?? 0}
                bondingProgress={bondingMap[album.id] ?? 0}
              />
            );
          })}
          {/* Peek spacer */}
          <div className="flex-shrink-0 w-2" />
        </div>
      </div>
    </div>
  );
};

export default AlbumDropsCarousel;
