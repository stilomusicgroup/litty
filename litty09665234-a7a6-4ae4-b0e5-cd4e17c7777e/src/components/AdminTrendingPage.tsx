import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, TrendingUp, ArrowLeft, Music } from 'lucide-react';
import { useAuth } from '@/hooks/use-privy-auth';
import { ADMIN_ADDRESS } from '@/lib/constants';
import {
  setCuratedTrending,
  deleteCuratedTrending,
  subscribeManyCuratedTrending,
} from '@/lib/collections/curatedTrending';
import type { CuratedTrendingResponse } from '@/lib/collections/curatedTrending';
import { getManySongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { getManySongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { Time } from '@/lib/db-client';
import { Address } from '@/lib/db-client';
import { toast } from 'sonner';
import { isSeedSong } from '@/utils/songFilters';

const NEON_GREEN = '#00FF41';

const AdminTrendingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isAdmin = user?.address === ADMIN_ADDRESS;

  // Songs data
  const [songs, setSongs] = useState<SongsResponse[]>([]);
  const [details, setDetails] = useState<SongDetailsResponse[]>([]);
  const [curatedTrending, setCuratedTrendingState] = useState<CuratedTrendingResponse[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingSongs, setLoadingSongs] = useState(true);

  // Load songs & details
  useEffect(() => {
    (async () => {
      try {
        const [s, d] = await Promise.all([
          getManySongs('order by tarobase_created_at desc limit 200'),
          getManySongDetails('order by tarobase_created_at desc limit 200'),
        ]);
        setSongs((s ?? []).filter(song => !isSeedSong(song)));
        setDetails(d ?? []);
      } catch (e) {
        console.warn('Failed to load songs', e);
      } finally {
        setLoadingSongs(false);
      }
    })();
  }, []);

  // Subscribe to curatedTrending
  useEffect(() => {
    let unsub: (() => Promise<void>) | null = null;
    subscribeManyCuratedTrending((data) => {
      setCuratedTrendingState((data ?? []).sort((a, b) => (b.addedAt as number) - (a.addedAt as number)));
    }, 'order by addedAt desc limit 50').then(fn => { unsub = fn; }).catch(() => {});
    return () => { unsub?.(); };
  }, []);

  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    details.forEach(d => { map[d.id] = d; });
    return map;
  }, [details]);

  const trendingIds = useMemo(() => new Set(curatedTrending.map(e => e.songId)), [curatedTrending]);

  // Filtered songs for search results
  const filteredSongs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return songs.filter(s => {
      const detail = detailsMap[s.id];
      const name = (detail?.title ?? s.name ?? '').toLowerCase();
      const symbol = (s.symbol ?? '').toLowerCase();
      return name.includes(q) || symbol.includes(q);
    }).slice(0, 12);
  }, [songs, detailsMap, searchQuery]);

  const handleAdd = async (song: SongsResponse) => {
    if (!user?.address) { toast.error('Not signed in'); return; }
    if (trendingIds.has(song.id)) { toast.info('Already in trending'); return; }
    const success = await setCuratedTrending(song.id, {
      songId: song.id,
      addedAt: Time.Now,
      addedBy: Address.publicKey(user.address),
    });
    if (success) {
      toast.success('Added to Trending');
    } else {
      toast.error('Failed to add — check admin permissions');
    }
  };

  const handleRemove = async (songId: string) => {
    const success = await deleteCuratedTrending(songId);
    if (success) {
      toast.success('Removed from Trending');
    } else {
      toast.error('Failed to remove');
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000' }}>
        <div className="text-center px-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(255,63,75,0.1)', border: '1px solid rgba(255,63,75,0.3)' }}
          >
            <TrendingUp size={24} style={{ color: '#FF3F4B' }} />
          </div>
          <p
            className="text-lg font-black uppercase tracking-widest mb-2"
            style={{ fontFamily: "'Archivo Black', sans-serif", color: '#fff' }}
          >
            Not Authorized
          </p>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Admin access required
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#000', paddingBottom: 80 }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{
          background: 'rgba(0,0,0,0.95)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(0, 255, 65, 0.12)',
        }}
      >
        <button
          onClick={() => navigate('/admin')}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <ArrowLeft size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
        </button>
        <div>
          <h1
            className="font-black uppercase tracking-widest"
            style={{ fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, fontSize: '0.85rem', color: NEON_GREEN, letterSpacing: '0.18em' }}
          >
            Curated Trending
          </h1>
          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', monospace" }}>
            Admin-managed homepage trending list
          </p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 max-w-lg mx-auto">
        {/* Search */}
        <div>
          <p
            className="text-xs font-black uppercase tracking-widest mb-3"
            style={{ fontFamily: "'Archivo Black', sans-serif", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}
          >
            Add Song
          </p>
          <div
            className="flex items-center gap-2 rounded-xl px-3"
            style={{
              background: 'rgba(10,26,14,0.6)',
              border: '1px solid rgba(0, 255, 65, 0.2)',
            }}
          >
            <Search size={15} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search by name or symbol..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent py-3 text-sm outline-none"
              style={{
                color: '#fff',
                fontFamily: "'Inter', monospace",
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs flex-shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Search results */}
          {searchQuery && (
            <div className="mt-2 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0, 255, 65, 0.15)', background: 'rgba(10,26,14,0.8)' }}>
              {loadingSongs ? (
                <div className="py-4 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}>
                  Loading...
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="py-4 text-center text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}>
                  No songs found
                </div>
              ) : (
                filteredSongs.map(song => {
                  const detail = detailsMap[song.id];
                  const title = detail?.title ?? song.name ?? 'Untitled';
                  const artist = detail?.artist ?? '—';
                  const symbol = song.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '';
                  const inTrending = trendingIds.has(song.id);
                  return (
                    <div
                      key={song.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {/* Cover */}
                      <div
                        className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.05)' }}
                      >
                        {detail?.coverImage ? (
                          <img src={detail.coverImage} alt={title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate" style={{ color: '#fff', fontFamily: "'Archivo Black', sans-serif" }}>{title}</p>
                        <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{artist} {symbol && `· ${symbol}`}</p>
                      </div>
                      {/* Add button */}
                      <button
                        onClick={() => handleAdd(song)}
                        disabled={inTrending}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 flex-shrink-0"
                        style={{
                          fontFamily: "'Archivo Black', sans-serif",
                          fontSize: '0.65rem',
                          fontWeight: 900,
                          letterSpacing: '0.08em',
                          background: inTrending ? 'rgba(0, 255, 65, 0.08)' : 'rgba(0, 255, 65, 0.15)',
                          border: `1px solid ${inTrending ? 'rgba(0, 255, 65, 0.2)' : 'rgba(0, 255, 65, 0.4)'}`,
                          color: inTrending ? 'rgba(0, 255, 65, 0.4)' : NEON_GREEN,
                          opacity: inTrending ? 0.7 : 1,
                          cursor: inTrending ? 'default' : 'pointer',
                        }}
                      >
                        <Plus size={11} />
                        {inTrending ? 'Added' : 'Add'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Current trending list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p
              className="text-xs font-black uppercase tracking-widest"
              style={{ fontFamily: "'Archivo Black', sans-serif", color: 'rgba(255,255,255,0.5)', letterSpacing: '0.15em' }}
            >
              Current Trending
            </p>
            <span
              className="text-xs rounded-full px-2 py-0.5"
              style={{
                fontFamily: "'Inter', monospace",
                fontSize: '0.65rem',
                background: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid rgba(0, 255, 65, 0.25)',
                color: NEON_GREEN,
              }}
            >
              {curatedTrending.length} songs
            </span>
          </div>

          {curatedTrending.length === 0 ? (
            <div
              className="rounded-xl py-10 text-center"
              style={{ background: 'rgba(10,26,14,0.4)', border: '1px dashed rgba(0, 255, 65, 0.15)' }}
            >
              <TrendingUp size={28} style={{ color: 'rgba(0, 255, 65, 0.2)', margin: '0 auto 8px' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace" }}>
                No songs in trending yet
              </p>
              <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
                Search above to add songs
              </p>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0, 255, 65, 0.15)', background: 'rgba(10,26,14,0.6)' }}>
              {curatedTrending.map((entry, index) => {
                const song = songs.find(s => s.id === entry.songId);
                const detail = song ? detailsMap[song.id] : null;
                const title = detail?.title ?? song?.name ?? entry.songId;
                const artist = detail?.artist ?? '—';
                const symbol = song?.symbol ? (song.symbol.startsWith('$') ? song.symbol : `$${song.symbol}`) : '';
                const addedDate = new Date((entry.addedAt as number) * 1000).toLocaleDateString();

                return (
                  <div
                    key={entry.songId}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: index < curatedTrending.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                  >
                    {/* Rank */}
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-black"
                      style={{ fontFamily: "'Archivo Black', sans-serif", background: 'rgba(0, 255, 65, 0.08)', color: 'rgba(0, 255, 65, 0.6)', fontSize: '0.6rem' }}
                    >
                      {index + 1}
                    </div>
                    {/* Cover */}
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {detail?.coverImage ? (
                        <img src={detail.coverImage} alt={title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={16} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate" style={{ color: '#fff', fontFamily: "'Archivo Black', sans-serif" }}>{title}</p>
                      <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                        {artist} {symbol && `· ${symbol}`} · Added {addedDate}
                      </p>
                    </div>
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemove(entry.songId)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                      style={{
                        background: 'rgba(255,63,75,0.08)',
                        border: '1px solid rgba(255,63,75,0.2)',
                      }}
                      title="Remove from trending"
                    >
                      <Trash2 size={13} style={{ color: '#FF3F4B' }} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTrendingPage;
