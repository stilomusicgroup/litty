/**
 * Filters out seed/filler songs that were used during development
 * and should never appear in live UI listings.
 *
 * Seed songs are identified by:
 *  - id matching /^song_\d+$/ or /^song_seed_/
 *  - name/title (case-insensitive) matching a known seed title
 */

const SEED_ID_PATTERNS: RegExp[] = [
  /^song_\d+$/,
  /^song_seed_/,
];

const SEED_NAMES: Set<string> = new Set([
  'neon nights',
  'neon lights',
  'midnight drive',
  'violet skies',
  'aurora dreams',
  'quantum bass',
  'glass echoes',
  'midnight protocol',
  'golden hour',
  'street legends',
  'echoes',
  'neon dreams',
]);

export function isSeedSong(song: { id?: string; name?: string; title?: string } | null | undefined): boolean {
  if (!song) return false;

  const id = song.id ?? '';
  if (id && SEED_ID_PATTERNS.some((re) => re.test(id))) {
    return true;
  }

  const candidateName = (song.name ?? song.title ?? '').trim().toLowerCase();
  if (candidateName && SEED_NAMES.has(candidateName)) {
    return true;
  }

  return false;
}
