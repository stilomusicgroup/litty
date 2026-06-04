import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Tracks reposts of songs by users. Used to count reposts per song and list a user's reposts on their profile. Public read for leaderboards/counts; create restricted to the reposter; immutable updates; only the reposter can delete (un-repost).
 */
export interface RepostsRequest {
    songId: string;
    reposterAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface RepostsResponse {
    songId: string;
    reposterAddress: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Reposts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildReposts(repostId: string, data: RepostsRequest): DocumentOperation;
/**
 * Any authenticated user can create a repost. Caller must set reposterAddress to their own wallet (@newData.reposterAddress == @user.address). Frontend should set createdAt to current Unix seconds. Document ID is application-defined (typically '{songId}_{reposterAddress}' or a generated id). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setReposts(repostId: string, data: RepostsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
   (Get Single Item)
 */
export declare function getReposts(repostId: string): Promise<RepostsResponse | null>;
/**
 * Subscribes to changes in a single Reposts document. (
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  )
 */
export declare function subscribeReposts(callback: (data: RepostsResponse | null) => void, repostId: string): Promise<() => Promise<void>>;
/**
 * Get many Reposts items from collection reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function getManyReposts(filter?: string): Promise<RepostsResponse[]>;
/**
 * Subscribe to changes in Reposts collection at reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function subscribeManyReposts(callback: (data: RepostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Reposts items from collection reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function getAllReposts(filter?: string): Promise<RepostsResponse[]>;
/**
 * Subscribe to changes in Reposts collection at reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function subscribeAllReposts(callback: (data: RepostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Reposts items in collection reposts.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countReposts(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Reposts items in collection reposts.
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
export declare function aggregateReposts(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Only the original reposter (@user.address == @data.reposterAddress) can delete their own repost, enabling un-repost behavior. Admin cannot delete on behalf of users.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteReposts(repostId: string): Promise<boolean>;
/**
 * Build a delete operation for Reposts for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteReposts(repostId: string): DocumentOperation;
