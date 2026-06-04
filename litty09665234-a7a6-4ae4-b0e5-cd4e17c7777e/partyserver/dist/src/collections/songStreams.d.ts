import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Tracks total stream count per song. Only backend (PROJECT_VAULT_ADDRESS) can create/increment to prevent users from inflating counts. Public readable for leaderboard display.
 */
export interface SongStreamsRequest {
    count: number | TimeOperation | IncrementOperation | TokenAmount;
    lastStreamedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongStreamsResponse {
    count: number;
    lastStreamedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SongStreams operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongStreams(songId: string, data: SongStreamsRequest): DocumentOperation;
/**
 * Only backend (signed with PROJECT_VAULT_ADDRESS) can create the initial stream record for a song. Frontend must call a backend route which validates and creates the record. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongStreams(songId: string, data: SongStreamsRequest): Promise<boolean>;
export type SongStreamsRequestUpdate = Partial<SongStreamsRequest>;
/**
 * Build a SongStreams update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSongStreams(songId: string, data: SongStreamsRequestUpdate): DocumentOperation;
/**
 * Only backend (signed with PROJECT_VAULT_ADDRESS) can increment count and update lastStreamedAt. Prevents users from inflating their own counts. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSongStreams(songId: string, data: SongStreamsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
   (Get Single Item)
 */
export declare function getSongStreams(songId: string): Promise<SongStreamsResponse | null>;
/**
 * Subscribes to changes in a single SongStreams document. (
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  )
 */
export declare function subscribeSongStreams(callback: (data: SongStreamsResponse | null) => void, songId: string): Promise<() => Promise<void>>;
/**
 * Get many SongStreams items from collection songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function getManySongStreams(filter?: string): Promise<SongStreamsResponse[]>;
/**
 * Subscribe to changes in SongStreams collection at songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function subscribeManySongStreams(callback: (data: SongStreamsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongStreams items from collection songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function getAllSongStreams(filter?: string): Promise<SongStreamsResponse[]>;
/**
 * Subscribe to changes in SongStreams collection at songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function subscribeAllSongStreams(callback: (data: SongStreamsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongStreams items in collection songStreams.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongStreams(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongStreams items in collection songStreams.
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
export declare function aggregateSongStreams(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
