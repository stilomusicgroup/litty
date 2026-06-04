import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Individual reaction records for chat messages. Document ID should be a composite like {messageId}_{walletAddress}_{emoji} using underscores for natural uniqueness (one reaction per user per emoji per message).
 */
export interface ChatReactionsRequest {
    messageId: string;
    walletAddress: AddressType;
    emoji: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ChatReactionsResponse {
    messageId: string;
    walletAddress: string;
    emoji: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ChatReactions operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildChatReactions(reactionId: string, data?: ChatReactionsRequest): DocumentOperation;
/**
 * Authenticated users can react to messages. walletAddress must match caller to prevent spoofing. Document ID should be composite {messageId}_{walletAddress}_{emoji} using underscores (not hyphens) for natural dedup. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setChatReactions(reactionId: string, data?: ChatReactionsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view message reactions and counts.
   (Get Single Item)
 */
export declare function getChatReactions(reactionId: string): Promise<ChatReactionsResponse | null>;
/**
 * Subscribes to changes in a single ChatReactions document. (
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  )
 */
export declare function subscribeChatReactions(callback: (data: ChatReactionsResponse | null) => void, reactionId: string): Promise<() => Promise<void>>;
/**
 * Get many ChatReactions items from collection chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function getManyChatReactions(filter?: string): Promise<ChatReactionsResponse[]>;
/**
 * Subscribe to changes in ChatReactions collection at chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function subscribeManyChatReactions(callback: (data: ChatReactionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ChatReactions items from collection chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function getAllChatReactions(filter?: string): Promise<ChatReactionsResponse[]>;
/**
 * Subscribe to changes in ChatReactions collection at chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function subscribeAllChatReactions(callback: (data: ChatReactionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count ChatReactions items in collection chatReactions.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countChatReactions(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on ChatReactions items in collection chatReactions.
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
export declare function aggregateChatReactions(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Users can remove their own reactions to toggle them off.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteChatReactions(reactionId: string): Promise<boolean>;
/**
 * Build a delete operation for ChatReactions for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteChatReactions(reactionId: string): DocumentOperation;
