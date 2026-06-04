import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { Howl } from 'howler';
import { toast } from 'sonner';
import { getIdToken } from '@pooflabs/web';
import { useAuth } from '@/hooks/use-privy-auth';
import { triggerHapticFeedback } from '@/utils/haptic';
import { getManySongDetails } from '@/lib/collections/songDetails';
import {
  getListeningHistoryGenres,
  setListeningHistoryGenres,
  updateListeningHistoryGenres,
} from '@/lib/collections/listeningHistory';
import { Address } from '@/lib/db-client';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { useStreamEventLogger } from '@/hooks/use-stream-event-logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlayerSong {
  songId: string;
  title: string;
  artist: string;
  coverImage?: string;
  audioUrl?: string;
  audiusStreamUrl?: string;
  duration?: number;
  symbol?: string;
  genre?: string;
}

export type RepeatMode = 'off' | 'one' | 'all';

const QUEUE_STORAGE_KEY = 'lit-studio-queue';

function saveQueueToStorage(queue: PlayerSong[], index: number) {
  try {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify({ queue, index }));
  } catch { /* ignore */ }
}

function loadQueueFromStorage(): { queue: PlayerSong[]; index: number } | null {
  try {
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export interface PlayerState {
  currentSong: PlayerSong | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: PlayerSong[];
  originalQueue: PlayerSong[];
  queueIndex: number;
  repeatMode: RepeatMode;
  shuffleMode: boolean;
  isLoading: boolean;
  hasPlayed: boolean;
}

interface PlayerContextValue extends PlayerState {
  playSong: (song: PlayerSong) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  skipNext: () => void;
  skipPrev: () => void;
  setQueue: (songs: PlayerSong[], startIndex?: number, playOnQueue?: boolean) => void;
  addToQueue: (song: PlayerSong) => void;
  clearQueue: () => void;
  jumpToQueueIndex: (index: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}

// ─── BroadcastChannel for multi-tab sync ─────────────────────────────────────

const BROADCAST_CHANNEL_NAME = 'lit-player-sync';

// ─── Play count tracking ──────────────────────────────────────────────────────

function incrementPlayCount(songId: string) {
  try {
    const stored = localStorage.getItem('lit_play_counts');
    const counts: Record<string, number> = stored ? JSON.parse(stored) : {};
    counts[songId] = (counts[songId] ?? 0) + 1;
    localStorage.setItem('lit_play_counts', JSON.stringify(counts));
  } catch {
    // localStorage may be unavailable
  }
}

// ─── Stream recording — server-side deduplication guards against refreshes/multi-device ──

async function recordStream(songId: string, userAddress: string, token: string): Promise<void> {
  try {
    const authApi = createAuthenticatedApiClient(token, userAddress);
    await authApi.post(`/api/songs/${songId}/stream`);
  } catch {
    // Non-critical — silently ignore errors
  }
}

// ─── Genre affinity tracking ──────────────────────────────────────────────────
// Normalize genre for use as both the path segment and the stored genre field.
// Trim whitespace; replace "/" with "-" to keep the path segment valid.
function normalizeGenre(raw: string): string {
  return raw.trim().replace(/\//g, '-');
}

async function trackGenrePlay(userAddress: string, rawGenre: string): Promise<void> {
  const genre = normalizeGenre(rawGenre);
  if (!genre) return;
  const existing = await getListeningHistoryGenres(userAddress, genre);
  const lastPlayedAt = Math.floor(Date.now() / 1000);
  if (existing) {
    await updateListeningHistoryGenres(userAddress, genre, {
      playCount: (existing.playCount ?? 0) + 1,
      lastPlayedAt,
    });
  } else {
    await setListeningHistoryGenres(userAddress, genre, {
      userId: Address.publicKey(userAddress),
      genre,
      playCount: 1,
      lastPlayedAt,
    });
  }
}

// ─── Audio cache helper ───────────────────────────────────────────────────────

async function cacheAudioUrl(url: string) {
  try {
    if ('caches' in window) {
      const cache = await caches.open('lit-audio-v1');
      const existing = await cache.match(url);
      if (!existing) {
        const resp = await fetch(url);
        if (resp.ok) await cache.put(url, resp);
      }
    }
  } catch {
    // Cache API may not be available
  }
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { createStreamEvent } = useStreamEventLogger();
  const [state, setState] = useState<PlayerState>(() => {
    const saved = loadQueueFromStorage();
    return {
      currentSong: saved?.queue?.[saved?.index ?? 0] ?? null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.85,
      queue: saved?.queue ?? [],
      originalQueue: saved?.queue ?? [],
      queueIndex: saved?.index ?? -1,
      repeatMode: 'off',
      shuffleMode: false,
      isLoading: false,
      hasPlayed: false,
    };
  });

  const howlRef = useRef<Howl | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string>(crypto.randomUUID());
  const playSongRef = useRef<((song: PlayerSong) => void) | null>(null);
  const currentSongRef = useRef<PlayerSong | null>(state.currentSong);

  // Setup BroadcastChannel
  useEffect(() => {
    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.onmessage = (e) => {
        if (e.data?.type === 'PAUSE_ALL' && e.data?.fromTab !== tabIdRef.current) {
          howlRef.current?.pause();
          setState((s) => ({ ...s, isPlaying: false }));
        }
      };
      broadcastRef.current = bc;
    } catch {
      // BroadcastChannel not available in all envs
    }
    return () => {
      broadcastRef.current?.close();
    };
  }, []);

  const broadcastPlay = useCallback(() => {
    try {
      broadcastRef.current?.postMessage({ type: 'PAUSE_ALL', fromTab: tabIdRef.current });
    } catch {
      // ignore
    }
  }, []);

  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const h = howlRef.current;
      if (!h) return;
      const time = (h.seek() as number) || 0;
      setState((s) => ({ ...s, currentTime: time }));
    }, 300);
  }, []);

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const setMediaSession = useCallback((song: PlayerSong) => {
    if (!('mediaSession' in navigator)) return;
    const artwork: MediaImage[] = [];
    if (song.coverImage) {
      artwork.push({ src: song.coverImage, sizes: '512x512', type: 'image/jpeg' });
      artwork.push({ src: song.coverImage, sizes: '256x256', type: 'image/jpeg' });
      artwork.push({ src: song.coverImage, sizes: '96x96', type: 'image/jpeg' });
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: song.title,
      artwork,
    });
  }, []);

  const destroyHowl = useCallback(() => {
    stopTick();
    if (howlRef.current) {
      howlRef.current.off();
      howlRef.current.unload();
      howlRef.current = null;
    }
  }, [stopTick]);

  const playSong = useCallback(
    (song: PlayerSong) => {
      destroyHowl();
      triggerHapticFeedback();

      const audioSrc = song.audioUrl || song.audiusStreamUrl || null;

      if (!audioSrc) {
        toast.error('Preview unavailable');
        return;
      }

      setState((s) => ({
        ...s,
        currentSong: song,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isLoading: true,
        hasPlayed: true,
      }));

      incrementPlayCount(song.songId);
      // Record stream via backend (authenticated users only — prevents anonymous spam)
      if (user?.address) {
        getIdToken().then((token) => {
          if (token) recordStream(song.songId, user.address, token).catch(() => { /* silent */ });
        }).catch(() => { /* silent */ });
        // Log stream event to streamEvents collection for analytics
        createStreamEvent({ songId: song.songId, duration: song.duration, source: 'player' }).catch(() => { /* silent */ });
      }
      // Track genre affinity for signed-in users when a song starts playing
      if (user?.address && song.genre) {
        trackGenrePlay(user.address, song.genre).catch(() => { /* silent — non-critical */ });
      }
      setMediaSession(song);
      broadcastPlay();

      // Cache for offline
      cacheAudioUrl(audioSrc);

      const h = new Howl({
        src: [audioSrc],
        html5: true,
        volume: state.volume,
        onload: () => {
          setState((s) => ({ ...s, duration: h.duration(), isLoading: false }));
        },
        onloaderror: () => {
          setState((s) => ({ ...s, isLoading: false }));
          toast.error('Audio failed to load');
        },
        onend: () => {
          stopTick();
          setState((s) => {
            if (s.repeatMode === 'one') {
              h.seek(0);
              h.play();
              startTick();
              return { ...s, currentTime: 0, isPlaying: true };
            }
            // Auto-advance queue
            const nextIndex = s.shuffleMode
              ? Math.floor(Math.random() * s.queue.length)
              : s.queueIndex + 1;
            if (nextIndex < s.queue.length) {
              const nextSong = s.queue[nextIndex];
              saveQueueToStorage(s.queue, nextIndex);
              setTimeout(() => playSongRef.current?.(nextSong), 0);
              return { ...s, queueIndex: nextIndex };
            }
            // End of queue
            if (s.repeatMode === 'all' && s.queue.length > 0) {
              const firstSong = s.queue[0];
              saveQueueToStorage(s.queue, 0);
              setTimeout(() => playSongRef.current?.(firstSong), 0);
              return { ...s, queueIndex: 0 };
            }
            // repeatMode === 'off': stop playback
            return {
              ...s,
              isPlaying: false,
              currentTime: 0,
            };
          });
        },
        onplay: () => {
          startTick();
          setState((s) => ({ ...s, isPlaying: true }));
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
          }
        },
        onpause: () => {
          stopTick();
          setState((s) => ({ ...s, isPlaying: false }));
          if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
          }
        },
      });

      howlRef.current = h;
      h.play();

      // Wire basic MediaSession action handlers
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => h.play());
        navigator.mediaSession.setActionHandler('pause', () => h.pause());
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined) {
            h.seek(details.seekTime);
            setState((s) => ({ ...s, currentTime: details.seekTime! }));
          }
        });
      }
    },
    [destroyHowl, state.volume, setMediaSession, broadcastPlay, startTick, stopTick, user, createStreamEvent]
  );

  // Keep the ref in sync so onend callbacks can always call the latest playSong
  useEffect(() => {
    playSongRef.current = playSong;
  }, [playSong]);

  // Keep currentSong ref in sync for togglePlay when howl is not yet initialized
  useEffect(() => {
    currentSongRef.current = state.currentSong;
  }, [state.currentSong]);

  const togglePlay = useCallback(() => {
    const h = howlRef.current;
    if (!h) {
      // No howl instance yet, but a song may be selected (e.g. loaded from storage).
      // Start playing it to initialize the howl.
      if (currentSongRef.current) {
        playSongRef.current?.(currentSongRef.current);
      }
      return;
    }
    triggerHapticFeedback();
    if (h.playing()) {
      h.pause();
    } else {
      broadcastPlay();
      h.play();
    }
  }, [broadcastPlay]);

  const seek = useCallback((time: number) => {
    const h = howlRef.current;
    if (!h) return;
    h.seek(time);
    setState((s) => ({ ...s, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    howlRef.current?.volume(volume);
    setState((s) => ({ ...s, volume }));
  }, []);

  const skipNext = useCallback(() => {
    setState((s) => {
      const nextIdx = s.shuffleMode
        ? Math.floor(Math.random() * s.queue.length)
        : s.queueIndex + 1;
      if (nextIdx < s.queue.length) {
        setTimeout(() => playSong(s.queue[nextIdx]), 0);
        return { ...s, queueIndex: nextIdx };
      }
      return s;
    });
  }, [playSong]);

  const skipPrev = useCallback(() => {
    const h = howlRef.current;
    setState((s) => {
      const currentT = (h?.seek() as number) || 0;
      if (currentT > 3) {
        h?.seek(0);
        return { ...s, currentTime: 0 };
      }
      const prevIdx = s.queueIndex - 1;
      if (prevIdx >= 0) {
        setTimeout(() => playSong(s.queue[prevIdx]), 0);
        return { ...s, queueIndex: prevIdx };
      }
      h?.seek(0);
      return { ...s, currentTime: 0 };
    });
  }, [playSong]);

  const setQueue = useCallback(
    (songs: PlayerSong[], startIndex = 0, playOnQueue = true) => {
      saveQueueToStorage(songs, startIndex);
      setState((s) => ({
        ...s,
        queue: songs,
        originalQueue: [...songs],
        queueIndex: startIndex,
        shuffleMode: false,
        currentSong: songs[startIndex] ?? null,
        isPlaying: false,
        currentTime: 0,
      }));
      if (songs.length > 0 && playOnQueue) playSong(songs[startIndex]);
    },
    [playSong]
  );

  const addToQueue = useCallback(
    (song: PlayerSong) => {
      setState((s) => {
        const newQueue = [...s.queue, song];
        saveQueueToStorage(newQueue, s.queueIndex);
        return { ...s, queue: newQueue, originalQueue: [...s.originalQueue, song] };
      });
      toast.success(`"${song.title}" added to queue`);
    },
    []
  );

  const clearQueue = useCallback(() => {
    setState((s) => ({
      ...s,
      queue: [],
      originalQueue: [],
      queueIndex: -1,
    }));
    try { localStorage.removeItem(QUEUE_STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const jumpToQueueIndex = useCallback(
    (index: number) => {
      setState((s) => {
        if (index < 0 || index >= s.queue.length) return s;
        const song = s.queue[index];
        saveQueueToStorage(s.queue, index);
        setTimeout(() => playSongRef.current?.(song), 0);
        return { ...s, queueIndex: index };
      });
    },
    []
  );

  const setRepeatMode = useCallback((mode: RepeatMode) => {
    setState((s) => ({ ...s, repeatMode: mode }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((s) => {
      if (!s.shuffleMode) {
        // Turning shuffle ON: randomize queue, keep current song at front
        const remaining = s.queue.filter((_, i) => i !== s.queueIndex);
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        const currentSong = s.queue[s.queueIndex];
        const shuffledQueue = currentSong ? [currentSong, ...remaining] : remaining;
        return {
          ...s,
          shuffleMode: true,
          originalQueue: s.originalQueue.length === 0 ? [...s.queue] : s.originalQueue,
          queue: shuffledQueue,
          queueIndex: 0,
        };
      } else {
        // Turning shuffle OFF: restore original queue order
        const original = s.originalQueue.length > 0 ? s.originalQueue : s.queue;
        const currentSongId = s.currentSong?.songId;
        const restoredIndex = currentSongId
          ? original.findIndex((song) => song.songId === currentSongId)
          : s.queueIndex;
        return {
          ...s,
          shuffleMode: false,
          queue: original,
          queueIndex: restoredIndex >= 0 ? restoredIndex : 0,
        };
      }
    });
  }, []);

  // MediaSession next/prev handlers
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('nexttrack', () => skipNext());
    navigator.mediaSession.setActionHandler('previoustrack', () => skipPrev());
    return () => {
      try {
        navigator.mediaSession.setActionHandler('nexttrack', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
      } catch { /* ignore */ }
    };
  }, [skipNext, skipPrev]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyHowl();
    };
  }, [destroyHowl]);

  // On first mount, if no saved queue exists, load the latest approved song as default
  useEffect(() => {
    const hasSavedQueue = state.queue.length > 0;
    if (hasSavedQueue) return;

    let cancelled = false;
    const loadLatestSong = async () => {
      try {
        const songs = await getManySongDetails('last 1 recently created approved songs with audioUrl');
        if (cancelled || songs.length === 0) return;
        const latest = songs[0];
        const defaultSong: PlayerSong = {
          songId: latest.id,
          title: latest.title,
          artist: latest.artist || 'Unknown Artist',
          coverImage: latest.coverImage,
          audioUrl: latest.audioUrl,
          audiusStreamUrl: latest.audiusStreamUrl,
          duration: latest.duration ? latest.duration / 1000 : undefined,
          genre: latest.genre,
          symbol: latest.tokenSymbol,
        };
        saveQueueToStorage([defaultSong], 0);
        if (!cancelled) {
          setState((s) => ({
            ...s,
            queue: [defaultSong],
            originalQueue: [defaultSong],
            queueIndex: 0,
            currentSong: defaultSong,
          }));
        }
      } catch {
        // Failed to load default song — leave player empty
      }
    };
    loadLatestSong();
    return () => { cancelled = true; };
  }, []);

  const value: PlayerContextValue = {
    ...state,
    playSong,
    togglePlay,
    seek,
    setVolume,
    skipNext,
    skipPrev,
    setQueue,
    addToQueue,
    clearQueue,
    jumpToQueueIndex,
    setRepeatMode,
    toggleShuffle,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
