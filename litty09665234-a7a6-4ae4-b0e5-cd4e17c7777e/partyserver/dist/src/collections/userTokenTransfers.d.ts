import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Onchain user-initiated SPL token transfers (USDC, song tokens, etc.). Minimal onchain collection that triggers a real SPL token movement from the user's wallet to a recipient via TokenPlugin hook.
 */
export interface UserTokenTransfersRequest {
    toAddress: AddressType;
    mintAddress: AddressType;
    amount: number | TimeOperation | IncrementOperation | TokenAmount;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface UserTokenTransfersResponse {
    toAddress: string;
    mintAddress: string;
    amount: number;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a UserTokenTransfers operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUserTokenTransfers(transferId: string, data?: UserTokenTransfersRequest): DocumentOperation;
/**
 * Authenticated users only. Transfers SPL tokens from the caller's wallet to the specified toAddress. Amount must be provided in the token's base units. Hook executes the actual onchain token transfer via TokenPlugin. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUserTokenTransfers(transferId: string, data?: UserTokenTransfersRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the token transfer.
   (Get Single Item)
 */
export declare function getUserTokenTransfers(transferId: string): Promise<UserTokenTransfersResponse | null>;
/**
 * Subscribes to changes in a single UserTokenTransfers document. (
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the token transfer.
  )
 */
export declare function subscribeUserTokenTransfers(callback: (data: UserTokenTransfersResponse | null) => void, transferId: string): Promise<() => Promise<void>>;
/**
 * Get many UserTokenTransfers items from collection userTokenTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the token transfer.
  
 */
export declare function getManyUserTokenTransfers(filter?: string): Promise<UserTokenTransfersResponse[]>;
/**
 * Subscribe to changes in UserTokenTransfers collection at userTokenTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the token transfer.
  
 */
export declare function subscribeManyUserTokenTransfers(callback: (data: UserTokenTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all UserTokenTransfers items from collection userTokenTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the token transfer.
  
 */
export declare function getAllUserTokenTransfers(filter?: string): Promise<UserTokenTransfersResponse[]>;
/**
 * Subscribe to changes in UserTokenTransfers collection at userTokenTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the token transfer.
  
 */
export declare function subscribeAllUserTokenTransfers(callback: (data: UserTokenTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count UserTokenTransfers items in collection userTokenTransfers.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countUserTokenTransfers(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on UserTokenTransfers items in collection userTokenTransfers.
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
export declare function aggregateUserTokenTransfers(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
