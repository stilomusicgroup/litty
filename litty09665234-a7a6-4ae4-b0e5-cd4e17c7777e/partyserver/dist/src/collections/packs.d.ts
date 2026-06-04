import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Single 'studio' pack tier with open-amount pricing. Customers choose the SOL amount they want to contribute (not locked to fixed price tiers); NFT count, token amount, and payout splits are configured per-pack by admins.
 */
export interface PacksRequest {
    artistPayout: number | TimeOperation | IncrementOperation | TokenAmount;
    name: string;
    nftCount: number | TimeOperation | IncrementOperation | TokenAmount;
    platformSlice: number | TimeOperation | IncrementOperation | TokenAmount;
    priceSol: number | TimeOperation | IncrementOperation | TokenAmount;
    priceUsd: number | TimeOperation | IncrementOperation | TokenAmount;
    sortIndex: number | IncrementOperation | TokenAmount;
    tokenAmount: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PacksResponse {
    artistPayout: number;
    name: string;
    nftCount: number;
    platformSlice: number;
    priceSol: number;
    priceUsd: number;
    sortIndex: number;
    tokenAmount: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Packs operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPacks(packId: string, data: PacksRequest): DocumentOperation;
/**
 * Only ADMIN_ADDRESS or PROJECT_VAULT_ADDRESS can create pack definitions. Configures the studio tier: priceUsd in cents and priceSol in lamports represent reference/minimum pricing (customers choose the actual SOL amount at purchase time), tokenAmount in base units of the song SPL token, artistPayout and platformSlice in cents, sortIndex controls display ordering. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPacks(packId: string, data: PacksRequest): Promise<boolean>;
export type PacksRequestUpdate = Partial<PacksRequest>;
/**
 * Build a Packs update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePacks(packId: string, data: PacksRequestUpdate): DocumentOperation;
/**
 * Only ADMIN_ADDRESS or PROJECT_VAULT_ADDRESS can update pack definitions. sortIndex controls display ordering. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePacks(packId: string, data: PacksRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view available pack products with pricing, NFT count, token amounts, and payout splits.
   (Get Single Item)
 */
export declare function getPacks(packId: string): Promise<PacksResponse | null>;
/**
 * Subscribes to changes in a single Packs document. (
  Read Operation Details: Public read. Anyone can view available pack products with pricing, NFT count, token amounts, and payout splits.
  )
 */
export declare function subscribePacks(callback: (data: PacksResponse | null) => void, packId: string): Promise<() => Promise<void>>;
/**
 * Get many Packs items from collection packs
 
  Read Operation Details: Public read. Anyone can view available pack products with pricing, NFT count, token amounts, and payout splits.
  
 */
export declare function getManyPacks(filter?: string): Promise<PacksResponse[]>;
/**
 * Subscribe to changes in Packs collection at packs
 
  Read Operation Details: Public read. Anyone can view available pack products with pricing, NFT count, token amounts, and payout splits.
  
 */
export declare function subscribeManyPacks(callback: (data: PacksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Packs items from collection packs
 
  Read Operation Details: Public read. Anyone can view available pack products with pricing, NFT count, token amounts, and payout splits.
  
 */
export declare function getAllPacks(filter?: string): Promise<PacksResponse[]>;
/**
 * Subscribe to changes in Packs collection at packs
 
  Read Operation Details: Public read. Anyone can view available pack products with pricing, NFT count, token amounts, and payout splits.
  
 */
export declare function subscribeAllPacks(callback: (data: PacksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Packs items in collection packs.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countPacks(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Packs items in collection packs.
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
export declare function aggregatePacks(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
