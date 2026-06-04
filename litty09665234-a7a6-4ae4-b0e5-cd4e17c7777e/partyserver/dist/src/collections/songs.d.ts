import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Core song token collection. Each song is launched as a tradable SPL token via PumpFunPlugin with automatic bonding curve.
 */
export interface SongsRequest {
    name: string;
    symbol: string;
    uri: string;
    creator: AddressType;
    audiusStreamUrl?: string;
    audiusTrackId?: string;
    albumId?: string;
    slotNumber?: number | TimeOperation | IncrementOperation | TokenAmount;
    isPrivate?: boolean;
    graduated?: boolean;
    graduatedAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    teaserImageUrl?: string;
    graduationReserveBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    assetType?: string;
    mintStatus?: string;
    hasSplToken?: boolean;
    beamUpEnabled?: boolean;
    beamUpRequestCount?: number | IncrementOperation | TokenAmount;
    firstBeamerWallet?: string;
    firstBeamerEmail?: string;
    mintAddress?: string;
    pairCurrency?: string;
    paused?: boolean;
    hidden?: boolean;
    swapEligible?: boolean;
}
export interface SongsResponse {
    name: string;
    symbol: string;
    uri: string;
    creator: string;
    audiusStreamUrl?: string;
    audiusTrackId?: string;
    albumId?: string;
    slotNumber?: number;
    isPrivate?: boolean;
    graduated?: boolean;
    graduatedAt?: number;
    teaserImageUrl?: string;
    graduationReserveBps?: number;
    assetType?: string;
    mintStatus?: string;
    hasSplToken?: boolean;
    beamUpEnabled?: boolean;
    beamUpRequestCount?: number;
    firstBeamerWallet?: string;
    firstBeamerEmail?: string;
    mintAddress?: string;
    pairCurrency?: string;
    paused?: boolean;
    hidden?: boolean;
    swapEligible?: boolean;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a Songs operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongs(songId: string, data?: SongsRequest): DocumentOperation;
/**
 * Authenticated users can create songs. Creators cannot set swapEligible to true (admin-only). Admin, project vault, and operations wallet have full create access. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongs(songId: string, data?: SongsRequest): Promise<boolean>;
export type SongsRequestUpdate = Partial<SongsRequest>;
/**
 * Build a Songs update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSongs(songId: string, data: SongsRequestUpdate): DocumentOperation;
/**
 * Creator or admin can update. Creators cannot set swapEligible to true (admin-only). Admin, project vault, and operations wallet have full update access. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSongs(songId: string, data: SongsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view song metadata.
   (Get Single Item)
 */
export declare function getSongs(songId: string): Promise<SongsResponse | null>;
/**
 * Subscribes to changes in a single Songs document. (
  Read Operation Details: Public read. Anyone can view song metadata.
  )
 */
export declare function subscribeSongs(callback: (data: SongsResponse | null) => void, songId: string): Promise<() => Promise<void>>;
/**
 * Get many Songs items from collection songs
 
  Read Operation Details: Public read. Anyone can view song metadata.
  
 */
export declare function getManySongs(filter?: string): Promise<SongsResponse[]>;
/**
 * Subscribe to changes in Songs collection at songs
 
  Read Operation Details: Public read. Anyone can view song metadata.
  
 */
export declare function subscribeManySongs(callback: (data: SongsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Songs items from collection songs
 
  Read Operation Details: Public read. Anyone can view song metadata.
  
 */
export declare function getAllSongs(filter?: string): Promise<SongsResponse[]>;
/**
 * Subscribe to changes in Songs collection at songs
 
  Read Operation Details: Public read. Anyone can view song metadata.
  
 */
export declare function subscribeAllSongs(callback: (data: SongsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Songs items in collection songs.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongs(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Songs items in collection songs.
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
export declare function aggregateSongs(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Runs the "getTokenMintAddress" query on Songs.
 * Query Logic: @TokenPlugin.getTokenMintAddress($songId, @data.name, @data.symbol)
 */
export declare function runGetTokenMintAddressQueryForSongs(songId: string): Promise<string>;
/**
 * Runs the "getBondingCurveProgress" query on Songs.
 * Query Logic: @PumpFunPlugin.getBondingCurveProgress(@TokenPlugin.getTokenMintAddress($songId, @data.name, @data.symbol))
 */
export declare function runGetBondingCurveProgressQueryForSongs(songId: string): Promise<number>;
/**
 * Runs the "getCreatorFee" query on Songs.
 * Query Logic: @PumpFunPlugin.getCreatorFee(@TokenPlugin.getTokenMintAddress($songId, @data.name, @data.symbol))
 */
export declare function runGetCreatorFeeQueryForSongs(songId: string): Promise<number>;
/** Arguments accepted by the "getTokenBalance" query on Songs. */
interface SongsGetTokenBalanceArgs {
    walletAddress: string;
}
/**
 * Runs the "getTokenBalance" query on Songs.
 * Query Logic: @TokenPlugin.getBalance(@newData.walletAddress, @TokenPlugin.getTokenMintAddress($songId, @data.name, @data.symbol))
 */
export declare function runGetTokenBalanceQueryForSongs(songId: string, args: SongsGetTokenBalanceArgs): Promise<number>;
/**
 * Runs the "getSolPriceUsd" query on Songs.
 * Query Logic: @PriceFeedPlugin.getPriceFeed(@PriceFeedPlugin.SOL)
 */
export declare function runGetSolPriceUsdQueryForSongs(songId: string): Promise<number>;
/**
 * Buy or sell song tokens via Jupiter aggregator. Supports trading both on bonding curve and after graduation.
 */
export interface SongsSwapsRequest {
    mint: AddressType;
    amt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsSwapsResponse {
    mint: string;
    amt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsSwaps operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsSwaps(songId: string, swapId: string, data?: SongsSwapsRequest): DocumentOperation;
/**
 * Any user can swap when PLATFORM_PAUSED is false and the song's paused field is not true. Set mint to @constants.SOL to buy song tokens with SOL, or set mint to the song token mint address to sell tokens for SOL. amt is in the smallest unit of the input token (lamports for SOL). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsSwaps(songId: string, swapId: string, data?: SongsSwapsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getSongsSwaps(songId: string, swapId: string): Promise<SongsSwapsResponse | null>;
/**
 * Subscribes to changes in a single SongsSwaps document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeSongsSwaps(callback: (data: SongsSwapsResponse | null) => void, songId: string, swapId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsSwaps items from collection songs/${songId}/swaps
 
  Read Operation Details: Public read.
  
 */
export declare function getManySongsSwaps(songId: string, filter?: string): Promise<SongsSwapsResponse[]>;
/**
 * Subscribe to changes in SongsSwaps collection at songs/${songId}/swaps
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManySongsSwaps(callback: (data: SongsSwapsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsSwaps items from collection songs/${songId}/swaps
 
  Read Operation Details: Public read.
  
 */
export declare function getAllSongsSwaps(songId: string, filter?: string): Promise<SongsSwapsResponse[]>;
/**
 * Subscribe to changes in SongsSwaps collection at songs/${songId}/swaps
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllSongsSwaps(callback: (data: SongsSwapsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsSwaps items in collection songs/${songId}/swaps.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsSwaps(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsSwaps items in collection songs/${songId}/swaps.
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
export declare function aggregateSongsSwaps(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Buy song tokens directly on bonding curve with exact SOL input amount.
 */
export interface SongsBuysRequest {
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
    slip: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsBuysResponse {
    solAmt: number;
    slip: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsBuys operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsBuys(songId: string, buyId: string, data?: SongsBuysRequest): DocumentOperation;
/**
 * Any user can buy song tokens on bonding curve when PLATFORM_PAUSED is false and the song's paused field is not true. solAmt is in lamports (1 SOL = 1000000000 lamports). slip is slippage in basis points (500 = 5%). Works only while token is on bonding curve (before graduation). A 2% platform fee (PLATFORM_FEE_BPS / 10000) in SOL is automatically transferred from the buyer to PROJECT_VAULT_ADDRESS (OPERATIONS_WALLET / infra fee wallet) after each buy. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsBuys(songId: string, buyId: string, data?: SongsBuysRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getSongsBuys(songId: string, buyId: string): Promise<SongsBuysResponse | null>;
/**
 * Subscribes to changes in a single SongsBuys document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeSongsBuys(callback: (data: SongsBuysResponse | null) => void, songId: string, buyId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsBuys items from collection songs/${songId}/buys
 
  Read Operation Details: Public read.
  
 */
export declare function getManySongsBuys(songId: string, filter?: string): Promise<SongsBuysResponse[]>;
/**
 * Subscribe to changes in SongsBuys collection at songs/${songId}/buys
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManySongsBuys(callback: (data: SongsBuysResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsBuys items from collection songs/${songId}/buys
 
  Read Operation Details: Public read.
  
 */
export declare function getAllSongsBuys(songId: string, filter?: string): Promise<SongsBuysResponse[]>;
/**
 * Subscribe to changes in SongsBuys collection at songs/${songId}/buys
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllSongsBuys(callback: (data: SongsBuysResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsBuys items in collection songs/${songId}/buys.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsBuys(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsBuys items in collection songs/${songId}/buys.
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
export declare function aggregateSongsBuys(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Collect accumulated bonding curve creator fees for a song token.
 */
export interface SongsCollectFeesRequest {
}
export interface SongsCollectFeesResponse {
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsCollectFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsCollectFees(songId: string, feeId: string, data?: SongsCollectFeesRequest): DocumentOperation;
/**
 * Permissionless when PLATFORM_PAUSED is false and the song's paused field is not true. Derives creator from the onchain song document and sends accumulated SOL creator fees to the artist's wallet. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsCollectFees(songId: string, feeId: string, data?: SongsCollectFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getSongsCollectFees(songId: string, feeId: string): Promise<SongsCollectFeesResponse | null>;
/**
 * Subscribes to changes in a single SongsCollectFees document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeSongsCollectFees(callback: (data: SongsCollectFeesResponse | null) => void, songId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsCollectFees items from collection songs/${songId}/collectFees
 
  Read Operation Details: Public read.
  
 */
export declare function getManySongsCollectFees(songId: string, filter?: string): Promise<SongsCollectFeesResponse[]>;
/**
 * Subscribe to changes in SongsCollectFees collection at songs/${songId}/collectFees
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManySongsCollectFees(callback: (data: SongsCollectFeesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsCollectFees items from collection songs/${songId}/collectFees
 
  Read Operation Details: Public read.
  
 */
export declare function getAllSongsCollectFees(songId: string, filter?: string): Promise<SongsCollectFeesResponse[]>;
/**
 * Subscribe to changes in SongsCollectFees collection at songs/${songId}/collectFees
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllSongsCollectFees(callback: (data: SongsCollectFeesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsCollectFees items in collection songs/${songId}/collectFees.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsCollectFees(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsCollectFees items in collection songs/${songId}/collectFees.
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
export declare function aggregateSongsCollectFees(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Passthrough buyer airdrop transfer from the project vault to a recipient wallet for Shopify fulfillment workflows.
 */
export interface SongsAirdropsRequest {
    recipient: AddressType;
    amount: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsAirdropsResponse {
    recipient: string;
    amount: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsAirdrops operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsAirdrops(songId: string, airdropId: string, data?: SongsAirdropsRequest): DocumentOperation;
/**
 * ADMIN_ADDRESS or PROJECT_VAULT_ADDRESS can trigger a buyer airdrop payout for a song purchase. recipient is the destination wallet and amount is the song token amount in the token's smallest base units; the passthrough hook transfers the song-specific SPL token mint derived from the parent song document from PROJECT_VAULT_ADDRESS to the recipient without storing a permanent record. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsAirdrops(songId: string, airdropId: string, data?: SongsAirdropsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect buyer airdrop requests and outcomes.
   (Get Single Item)
 */
export declare function getSongsAirdrops(songId: string, airdropId: string): Promise<SongsAirdropsResponse | null>;
/**
 * Subscribes to changes in a single SongsAirdrops document. (
  Read Operation Details: Public read. Anyone can inspect buyer airdrop requests and outcomes.
  )
 */
export declare function subscribeSongsAirdrops(callback: (data: SongsAirdropsResponse | null) => void, songId: string, airdropId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsAirdrops items from collection songs/${songId}/airdrops
 
  Read Operation Details: Public read. Anyone can inspect buyer airdrop requests and outcomes.
  
 */
export declare function getManySongsAirdrops(songId: string, filter?: string): Promise<SongsAirdropsResponse[]>;
/**
 * Subscribe to changes in SongsAirdrops collection at songs/${songId}/airdrops
 
  Read Operation Details: Public read. Anyone can inspect buyer airdrop requests and outcomes.
  
 */
export declare function subscribeManySongsAirdrops(callback: (data: SongsAirdropsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsAirdrops items from collection songs/${songId}/airdrops
 
  Read Operation Details: Public read. Anyone can inspect buyer airdrop requests and outcomes.
  
 */
export declare function getAllSongsAirdrops(songId: string, filter?: string): Promise<SongsAirdropsResponse[]>;
/**
 * Subscribe to changes in SongsAirdrops collection at songs/${songId}/airdrops
 
  Read Operation Details: Public read. Anyone can inspect buyer airdrop requests and outcomes.
  
 */
export declare function subscribeAllSongsAirdrops(callback: (data: SongsAirdropsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsAirdrops items in collection songs/${songId}/airdrops.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsAirdrops(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsAirdrops items in collection songs/${songId}/airdrops.
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
export declare function aggregateSongsAirdrops(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Tracks which users have liked which songs. One like per user per song, with the document ID being the user's wallet address as a natural unique constraint.
 */
export interface SongsLikesRequest {
    likedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsLikesResponse {
    likedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SongsLikes operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsLikes(songId: string, userAddress: string, data?: SongsLikesRequest): DocumentOperation;
/**
 * Users can only create a like document where the $userAddress path param matches their own wallet address, ensuring one like per user per song. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsLikes(songId: string, userAddress: string, data?: SongsLikesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can see who liked a song.
   (Get Single Item)
 */
export declare function getSongsLikes(songId: string, userAddress: string): Promise<SongsLikesResponse | null>;
/**
 * Subscribes to changes in a single SongsLikes document. (
  Read Operation Details: Public read. Anyone can see who liked a song.
  )
 */
export declare function subscribeSongsLikes(callback: (data: SongsLikesResponse | null) => void, songId: string, userAddress: string): Promise<() => Promise<void>>;
/**
 * Get many SongsLikes items from collection songs/${songId}/likes
 
  Read Operation Details: Public read. Anyone can see who liked a song.
  
 */
export declare function getManySongsLikes(songId: string, filter?: string): Promise<SongsLikesResponse[]>;
/**
 * Subscribe to changes in SongsLikes collection at songs/${songId}/likes
 
  Read Operation Details: Public read. Anyone can see who liked a song.
  
 */
export declare function subscribeManySongsLikes(callback: (data: SongsLikesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsLikes items from collection songs/${songId}/likes
 
  Read Operation Details: Public read. Anyone can see who liked a song.
  
 */
export declare function getAllSongsLikes(songId: string, filter?: string): Promise<SongsLikesResponse[]>;
/**
 * Subscribe to changes in SongsLikes collection at songs/${songId}/likes
 
  Read Operation Details: Public read. Anyone can see who liked a song.
  
 */
export declare function subscribeAllSongsLikes(callback: (data: SongsLikesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsLikes items in collection songs/${songId}/likes.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsLikes(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsLikes items in collection songs/${songId}/likes.
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
export declare function aggregateSongsLikes(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 *
  Delete Operation Details: Users can remove their own likes (unlike).
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteSongsLikes(songId: string, userAddress: string): Promise<boolean>;
/**
 * Build a delete operation for SongsLikes for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteSongsLikes(songId: string, userAddress: string): DocumentOperation;
/**
 * Artist SOL payout triggered by webhook. Transfers 69% of pack price from OPERATIONS_WALLET to song creator.
 */
export interface SongsPayoutsRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsPayoutsResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsPayouts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsPayouts(songId: string, payoutId: string, data?: SongsPayoutsRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsPayouts(songId: string, payoutId: string, data?: SongsPayoutsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect artist payout records.
   (Get Single Item)
 */
export declare function getSongsPayouts(songId: string, payoutId: string): Promise<SongsPayoutsResponse | null>;
/**
 * Subscribes to changes in a single SongsPayouts document. (
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  )
 */
export declare function subscribeSongsPayouts(callback: (data: SongsPayoutsResponse | null) => void, songId: string, payoutId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsPayouts items from collection songs/${songId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function getManySongsPayouts(songId: string, filter?: string): Promise<SongsPayoutsResponse[]>;
/**
 * Subscribe to changes in SongsPayouts collection at songs/${songId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function subscribeManySongsPayouts(callback: (data: SongsPayoutsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsPayouts items from collection songs/${songId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function getAllSongsPayouts(songId: string, filter?: string): Promise<SongsPayoutsResponse[]>;
/**
 * Subscribe to changes in SongsPayouts collection at songs/${songId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function subscribeAllSongsPayouts(callback: (data: SongsPayoutsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsPayouts items in collection songs/${songId}/payouts.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsPayouts(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsPayouts items in collection songs/${songId}/payouts.
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
export declare function aggregateSongsPayouts(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Infrastructure fee 10% of pack price from OPERATIONS_WALLET to infrastructure wallet.
 */
export interface SongsInfraFeesRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsInfraFeesResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsInfraFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsInfraFees(songId: string, feeId: string, data?: SongsInfraFeesRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsInfraFees(songId: string, feeId: string, data?: SongsInfraFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
   (Get Single Item)
 */
export declare function getSongsInfraFees(songId: string, feeId: string): Promise<SongsInfraFeesResponse | null>;
/**
 * Subscribes to changes in a single SongsInfraFees document. (
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  )
 */
export declare function subscribeSongsInfraFees(callback: (data: SongsInfraFeesResponse | null) => void, songId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsInfraFees items from collection songs/${songId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function getManySongsInfraFees(songId: string, filter?: string): Promise<SongsInfraFeesResponse[]>;
/**
 * Subscribe to changes in SongsInfraFees collection at songs/${songId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function subscribeManySongsInfraFees(callback: (data: SongsInfraFeesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsInfraFees items from collection songs/${songId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function getAllSongsInfraFees(songId: string, filter?: string): Promise<SongsInfraFeesResponse[]>;
/**
 * Subscribe to changes in SongsInfraFees collection at songs/${songId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function subscribeAllSongsInfraFees(callback: (data: SongsInfraFeesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsInfraFees items in collection songs/${songId}/infraFees.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsInfraFees(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsInfraFees items in collection songs/${songId}/infraFees.
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
export declare function aggregateSongsInfraFees(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Treasury fee 1% of pack price from OPERATIONS_WALLET to treasury wallet.
 */
export interface SongsTreasuryFeesRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsTreasuryFeesResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsTreasuryFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsTreasuryFees(songId: string, feeId: string, data?: SongsTreasuryFeesRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsTreasuryFees(songId: string, feeId: string, data?: SongsTreasuryFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
   (Get Single Item)
 */
export declare function getSongsTreasuryFees(songId: string, feeId: string): Promise<SongsTreasuryFeesResponse | null>;
/**
 * Subscribes to changes in a single SongsTreasuryFees document. (
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  )
 */
export declare function subscribeSongsTreasuryFees(callback: (data: SongsTreasuryFeesResponse | null) => void, songId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsTreasuryFees items from collection songs/${songId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function getManySongsTreasuryFees(songId: string, filter?: string): Promise<SongsTreasuryFeesResponse[]>;
/**
 * Subscribe to changes in SongsTreasuryFees collection at songs/${songId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function subscribeManySongsTreasuryFees(callback: (data: SongsTreasuryFeesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsTreasuryFees items from collection songs/${songId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function getAllSongsTreasuryFees(songId: string, filter?: string): Promise<SongsTreasuryFeesResponse[]>;
/**
 * Subscribe to changes in SongsTreasuryFees collection at songs/${songId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function subscribeAllSongsTreasuryFees(callback: (data: SongsTreasuryFeesResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsTreasuryFees items in collection songs/${songId}/treasuryFees.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsTreasuryFees(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsTreasuryFees items in collection songs/${songId}/treasuryFees.
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
export declare function aggregateSongsTreasuryFees(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Buy song tokens with USDC via Jupiter aggregator, with USDC platform fee.
 */
export interface SongsUsdcBuysRequest {
    usdcAmt: number | TimeOperation | IncrementOperation | TokenAmount;
    slip: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsUsdcBuysResponse {
    usdcAmt: number;
    slip: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsUsdcBuys operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsUsdcBuys(songId: string, buyId: string, data?: SongsUsdcBuysRequest): DocumentOperation;
/**
 * Any user can buy song tokens with USDC when PLATFORM_PAUSED is false and the song's paused field is not true. usdcAmt is in micro-USDC (1 USDC = 1000000). slip is slippage in basis points (500 = 5%). Uses DeFiPlugin.swap to route USDC through Jupiter for token purchase. A 2% platform fee (PLATFORM_FEE_BPS / 10000) in USDC is automatically transferred from the buyer to PROJECT_VAULT_ADDRESS. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsUsdcBuys(songId: string, buyId: string, data?: SongsUsdcBuysRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getSongsUsdcBuys(songId: string, buyId: string): Promise<SongsUsdcBuysResponse | null>;
/**
 * Subscribes to changes in a single SongsUsdcBuys document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeSongsUsdcBuys(callback: (data: SongsUsdcBuysResponse | null) => void, songId: string, buyId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsUsdcBuys items from collection songs/${songId}/usdcBuys
 
  Read Operation Details: Public read.
  
 */
export declare function getManySongsUsdcBuys(songId: string, filter?: string): Promise<SongsUsdcBuysResponse[]>;
/**
 * Subscribe to changes in SongsUsdcBuys collection at songs/${songId}/usdcBuys
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManySongsUsdcBuys(callback: (data: SongsUsdcBuysResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsUsdcBuys items from collection songs/${songId}/usdcBuys
 
  Read Operation Details: Public read.
  
 */
export declare function getAllSongsUsdcBuys(songId: string, filter?: string): Promise<SongsUsdcBuysResponse[]>;
/**
 * Subscribe to changes in SongsUsdcBuys collection at songs/${songId}/usdcBuys
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllSongsUsdcBuys(callback: (data: SongsUsdcBuysResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsUsdcBuys items in collection songs/${songId}/usdcBuys.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsUsdcBuys(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsUsdcBuys items in collection songs/${songId}/usdcBuys.
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
export declare function aggregateSongsUsdcBuys(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Sell song tokens for USDC via Jupiter aggregator, with USDC platform fee.
 */
export interface SongsUsdcSellsRequest {
    tokenAmt: number | TimeOperation | IncrementOperation | TokenAmount;
    slip: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongsUsdcSellsResponse {
    tokenAmt: number;
    slip: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a SongsUsdcSells operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongsUsdcSells(songId: string, sellId: string, data?: SongsUsdcSellsRequest): DocumentOperation;
/**
 * Any user can sell song tokens for USDC when PLATFORM_PAUSED is false and the song's paused field is not true. tokenAmt is the number of song tokens to sell (in base units with 6 decimals). slip is slippage in basis points (500 = 5%). Uses DeFiPlugin.swap to route tokens through Jupiter for USDC. A 2% platform fee (PLATFORM_FEE_BPS / 10000) in USDC is automatically transferred from the seller to PROJECT_VAULT_ADDRESS. The fee is calculated on the expected USD value of the tokens sold, determined by @DeFiPlugin.getSwapQuote at execution time, using @MathPlugin.mulDivFloor for overflow-safe precision. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongsUsdcSells(songId: string, sellId: string, data?: SongsUsdcSellsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getSongsUsdcSells(songId: string, sellId: string): Promise<SongsUsdcSellsResponse | null>;
/**
 * Subscribes to changes in a single SongsUsdcSells document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeSongsUsdcSells(callback: (data: SongsUsdcSellsResponse | null) => void, songId: string, sellId: string): Promise<() => Promise<void>>;
/**
 * Get many SongsUsdcSells items from collection songs/${songId}/usdcSells
 
  Read Operation Details: Public read.
  
 */
export declare function getManySongsUsdcSells(songId: string, filter?: string): Promise<SongsUsdcSellsResponse[]>;
/**
 * Subscribe to changes in SongsUsdcSells collection at songs/${songId}/usdcSells
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManySongsUsdcSells(callback: (data: SongsUsdcSellsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongsUsdcSells items from collection songs/${songId}/usdcSells
 
  Read Operation Details: Public read.
  
 */
export declare function getAllSongsUsdcSells(songId: string, filter?: string): Promise<SongsUsdcSellsResponse[]>;
/**
 * Subscribe to changes in SongsUsdcSells collection at songs/${songId}/usdcSells
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllSongsUsdcSells(callback: (data: SongsUsdcSellsResponse[]) => void, songId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count SongsUsdcSells items in collection songs/${songId}/usdcSells.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countSongsUsdcSells(songId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on SongsUsdcSells items in collection songs/${songId}/usdcSells.
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
export declare function aggregateSongsUsdcSells(songId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
export {};
