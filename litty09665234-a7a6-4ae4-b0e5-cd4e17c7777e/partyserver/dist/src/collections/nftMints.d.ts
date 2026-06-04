import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Metaplex NFT editions for songs. Each song can have NFT bundles or limited editions minted alongside the SPL token.
 */
export interface NftMintsRequest {
    songId: string;
    mintAddress: AddressType;
    owner: AddressType;
    tokenMint: AddressType;
    title: string;
    artist: string;
    coverImage?: string;
    isSoulbound: boolean;
    editionType: string;
    editionNumber?: number | IncrementOperation | TokenAmount;
    totalEditions?: number | IncrementOperation | TokenAmount;
    royaltyBps?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface NftMintsResponse {
    songId: string;
    mintAddress: string;
    owner: string;
    tokenMint: string;
    title: string;
    artist: string;
    coverImage?: string;
    isSoulbound: boolean;
    editionType: string;
    editionNumber?: number;
    totalEditions?: number;
    royaltyBps?: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a NftMints operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildNftMints(nftId: string, data: NftMintsRequest): DocumentOperation;
/**
 * Authenticated users can create a record when owner matches the caller wallet, or the backend vault (PROJECT_VAULT_ADDRESS) can create records on behalf of buyers during Shopify webhook dual-mint fulfillment. The frontend should provide the associated songId, tokenMint, title, artist, edition metadata, and the minted Metaplex mintAddress after the dual-mint flow completes. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setNftMints(nftId: string, data: NftMintsRequest): Promise<boolean>;
export type NftMintsRequestUpdate = Partial<NftMintsRequest>;
/**
 * Build a NftMints update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateNftMints(nftId: string, data: NftMintsRequestUpdate): DocumentOperation;
/**
 * Only the stored owner can update mutable metadata fields for the NFT mint record. Immutable fields marked with ! such as songId, mintAddress, owner, tokenMint, title, and artist cannot be changed after creation. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateNftMints(nftId: string, data: NftMintsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read NFT mint records because onchain documents are public. The collection links song releases to their NFT edition mint addresses and ownership metadata.
   (Get Single Item)
 */
export declare function getNftMints(nftId: string): Promise<NftMintsResponse | null>;
/**
 * Subscribes to changes in a single NftMints document. (
  Read Operation Details: Anyone can read NFT mint records because onchain documents are public. The collection links song releases to their NFT edition mint addresses and ownership metadata.
  )
 */
export declare function subscribeNftMints(callback: (data: NftMintsResponse | null) => void, nftId: string): Promise<() => Promise<void>>;
/**
 * Get many NftMints items from collection nftMints
 
  Read Operation Details: Anyone can read NFT mint records because onchain documents are public. The collection links song releases to their NFT edition mint addresses and ownership metadata.
  
 */
export declare function getManyNftMints(filter?: string): Promise<NftMintsResponse[]>;
/**
 * Subscribe to changes in NftMints collection at nftMints
 
  Read Operation Details: Anyone can read NFT mint records because onchain documents are public. The collection links song releases to their NFT edition mint addresses and ownership metadata.
  
 */
export declare function subscribeManyNftMints(callback: (data: NftMintsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all NftMints items from collection nftMints
 
  Read Operation Details: Anyone can read NFT mint records because onchain documents are public. The collection links song releases to their NFT edition mint addresses and ownership metadata.
  
 */
export declare function getAllNftMints(filter?: string): Promise<NftMintsResponse[]>;
/**
 * Subscribe to changes in NftMints collection at nftMints
 
  Read Operation Details: Anyone can read NFT mint records because onchain documents are public. The collection links song releases to their NFT edition mint addresses and ownership metadata.
  
 */
export declare function subscribeAllNftMints(callback: (data: NftMintsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count NftMints items in collection nftMints.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countNftMints(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on NftMints items in collection nftMints.
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
export declare function aggregateNftMints(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
