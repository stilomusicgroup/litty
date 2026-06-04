import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Global and per-song chat messages for the Lit Hub real-time chat system. Messages can belong to the global Lit Hub chat (songId null) or a per-song Artist Room (songId populated).
 */
export interface ChatMessagesRequest {
    walletAddress: AddressType;
    displayName?: string;
    content: string;
    songId?: string;
    isPinned: boolean;
    pinnedBy?: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    arenaId?: string;
}
export interface ChatMessagesResponse {
    walletAddress: string;
    displayName?: string;
    content: string;
    songId?: string;
    isPinned: boolean;
    pinnedBy?: string;
    createdAt: number;
    arenaId?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ChatMessages operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildChatMessages(messageId: string, data: ChatMessagesRequest): DocumentOperation;
/**
 * Authenticated users can post messages. walletAddress must match the caller's wallet to prevent spoofing. songId null means global Lit Hub, populated means an Artist Room scoped to that song. isPinned should default to false on creation. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setChatMessages(messageId: string, data: ChatMessagesRequest): Promise<boolean>;
export type ChatMessagesRequestUpdate = Partial<ChatMessagesRequest>;
/**
 * Build a ChatMessages update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateChatMessages(messageId: string, data: ChatMessagesRequestUpdate): DocumentOperation;
/**
 * Only ADMIN_ADDRESS can update messages, primarily to toggle isPinned and set pinnedBy for message pinning (eligibility validation happens client-side, admin signs the pin action). (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateChatMessages(messageId: string, data: ChatMessagesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
   (Get Single Item)
 */
export declare function getChatMessages(messageId: string): Promise<ChatMessagesResponse | null>;
/**
 * Subscribes to changes in a single ChatMessages document. (
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  )
 */
export declare function subscribeChatMessages(callback: (data: ChatMessagesResponse | null) => void, messageId: string): Promise<() => Promise<void>>;
/**
 * Get many ChatMessages items from collection chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function getManyChatMessages(filter?: string): Promise<ChatMessagesResponse[]>;
/**
 * Subscribe to changes in ChatMessages collection at chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function subscribeManyChatMessages(callback: (data: ChatMessagesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ChatMessages items from collection chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function getAllChatMessages(filter?: string): Promise<ChatMessagesResponse[]>;
/**
 * Subscribe to changes in ChatMessages collection at chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function subscribeAllChatMessages(callback: (data: ChatMessagesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count ChatMessages items in collection chatMessages.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countChatMessages(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on ChatMessages items in collection chatMessages.
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
export declare function aggregateChatMessages(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: ADMIN_ADDRESS can moderate by deleting any message. Users can delete their own messages.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteChatMessages(messageId: string): Promise<boolean>;
/**
 * Build a delete operation for ChatMessages for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteChatMessages(messageId: string): DocumentOperation;
