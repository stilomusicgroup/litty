import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Artist follow/subscription records. Document ID ($followId) is a composite of followerAddress and artistAddress (e.g., '{followerAddress}_{artistAddress}') for natural uniqueness — one follow per user per artist.
 */
export interface FollowsRequest {
    followerAddress: AddressType;
    artistAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface FollowsResponse {
    followerAddress: string;
    artistAddress: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Follows operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildFollows(followId: string, data?: FollowsRequest): DocumentOperation;
/**
 * Authenticated users can create follow records. followerAddress must match the caller's wallet to prevent spoofing. Document ID should be composite '{followerAddress}_{artistAddress}' using underscores (not hyphens) for natural dedup — one follow per user per artist. All fields are immutable after creation. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setFollows(followId: string, data?: FollowsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can see who follows which artists.
   (Get Single Item)
 */
export declare function getFollows(followId: string): Promise<FollowsResponse | null>;
/**
 * Subscribes to changes in a single Follows document. (
  Read Operation Details: Public read. Anyone can see who follows which artists.
  )
 */
export declare function subscribeFollows(callback: (data: FollowsResponse | null) => void, followId: string): Promise<() => Promise<void>>;
/**
 * Get many Follows items from collection follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function getManyFollows(filter?: string): Promise<FollowsResponse[]>;
/**
 * Subscribe to changes in Follows collection at follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function subscribeManyFollows(callback: (data: FollowsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Follows items from collection follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function getAllFollows(filter?: string): Promise<FollowsResponse[]>;
/**
 * Subscribe to changes in Follows collection at follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function subscribeAllFollows(callback: (data: FollowsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Follows items in collection follows.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countFollows(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Follows items in collection follows.
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
export declare function aggregateFollows(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Only the follower (followerAddress matches caller wallet) can delete their follow record to unfollow an artist.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteFollows(followId: string): Promise<boolean>;
/**
 * Build a delete operation for Follows for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteFollows(followId: string): DocumentOperation;
