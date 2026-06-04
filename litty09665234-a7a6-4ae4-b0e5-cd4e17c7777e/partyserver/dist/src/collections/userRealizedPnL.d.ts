import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Tracks each realized gain/loss event when tokens are sold. Created by frontend after successful sells/swaps. Immutable once recorded.
 */
export interface UserRealizedPnLEventsRequest {
    tokenMint: AddressType;
    songId: string;
    songName: string;
    songSymbol: string;
    lotIds: string;
    totalSoldQuantity: number | TimeOperation | IncrementOperation | TokenAmount;
    totalCostBasis: number | TimeOperation | IncrementOperation | TokenAmount;
    totalSaleProceeds: number | TimeOperation | IncrementOperation | TokenAmount;
    currency: string;
    realizedPnL: number | IncrementOperation | TokenAmount;
    realizedAt: number | TimeOperation | IncrementOperation | TokenAmount;
    source: string;
    txSignature: string;
}
export interface UserRealizedPnLEventsResponse {
    tokenMint: string;
    songId: string;
    songName: string;
    songSymbol: string;
    lotIds: string;
    totalSoldQuantity: number;
    totalCostBasis: number;
    totalSaleProceeds: number;
    currency: string;
    realizedPnL: number;
    realizedAt: number;
    source: string;
    txSignature: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a UserRealizedPnLEvents operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUserRealizedPnLEvents(userAddress: string, eventId: string, data?: UserRealizedPnLEventsRequest): DocumentOperation;
/**
 * Authenticated users only. Caller must equal $userAddress. Frontend creates a PnL event after each successful sell, calculating gain/loss from consumed lots. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUserRealizedPnLEvents(userAddress: string, eventId: string, data?: UserRealizedPnLEventsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read realized PnL events. Public for portfolio transparency.
   (Get Single Item)
 */
export declare function getUserRealizedPnLEvents(userAddress: string, eventId: string): Promise<UserRealizedPnLEventsResponse | null>;
/**
 * Subscribes to changes in a single UserRealizedPnLEvents document. (
  Read Operation Details: Anyone can read realized PnL events. Public for portfolio transparency.
  )
 */
export declare function subscribeUserRealizedPnLEvents(callback: (data: UserRealizedPnLEventsResponse | null) => void, userAddress: string, eventId: string): Promise<() => Promise<void>>;
/**
 * Get many UserRealizedPnLEvents items from collection userRealizedPnL/${userAddress}/events
 
  Read Operation Details: Anyone can read realized PnL events. Public for portfolio transparency.
  
 */
export declare function getManyUserRealizedPnLEvents(userAddress: string, filter?: string): Promise<UserRealizedPnLEventsResponse[]>;
/**
 * Subscribe to changes in UserRealizedPnLEvents collection at userRealizedPnL/${userAddress}/events
 
  Read Operation Details: Anyone can read realized PnL events. Public for portfolio transparency.
  
 */
export declare function subscribeManyUserRealizedPnLEvents(callback: (data: UserRealizedPnLEventsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all UserRealizedPnLEvents items from collection userRealizedPnL/${userAddress}/events
 
  Read Operation Details: Anyone can read realized PnL events. Public for portfolio transparency.
  
 */
export declare function getAllUserRealizedPnLEvents(userAddress: string, filter?: string): Promise<UserRealizedPnLEventsResponse[]>;
/**
 * Subscribe to changes in UserRealizedPnLEvents collection at userRealizedPnL/${userAddress}/events
 
  Read Operation Details: Anyone can read realized PnL events. Public for portfolio transparency.
  
 */
export declare function subscribeAllUserRealizedPnLEvents(callback: (data: UserRealizedPnLEventsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count UserRealizedPnLEvents items in collection userRealizedPnL/${userAddress}/events.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countUserRealizedPnLEvents(userAddress: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on UserRealizedPnLEvents items in collection userRealizedPnL/${userAddress}/events.
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
export declare function aggregateUserRealizedPnLEvents(userAddress: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
