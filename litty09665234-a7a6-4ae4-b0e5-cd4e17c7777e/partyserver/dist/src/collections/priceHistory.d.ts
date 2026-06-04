import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Time-series price snapshots for song tokens, recorded on each trade. Frontend creates these entries after swap/buy transactions to maintain price history for charts and analytics.
 */
export interface PriceHistoryRequest {
    bondingCurveProgress?: number | TimeOperation | IncrementOperation | TokenAmount;
    createdAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    marketCap?: number | TimeOperation | IncrementOperation | TokenAmount;
    price?: number | TimeOperation | IncrementOperation | TokenAmount;
    songId: string;
    totalSupply?: number | TimeOperation | IncrementOperation | TokenAmount;
    volume24h?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PriceHistoryResponse {
    bondingCurveProgress?: number;
    createdAt?: number;
    marketCap?: number;
    price?: number;
    songId: string;
    totalSupply?: number;
    volume24h?: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PriceHistory operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPriceHistory(snapshotId: string, data: PriceHistoryRequest): DocumentOperation;
/**
 * Backend-only (PROJECT_VAULT_ADDRESS). Price snapshots are created by the server after swap/buy transactions. Prevents bot spam and fake price data injection. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPriceHistory(snapshotId: string, data: PriceHistoryRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view price history data for charting and analytics. Returns all price snapshots ordered by createdAt.
   (Get Single Item)
 */
export declare function getPriceHistory(snapshotId: string): Promise<PriceHistoryResponse | null>;
/**
 * Subscribes to changes in a single PriceHistory document. (
  Read Operation Details: Public read. Anyone can view price history data for charting and analytics. Returns all price snapshots ordered by createdAt.
  )
 */
export declare function subscribePriceHistory(callback: (data: PriceHistoryResponse | null) => void, snapshotId: string): Promise<() => Promise<void>>;
/**
 * Get many PriceHistory items from collection priceHistory
 
  Read Operation Details: Public read. Anyone can view price history data for charting and analytics. Returns all price snapshots ordered by createdAt.
  
 */
export declare function getManyPriceHistory(filter?: string): Promise<PriceHistoryResponse[]>;
/**
 * Subscribe to changes in PriceHistory collection at priceHistory
 
  Read Operation Details: Public read. Anyone can view price history data for charting and analytics. Returns all price snapshots ordered by createdAt.
  
 */
export declare function subscribeManyPriceHistory(callback: (data: PriceHistoryResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PriceHistory items from collection priceHistory
 
  Read Operation Details: Public read. Anyone can view price history data for charting and analytics. Returns all price snapshots ordered by createdAt.
  
 */
export declare function getAllPriceHistory(filter?: string): Promise<PriceHistoryResponse[]>;
/**
 * Subscribe to changes in PriceHistory collection at priceHistory
 
  Read Operation Details: Public read. Anyone can view price history data for charting and analytics. Returns all price snapshots ordered by createdAt.
  
 */
export declare function subscribeAllPriceHistory(callback: (data: PriceHistoryResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count PriceHistory items in collection priceHistory.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countPriceHistory(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on PriceHistory items in collection priceHistory.
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
export declare function aggregatePriceHistory(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Admin only. Reserved for data correction or cleanup.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePriceHistory(snapshotId: string): Promise<boolean>;
/**
 * Build a delete operation for PriceHistory for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePriceHistory(snapshotId: string): DocumentOperation;
