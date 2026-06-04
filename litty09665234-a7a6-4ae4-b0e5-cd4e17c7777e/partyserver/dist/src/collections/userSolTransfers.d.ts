import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Onchain user-initiated SOL transfers. Minimal onchain collection that triggers a real SOL token movement from the user's wallet to a recipient via TokenPlugin hook.
 */
export interface UserSolTransfersRequest {
    toAddress: AddressType;
    amountLamports: number | TimeOperation | IncrementOperation | TokenAmount;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface UserSolTransfersResponse {
    toAddress: string;
    amountLamports: number;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a UserSolTransfers operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUserSolTransfers(transferId: string, data?: UserSolTransfersRequest): DocumentOperation;
/**
 * Authenticated users only. Transfers SOL from the caller's wallet to the specified toAddress. Amount must be provided in lamports (base units). Hook executes the actual onchain SOL transfer via TokenPlugin. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUserSolTransfers(transferId: string, data?: UserSolTransfersRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the transfer.
   (Get Single Item)
 */
export declare function getUserSolTransfers(transferId: string): Promise<UserSolTransfersResponse | null>;
/**
 * Subscribes to changes in a single UserSolTransfers document. (
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the transfer.
  )
 */
export declare function subscribeUserSolTransfers(callback: (data: UserSolTransfersResponse | null) => void, transferId: string): Promise<() => Promise<void>>;
/**
 * Get many UserSolTransfers items from collection userSolTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the transfer.
  
 */
export declare function getManyUserSolTransfers(filter?: string): Promise<UserSolTransfersResponse[]>;
/**
 * Subscribe to changes in UserSolTransfers collection at userSolTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the transfer.
  
 */
export declare function subscribeManyUserSolTransfers(callback: (data: UserSolTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all UserSolTransfers items from collection userSolTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the transfer.
  
 */
export declare function getAllUserSolTransfers(filter?: string): Promise<UserSolTransfersResponse[]>;
/**
 * Subscribe to changes in UserSolTransfers collection at userSolTransfers
 
  Read Operation Details: Publicly readable onchain transfer record. Anyone can verify the transfer.
  
 */
export declare function subscribeAllUserSolTransfers(callback: (data: UserSolTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count UserSolTransfers items in collection userSolTransfers.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countUserSolTransfers(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on UserSolTransfers items in collection userSolTransfers.
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
export declare function aggregateUserSolTransfers(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
