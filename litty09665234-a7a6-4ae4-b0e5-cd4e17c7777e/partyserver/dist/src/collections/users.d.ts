import { AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * User profiles with email linkage for Shopify webhook matching and token airdrop delivery.
 */
export interface UsersRequest {
    displayName?: string;
    email?: string;
    walletAddress: AddressType;
    profileImage?: string;
    username?: string;
    twitter?: string;
    instagram?: string;
    spotify?: string;
    tiktok?: string;
    youtube?: string;
    twitch?: string;
    kick?: string;
    soundcloud?: string;
    facebook?: string;
    linkedin?: string;
    telegram?: string;
    website?: string;
}
export interface UsersResponse {
    displayName?: string;
    email?: string;
    walletAddress: string;
    profileImage?: string;
    username?: string;
    twitter?: string;
    instagram?: string;
    spotify?: string;
    tiktok?: string;
    youtube?: string;
    twitch?: string;
    kick?: string;
    soundcloud?: string;
    facebook?: string;
    linkedin?: string;
    telegram?: string;
    website?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Users operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUsers(userAddress: string, data?: UsersRequest): DocumentOperation;
/**
 * Users can create their own profile when $userAddress and walletAddress match their wallet. The backend (PROJECT_VAULT_ADDRESS) and ADMIN_ADDRESS can also create user records for new card-purchase wallets or administrative purposes. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUsers(userAddress: string, data?: UsersRequest): Promise<boolean>;
export type UsersRequestUpdate = Partial<UsersRequest>;
/**
 * Build a Users update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateUsers(userAddress: string, data: UsersRequestUpdate): DocumentOperation;
/**
 * Users can update their own profile. PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can also update user records. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateUsers(userAddress: string, data: UsersRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view user profiles.
   (Get Single Item)
 */
export declare function getUsers(userAddress: string): Promise<UsersResponse | null>;
/**
 * Subscribes to changes in a single Users document. (
  Read Operation Details: Public read. Anyone can view user profiles.
  )
 */
export declare function subscribeUsers(callback: (data: UsersResponse | null) => void, userAddress: string): Promise<() => Promise<void>>;
/**
 * Get many Users items from collection users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function getManyUsers(filter?: string): Promise<UsersResponse[]>;
/**
 * Subscribe to changes in Users collection at users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function subscribeManyUsers(callback: (data: UsersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Users items from collection users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function getAllUsers(filter?: string): Promise<UsersResponse[]>;
/**
 * Subscribe to changes in Users collection at users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function subscribeAllUsers(callback: (data: UsersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Users items in collection users.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countUsers(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Users items in collection users.
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
export declare function aggregateUsers(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
