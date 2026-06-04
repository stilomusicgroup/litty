import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Per-user playlist entries. Each user has exactly ONE playlist site-wide, stored as a flat list of (user, song) entries under their wallet address. One document per (user, song) pair. Entries can be reordered by the owner via the `position` field, but other fields (userAddress, songId, addedAt) are immutable once added.
 */
export interface PlaylistSongsSongsRequest {
    userAddress: AddressType;
    songId: string;
    addedAt: number | TimeOperation | IncrementOperation | TokenAmount;
    position: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PlaylistSongsSongsResponse {
    userAddress: string;
    songId: string;
    addedAt: number;
    position: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PlaylistSongsSongs operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPlaylistSongsSongs(userAddress: string, songId: string, data?: PlaylistSongsSongsRequest): DocumentOperation;
/**
 * Only the user themselves can add songs to their own playlist. The $userAddress path segment must equal @newData.userAddress, which must equal @user.address. userAddress and songId are immutable (readonly). addedAt is an immutable Unix timestamp in seconds set on creation. The client must supply a `position` (UInt) representing the sort index within the user's playlist (lower = earlier in the queue). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPlaylistSongsSongs(userAddress: string, songId: string, data?: PlaylistSongsSongsRequest): Promise<boolean>;
export type PlaylistSongsSongsRequestUpdate = Partial<PlaylistSongsSongsRequest>;
/**
 * Build a PlaylistSongsSongs update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePlaylistSongsSongs(userAddress: string, songId: string, data: PlaylistSongsSongsRequestUpdate): DocumentOperation;
/**
 * Only the owner ($userAddress == @user.address) can update their own playlist entry. Only the `position` field may change — userAddress, songId, and addedAt must remain identical between @data and @newData. Used for reordering songs within the playlist. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePlaylistSongsSongs(userAddress: string, songId: string, data: PlaylistSongsSongsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
   (Get Single Item)
 */
export declare function getPlaylistSongsSongs(userAddress: string, songId: string): Promise<PlaylistSongsSongsResponse | null>;
/**
 * Subscribes to changes in a single PlaylistSongsSongs document. (
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  )
 */
export declare function subscribePlaylistSongsSongs(callback: (data: PlaylistSongsSongsResponse | null) => void, userAddress: string, songId: string): Promise<() => Promise<void>>;
/**
 * Get many PlaylistSongsSongs items from collection playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function getManyPlaylistSongsSongs(userAddress: string, filter?: string): Promise<PlaylistSongsSongsResponse[]>;
/**
 * Subscribe to changes in PlaylistSongsSongs collection at playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function subscribeManyPlaylistSongsSongs(callback: (data: PlaylistSongsSongsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PlaylistSongsSongs items from collection playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function getAllPlaylistSongsSongs(userAddress: string, filter?: string): Promise<PlaylistSongsSongsResponse[]>;
/**
 * Subscribe to changes in PlaylistSongsSongs collection at playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function subscribeAllPlaylistSongsSongs(callback: (data: PlaylistSongsSongsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count PlaylistSongsSongs items in collection playlistSongs/${userAddress}/songs.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countPlaylistSongsSongs(userAddress: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on PlaylistSongsSongs items in collection playlistSongs/${userAddress}/songs.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregatePlaylistSongsSongs(userAddress: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Only the user themselves can remove songs from their own playlist (the $userAddress path segment must equal @user.address).
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePlaylistSongsSongs(userAddress: string, songId: string): Promise<boolean>;
/**
 * Build a delete operation for PlaylistSongsSongs for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePlaylistSongsSongs(userAddress: string, songId: string): DocumentOperation;
