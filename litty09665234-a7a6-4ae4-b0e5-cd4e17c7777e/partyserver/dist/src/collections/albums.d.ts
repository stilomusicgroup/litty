import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Album token collection. Each album is launched as a tradable SPL token via PumpFunPlugin with automatic bonding curve, mirroring the songs pattern. Albums act as containers/access tokens for a curated set of songs that may be private until graduated to public.
 */
export interface AlbumsRequest {
    name: string;
    symbol: string;
    uri: string;
    creator: AddressType;
    coverArtUrl?: string;
    slotCount: number | TimeOperation | IncrementOperation | TokenAmount;
    description?: string;
}
export interface AlbumsResponse {
    name: string;
    symbol: string;
    uri: string;
    creator: string;
    coverArtUrl?: string;
    slotCount: number;
    description?: string;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a Albums operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildAlbums(albumId: string, data?: AlbumsRequest): DocumentOperation;
/**
 * Authenticated artists can create their own album token when creator matches their wallet. ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can also create albums for bootstrap or seed data. The uri field must be a Metaplex-standard JSON metadata URL; the PumpFunPlugin hook launches the album token on Pump.fun with automatic bonding curve. slotCount defines how many song slots the album will hold (e.g., 8 or 12). Use getTokenMintAddress to retrieve the resulting mint. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setAlbums(albumId: string, data?: AlbumsRequest): Promise<boolean>;
export type AlbumsRequestUpdate = Partial<AlbumsRequest>;
/**
 * Build a Albums update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateAlbums(albumId: string, data: AlbumsRequestUpdate): DocumentOperation;
/**
 * Creator (artist), PROJECT_VAULT_ADDRESS, or ADMIN_ADDRESS can update mutable metadata fields like coverArtUrl, description, and slotCount. Token-defining fields (name/symbol/uri/creator) are readonly. No on-chain hook on update. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateAlbums(albumId: string, data: AlbumsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view album token data, bonding curve progress, creator fees, and token balances via queries.
   (Get Single Item)
 */
export declare function getAlbums(albumId: string): Promise<AlbumsResponse | null>;
/**
 * Subscribes to changes in a single Albums document. (
  Read Operation Details: Public read. Anyone can view album token data, bonding curve progress, creator fees, and token balances via queries.
  )
 */
export declare function subscribeAlbums(callback: (data: AlbumsResponse | null) => void, albumId: string): Promise<() => Promise<void>>;
/**
 * Get many Albums items from collection albums
 
  Read Operation Details: Public read. Anyone can view album token data, bonding curve progress, creator fees, and token balances via queries.
  
 */
export declare function getManyAlbums(filter?: string): Promise<AlbumsResponse[]>;
/**
 * Subscribe to changes in Albums collection at albums
 
  Read Operation Details: Public read. Anyone can view album token data, bonding curve progress, creator fees, and token balances via queries.
  
 */
export declare function subscribeManyAlbums(callback: (data: AlbumsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Albums items from collection albums
 
  Read Operation Details: Public read. Anyone can view album token data, bonding curve progress, creator fees, and token balances via queries.
  
 */
export declare function getAllAlbums(filter?: string): Promise<AlbumsResponse[]>;
/**
 * Subscribe to changes in Albums collection at albums
 
  Read Operation Details: Public read. Anyone can view album token data, bonding curve progress, creator fees, and token balances via queries.
  
 */
export declare function subscribeAllAlbums(callback: (data: AlbumsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Albums items in collection albums.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countAlbums(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Albums items in collection albums.
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
export declare function aggregateAlbums(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Runs the "getTokenMintAddress" query on Albums.
 * Query Logic: @TokenPlugin.getTokenMintAddress($albumId, @data.name, @data.symbol)
 */
export declare function runGetTokenMintAddressQueryForAlbums(albumId: string): Promise<string>;
/**
 * Runs the "getBondingCurveProgress" query on Albums.
 * Query Logic: @PumpFunPlugin.getBondingCurveProgress(@TokenPlugin.getTokenMintAddress($albumId, @data.name, @data.symbol))
 */
export declare function runGetBondingCurveProgressQueryForAlbums(albumId: string): Promise<number>;
/**
 * Runs the "getCreatorFee" query on Albums.
 * Query Logic: @PumpFunPlugin.getCreatorFee(@TokenPlugin.getTokenMintAddress($albumId, @data.name, @data.symbol))
 */
export declare function runGetCreatorFeeQueryForAlbums(albumId: string): Promise<number>;
/** Arguments accepted by the "getTokenBalance" query on Albums. */
interface AlbumsGetTokenBalanceArgs {
    walletAddress: string;
}
/**
 * Runs the "getTokenBalance" query on Albums.
 * Query Logic: @TokenPlugin.getBalance(@newData.walletAddress, @TokenPlugin.getTokenMintAddress($albumId, @data.name, @data.symbol))
 */
export declare function runGetTokenBalanceQueryForAlbums(albumId: string, args: AlbumsGetTokenBalanceArgs): Promise<number>;
export {};
