import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Extended song metadata stored offchain to minimize onchain costs. Uses same $songId as the onchain songs collection for linkage.
 */
export interface SongDetailsRequest {
    title: string;
    artist: string;
    artistAddress: AddressType;
    description?: string;
    coverImage?: string;
    audioUrl?: string;
    genre?: string;
    lyrics?: string;
    minTokensRequired?: number | TimeOperation | IncrementOperation | TokenAmount;
    streamRequirement: number | IncrementOperation | TokenAmount;
    nftMint?: string;
    approved: boolean;
    audiusArtworkUrl?: string;
    audiusHandle?: string;
    audiusStreamUrl?: string;
    audiusTrackId?: string;
    duration?: number | TimeOperation | IncrementOperation | TokenAmount;
    totalEditions?: number | TimeOperation | IncrementOperation | TokenAmount;
    currentEditionCount?: number | TimeOperation | IncrementOperation | TokenAmount;
    tokenSymbol?: string;
    approvalStatus?: string;
    rejectionReason?: string;
    changesRequested?: string;
    submittedAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    launchMode?: string;
    artistEmail?: string;
    nftRoyaltyPct?: number | TimeOperation | IncrementOperation | TokenAmount;
    releaseDate?: string;
    releasePlatforms?: string;
    releaseTime?: string;
    isGraduated?: boolean;
}
export interface SongDetailsResponse {
    title: string;
    artist: string;
    artistAddress: string;
    description?: string;
    coverImage?: string;
    audioUrl?: string;
    genre?: string;
    lyrics?: string;
    minTokensRequired?: number;
    streamRequirement: number;
    nftMint?: string;
    approved: boolean;
    audiusArtworkUrl?: string;
    audiusHandle?: string;
    audiusStreamUrl?: string;
    audiusTrackId?: string;
    duration?: number;
    totalEditions?: number;
    currentEditionCount?: number;
    tokenSymbol?: string;
    approvalStatus?: string;
    rejectionReason?: string;
    changesRequested?: string;
    submittedAt?: number;
    launchMode?: string;
    artistEmail?: string;
    nftRoyaltyPct?: number;
    releaseDate?: string;
    releasePlatforms?: string;
    releaseTime?: string;
    isGraduated?: boolean;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SongDetails operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongDetails(songId: string, data: SongDetailsRequest): DocumentOperation;
/**
 * Only the system backend (PROJECT_VAULT_ADDRESS) or admin (ADMIN_ADDRESS) can create song metadata. Creation should happen as part of the automated token launch pipeline or admin action. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongDetails(songId: string, data: SongDetailsRequest): Promise<boolean>;
export type SongDetailsRequestUpdate = Partial<SongDetailsRequest>;
/**
 * Build a SongDetails update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSongDetails(songId: string, data: SongDetailsRequestUpdate): DocumentOperation;
/**
 * ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, or OPERATIONS_WALLET can update. Includes setting isGraduated to true when a song's bonding curve reaches 100% and the token graduates to a DEX. Admin should set isGraduated: true at graduation time to signal that trading should route through DEX (Jupiter/PumpSwap) instead of bonding curve. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSongDetails(songId: string, data: SongDetailsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view song metadata, including whether a submission has been approved for marketplace display.
   (Get Single Item)
 */
export declare function getSongDetails(songId: string): Promise<SongDetailsResponse | null>;
/**
 * Subscribes to changes in a single SongDetails document. (
  Read Operation Details: Public read. Anyone can view song metadata, including whether a submission has been approved for marketplace display.
  )
 */
export declare function subscribeSongDetails(callback: (data: SongDetailsResponse | null) => void, songId: string): Promise<() => Promise<void>>;
/**
 * Get many SongDetails items from collection songDetails
 
  Read Operation Details: Public read. Anyone can view song metadata, including whether a submission has been approved for marketplace display.
  
 */
export declare function getManySongDetails(filter?: string): Promise<SongDetailsResponse[]>;
/**
 * Subscribe to changes in SongDetails collection at songDetails
 
  Read Operation Details: Public read. Anyone can view song metadata, including whether a submission has been approved for marketplace display.
  
 */
export declare function subscribeManySongDetails(callback: (data: SongDetailsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongDetails items from collection songDetails
 
  Read Operation Details: Public read. Anyone can view song metadata, including whether a submission has been approved for marketplace display.
  
 */
export declare function getAllSongDetails(filter?: string): Promise<SongDetailsResponse[]>;
/**
 * Subscribe to changes in SongDetails collection at songDetails
 
  Read Operation Details: Public read. Anyone can view song metadata, including whether a submission has been approved for marketplace display.
  
 */
export declare function subscribeAllSongDetails(callback: (data: SongDetailsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongDetails items in collection songDetails.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongDetails(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongDetails items in collection songDetails.
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
export declare function aggregateSongDetails(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Runs the "tokenPriceUsd" query on SongDetails.
 * Query Logic: @DeFiPlugin.getSwapQuote(@TokenPlugin.getTokenMintAddress($songId, get(/songs/$songId).name, get(/songs/$songId).symbol), @constants.USDC, 1000000)
 */
export declare function runTokenPriceUsdQueryForSongDetails(songId: string): Promise<string>;
/**
 * Runs the "tokenPriceSol" query on SongDetails.
 * Query Logic: @DeFiPlugin.getSwapQuote(@TokenPlugin.getTokenMintAddress($songId, get(/songs/$songId).name, get(/songs/$songId).symbol), @constants.SOL, 1000000)
 */
export declare function runTokenPriceSolQueryForSongDetails(songId: string): Promise<string>;
