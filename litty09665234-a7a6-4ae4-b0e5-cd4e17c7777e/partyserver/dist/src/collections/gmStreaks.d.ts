import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Tracks daily GM streak for each user. Document ID is the user's wallet address for natural uniqueness. Stores current streak, longest streak, total GMs, and last GM date.
 */
export interface GmStreaksRequest {
    currentStreak: number | TimeOperation | IncrementOperation | TokenAmount;
    lastGmDate: string;
    longestStreak: number | TimeOperation | IncrementOperation | TokenAmount;
    totalGms: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface GmStreaksResponse {
    currentStreak: number;
    lastGmDate: string;
    longestStreak: number;
    totalGms: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a GmStreaks operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildGmStreaks(userAddress: string, data?: GmStreaksRequest): DocumentOperation;
/**
 * Users create their own streak record on first GM. The $userAddress path param must equal caller's wallet. currentStreak and totalGms should start at 1, longestStreak at 1, and lastGmDate set to today's date string. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setGmStreaks(userAddress: string, data?: GmStreaksRequest): Promise<boolean>;
export type GmStreaksRequestUpdate = Partial<GmStreaksRequest>;
/**
 * Build a GmStreaks update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateGmStreaks(userAddress: string, data: GmStreaksRequestUpdate): DocumentOperation;
/**
 * Users update their own streak record when sending subsequent GMs. Frontend logic handles streak continuation vs reset based on lastGmDate comparison to current date. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateGmStreaks(userAddress: string, data: GmStreaksRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
   (Get Single Item)
 */
export declare function getGmStreaks(userAddress: string): Promise<GmStreaksResponse | null>;
/**
 * Subscribes to changes in a single GmStreaks document. (
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  )
 */
export declare function subscribeGmStreaks(callback: (data: GmStreaksResponse | null) => void, userAddress: string): Promise<() => Promise<void>>;
/**
 * Get many GmStreaks items from collection gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function getManyGmStreaks(filter?: string): Promise<GmStreaksResponse[]>;
/**
 * Subscribe to changes in GmStreaks collection at gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function subscribeManyGmStreaks(callback: (data: GmStreaksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all GmStreaks items from collection gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function getAllGmStreaks(filter?: string): Promise<GmStreaksResponse[]>;
/**
 * Subscribe to changes in GmStreaks collection at gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function subscribeAllGmStreaks(callback: (data: GmStreaksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count GmStreaks items in collection gmStreaks.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countGmStreaks(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on GmStreaks items in collection gmStreaks.
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
export declare function aggregateGmStreaks(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
