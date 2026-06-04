import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Uniqueness-enforcing reverse lookup table mapping usernames to wallet addresses.
 */
export interface UsernamesRequest {
    userAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface UsernamesResponse {
    userAddress: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Usernames operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUsernames(username: string, data: UsernamesRequest): DocumentOperation;
/**
 * Users can claim a username by creating a document with their wallet address as userAddress. Backend (PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET) and ADMIN_ADDRESS can also create username mappings. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUsernames(username: string, data: UsernamesRequest): Promise<boolean>;
export type UsernamesRequestUpdate = Partial<UsernamesRequest>;
/**
 * Build a Usernames update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateUsernames(username: string, data: UsernamesRequestUpdate): DocumentOperation;
/**
 * Username mapping can be updated by the owner of the wallet address, or by backend/admin accounts. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateUsernames(username: string, data: UsernamesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
   (Get Single Item)
 */
export declare function getUsernames(username: string): Promise<UsernamesResponse | null>;
/**
 * Subscribes to changes in a single Usernames document. (
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  )
 */
export declare function subscribeUsernames(callback: (data: UsernamesResponse | null) => void, username: string): Promise<() => Promise<void>>;
/**
 * Get many Usernames items from collection usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function getManyUsernames(filter?: string): Promise<UsernamesResponse[]>;
/**
 * Subscribe to changes in Usernames collection at usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function subscribeManyUsernames(callback: (data: UsernamesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Usernames items from collection usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function getAllUsernames(filter?: string): Promise<UsernamesResponse[]>;
/**
 * Subscribe to changes in Usernames collection at usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function subscribeAllUsernames(callback: (data: UsernamesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Usernames items in collection usernames.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countUsernames(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Usernames items in collection usernames.
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
export declare function aggregateUsernames(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
