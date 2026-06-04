import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  runGetBondingCurveProgressQueryForSongs,
  runGetTokenMintAddressQueryForSongs,
} from '@/lib/collections/songs';
import { fetchPumpFunPrice } from '@/hooks/usePumpFunPrice';
import type { SongsResponse } from '@/lib/collections/songs';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { Play, BarChart3, Plus } from 'lucide-react';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import { useAuth } from '@/hooks/use-privy-auth';
import { toast } from 'sonner';

// ── Constants ──────────────────────────────────────────────────────────────────
const NEON_GREEN = '#10B981';

// ── Chart Card ─────────────────────────────────────────────────────────────────
interface ChartCardProps {
  rank: number;
  song: SongsResponse;
  details: SongDetailsResponse | null;
  onClick: () => void;
  // Pre-fetched live data from list-level fetch
  bondingProgress: number | null;
  priceSol: number | null;
  priceLoading: boolean;
}

const ChartCard: React.FC<ChartCardProps> = ({ rank, song, details, onClick, bondingProgress, priceSol, priceLoading }) => {
  const { user } = useAuth();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);

  const title = details?.title ?? song.name ?? 'Untitled';
  const ticker = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '$???';

  // Bonding curve progress display
  const progressDisplay = bondingProgress !== null
    ? `${bondingProgress.toFixed(1)}%`
    : priceLoading ? '—' : '—';

  // Price display in SOL
  const priceDisplay = priceSol !== null
    ? priceSol < 0.000001
      ? `${(priceSol * 1e9).toFixed(2)} LAMP`
      : priceSol < 0.001
      ? `${(priceSol * 1000).toFixed(4)}m◎`
      : `◎${priceSol.toFixed(6)}`
    : priceLoading ? '—' : '—';

  const handleAddToPlaylist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      setShowPlaylistModal(true);
    } else {
      toast.error('Sign in to add songs to a playlist.');
    }
  };

  return (
    <div
      className="snap-start flex-shrink-0 flex flex-col rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 select-none"
      style={{
        width: 168,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = `1px solid ${NEON_GREEN}44`;
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = '1px solid rgba(255,255,255,0.07)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Album art area */}
      <div className="relative w-full overflow-hidden" style={{ height: 164 }}>
        {details?.coverImage ? (
          <img
            src={details.coverImage}
            alt={title}
            className="w-full h-full object-cover block"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-2xl font-black"
            style={{
              background: 'linear-gradient(135deg, #1a0a2e 0%, #0d1b2a 100%)',
              color: 'rgba(255,255,255,0.15)',
            }}
          >
            {title.charAt(0)}
          </div>
        )}

        {/* Bonding progress bar overlay — bottom of art */}
        {(bondingProgress !== null || priceLoading) && (
          <div className="absolute bottom-0 left-0 right-0" style={{ height: 3, background: 'rgba(0,0,0,0.4)' }}>
            {bondingProgress !== null && (
              <div
                style={{
                  width: `${Math.min(bondingProgress, 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, ${NEON_GREEN}, #00FFD1)`,
                  boxShadow: `0 0 6px ${NEON_GREEN}88`,
                  transition: 'width 0.4s ease',
                }}
              />
            )}
          </div>
        )}

        {/* Rank badge — top-left */}
        <div
          className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-black text-white"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
        >
          #{rank}
        </div>

        {/* Play button overlay — bottom-right of art */}
        <div
          className="absolute bottom-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: NEON_GREEN,
            boxShadow: `0 0 12px ${NEON_GREEN}88`,
          }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <Play size={14} fill="#000" color="#000" className="ml-0.5" />
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-1.5 p-2.5">
        {/* Title */}
        <div
          className="text-xs font-black uppercase truncate tracking-wide"
          style={{ color: '#fff' }}
          title={title}
        >
          {title}
        </div>

        {/* Ticker + live data + playlist button row */}
        <div className="flex items-center justify-between gap-1">
          {/* Ticker + price/progress */}
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-bold leading-none"
              style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}
            >
              {ticker}
            </div>
            <div className="mt-1 flex flex-col gap-0.5">
              <div>
                <div className="text-[8px] font-bold tracking-wider uppercase leading-none" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', monospace" }}>PRICE</div>
                <div
                  className="text-[10px] font-bold leading-none mt-0.5 truncate"
                  style={{ color: '#fff', fontFamily: "'Inter', monospace" }}
                >
                  {priceDisplay}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-bold tracking-wider uppercase leading-none" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', monospace" }}>CURVE</div>
                <div
                  className="text-[10px] font-bold leading-none mt-0.5"
                  style={{ color: NEON_GREEN, fontFamily: "'Inter', monospace" }}
                >
                  {progressDisplay}
                </div>
              </div>
            </div>
          </div>

          {/* Playlist button */}
          <button
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              background: 'rgba(0, 255, 65, 0.1)',
              border: '1px solid rgba(0, 255, 65, 0.35)',
              color: NEON_GREEN,
            }}
            onClick={handleAddToPlaylist}
            title="Add to playlist"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* BUY + CHART buttons */}
        <div className="flex gap-1.5 mt-0.5">
          <button
            className="flex-1 py-1.5 rounded-lg text-[11px] font-black text-black transition-all duration-150 active:scale-95"
            style={{ background: NEON_GREEN }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            BUY
          </button>
          <button
            className="flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 transition-all duration-150 active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
            }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
          >
            <BarChart3 size={10} />
            CHART
          </button>
        </div>
      </div>

      {showPlaylistModal && (
        <AddToPlaylistModal
          songId={song.id}
          title={title}
          artist={details?.artist}
          coverImage={details?.coverImage}
          isOpen={showPlaylistModal}
          onClose={() => setShowPlaylistModal(false)}
        />
      )}
    </div>
  );
};

// ── List-level live data fetcher ───────────────────────────────────────────────
interface SongLiveData {
  bondingProgress: number | null;
  priceSol: number | null;
}

function useListLiveData(songs: SongsResponse[]): {
  liveData: Record<string, SongLiveData>;
  loading: boolean;
} {
  const [liveData, setLiveData] = useState<Record<string, SongLiveData>>({});
  const [loading, setLoading] = useState(true);

  const idsKey = songs.map((s) => s.id).join(',');

  useEffect(() => {
    if (songs.length === 0) {
      setLoading(false);
      return;
    }
    let mounted = true;

    async function fetchAll() {
      const results: Record<string, SongLiveData> = {};

      await Promise.allSettled(
        songs.map(async (song) => {
          try {
            const [progress, mintAddress] = await Promise.all([
              runGetBondingCurveProgressQueryForSongs(song.id).catch(() => null),
              runGetTokenMintAddressQueryForSongs(song.id).catch(() => null),
            ]);

            let priceSol: number | null = null;
            if (mintAddress) {
              try {
                const pf = await fetchPumpFunPrice(mintAddress);
                if (pf) {
                  priceSol = pf.priceSol;
                }
              } catch {
                // price unavailable
              }
            }

            results[song.id] = { bondingProgress: progress, priceSol };
          } catch {
            results[song.id] = { bondingProgress: null, priceSol: null };
          }
        })
      );

      if (mounted) {
        setLiveData(results);
        setLoading(false);
      }
    }

    fetchAll();
    return () => { mounted = false; };
  }, [idsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return { liveData, loading };
}

// ── Main Charts Section ────────────────────────────────────────────────────────
interface ChartsSectionProps {
  songs: SongsResponse[];
  detailsMap: Record<string, SongDetailsResponse>;
}

const ChartsSection: React.FC<ChartsSectionProps> = ({ songs, detailsMap }) => {
  const navigate = useNavigate();
  const visibleSongs = useMemo(() => songs.filter((s) => !s.hidden), [songs]);
  const { liveData, loading: liveLoading } = useListLiveData(visibleSongs);

  // Sort by bonding curve progress descending (most active / closest to graduation first)
  // Fall back to created_at for songs whose progress hasn't loaded yet
  const rankedSongs = useMemo(() => {
    return [...visibleSongs].sort((a, b) => {
      const pa = liveData[a.id]?.bondingProgress ?? -1;
      const pb = liveData[b.id]?.bondingProgress ?? -1;
      if (pa !== pb) return pb - pa;
      return (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0);
    });
  }, [visibleSongs, liveData]);

  if (rankedSongs.length === 0) {
    return (
      <div className="px-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
            $Lit Charts
          </h3>
        </div>
        <div
          className="rounded-2xl py-10 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            No songs charted yet — be the first to drop
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3 px-4">
        <span className="text-lg">📊</span>
        <h3 className="text-sm font-black uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.7)' }}>
          $Lit Charts
        </h3>
        <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(0,255,136,0.3), transparent)' }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(0,255,136,0.5)' }}>
          Live
        </span>
        <span
          className="w-2 h-2 rounded-full animate-pulse"
          style={{ background: NEON_GREEN, boxShadow: `0 0 6px ${NEON_GREEN}` }}
        />
      </div>

      {/* Horizontal scroll row */}
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-4"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
      >
        {rankedSongs.map((song, idx) => {
          const live = liveData[song.id];
          return (
            <ChartCard
              key={song.id}
              rank={idx + 1}
              song={song}
              details={detailsMap[song.id] ?? null}
              onClick={() => navigate(`/song/${song.id}`)}
              bondingProgress={live?.bondingProgress ?? null}
              priceSol={live?.priceSol ?? null}
              priceLoading={liveLoading || !live}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ChartsSection;
