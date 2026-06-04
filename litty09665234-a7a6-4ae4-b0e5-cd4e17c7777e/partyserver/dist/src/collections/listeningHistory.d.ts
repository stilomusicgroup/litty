import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Per-user, per-genre listening history used to compute genre affinity for the Made For You section on Discover. Document ID path is keyed by the listener wallet ($userId) and the genre name ($genre) so a single user's full per-genre history can be fetched with a wildcard query, and a single (user, genre) row can be incremented cheaply when a song plays.
 */
export interface ListeningHistoryGenresRequest {
    userId: AddressType;
    genre: string;
    playCount: number | TimeOperation | IncrementOperation | TokenAmount;
    lastPlayedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ListeningHistoryGenresResponse {
    userId: string;
    genre: string;
    playCount: number;
    lastPlayedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ListeningHistoryGenres operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequest): DocumentOperation;
/**
 * Authenticated user only — the caller's wallet must equal the $userId path segment. The userId field must match $userId and the genre field must match $genre to keep the document body consistent with its path. Frontend writes this record the first time a user plays a song in a given genre (playCount typically initialized to 1, lastPlayedAt to current Unix seconds). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequest): Promise<boolean>;
export type ListeningHistoryGenresRequestUpdate = Partial<ListeningHistoryGenresRequest>;
/**
 * Build a ListeningHistoryGenres update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequestUpdate): DocumentOperation;
/**
 * Only the owning user (@user.address == $userId) can update. Used by the frontend on each subsequent play to increment playCount and refresh lastPlayedAt (Unix seconds) for that (user, genre) pair. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
   (Get Single Item)
 */
export declare function getListeningHistoryGenres(userId: string, genre: string): Promise<ListeningHistoryGenresResponse | null>;
/**
 * Subscribes to changes in a single ListeningHistoryGenres document. (
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  )
 */
export declare function subscribeListeningHistoryGenres(callback: (data: ListeningHistoryGenresResponse | null) => void, userId: string, genre: string): Promise<() => Promise<void>>;
/**
 * Get many ListeningHistoryGenres items from collection listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function getManyListeningHistoryGenres(userId: string, filter?: string): Promise<ListeningHistoryGenresResponse[]>;
/**
 * Subscribe to changes in ListeningHistoryGenres collection at listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function subscribeManyListeningHistoryGenres(callback: (data: ListeningHistoryGenresResponse[]) => void, userId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ListeningHistoryGenres items from collection listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function getAllListeningHistoryGenres(userId: string, filter?: string): Promise<ListeningHistoryGenresResponse[]>;
/**
 * Subscribe to changes in ListeningHistoryGenres collection at listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function subscribeAllListeningHistoryGenres(callback: (data: ListeningHistoryGenresResponse[]) => void, userId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count ListeningHistoryGenres items in collection listeningHistory/${userId}/genres.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countListeningHistoryGenres(userId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on ListeningHistoryGenres items in collection listeningHistory/${userId}/genres.
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
export declare function aggregateListeningHistoryGenres(userId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Only the owning user (@user.address == $userId) can delete their own history record. No admin or backend deletion path.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteListeningHistoryGenres(userId: string, genre: string): Promise<boolean>;
/**
 * Build a delete operation for ListeningHistoryGenres for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteListeningHistoryGenres(userId: string, genre: string): DocumentOperation;
