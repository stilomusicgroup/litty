import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Artist profile comment wall. Users can leave comments on artist profiles. Document ID is a composite string created by the frontend (e.g., '{artistAddress}_{walletAddress}_{timestamp}') but the policy does not enforce the ID format.
 */
export interface CommentsRequest {
    walletAddress: AddressType;
    displayName?: string;
    content: string;
    artistAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    isPinned: boolean;
}
export interface CommentsResponse {
    walletAddress: string;
    displayName?: string;
    content: string;
    artistAddress: string;
    createdAt: number;
    isPinned: boolean;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Comments operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildComments(commentId: string, data: CommentsRequest): DocumentOperation;
/**
 * Authenticated users can post comments. walletAddress must match the caller's wallet to prevent spoofing. artistAddress indicates which artist profile the comment belongs to. createdAt is a Unix timestamp in seconds and is immutable. content is the comment text (max 280 chars enforced client-side). isPinned defaults to false. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setComments(commentId: string, data: CommentsRequest): Promise<boolean>;
export type CommentsRequestUpdate = Partial<CommentsRequest>;
/**
 * Build a Comments update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateComments(commentId: string, data: CommentsRequestUpdate): DocumentOperation;
/**
 * Only ADMIN_ADDRESS can update comments, primarily to toggle isPinned status. All other fields are immutable (marked with !) except displayName which is mutable. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateComments(commentId: string, data: CommentsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
   (Get Single Item)
 */
export declare function getComments(commentId: string): Promise<CommentsResponse | null>;
/**
 * Subscribes to changes in a single Comments document. (
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  )
 */
export declare function subscribeComments(callback: (data: CommentsResponse | null) => void, commentId: string): Promise<() => Promise<void>>;
/**
 * Get many Comments items from collection comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function getManyComments(filter?: string): Promise<CommentsResponse[]>;
/**
 * Subscribe to changes in Comments collection at comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function subscribeManyComments(callback: (data: CommentsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Comments items from collection comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function getAllComments(filter?: string): Promise<CommentsResponse[]>;
/**
 * Subscribe to changes in Comments collection at comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function subscribeAllComments(callback: (data: CommentsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Comments items in collection comments.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countComments(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Comments items in collection comments.
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
export declare function aggregateComments(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Users can delete their own comments (walletAddress matches caller). ADMIN_ADDRESS can delete any comment for moderation purposes.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteComments(commentId: string): Promise<boolean>;
/**
 * Build a delete operation for Comments for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteComments(commentId: string): DocumentOperation;
