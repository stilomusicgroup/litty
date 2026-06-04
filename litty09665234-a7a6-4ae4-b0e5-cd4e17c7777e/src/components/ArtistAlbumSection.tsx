/**
 * ArtistAlbumSection — per-album management panel in the artist dashboard.
 * Shows album coin chart, holder count, slots grid with "+ Add Song" action.
 *
 * Teaser approach: We store teaserImageUrl directly on the placeholder song doc.
 * When an artist clicks "+ Add Song" for an empty slot, we open the song creation
 * form with albumId + slotNumber pre-filled and isPrivate defaulted to true.
 * Artists can also upload a teaser image for that slot when adding the song.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-privy-auth';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManyAlbums } from '@/lib/collections/albums';
import type { AlbumsResponse } from '@/lib/collections/albums';
import {
  runGetBondingCurveProgressQueryForAlbums,
  runGetTokenMintAddressQueryForAlbums,
} from '@/lib/collections/albums';
import { subscribeManySongs, setSongs } from '@/lib/collections/songs';
import type { SongsResponse } from '@/lib/collections/songs';
import { subscribeManySongDetails, setSongDetails } from '@/lib/collections/songDetails';
import type { SongDetailsResponse } from '@/lib/collections/songDetails';
import { uploadAppFiles, getAppFiles } from '@/lib/collections/appFiles';
import { Address, Time } from '@/lib/db-client';
import {
  Plus, Lock, CheckCircle, ArrowUpRight, Music, TrendingUp,
  Loader2, Image, X, ChevronRight, Disc3, Sparkles,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { triggerHapticFeedback } from '@/utils/haptic';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const PURPLE = '#8B5CF6';
const MAGENTA = '#EC4899';

const S = {
  bg: '#080512',
  card: 'linear-gradient(145deg, rgba(30,20,60,0.9) 0%, rgba(15,10,30,0.95) 100%)',
  border: 'rgba(139,92,246,0.2)',
  input: {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(139,92,246,0.25)',
    color: '#e0d7ff',
  } as React.CSSProperties,
  label: { color: 'rgba(220,214,240,0.65)', fontSize: '0.75rem', fontWeight: 600 } as React.CSSProperties,
  muted: 'rgba(220,214,240,0.4)',
  purple: '#a78bfa',
  pink: '#f472b6',
  text: '#e0d7ff',
};

const GENRES = ['Hip-Hop', 'R&B', 'Pop', 'Electronic', 'Trap', 'Afrobeats', 'Latin', 'Drill', 'House', 'Other'] as const;
type Genre = typeof GENRES[number];

const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 800;

async function uploadAndGetUrl(fileId: string, file: File): Promise<string> {
  const success = await uploadAppFiles(fileId, file);
  if (!success) return '';
  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    const item = await getAppFiles(fileId);
    if (item?.url) return item.url;
  }
  return '';
}

function generateId(prefix: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || prefix}-${suffix}`;
}

// ─── Add Song Modal ───────────────────────────────────────────────────────────

interface AddSongModalProps {
  albumId: string;
  slotNumber: number;
  walletAddress: string;
  onClose: () => void;
}

const AddSongModal: React.FC<AddSongModalProps> = ({ albumId, slotNumber, walletAddress, onClose }) => {
  const [form, setForm] = useState({
    title: '',
    genre: '' as Genre | '',
    tokenSymbol: '',
    coverFile: null as File | null,
    coverPreview: null as string | null,
    audioFile: null as File | null,
    audioDuration: null as number | null,
    teaserFile: null as File | null,
    teaserPreview: null as string | null,
  });
  const [stage, setStage] = useState<'idle' | 'working' | 'success'>('idle');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Song title required'); return; }
    if (!form.tokenSymbol.trim()) { setError('Token symbol required'); return; }
    setError('');
    setStage('working');

    const songId = generateId('song', form.title);
    try {
      // Upload cover
      let coverArtUrl = '';
      if (form.coverFile) {
        coverArtUrl = await uploadAndGetUrl(`cover-${songId}`, form.coverFile);
      }

      // Upload audio
      let audioUrl = '';
      if (form.audioFile) {
        audioUrl = await uploadAndGetUrl(`audio-${songId}`, form.audioFile);
      }

      // Upload teaser
      let teaserImageUrl = '';
      if (form.teaserFile) {
        teaserImageUrl = await uploadAndGetUrl(`teaser-${songId}`, form.teaserFile);
      }

      // Upload metadata
      const metadata = {
        name: form.title,
        symbol: form.tokenSymbol,
        description: '',
        image: coverArtUrl || '',
        animation_url: audioUrl ? `${audioUrl}?ext=mp3` : '',
        properties: { category: 'audio' },
      };
      const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json', { type: 'application/json' });
      const metadataUrl = await uploadAndGetUrl(`metadata-${songId}`, metadataFile);
      if (!metadataUrl) throw new Error('Metadata upload failed');

      // Create song token (onchain via PumpFun)
      const songCreated = await setSongs(songId, {
        name: form.title,
        symbol: form.tokenSymbol,
        uri: metadataUrl,
        creator: Address.publicKey(walletAddress),
        albumId,
        slotNumber,
        isPrivate: true,
        teaserImageUrl: teaserImageUrl || undefined,
      });
      if (!songCreated) throw new Error('Failed to create song token');

      // Save song details (offchain)
      await setSongDetails(songId, {
        title: form.title,
        artist: '',
        artistAddress: Address.publicKey(walletAddress),
        genre: form.genre || undefined,
        coverImage: coverArtUrl || undefined,
        audioUrl: audioUrl || undefined,
        tokenSymbol: form.tokenSymbol,
        totalEditions: 0,
        currentEditionCount: 0,
        duration: form.audioDuration ?? undefined,
        streamRequirement: 0,
        approved: false,
      });

      setStage('success');
      toast.success(`Track "${form.title}" added to slot ${slotNumber + 1}!`);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add song');
      setStage('idle');
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        style={{ background: 'rgba(12,8,26,0.98)', border: '1px solid rgba(139,92,246,0.25)' }}
      >
        <div className="space-y-5 p-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}>
              <Music size={16} className="text-white" />
            </div>
            <div>
              <div className="text-xs font-black tracking-widest" style={{ color: S.purple }}>SLOT {slotNumber + 1}</div>
              <h2 className="text-lg font-black" style={{ color: S.text }}>Add Private Song</h2>
            </div>
          </div>

          {stage === 'success' ? (
            <div className="text-center py-8">
              <CheckCircle size={40} className="mx-auto mb-3" style={{ color: NEON_GREEN }} />
              <p className="text-base font-bold" style={{ color: S.text }}>Song added!</p>
            </div>
          ) : (
            <>
              {/* Song title */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={S.label as React.CSSProperties}>Song Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Neon Dreams"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                  style={S.input}
                  disabled={stage === 'working'}
                />
              </div>

              {/* Token symbol */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={S.label as React.CSSProperties}>Token Symbol *</label>
                <input
                  type="text"
                  value={form.tokenSymbol}
                  onChange={e => setForm(f => ({ ...f, tokenSymbol: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) }))}
                  placeholder="e.g. NEON"
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none tracking-widest"
                  style={S.input}
                  disabled={stage === 'working'}
                />
              </div>

              {/* Genre */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={S.label as React.CSSProperties}>Genre</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, genre: g }))}
                      disabled={stage === 'working'}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: form.genre === g ? 'rgba(139,92,246,0.35)' : 'rgba(0,0,0,0.3)',
                        border: `1px solid ${form.genre === g ? 'rgba(139,92,246,0.55)' : 'rgba(139,92,246,0.12)'}`,
                        color: form.genre === g ? S.text : 'rgba(220,214,240,0.45)',
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cover art upload */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={S.label as React.CSSProperties}>Cover Art</label>
                {form.coverPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={form.coverPreview} alt="cover" className="w-14 h-14 rounded-xl object-cover" />
                    <button
                      onClick={() => setForm(f => ({ ...f, coverFile: null, coverPreview: null }))}
                      className="text-xs underline" style={{ color: S.muted }}>Remove</button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer transition-all"
                    style={{ height: '80px', borderColor: 'rgba(139,92,246,0.25)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    <Image size={18} style={{ color: S.purple }} />
                    <span className="text-xs" style={{ color: S.muted }}>Upload cover art (JPG/PNG)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setForm(form => ({ ...form, coverFile: f, coverPreview: URL.createObjectURL(f) }));
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Audio upload */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={S.label as React.CSSProperties}>Audio File</label>
                {form.audioFile ? (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.2)' }}>
                    <Music size={16} style={{ color: S.purple }} />
                    <span className="text-xs text-white truncate flex-1">{form.audioFile.name}</span>
                    <button onClick={() => setForm(f => ({ ...f, audioFile: null, audioDuration: null }))}
                      className="text-xs" style={{ color: S.muted }}>Remove</button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer"
                    style={{ height: '80px', borderColor: 'rgba(139,92,246,0.25)', background: 'rgba(0,0,0,0.2)' }}
                  >
                    <Music size={18} style={{ color: S.purple }} />
                    <span className="text-xs" style={{ color: S.muted }}>Upload audio (MP3/WAV)</span>
                    <input
                      type="file"
                      accept="audio/mpeg,audio/wav,.mp3,.wav"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const audio = new Audio();
                        audio.src = URL.createObjectURL(f);
                        audio.onloadedmetadata = () => {
                          setForm(form => ({ ...form, audioFile: f, audioDuration: Math.floor(audio.duration) }));
                        };
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Teaser image upload */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={S.label as React.CSSProperties}>Teaser Image <span style={{ color: S.muted }}>(optional)</span></label>
                <p className="text-xs mb-1.5" style={{ color: S.muted }}>Shown to non-holders in the locked slot.</p>
                {form.teaserPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={form.teaserPreview} alt="teaser" className="w-14 h-14 rounded-xl object-cover opacity-60" />
                    <button onClick={() => setForm(f => ({ ...f, teaserFile: null, teaserPreview: null }))}
                      className="text-xs underline" style={{ color: S.muted }}>Remove</button>
                  </div>
                ) : (
                  <label
                    className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed cursor-pointer"
                    style={{ height: '70px', borderColor: 'rgba(139,92,246,0.15)', background: 'rgba(0,0,0,0.1)' }}
                  >
                    <Image size={14} style={{ color: 'rgba(139,92,246,0.4)' }} />
                    <span className="text-xs" style={{ color: 'rgba(220,214,240,0.3)' }}>Upload teaser</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      className="hidden"
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) setForm(form => ({ ...form, teaserFile: f, teaserPreview: URL.createObjectURL(f) }));
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Disclosure note */}
              <div
                className="px-4 py-3 rounded-xl"
                style={{
                  background: 'rgba(0, 255, 65, 0.04)',
                  border: '1px solid rgba(0, 255, 65, 0.15)',
                }}
              >
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(0, 255, 65, 0.7)' }}>
                  This song is permanently exclusive to album coin holders — it will never appear on the public feed or DexScreener.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <AlertCircle size={14} style={{ color: '#f87171', flexShrink: 0 }} />
                  <p className="text-xs" style={{ color: '#f87171' }}>{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={stage === 'working'}
                className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{
                  background: stage === 'working' ? 'rgba(139,92,246,0.3)' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  color: 'white',
                  boxShadow: stage === 'working' ? 'none' : '0 0 24px rgba(139,92,246,0.35)',
                }}
              >
                {stage === 'working'
                  ? <><Loader2 size={16} className="animate-spin" />Adding song...</>
                  : <><Sparkles size={16} />Add to Slot {slotNumber + 1}</>
                }
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Single Album Card ────────────────────────────────────────────────────────

interface AlbumCardProps {
  album: AlbumsResponse;
  walletAddress: string;
}

const ArtistAlbumCard: React.FC<AlbumCardProps> = ({ album, walletAddress }) => {
  const navigate = useNavigate();
  const [bondingProgress, setBondingProgress] = useState<number | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [addSlot, setAddSlot] = useState<number | null>(null);

  // Songs in this album
  const { data: albumSongs } = useRealtimeData<SongsResponse[]>(
    subscribeManySongs,
    true,
    `where albumId = '${album.id}'`
  );

  const albumSongIds = (albumSongs ?? []).map(s => s.id);
  const { data: albumDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    albumSongIds.length > 0,
    albumSongIds.length > 0 ? `where id in (${albumSongIds.map(id => `'${id}'`).join(',')})` : ''
  );

  useEffect(() => {
    runGetBondingCurveProgressQueryForAlbums(album.id).then(p => setBondingProgress(p)).catch(() => {});
    runGetTokenMintAddressQueryForAlbums(album.id).then(m => setMintAddress(m)).catch(() => {});
  }, [album.id]);

  const detailsMap = Object.fromEntries((albumDetails ?? []).map(d => [d.id, d]));
  const songsBySlot: Record<number, SongsResponse> = {};
  (albumSongs ?? []).forEach(s => {
    if (s.slotNumber !== undefined && s.slotNumber !== null) {
      songsBySlot[s.slotNumber] = s;
    }
  });
  const filledSlots = Object.keys(songsBySlot).length;

  return (
    <>
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: S.card,
          border: `1px solid ${S.border}`,
        }}
      >
        {/* Album header */}
        <div className="flex items-center gap-4 p-5 border-b" style={{ borderColor: 'rgba(139,92,246,0.12)' }}>
          <div
            className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(30,20,60,0.9), rgba(10,4,20,0.95))' }}
          >
            {album.coverArtUrl
              ? <img src={album.coverArtUrl} alt={album.name} className="w-full h-full object-cover" />
              : <Disc3 size={24} style={{ color: 'rgba(139,92,246,0.4)' }} />
            }
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-white truncate">{album.name}</h3>
            {album.symbol && (
              <span className="text-xs" style={{ color: '#a78bfa', fontFamily: "'Inter', monospace" }}>
                ${album.symbol}
              </span>
            )}
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="text-xs" style={{ color: S.muted }}>
                {filledSlots}/{album.slotCount} slots
              </span>
              {bondingProgress !== null && (
                <span className="text-xs" style={{ color: S.muted }}>
                  {bondingProgress.toFixed(1)}% bonded
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate(`/album/${album.id}/vault`)}
            className="p-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}
          >
            <ArrowUpRight size={16} style={{ color: S.purple }} />
          </button>
        </div>

        {/* Mini chart */}
        {mintAddress && (
          <div style={{ height: '160px', overflow: 'hidden' }}>
            <iframe
              src={`https://www.geckoterminal.com/solana/tokens/${mintAddress}?embed=1&info=0&swaps=0&grayscale=0&light_chart=0`}
              title={`${album.symbol ?? 'Album'} chart`}
              width="100%"
              height="160"
              frameBorder="0"
              loading="lazy"
              sandbox="allow-scripts allow-same-origin"
              style={{ display: 'block', border: 'none' }}
            />
          </div>
        )}

        {/* Bonding progress bar */}
        {bondingProgress !== null && (
          <div className="px-5 py-3" style={{ borderBottom: '1px solid rgba(139,92,246,0.08)' }}>
            <div className="flex justify-between text-[10px] mb-1.5" style={{ color: S.muted }}>
              <span>Bonding Curve</span>
              <span style={{ fontFamily: "'Inter', monospace" }}>{bondingProgress.toFixed(1)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(bondingProgress, 100)}%`,
                  background: 'linear-gradient(90deg, #8B5CF6, #00FF41)',
                  boxShadow: '0 0 8px rgba(0, 255, 65, 0.3)',
                }}
              />
            </div>
          </div>
        )}

        {/* Slots grid */}
        <div className="p-5">
          <p className="text-xs font-black tracking-[0.15em] uppercase mb-3"
            style={{ color: S.purple }}>
            Song Slots
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Array.from({ length: album.slotCount }, (_, i) => {
              const song = songsBySlot[i] ?? null;
              const details = song ? (detailsMap[song.id] ?? null) : null;

              if (song) {
                const isPrivate = song.isPrivate === true;

                return (
                  <div
                    key={i}
                    className="rounded-xl p-3 space-y-2"
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: `1px solid ${isPrivate ? 'rgba(139,92,246,0.2)' : 'rgba(0,212,255,0.25)'}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px]" style={{ color: S.muted }}>#{i + 1}</span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: isPrivate ? 'rgba(139,92,246,0.15)' : 'rgba(0,212,255,0.15)',
                          color: isPrivate ? '#c4b5fd' : CYAN,
                          border: `1px solid ${isPrivate ? 'rgba(139,92,246,0.3)' : 'rgba(0,212,255,0.3)'}`,
                        }}
                      >
                        {isPrivate ? 'exclusive' : 'public'}
                      </span>
                    </div>
                    <p className="text-xs font-bold truncate text-white">{details?.title ?? song.name}</p>
                  </div>
                );
              }

              // Empty slot
              return (
                <button
                  key={i}
                  onClick={() => { triggerHapticFeedback(); setAddSlot(i); }}
                  className="rounded-xl p-3 flex flex-col items-center justify-center gap-2 transition-all hover:opacity-80 active:scale-95"
                  style={{
                    background: 'rgba(0,0,0,0.2)',
                    border: '1px dashed rgba(139,92,246,0.2)',
                    minHeight: '80px',
                  }}
                >
                  <Plus size={16} style={{ color: 'rgba(139,92,246,0.4)' }} />
                  <span className="text-[10px]" style={{ color: 'rgba(220,214,240,0.3)' }}>Slot {i + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Song Modal */}
      {addSlot !== null && (
        <AddSongModal
          albumId={album.id}
          slotNumber={addSlot}
          walletAddress={walletAddress}
          onClose={() => setAddSlot(null)}
        />
      )}
    </>
  );
};

// ─── Main Section ─────────────────────────────────────────────────────────────

const ArtistAlbumSection: React.FC = () => {
  const { user } = useAuth();
  const walletAddress = user?.address ?? null;

  const { data: myAlbums } = useRealtimeData<AlbumsResponse[]>(
    subscribeManyAlbums,
    !!walletAddress,
    `where creator = '${walletAddress}'`
  );

  if (!walletAddress) return null;
  if (!myAlbums?.length) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Disc3 size={16} style={{ color: CYAN }} />
        <h2
          className="text-sm font-black tracking-[0.15em] uppercase"
          style={{ fontFamily: "'Archivo Black', sans-serif", color: CYAN }}
        >
          My Albums
        </h2>
      </div>
      {(myAlbums ?? []).map(album => (
        <ArtistAlbumCard key={album.id} album={album} walletAddress={walletAddress} />
      ))}
    </div>
  );
};

export default ArtistAlbumSection;

