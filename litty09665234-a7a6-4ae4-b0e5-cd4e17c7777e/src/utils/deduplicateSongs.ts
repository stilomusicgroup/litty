import type { SongsResponse } from '@/lib/collections/songs';

/**
 * Deduplicates songs by title (name) + creator address.
 * When duplicates exist, keeps the one with the earliest tarobase_created_at (the original).
 */
export function deduplicateSongs(songs: SongsResponse[]): SongsResponse[] {
  const seen = new Map<string, SongsResponse>();
  for (const song of songs) {
    const key = `${song.name}::${song.creator}`;
    const existing = seen.get(key);
    if (!existing || song.tarobase_created_at < existing.tarobase_created_at) {
      seen.set(key, song);
    }
  }
  return Array.from(seen.values());
}
