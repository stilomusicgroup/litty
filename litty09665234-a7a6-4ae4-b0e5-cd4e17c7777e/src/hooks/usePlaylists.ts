/**
 * usePlaylists — deprecated. Use useMyPlaylist from @/hooks/useMyPlaylist instead.
 * Each user now has a single playlist (no multi-playlist concept).
 * This file is kept as a stub to avoid broken imports during migration.
 */
export function usePlaylists() {
  return {
    playlists: [] as never[],
    createPlaylist: async (_name: string) => null as string | null,
    addToPlaylist: async (_playlistId: string, _songId: string) => false,
    removeFromPlaylist: async (_playlistId: string, _songId: string) => {},
    deletePlaylist: async (_playlistId: string) => {},
  };
}
