import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Tracks each token acquisition as a tax lot for per-user cost basis tracking. Created by frontend after successful buys/swaps/airdrops/pack purchases.
 */
export interface UserTokenLotsLotsRequest {
    tokenMint: AddressType;
    songId: string;
    songName: string;
    songSymbol: string;
    quantity: number | TimeOperation | IncrementOperation | TokenAmount;
    remainingQuantity: number | TimeOperation | IncrementOperation | TokenAmount;
    costBasisAmount: number | TimeOperation | IncrementOperation | TokenAmount;
    costBasisCurrency: string;
    acquiredAt: number | TimeOperation | IncrementOperation | TokenAmount;
    source: string;
    txSignature: string;
    pricePerToken: string;
}
export interface UserTokenLotsLotsResponse {
    tokenMint: string;
    songId: string;
    songName: string;
    songSymbol: string;
    quantity: number;
    remainingQuantity: number;
    costBasisAmount: number;
    costBasisCurrency: string;
    acquiredAt: number;
    source: string;
    txSignature: string;
    pricePerToken: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a UserTokenLotsLots operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUserTokenLotsLots(userAddress: string, lotId: string, data?: UserTokenLotsLotsRequest): DocumentOperation;
/**
 * Authenticated users only. Caller must equal $userAddress. Frontend creates a lot after each successful token acquisition (buy, swap, airdrop, pack). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUserTokenLotsLots(userAddress: string, lotId: string, data?: UserTokenLotsLotsRequest): Promise<boolean>;
export type UserTokenLotsLotsRequestUpdate = Partial<UserTokenLotsLotsRequest>;
/**
 * Build a UserTokenLotsLots update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateUserTokenLotsLots(userAddress: string, lotId: string, data: UserTokenLotsLotsRequestUpdate): DocumentOperation;
/**
 * Owner only ($userAddress). Used to decrement remainingQuantity when tokens from this lot are sold. No other fields should change. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateUserTokenLotsLots(userAddress: string, lotId: string, data: UserTokenLotsLotsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read lot records. Public for portfolio transparency.
   (Get Single Item)
 */
export declare function getUserTokenLotsLots(userAddress: string, lotId: string): Promise<UserTokenLotsLotsResponse | null>;
/**
 * Subscribes to changes in a single UserTokenLotsLots document. (
  Read Operation Details: Anyone can read lot records. Public for portfolio transparency.
  )
 */
export declare function subscribeUserTokenLotsLots(callback: (data: UserTokenLotsLotsResponse | null) => void, userAddress: string, lotId: string): Promise<() => Promise<void>>;
/**
 * Get many UserTokenLotsLots items from collection userTokenLots/${userAddress}/lots
 
  Read Operation Details: Anyone can read lot records. Public for portfolio transparency.
  
 */
export declare function getManyUserTokenLotsLots(userAddress: string, filter?: string): Promise<UserTokenLotsLotsResponse[]>;
/**
 * Subscribe to changes in UserTokenLotsLots collection at userTokenLots/${userAddress}/lots
 
  Read Operation Details: Anyone can read lot records. Public for portfolio transparency.
  
 */
export declare function subscribeManyUserTokenLotsLots(callback: (data: UserTokenLotsLotsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all UserTokenLotsLots items from collection userTokenLots/${userAddress}/lots
 
  Read Operation Details: Anyone can read lot records. Public for portfolio transparency.
  
 */
export declare function getAllUserTokenLotsLots(userAddress: string, filter?: string): Promise<UserTokenLotsLotsResponse[]>;
/**
 * Subscribe to changes in UserTokenLotsLots collection at userTokenLots/${userAddress}/lots
 
  Read Operation Details: Anyone can read lot records. Public for portfolio transparency.
  
 */
export declare function subscribeAllUserTokenLotsLots(callback: (data: UserTokenLotsLotsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count UserTokenLotsLots items in collection userTokenLots/${userAddress}/lots.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countUserTokenLotsLots(userAddress: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on UserTokenLotsLots items in collection userTokenLots/${userAddress}/lots.
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
export declare function aggregateUserTokenLotsLots(userAddress: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
