import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Admin-curated list of trending songs/tokens displayed on the homepage. Document ID is the songId, enforcing uniqueness (a song can only appear once in the trending list). Admin can drag-to-reorder entries by updating the optional `order` field (lower = displayed first); other fields are immutable.
 */
export interface CuratedTrendingRequest {
    songId: string;
    addedAt: number | TimeOperation | IncrementOperation | TokenAmount;
    addedBy: AddressType;
    order?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface CuratedTrendingResponse {
    songId: string;
    addedAt: number;
    addedBy: string;
    order?: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a CuratedTrending operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildCuratedTrending(songId: string, data?: CuratedTrendingRequest): DocumentOperation;
/**
 * Admin only (@user.address must equal @constants.ADMIN_ADDRESS). Document ID is the songId, enforcing uniqueness. Validates that the referenced song exists in /songs/$songId. The addedBy field must equal the caller's wallet, and songId must equal the document path segment. The `order` field is optional on create. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setCuratedTrending(songId: string, data?: CuratedTrendingRequest): Promise<boolean>;
export type CuratedTrendingRequestUpdate = Partial<CuratedTrendingRequest>;
/**
 * Build a CuratedTrending update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateCuratedTrending(songId: string, data: CuratedTrendingRequestUpdate): DocumentOperation;
/**
 * Admin only (@user.address must equal @constants.ADMIN_ADDRESS). Used for manual drag-to-reorder: admin updates the optional `order` field (lower = displayed first). Immutable fields (songId, addedBy, addedAt) cannot change — the rule enforces that @newData values for these fields equal the existing @data values, so effectively only `order` can be modified. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateCuratedTrending(songId: string, data: CuratedTrendingRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
   (Get Single Item)
 */
export declare function getCuratedTrending(songId: string): Promise<CuratedTrendingResponse | null>;
/**
 * Subscribes to changes in a single CuratedTrending document. (
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  )
 */
export declare function subscribeCuratedTrending(callback: (data: CuratedTrendingResponse | null) => void, songId: string): Promise<() => Promise<void>>;
/**
 * Get many CuratedTrending items from collection curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function getManyCuratedTrending(filter?: string): Promise<CuratedTrendingResponse[]>;
/**
 * Subscribe to changes in CuratedTrending collection at curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function subscribeManyCuratedTrending(callback: (data: CuratedTrendingResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all CuratedTrending items from collection curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function getAllCuratedTrending(filter?: string): Promise<CuratedTrendingResponse[]>;
/**
 * Subscribe to changes in CuratedTrending collection at curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function subscribeAllCuratedTrending(callback: (data: CuratedTrendingResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count CuratedTrending items in collection curatedTrending.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countCuratedTrending(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on CuratedTrending items in collection curatedTrending.
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
export declare function aggregateCuratedTrending(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Admin only (@user.address must equal @constants.ADMIN_ADDRESS). Removes the song from the curated trending list.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteCuratedTrending(songId: string): Promise<boolean>;
/**
 * Build a delete operation for CuratedTrending for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteCuratedTrending(songId: string): DocumentOperation;
