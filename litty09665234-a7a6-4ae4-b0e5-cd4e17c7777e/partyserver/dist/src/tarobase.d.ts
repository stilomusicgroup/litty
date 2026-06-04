import type { GetManyResult } from '@pooflabs/server';
import { PublicKey } from '@solana/web3.js';
/**
 * Time utility for server-time values
 *
 * Use this when you want to store the current server time in a numeric field
 *
 * Example:
 * // For a schema with { createdAt: "UInt" }
 * await setPost("123", {
 *   title: "My Post",
 *   createdAt: Time.Now  // Will be stored as the server's current timestamp
 * });
 *
 * Note: Time.Now requires a UInt field. Int (signed) is rejected both offchain
 * and onchain (utils.rs InvalidTypeForTimestamp).
 */
export interface TimeOperation {
    operation: string;
    value: string;
}
/**
 * Increment utility for incrementing/decrementing numeric fields
 *
 * Use this when you want to increment or decrement a numeric field by a specific amount
 *
 * Example:
 * // For a schema with { viewCount: "UInt" } or { balance: "Int" }
 * await updatePost("123", {
 *   viewCount: Increment.by(1)  // Increments viewCount by 1
 * });
 * await updateAccount("456", {
 *   balance: Increment.by(-50)  // Decrements balance by 50
 * });
 */
export interface IncrementOperation {
    operation: string;
    value: number;
}
export type TokenName = 'USDC' | 'SOL' | 'pSOL' | 'other';
export interface TokenAmount {
    type: 'token';
    name: TokenName;
    amount: number;
}
/**
 * AddressType represents a Solana public key for use in request data.
 */
export interface AddressType {
    type: 'address';
    publicKey: PublicKey | string;
}
export declare const Token: {
    /**
     * Creates a TokenAmount object representing a specific amount of a token.
     * @param name The name of the token (e.g., 'USDC', 'SOL', 'pSOL').
     * @param amount The user-friendly amount (e.g., 10.5 for 10.5 USDC).
     */
    amount: (name: TokenName, amount: number) => TokenAmount;
    /**
     * Converts a TokenAmount object back to its integer representation based on decimals.
     * Useful if you need the raw integer value on the client side.
     */
    convert: (amount: TokenAmount) => number;
};
export declare const Time: {
    /**
     * Represents the server's current time. Use this value for 'UInt' fields only
     * in request data where you want the server to insert the timestamp.
     * (Onchain and offchain both require UInt — Int is rejected with InvalidTypeForTimestamp.)
     */
    Now: TimeOperation;
};
export declare const Increment: {
    /**
     * Creates an increment/decrement operation for numeric fields.
     * Use positive values to increment, negative values to decrement.
     * @param value The amount to increment (positive) or decrement (negative)
     *
     * Example:
     * // Increment a counter by 1
     * await updatePost("123", { viewCount: Increment.by(1) });
     *
     * // Decrement a balance by 50
     * await updateAccount("456", { balance: Increment.by(-50) });
     */
    by: (value: number) => IncrementOperation;
};
export declare const Address: {
    /**
     * Creates an AddressType object from a PublicKey instance or a base58 string.
     * Validates the input and throws an error if invalid.
     * Special case: 'solana' is allowed as a reserved string representing native SOL.
     * @param key A PublicKey instance, a base58 encoded public key string, or 'solana' for native SOL.
     */
    publicKey: (key: PublicKey | string) => AddressType;
};
/**
 * Common metadata fields added by TaroBase to document responses.
 */
export interface TarobaseMetadata {
    id: string;
    tarobase_created_at: number;
}
/**
 * Represents a file stored in TaroBase Storage.
 */
export interface FileItem {
    path: string;
    url: string;
}
/**
 * Represents a document operation for use with setMany.
 * Used by build functions to create properly typed operations.
 */
export interface DocumentOperation {
    path: string;
    document: any;
}
/**
 * Execute multiple document operations in a single batch.
 * @param operations Array of DocumentOperation objects created by build functions
 * @returns Promise resolving to the result of the batch operation
 */
export declare function setMany(operations: DocumentOperation[]): Promise<any>;
/**
 * Batch read multiple documents by their full paths in a single request.
 * Much faster than multiple individual get() calls — single network round trip.
 * Returns results in the same order as input paths. Max 30 paths per request.
 * Each result has { path, data, error? } — one failure doesn't break the batch.
 *
 * ALWAYS use this instead of multiple get() calls when reading 2+ documents by path.
 *
 * @param paths Array of full document paths (e.g., ["players/abc", "settings/abc"])
 * @example
 * const [profile, settings, stats] = await getMany([
 *   "profiles/" + walletAddress,
 *   "settings/" + walletAddress,
 *   "stats/" + walletAddress,
 * ]);
 * if (profile.data) { // use profile data }
 */
export declare function getMany(paths: string[]): Promise<GetManyResult[]>;
/**
 * Safely format an error for logging (avoids [object Object] in logs)
 * Handles circular references, empty messages, and non-Error objects
 * Always includes the full error object for comprehensive debugging
 */
export declare function formatError(error: unknown): string;
/**
 * Handles AdminFiles files (Get Single File based on its ID, null if not found)
 */
export declare function getAdminFiles(fileId: string): Promise<FileItem | null>;
/**
 * Handles AdminFiles files (Upload/Replace a File and persist it keyed by its ID) To get the file URL use the getAdminFiles function right after this one.
 * @returns A boolean indicating whether the upload succeeded (true) or failed (false). Always check this value to confirm the upload worked.
 */
export declare function uploadAdminFiles(fileId: string, file: File): Promise<boolean>;
/**
 * Handles AdminFiles files (Delete File based on its ID)
 * @returns A boolean indicating whether the delete succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteAdminFiles(fileId: string): Promise<boolean>;
/**
 * Handles AppFiles files (Get Single File based on its ID, null if not found)
 */
export declare function getAppFiles(fileId: string): Promise<FileItem | null>;
/**
 * Handles AppFiles files (Upload/Replace a File and persist it keyed by its ID) To get the file URL use the getAppFiles function right after this one.
 * @returns A boolean indicating whether the upload succeeded (true) or failed (false). Always check this value to confirm the upload worked.
 */
export declare function uploadAppFiles(fileId: string, file: File): Promise<boolean>;
/**
 * Handles AppFiles files (Delete File based on its ID)
 * @returns A boolean indicating whether the delete succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteAppFiles(fileId: string): Promise<boolean>;
export interface CommonQueriesRequest {
}
export interface CommonQueriesResponse {
    id: string;
    tarobase_created_at: number;
}
/**
 *
  Read Operation Details: Anyone can use these queries: (1) Balance queries - check SOL, USDC, or any SPL token balance for any wallet address. (2) Jupiter swap quotes - get expected output amounts for token swaps via Jupiter aggregator. (3) Meteora swap quotes - get expected output amounts for Meteora dynamic bonding curve pools.
   (Get Single Item)
 */
export declare function getCommonQueries(queryId: string): Promise<CommonQueriesResponse | null>;
/**
 * Subscribes to changes in a single CommonQueries document. (
  Read Operation Details: Anyone can use these queries: (1) Balance queries - check SOL, USDC, or any SPL token balance for any wallet address. (2) Jupiter swap quotes - get expected output amounts for token swaps via Jupiter aggregator. (3) Meteora swap quotes - get expected output amounts for Meteora dynamic bonding curve pools.
  )
 */
export declare function subscribeCommonQueries(callback: (data: CommonQueriesResponse | null) => void, queryId: string): Promise<() => Promise<void>>;
/**
 * Get many CommonQueries items from collection commonQueries
 
  Read Operation Details: Anyone can use these queries: (1) Balance queries - check SOL, USDC, or any SPL token balance for any wallet address. (2) Jupiter swap quotes - get expected output amounts for token swaps via Jupiter aggregator. (3) Meteora swap quotes - get expected output amounts for Meteora dynamic bonding curve pools.
  
 */
export declare function getManyCommonQueries(filter?: string): Promise<CommonQueriesResponse[]>;
/**
 * Subscribe to changes in CommonQueries collection at commonQueries
 
  Read Operation Details: Anyone can use these queries: (1) Balance queries - check SOL, USDC, or any SPL token balance for any wallet address. (2) Jupiter swap quotes - get expected output amounts for token swaps via Jupiter aggregator. (3) Meteora swap quotes - get expected output amounts for Meteora dynamic bonding curve pools.
  
 */
export declare function subscribeManyCommonQueries(callback: (data: CommonQueriesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all CommonQueries items from collection commonQueries
 
  Read Operation Details: Anyone can use these queries: (1) Balance queries - check SOL, USDC, or any SPL token balance for any wallet address. (2) Jupiter swap quotes - get expected output amounts for token swaps via Jupiter aggregator. (3) Meteora swap quotes - get expected output amounts for Meteora dynamic bonding curve pools.
  
 */
export declare function getAllCommonQueries(filter?: string): Promise<CommonQueriesResponse[]>;
/**
 * Subscribe to changes in CommonQueries collection at commonQueries
 
  Read Operation Details: Anyone can use these queries: (1) Balance queries - check SOL, USDC, or any SPL token balance for any wallet address. (2) Jupiter swap quotes - get expected output amounts for token swaps via Jupiter aggregator. (3) Meteora swap quotes - get expected output amounts for Meteora dynamic bonding curve pools.
  
 */
export declare function subscribeAllCommonQueries(callback: (data: CommonQueriesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/** Arguments accepted by the "solBalance" query on CommonQueries. */
interface CommonQueriesSolBalanceArgs {
    walletAddress: string;
}
/**
 * Runs the "solBalance" query on CommonQueries.
 * Description: Get SOL balance for a wallet address in lamports (1 SOL = 1,000,000,000 lamports). Pass walletAddress as parameter.
 * Query Logic: @TokenPlugin.getBalance(@newData.walletAddress, @constants.SOL)
 */
export declare function runSolBalanceQueryForCommonQueries(queryId: string, args: CommonQueriesSolBalanceArgs): Promise<number>;
/** Arguments accepted by the "usdcBalance" query on CommonQueries. */
interface CommonQueriesUsdcBalanceArgs {
    walletAddress: string;
}
/**
 * Runs the "usdcBalance" query on CommonQueries.
 * Description: Get USDC balance for a wallet address in base units (1 USDC = 1,000,000 base units with 6 decimals). Pass walletAddress as parameter.
 * Query Logic: @TokenPlugin.getBalance(@newData.walletAddress, @constants.USDC)
 */
export declare function runUsdcBalanceQueryForCommonQueries(queryId: string, args: CommonQueriesUsdcBalanceArgs): Promise<number>;
/** Arguments accepted by the "tokenBalance" query on CommonQueries. */
interface CommonQueriesTokenBalanceArgs {
    walletAddress: string;
    tokenMint: string;
}
/**
 * Runs the "tokenBalance" query on CommonQueries.
 * Description: Get balance for any SPL token mint for a wallet address. Pass walletAddress and tokenMint as parameters. Returns balance in the token's smallest units based on its decimals.
 * Query Logic: @TokenPlugin.getBalance(@newData.walletAddress, @newData.tokenMint)
 */
export declare function runTokenBalanceQueryForCommonQueries(queryId: string, args: CommonQueriesTokenBalanceArgs): Promise<number>;
/** Arguments accepted by the "jupiterSwapQuote" query on CommonQueries. */
interface CommonQueriesJupiterSwapQuoteArgs {
    inputMint: string;
    outputMint: string;
    amount: string;
}
/**
 * Runs the "jupiterSwapQuote" query on CommonQueries.
 * Description: Get a Jupiter swap quote for exchanging tokens. Pass inputMint (token to sell, use @constants.SOL for native SOL), outputMint (token to buy), and amount (in smallest units like lamports). Returns the expected output amount.
 * Query Logic: @DeFiPlugin.getSwapQuote(@newData.inputMint, @newData.outputMint, @newData.amount)
 */
export declare function runJupiterSwapQuoteQueryForCommonQueries(queryId: string, args: CommonQueriesJupiterSwapQuoteArgs): Promise<number>;
/** Arguments accepted by the "meteoraSwapQuote" query on CommonQueries. */
interface CommonQueriesMeteoraSwapQuoteArgs {
    tokenMintAddress: string;
    tokenToSwapInMintAddress: string;
    tokenAmount: string;
}
/**
 * Runs the "meteoraSwapQuote" query on CommonQueries.
 * Description: Get a Meteora dynamic bonding curve swap quote. Pass tokenMintAddress (the pool's base token), tokenToSwapInMintAddress (token to swap in, use @constants.SOL for native SOL), and tokenAmount (in smallest units). Returns the expected output amount.
 * Query Logic: @DeFiPlugin.getMeteoraSwapQuote(@newData.tokenMintAddress, @newData.tokenToSwapInMintAddress, @newData.tokenAmount)
 */
export declare function runMeteoraSwapQuoteQueryForCommonQueries(queryId: string, args: CommonQueriesMeteoraSwapQuoteArgs): Promise<number>;
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
 * Runs the "tokenPriceUsd" query on SongDetails.
 * Query Logic: @DeFiPlugin.getSwapQuote(@TokenPlugin.getTokenMintAddress($songId, get(/songs/$songId).name, get(/songs/$songId).symbol), @constants.USDC, 1000000)
 */
export declare function runTokenPriceUsdQueryForSongDetails(songId: string): Promise<string>;
/**
 * Runs the "tokenPriceSol" query on SongDetails.
 * Query Logic: @DeFiPlugin.getSwapQuote(@TokenPlugin.getTokenMintAddress($songId, get(/songs/$songId).name, get(/songs/$songId).symbol), @constants.SOL, 1000000)
 */
export declare function runTokenPriceSolQueryForSongDetails(songId: string): Promise<string>;
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
export interface ArtistsRequest {
    name: string;
    bio?: string;
    profileImage?: string;
    walletAddress: AddressType;
    isVerified: boolean;
    creatorWallet?: AddressType;
    bannerImage?: string;
}
export interface ArtistsResponse {
    name: string;
    bio?: string;
    profileImage?: string;
    walletAddress: string;
    isVerified: boolean;
    creatorWallet?: string;
    bannerImage?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Artists operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildArtists(artistAddress: string, data: ArtistsRequest): DocumentOperation;
/**
 * Users can only create their own artist profile. The $artistAddress path param must equal the caller's wallet, and walletAddress field must match. isVerified must be set (defaults to false on frontend). creatorWallet is NOT set at creation - it is populated later by the backend. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setArtists(artistAddress: string, data: ArtistsRequest): Promise<boolean>;
export type ArtistsRequestUpdate = Partial<ArtistsRequest>;
/**
 * Build a Artists update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateArtists(artistAddress: string, data: ArtistsRequestUpdate): DocumentOperation;
/**
 * The artist (matching $artistAddress) can update their own profile fields. ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can also update artist profiles, primarily for toggling isVerified status and for the backend to populate creatorWallet (the Privy-created embedded Solana wallet pubkey). (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateArtists(artistAddress: string, data: ArtistsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view artist profiles.
   (Get Single Item)
 */
export declare function getArtists(artistAddress: string): Promise<ArtistsResponse | null>;
/**
 * Subscribes to changes in a single Artists document. (
  Read Operation Details: Public read. Anyone can view artist profiles.
  )
 */
export declare function subscribeArtists(callback: (data: ArtistsResponse | null) => void, artistAddress: string): Promise<() => Promise<void>>;
/**
 * Get many Artists items from collection artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function getManyArtists(filter?: string): Promise<ArtistsResponse[]>;
/**
 * Subscribe to changes in Artists collection at artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function subscribeManyArtists(callback: (data: ArtistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Artists items from collection artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function getAllArtists(filter?: string): Promise<ArtistsResponse[]>;
/**
 * Subscribe to changes in Artists collection at artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function subscribeAllArtists(callback: (data: ArtistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface PurchasesRequest {
    email: string;
    orderId: string;
    songId?: string;
    walletAddress?: string;
    tokenAmount?: number | TimeOperation | IncrementOperation | TokenAmount;
    status: string;
    shopifyPayload?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    nftCount?: number | TimeOperation | IncrementOperation | TokenAmount;
    nftTxHashes?: string;
    artistPayout?: number | TimeOperation | IncrementOperation | TokenAmount;
    platformFee?: number | TimeOperation | IncrementOperation | TokenAmount;
    receiptData?: string;
    packAmountUsd?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PurchasesResponse {
    email: string;
    orderId: string;
    songId?: string;
    walletAddress?: string;
    tokenAmount?: number;
    status: string;
    shopifyPayload?: string;
    createdAt: number;
    nftCount?: number;
    nftTxHashes?: string;
    artistPayout?: number;
    platformFee?: number;
    receiptData?: string;
    packAmountUsd?: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Purchases operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPurchases(purchaseId: string, data: PurchasesRequest): DocumentOperation;
/**
 * Only the backend (PROJECT_VAULT_ADDRESS) can create purchase records when Shopify webhooks are received. email and orderId are immutable after creation. status should be 'pending', 'completed', or 'failed'. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPurchases(purchaseId: string, data: PurchasesRequest): Promise<boolean>;
export type PurchasesRequestUpdate = Partial<PurchasesRequest>;
/**
 * Build a Purchases update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePurchases(purchaseId: string, data: PurchasesRequestUpdate): DocumentOperation;
/**
 * Only the backend can update purchase records, typically to change status from 'pending' to 'completed' or 'failed' and to set walletAddress and tokenAmount after airdrop. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePurchases(purchaseId: string, data: PurchasesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Only admin and backend vault can read purchase records for auditing and backend processing.
   (Get Single Item)
 */
export declare function getPurchases(purchaseId: string): Promise<PurchasesResponse | null>;
/**
 * Subscribes to changes in a single Purchases document. (
  Read Operation Details: Only admin and backend vault can read purchase records for auditing and backend processing.
  )
 */
export declare function subscribePurchases(callback: (data: PurchasesResponse | null) => void, purchaseId: string): Promise<() => Promise<void>>;
/**
 * Get many Purchases items from collection purchases
 
  Read Operation Details: Only admin and backend vault can read purchase records for auditing and backend processing.
  
 */
export declare function getManyPurchases(filter?: string): Promise<PurchasesResponse[]>;
/**
 * Subscribe to changes in Purchases collection at purchases
 
  Read Operation Details: Only admin and backend vault can read purchase records for auditing and backend processing.
  
 */
export declare function subscribeManyPurchases(callback: (data: PurchasesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Purchases items from collection purchases
 
  Read Operation Details: Only admin and backend vault can read purchase records for auditing and backend processing.
  
 */
export declare function getAllPurchases(filter?: string): Promise<PurchasesResponse[]>;
/**
 * Subscribe to changes in Purchases collection at purchases
 
  Read Operation Details: Only admin and backend vault can read purchase records for auditing and backend processing.
  
 */
export declare function subscribeAllPurchases(callback: (data: PurchasesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface UsersRequest {
    displayName?: string;
    email?: string;
    walletAddress: AddressType;
    profileImage?: string;
    username?: string;
    twitter?: string;
    instagram?: string;
    spotify?: string;
    tiktok?: string;
    youtube?: string;
    twitch?: string;
    kick?: string;
    soundcloud?: string;
    facebook?: string;
    linkedin?: string;
    telegram?: string;
    website?: string;
}
export interface UsersResponse {
    displayName?: string;
    email?: string;
    walletAddress: string;
    profileImage?: string;
    username?: string;
    twitter?: string;
    instagram?: string;
    spotify?: string;
    tiktok?: string;
    youtube?: string;
    twitch?: string;
    kick?: string;
    soundcloud?: string;
    facebook?: string;
    linkedin?: string;
    telegram?: string;
    website?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Users operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUsers(userAddress: string, data?: UsersRequest): DocumentOperation;
/**
 * Users can create their own profile when $userAddress and walletAddress match their wallet. The backend (PROJECT_VAULT_ADDRESS) and ADMIN_ADDRESS can also create user records for new card-purchase wallets or administrative purposes. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUsers(userAddress: string, data?: UsersRequest): Promise<boolean>;
export type UsersRequestUpdate = Partial<UsersRequest>;
/**
 * Build a Users update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateUsers(userAddress: string, data: UsersRequestUpdate): DocumentOperation;
/**
 * Users can update their own profile. PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can also update user records. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateUsers(userAddress: string, data: UsersRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view user profiles.
   (Get Single Item)
 */
export declare function getUsers(userAddress: string): Promise<UsersResponse | null>;
/**
 * Subscribes to changes in a single Users document. (
  Read Operation Details: Public read. Anyone can view user profiles.
  )
 */
export declare function subscribeUsers(callback: (data: UsersResponse | null) => void, userAddress: string): Promise<() => Promise<void>>;
/**
 * Get many Users items from collection users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function getManyUsers(filter?: string): Promise<UsersResponse[]>;
/**
 * Subscribe to changes in Users collection at users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function subscribeManyUsers(callback: (data: UsersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Users items from collection users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function getAllUsers(filter?: string): Promise<UsersResponse[]>;
/**
 * Subscribe to changes in Users collection at users
 
  Read Operation Details: Public read. Anyone can view user profiles.
  
 */
export declare function subscribeAllUsers(callback: (data: UsersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface ShopifyProductsRequest {
    shopifyProductId: string;
    songId: string;
    shopifyVariantId?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ShopifyProductsResponse {
    shopifyProductId: string;
    songId: string;
    shopifyVariantId?: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ShopifyProducts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildShopifyProducts(productId: string, data: ShopifyProductsRequest): DocumentOperation;
/**
 * Any authenticated wallet can create a mapping document. The document ID is the full Shopify product identifier or another app-chosen mapping key, and createdAt must be provided as a Unix timestamp in seconds. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setShopifyProducts(productId: string, data: ShopifyProductsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
   (Get Single Item)
 */
export declare function getShopifyProducts(productId: string): Promise<ShopifyProductsResponse | null>;
/**
 * Subscribes to changes in a single ShopifyProducts document. (
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  )
 */
export declare function subscribeShopifyProducts(callback: (data: ShopifyProductsResponse | null) => void, productId: string): Promise<() => Promise<void>>;
/**
 * Get many ShopifyProducts items from collection shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function getManyShopifyProducts(filter?: string): Promise<ShopifyProductsResponse[]>;
/**
 * Subscribe to changes in ShopifyProducts collection at shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function subscribeManyShopifyProducts(callback: (data: ShopifyProductsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ShopifyProducts items from collection shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function getAllShopifyProducts(filter?: string): Promise<ShopifyProductsResponse[]>;
/**
 * Subscribe to changes in ShopifyProducts collection at shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function subscribeAllShopifyProducts(callback: (data: ShopifyProductsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
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
export interface EditionsRequest {
    title: string;
    artist: string;
    artistAddress: AddressType;
    description?: string;
    coverImage?: string;
    audioUrl?: string;
    editionSize: number | TimeOperation | IncrementOperation | TokenAmount;
    remaining: number | TimeOperation | IncrementOperation | TokenAmount;
    priceSol: number | TimeOperation | IncrementOperation | TokenAmount;
    mintAddress?: string;
    editionTokenName: string;
    editionTokenSymbol: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface EditionsResponse {
    title: string;
    artist: string;
    artistAddress: string;
    description?: string;
    coverImage?: string;
    audioUrl?: string;
    editionSize: number;
    remaining: number;
    priceSol: number;
    mintAddress?: string;
    editionTokenName: string;
    editionTokenSymbol: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Editions operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditions(editionId: string, data: EditionsRequest): DocumentOperation;
/**
 * Only the artist creating the collectible can create the edition, and artistAddress must equal the caller wallet. editionSize, remaining, and priceSol are required UInt values; priceSol is stored in lamports and remaining should start equal to editionSize when created. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditions(editionId: string, data: EditionsRequest): Promise<boolean>;
export type EditionsRequestUpdate = Partial<EditionsRequest>;
/**
 * Build a Editions update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateEditions(editionId: string, data: EditionsRequestUpdate): DocumentOperation;
/**
 * Only the stored artistAddress can update an edition, and updates are allowed only while remaining is greater than 0 so sold-out editions become immutable. Immutable fields marked with ! such as artistAddress, editionSize, remaining, and createdAt cannot be changed after creation, so mutable edits should be limited to metadata fields like description, images, audioUrl, mintAddress, and token naming fields before sellout. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateEditions(editionId: string, data: EditionsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
   (Get Single Item)
 */
export declare function getEditions(editionId: string): Promise<EditionsResponse | null>;
/**
 * Subscribes to changes in a single Editions document. (
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  )
 */
export declare function subscribeEditions(callback: (data: EditionsResponse | null) => void, editionId: string): Promise<() => Promise<void>>;
/**
 * Get many Editions items from collection editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function getManyEditions(filter?: string): Promise<EditionsResponse[]>;
/**
 * Subscribe to changes in Editions collection at editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function subscribeManyEditions(callback: (data: EditionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Editions items from collection editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function getAllEditions(filter?: string): Promise<EditionsResponse[]>;
/**
 * Subscribe to changes in Editions collection at editions
 
  Read Operation Details: Anyone can read edition records to browse collectible releases, pricing, metadata, and remaining inventory. The document is offchain and acts as the control record for the collectible release while the blockchain operations happen in sub-collections.
  
 */
export declare function subscribeAllEditions(callback: (data: EditionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Runs the "getEditionStatus" query on Editions.
 * Query Logic: (@data.remaining > 0 && 'available') || (@data.remaining == 0 && 'sold_out')
 */
export declare function runGetEditionStatusQueryForEditions(editionId: string): Promise<string>;
export interface EditionsMintNFTRequest {
    buyerAddress: AddressType;
    metadataUri: string;
}
export interface EditionsMintNFTResponse {
    buyerAddress: string;
    metadataUri: string;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a EditionsMintNFT operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsMintNFT(editionId: string, mintId: string, data?: EditionsMintNFTRequest): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) can trigger the NFT mint after validating payment. buyerAddress is the destination wallet and metadataUri must be a valid Arweave or IPFS metadata JSON URI for the Metaplex NFT. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsMintNFT(editionId: string, mintId: string, data?: EditionsMintNFTRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
   (Get Single Item)
 */
export declare function getEditionsMintNFT(editionId: string, mintId: string): Promise<EditionsMintNFTResponse | null>;
/**
 * Subscribes to changes in a single EditionsMintNFT document. (
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  )
 */
export declare function subscribeEditionsMintNFT(callback: (data: EditionsMintNFTResponse | null) => void, editionId: string, mintId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsMintNFT items from collection editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function getManyEditionsMintNFT(editionId: string, filter?: string): Promise<EditionsMintNFTResponse[]>;
/**
 * Subscribe to changes in EditionsMintNFT collection at editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function subscribeManyEditionsMintNFT(callback: (data: EditionsMintNFTResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsMintNFT items from collection editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function getAllEditionsMintNFT(editionId: string, filter?: string): Promise<EditionsMintNFTResponse[]>;
/**
 * Subscribe to changes in EditionsMintNFT collection at editions/${editionId}/mintNFT
 
  Read Operation Details: Anyone can read these passthrough mint requests because onchain collections are publicly readable.
  
 */
export declare function subscribeAllEditionsMintNFT(callback: (data: EditionsMintNFTResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
export interface EditionsTransferTokenRequest {
    buyerAddress: AddressType;
    amount: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface EditionsTransferTokenResponse {
    buyerAddress: string;
    amount: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a EditionsTransferToken operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsTransferToken(editionId: string, transferId: string, data?: EditionsTransferTokenRequest): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) can trigger the passthrough token transfer after validating a purchase. This prevents unauthorized transfers of edition tokens from the artist's wallet. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsTransferToken(editionId: string, transferId: string, data?: EditionsTransferTokenRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
   (Get Single Item)
 */
export declare function getEditionsTransferToken(editionId: string, transferId: string): Promise<EditionsTransferTokenResponse | null>;
/**
 * Subscribes to changes in a single EditionsTransferToken document. (
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  )
 */
export declare function subscribeEditionsTransferToken(callback: (data: EditionsTransferTokenResponse | null) => void, editionId: string, transferId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsTransferToken items from collection editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function getManyEditionsTransferToken(editionId: string, filter?: string): Promise<EditionsTransferTokenResponse[]>;
/**
 * Subscribe to changes in EditionsTransferToken collection at editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function subscribeManyEditionsTransferToken(callback: (data: EditionsTransferTokenResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsTransferToken items from collection editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function getAllEditionsTransferToken(editionId: string, filter?: string): Promise<EditionsTransferTokenResponse[]>;
/**
 * Subscribe to changes in EditionsTransferToken collection at editions/${editionId}/transferToken
 
  Read Operation Details: Anyone can read these passthrough token transfer requests because onchain collections are public.
  
 */
export declare function subscribeAllEditionsTransferToken(callback: (data: EditionsTransferTokenResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
export interface EditionsPurchasesRequest {
    editionId: string;
    buyerEmail: string;
    buyerAddress?: string;
    orderId?: string;
    solPrice?: number | TimeOperation | IncrementOperation | TokenAmount;
    status: string;
    nftMintTx?: string;
    tokenTransferTx?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface EditionsPurchasesResponse {
    editionId: string;
    buyerEmail: string;
    buyerAddress?: string;
    orderId?: string;
    solPrice?: number;
    status: string;
    nftMintTx?: string;
    tokenTransferTx?: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a EditionsPurchases operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequest): DocumentOperation;
/**
 * Only the backend vault can create purchase records when checkout or fulfillment begins. editionId and createdAt are immutable after creation, buyerEmail is required, and status should be set to values like 'pending', 'completed', or 'failed'. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequest): Promise<boolean>;
export type EditionsPurchasesRequestUpdate = Partial<EditionsPurchasesRequest>;
/**
 * Build a EditionsPurchases update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequestUpdate): DocumentOperation;
/**
 * Only the backend vault can update purchase records, typically to attach buyerAddress, orderId, solPrice, nftMintTx, tokenTransferTx, or to transition status through the fulfillment lifecycle. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateEditionsPurchases(editionId: string, purchaseId: string, data: EditionsPurchasesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
   (Get Single Item)
 */
export declare function getEditionsPurchases(editionId: string, purchaseId: string): Promise<EditionsPurchasesResponse | null>;
/**
 * Subscribes to changes in a single EditionsPurchases document. (
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  )
 */
export declare function subscribeEditionsPurchases(callback: (data: EditionsPurchasesResponse | null) => void, editionId: string, purchaseId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsPurchases items from collection editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function getManyEditionsPurchases(editionId: string, filter?: string): Promise<EditionsPurchasesResponse[]>;
/**
 * Subscribe to changes in EditionsPurchases collection at editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function subscribeManyEditionsPurchases(callback: (data: EditionsPurchasesResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsPurchases items from collection editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function getAllEditionsPurchases(editionId: string, filter?: string): Promise<EditionsPurchasesResponse[]>;
/**
 * Subscribe to changes in EditionsPurchases collection at editions/${editionId}/purchases
 
  Read Operation Details: Only ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can read collectible purchase audit records. This preserves buyer purchase details while still allowing backend processing and admin review.
  
 */
export declare function subscribeAllEditionsPurchases(callback: (data: EditionsPurchasesResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
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
export interface EditionsPayRequest {
}
export interface EditionsPayResponse {
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a EditionsPay operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildEditionsPay(editionId: string, payId: string, data?: EditionsPayRequest): DocumentOperation;
/**
 * Any authenticated user can pay for an edition. The hook reads priceSol and artistAddress from the parent edition document, enforcing the correct payment amount and destination. The buyer cannot tamper with either value. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setEditionsPay(editionId: string, payId: string, data?: EditionsPayRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read.
   (Get Single Item)
 */
export declare function getEditionsPay(editionId: string, payId: string): Promise<EditionsPayResponse | null>;
/**
 * Subscribes to changes in a single EditionsPay document. (
  Read Operation Details: Public read.
  )
 */
export declare function subscribeEditionsPay(callback: (data: EditionsPayResponse | null) => void, editionId: string, payId: string): Promise<() => Promise<void>>;
/**
 * Get many EditionsPay items from collection editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function getManyEditionsPay(editionId: string, filter?: string): Promise<EditionsPayResponse[]>;
/**
 * Subscribe to changes in EditionsPay collection at editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeManyEditionsPay(callback: (data: EditionsPayResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all EditionsPay items from collection editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function getAllEditionsPay(editionId: string, filter?: string): Promise<EditionsPayResponse[]>;
/**
 * Subscribe to changes in EditionsPay collection at editions/${editionId}/pay
 
  Read Operation Details: Public read.
  
 */
export declare function subscribeAllEditionsPay(callback: (data: EditionsPayResponse[]) => void, editionId: string, filter?: string): Promise<() => Promise<void>>;
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
export interface PackPurchasesRequest {
    artistPayout: number | TimeOperation | IncrementOperation | TokenAmount;
    buyerAddress?: AddressType;
    buyerEmail: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    nftCount: number | TimeOperation | IncrementOperation | TokenAmount;
    packId: string;
    packName: string;
    platformSlice: number | TimeOperation | IncrementOperation | TokenAmount;
    shopifyOrderId: string;
    status: string;
    tokenAmount: number | TimeOperation | IncrementOperation | TokenAmount;
    songId?: string;
    nftTxHashes?: string;
    splTxHash?: string;
    artistPayoutUSD?: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutSOL?: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutStatus?: string;
    artistPayoutTxHash?: string;
    solPriceAtPurchase?: number | TimeOperation | IncrementOperation | TokenAmount;
    creatorFeeBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    platformFeeBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    nftRoyaltyBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    infraTxHash?: string;
    nftFailedCount?: number | TimeOperation | IncrementOperation | TokenAmount;
    nftType?: string;
    mintType?: string;
    pendingOversold?: string;
    treasuryTxHash?: string;
    walletSource?: string;
    solToArtist?: number | TimeOperation | IncrementOperation | TokenAmount;
    paymentReconciliation?: string;
    stepTokens?: boolean;
    stepPayout?: boolean;
    stepNft?: boolean;
    stepNotify?: boolean;
    solPriceAtPurchaseUsd?: number | TimeOperation | IncrementOperation | TokenAmount;
    solPriceTimestamp?: number | TimeOperation | IncrementOperation | TokenAmount;
    tipPercent?: number | TimeOperation | IncrementOperation | TokenAmount;
    tipAmountUsd?: number | TimeOperation | IncrementOperation | TokenAmount;
    buyerTokenAmount?: number | TimeOperation | IncrementOperation | TokenAmount;
    artistTokenAmount?: number | TimeOperation | IncrementOperation | TokenAmount;
    treasurySlice?: number | TimeOperation | IncrementOperation | TokenAmount;
    treasuryFeeBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    purchaseAmountUsd?: any;
    reconcileAttempts: number | TimeOperation | IncrementOperation | TokenAmount;
    shopifyFulfilled: boolean;
    swapTxSig: string;
    bondingCurveBuyId: string;
    artistTokenTxHash: string;
    cancelledAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    cancelledBy?: AddressType;
    airdropCompleted?: boolean;
    treasuryTransferCompleted?: boolean;
    infraFeeAccounted?: boolean;
    fundingFeeAccounted?: boolean;
    bondingCurveBuySubmitted?: boolean;
    needsReviewReason?: string;
    failureReason?: string;
}
export interface PackPurchasesResponse {
    artistPayout: number;
    buyerAddress?: string;
    buyerEmail: string;
    createdAt: number;
    nftCount: number;
    packId: string;
    packName: string;
    platformSlice: number;
    shopifyOrderId: string;
    status: string;
    tokenAmount: number;
    songId?: string;
    nftTxHashes?: string;
    splTxHash?: string;
    artistPayoutUSD?: number;
    artistPayoutSOL?: number;
    artistPayoutStatus?: string;
    artistPayoutTxHash?: string;
    solPriceAtPurchase?: number;
    creatorFeeBps?: number;
    platformFeeBps?: number;
    nftRoyaltyBps?: number;
    infraTxHash?: string;
    nftFailedCount?: number;
    nftType?: string;
    mintType?: string;
    pendingOversold?: string;
    treasuryTxHash?: string;
    walletSource?: string;
    solToArtist?: number;
    paymentReconciliation?: string;
    stepTokens?: boolean;
    stepPayout?: boolean;
    stepNft?: boolean;
    stepNotify?: boolean;
    solPriceAtPurchaseUsd?: number;
    solPriceTimestamp?: number;
    tipPercent?: number;
    tipAmountUsd?: number;
    buyerTokenAmount?: number;
    artistTokenAmount?: number;
    treasurySlice?: number;
    treasuryFeeBps?: number;
    purchaseAmountUsd?: any;
    reconcileAttempts: number;
    shopifyFulfilled: boolean;
    swapTxSig: string;
    bondingCurveBuyId: string;
    artistTokenTxHash: string;
    cancelledAt?: number;
    cancelledBy?: string;
    airdropCompleted?: boolean;
    treasuryTransferCompleted?: boolean;
    infraFeeAccounted?: boolean;
    fundingFeeAccounted?: boolean;
    bondingCurveBuySubmitted?: boolean;
    needsReviewReason?: string;
    failureReason?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PackPurchases operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchases(purchaseId: string, data: PackPurchasesRequest): DocumentOperation;
/**
 * The backend signer (either PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET) can create purchase records when Shopify webhooks are received, but ONLY if no document already exists at this path (get(/packPurchases/$purchaseId) == null). Because purchase document IDs are deterministic ('pack-{shopifyOrderId}-{packId}'), this enforces a hard uniqueness constraint on the (shopifyOrderId, packId) tuple at the policy layer — a second creator racing the webhook handler's pre-create existence check will hard-fail rather than silently succeed/overwrite. Accepting both backend constants ensures fulfillment continues to work if OPERATIONS_WALLET is later repointed to a separate signer. Optional fields walletSource, nftType, mintType, infraTxHash, treasuryTxHash, pendingOversold, nftFailedCount, creatorFeeBps, platformFeeBps, treasuryFeeBps, nftRoyaltyBps, solPriceAtPurchaseUsd, solPriceTimestamp, tipPercent, tipAmountUsd, buyerTokenAmount, artistTokenAmount, treasurySlice, purchaseAmountUsd (exact USD amount fan chose to spend, read from Shopify cart attribute amountUsd), and idempotency step flags (stepTokens, stepPayout, stepNft, stepNotify) are written by the backend during fulfillment. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchases(purchaseId: string, data: PackPurchasesRequest): Promise<boolean>;
export type PackPurchasesRequestUpdate = Partial<PackPurchasesRequest>;
/**
 * Build a PackPurchases update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePackPurchases(purchaseId: string, data: PackPurchasesRequestUpdate): DocumentOperation;
/**
 * The backend signer (either PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET) can update purchase records, typically to transition status through the fulfillment lifecycle. Accepting both constants ensures fulfillment continues to work if OPERATIONS_WALLET is later repointed to a separate signer. treasuryFeeBps stores the treasury fee in basis points captured at purchase time alongside creatorFeeBps, platformFeeBps, and nftRoyaltyBps. All fee-bps fields are optional UInt and written by the backend during payout validation. purchaseAmountUsd stores the exact USD amount the fan chose to spend at checkout (source-of-truth for downstream token math). Step flags (stepTokens, stepPayout, stepNft, stepNotify) are toggled to true as each fulfillment step completes; resume endpoint uses these to retry only steps still false. Idempotency flags airdropCompleted, treasuryTransferCompleted, infraFeeAccounted, and fundingFeeAccounted are set to true by fulfillment-steps.ts as each corresponding step (token airdrop, treasury outbound transfer, infra fee accounting, funding fee accounting) succeeds; fulfillment skips already-completed steps on retry. cancelledAt and cancelledBy are set together when an admin cancels a stuck order via the cancel endpoint; status is also set to 'cancelled' in the same write. Webhook re-delivery detection treats records with status='cancelled' as terminal and skips re-fulfillment. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePackPurchases(purchaseId: string, data: PackPurchasesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
   (Get Single Item)
 */
export declare function getPackPurchases(purchaseId: string): Promise<PackPurchasesResponse | null>;
/**
 * Subscribes to changes in a single PackPurchases document. (
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  )
 */
export declare function subscribePackPurchases(callback: (data: PackPurchasesResponse | null) => void, purchaseId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchases items from collection packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function getManyPackPurchases(filter?: string): Promise<PackPurchasesResponse[]>;
/**
 * Subscribe to changes in PackPurchases collection at packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function subscribeManyPackPurchases(callback: (data: PackPurchasesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchases items from collection packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function getAllPackPurchases(filter?: string): Promise<PackPurchasesResponse[]>;
/**
 * Subscribe to changes in PackPurchases collection at packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function subscribeAllPackPurchases(callback: (data: PackPurchasesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Admin-only deletion. PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can delete pack purchase records. Used by the Admin UI's Stuck Orders tab to remove stuck or permanently failed order records that cannot be recovered.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePackPurchases(purchaseId: string): Promise<boolean>;
/**
 * Build a delete operation for PackPurchases for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePackPurchases(purchaseId: string): DocumentOperation;
export interface ChatMessagesRequest {
    walletAddress: AddressType;
    displayName?: string;
    content: string;
    songId?: string;
    isPinned: boolean;
    pinnedBy?: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    arenaId?: string;
}
export interface ChatMessagesResponse {
    walletAddress: string;
    displayName?: string;
    content: string;
    songId?: string;
    isPinned: boolean;
    pinnedBy?: string;
    createdAt: number;
    arenaId?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ChatMessages operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildChatMessages(messageId: string, data: ChatMessagesRequest): DocumentOperation;
/**
 * Authenticated users can post messages. walletAddress must match the caller's wallet to prevent spoofing. songId null means global Lit Hub, populated means an Artist Room scoped to that song. isPinned should default to false on creation. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setChatMessages(messageId: string, data: ChatMessagesRequest): Promise<boolean>;
export type ChatMessagesRequestUpdate = Partial<ChatMessagesRequest>;
/**
 * Build a ChatMessages update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateChatMessages(messageId: string, data: ChatMessagesRequestUpdate): DocumentOperation;
/**
 * Only ADMIN_ADDRESS can update messages, primarily to toggle isPinned and set pinnedBy for message pinning (eligibility validation happens client-side, admin signs the pin action). (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateChatMessages(messageId: string, data: ChatMessagesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
   (Get Single Item)
 */
export declare function getChatMessages(messageId: string): Promise<ChatMessagesResponse | null>;
/**
 * Subscribes to changes in a single ChatMessages document. (
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  )
 */
export declare function subscribeChatMessages(callback: (data: ChatMessagesResponse | null) => void, messageId: string): Promise<() => Promise<void>>;
/**
 * Get many ChatMessages items from collection chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function getManyChatMessages(filter?: string): Promise<ChatMessagesResponse[]>;
/**
 * Subscribe to changes in ChatMessages collection at chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function subscribeManyChatMessages(callback: (data: ChatMessagesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ChatMessages items from collection chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function getAllChatMessages(filter?: string): Promise<ChatMessagesResponse[]>;
/**
 * Subscribe to changes in ChatMessages collection at chatMessages
 
  Read Operation Details: Public read. Anyone can view chat messages in global Lit Hub or per-song Artist Rooms.
  
 */
export declare function subscribeAllChatMessages(callback: (data: ChatMessagesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: ADMIN_ADDRESS can moderate by deleting any message. Users can delete their own messages.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteChatMessages(messageId: string): Promise<boolean>;
/**
 * Build a delete operation for ChatMessages for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteChatMessages(messageId: string): DocumentOperation;
export interface GmStreaksRequest {
    currentStreak: number | TimeOperation | IncrementOperation | TokenAmount;
    lastGmDate: string;
    longestStreak: number | TimeOperation | IncrementOperation | TokenAmount;
    totalGms: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface GmStreaksResponse {
    currentStreak: number;
    lastGmDate: string;
    longestStreak: number;
    totalGms: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a GmStreaks operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildGmStreaks(userAddress: string, data?: GmStreaksRequest): DocumentOperation;
/**
 * Users create their own streak record on first GM. The $userAddress path param must equal caller's wallet. currentStreak and totalGms should start at 1, longestStreak at 1, and lastGmDate set to today's date string. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setGmStreaks(userAddress: string, data?: GmStreaksRequest): Promise<boolean>;
export type GmStreaksRequestUpdate = Partial<GmStreaksRequest>;
/**
 * Build a GmStreaks update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateGmStreaks(userAddress: string, data: GmStreaksRequestUpdate): DocumentOperation;
/**
 * Users update their own streak record when sending subsequent GMs. Frontend logic handles streak continuation vs reset based on lastGmDate comparison to current date. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateGmStreaks(userAddress: string, data: GmStreaksRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
   (Get Single Item)
 */
export declare function getGmStreaks(userAddress: string): Promise<GmStreaksResponse | null>;
/**
 * Subscribes to changes in a single GmStreaks document. (
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  )
 */
export declare function subscribeGmStreaks(callback: (data: GmStreaksResponse | null) => void, userAddress: string): Promise<() => Promise<void>>;
/**
 * Get many GmStreaks items from collection gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function getManyGmStreaks(filter?: string): Promise<GmStreaksResponse[]>;
/**
 * Subscribe to changes in GmStreaks collection at gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function subscribeManyGmStreaks(callback: (data: GmStreaksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all GmStreaks items from collection gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function getAllGmStreaks(filter?: string): Promise<GmStreaksResponse[]>;
/**
 * Subscribe to changes in GmStreaks collection at gmStreaks
 
  Read Operation Details: Public read. Anyone can view GM streak data for any user.
  
 */
export declare function subscribeAllGmStreaks(callback: (data: GmStreaksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface ChatReactionsRequest {
    messageId: string;
    walletAddress: AddressType;
    emoji: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ChatReactionsResponse {
    messageId: string;
    walletAddress: string;
    emoji: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ChatReactions operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildChatReactions(reactionId: string, data?: ChatReactionsRequest): DocumentOperation;
/**
 * Authenticated users can react to messages. walletAddress must match caller to prevent spoofing. Document ID should be composite {messageId}_{walletAddress}_{emoji} using underscores (not hyphens) for natural dedup. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setChatReactions(reactionId: string, data?: ChatReactionsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view message reactions and counts.
   (Get Single Item)
 */
export declare function getChatReactions(reactionId: string): Promise<ChatReactionsResponse | null>;
/**
 * Subscribes to changes in a single ChatReactions document. (
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  )
 */
export declare function subscribeChatReactions(callback: (data: ChatReactionsResponse | null) => void, reactionId: string): Promise<() => Promise<void>>;
/**
 * Get many ChatReactions items from collection chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function getManyChatReactions(filter?: string): Promise<ChatReactionsResponse[]>;
/**
 * Subscribe to changes in ChatReactions collection at chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function subscribeManyChatReactions(callback: (data: ChatReactionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ChatReactions items from collection chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function getAllChatReactions(filter?: string): Promise<ChatReactionsResponse[]>;
/**
 * Subscribe to changes in ChatReactions collection at chatReactions
 
  Read Operation Details: Public read. Anyone can view message reactions and counts.
  
 */
export declare function subscribeAllChatReactions(callback: (data: ChatReactionsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Users can remove their own reactions to toggle them off.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteChatReactions(reactionId: string): Promise<boolean>;
/**
 * Build a delete operation for ChatReactions for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteChatReactions(reactionId: string): DocumentOperation;
export interface ArenasRequest {
    artistAddress: AddressType;
    artistName: string;
    coverImage?: string;
    songCount: number | TimeOperation | IncrementOperation | TokenAmount;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ArenasResponse {
    artistAddress: string;
    artistName: string;
    coverImage?: string;
    songCount: number;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Arenas operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildArenas(arenaId: string, data?: ArenasRequest): DocumentOperation;
/**
 * Authenticated users can create an arena when an artist uploads their first song. artistAddress must match arenaId. songCount starts at 1. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setArenas(arenaId: string, data?: ArenasRequest): Promise<boolean>;
export type ArenasRequestUpdate = Partial<ArenasRequest>;
/**
 * Build a Arenas update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateArenas(arenaId: string, data: ArenasRequestUpdate): DocumentOperation;
/**
 * Only the artist (matching $arenaId), ADMIN_ADDRESS, or PROJECT_VAULT_ADDRESS can update arena metadata like songCount or coverImage. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateArenas(arenaId: string, data: ArenasRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can browse available artist arenas.
   (Get Single Item)
 */
export declare function getArenas(arenaId: string): Promise<ArenasResponse | null>;
/**
 * Subscribes to changes in a single Arenas document. (
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  )
 */
export declare function subscribeArenas(callback: (data: ArenasResponse | null) => void, arenaId: string): Promise<() => Promise<void>>;
/**
 * Get many Arenas items from collection arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function getManyArenas(filter?: string): Promise<ArenasResponse[]>;
/**
 * Subscribe to changes in Arenas collection at arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function subscribeManyArenas(callback: (data: ArenasResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Arenas items from collection arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function getAllArenas(filter?: string): Promise<ArenasResponse[]>;
/**
 * Subscribe to changes in Arenas collection at arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function subscribeAllArenas(callback: (data: ArenasResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface WishlistsRequest {
    songIds: string;
    updatedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface WishlistsResponse {
    songIds: string;
    updatedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Wishlists operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildWishlists(walletAddress: string, data: WishlistsRequest): DocumentOperation;
/**
 * Users can only create their own wishlist. The $walletAddress path param must equal the caller's wallet address. songIds is a JSON-serialized string array of song IDs. updatedAt is a Unix timestamp in seconds. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setWishlists(walletAddress: string, data: WishlistsRequest): Promise<boolean>;
export type WishlistsRequestUpdate = Partial<WishlistsRequest>;
/**
 * Build a Wishlists update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateWishlists(walletAddress: string, data: WishlistsRequestUpdate): DocumentOperation;
/**
 * Only the wishlist owner can update their wishlist to add or remove song IDs. songIds and updatedAt are mutable and should be updated together. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateWishlists(walletAddress: string, data: WishlistsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
   (Get Single Item)
 */
export declare function getWishlists(walletAddress: string): Promise<WishlistsResponse | null>;
/**
 * Subscribes to changes in a single Wishlists document. (
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  )
 */
export declare function subscribeWishlists(callback: (data: WishlistsResponse | null) => void, walletAddress: string): Promise<() => Promise<void>>;
/**
 * Get many Wishlists items from collection wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function getManyWishlists(filter?: string): Promise<WishlistsResponse[]>;
/**
 * Subscribe to changes in Wishlists collection at wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function subscribeManyWishlists(callback: (data: WishlistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Wishlists items from collection wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function getAllWishlists(filter?: string): Promise<WishlistsResponse[]>;
/**
 * Subscribe to changes in Wishlists collection at wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function subscribeAllWishlists(callback: (data: WishlistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface FollowsRequest {
    followerAddress: AddressType;
    artistAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface FollowsResponse {
    followerAddress: string;
    artistAddress: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Follows operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildFollows(followId: string, data?: FollowsRequest): DocumentOperation;
/**
 * Authenticated users can create follow records. followerAddress must match the caller's wallet to prevent spoofing. Document ID should be composite '{followerAddress}_{artistAddress}' using underscores (not hyphens) for natural dedup — one follow per user per artist. All fields are immutable after creation. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setFollows(followId: string, data?: FollowsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can see who follows which artists.
   (Get Single Item)
 */
export declare function getFollows(followId: string): Promise<FollowsResponse | null>;
/**
 * Subscribes to changes in a single Follows document. (
  Read Operation Details: Public read. Anyone can see who follows which artists.
  )
 */
export declare function subscribeFollows(callback: (data: FollowsResponse | null) => void, followId: string): Promise<() => Promise<void>>;
/**
 * Get many Follows items from collection follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function getManyFollows(filter?: string): Promise<FollowsResponse[]>;
/**
 * Subscribe to changes in Follows collection at follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function subscribeManyFollows(callback: (data: FollowsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Follows items from collection follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function getAllFollows(filter?: string): Promise<FollowsResponse[]>;
/**
 * Subscribe to changes in Follows collection at follows
 
  Read Operation Details: Public read. Anyone can see who follows which artists.
  
 */
export declare function subscribeAllFollows(callback: (data: FollowsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Only the follower (followerAddress matches caller wallet) can delete their follow record to unfollow an artist.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteFollows(followId: string): Promise<boolean>;
/**
 * Build a delete operation for Follows for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteFollows(followId: string): DocumentOperation;
export interface CommentsRequest {
    walletAddress: AddressType;
    displayName?: string;
    content: string;
    artistAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    isPinned: boolean;
}
export interface CommentsResponse {
    walletAddress: string;
    displayName?: string;
    content: string;
    artistAddress: string;
    createdAt: number;
    isPinned: boolean;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Comments operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildComments(commentId: string, data: CommentsRequest): DocumentOperation;
/**
 * Authenticated users can post comments. walletAddress must match the caller's wallet to prevent spoofing. artistAddress indicates which artist profile the comment belongs to. createdAt is a Unix timestamp in seconds and is immutable. content is the comment text (max 280 chars enforced client-side). isPinned defaults to false. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setComments(commentId: string, data: CommentsRequest): Promise<boolean>;
export type CommentsRequestUpdate = Partial<CommentsRequest>;
/**
 * Build a Comments update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateComments(commentId: string, data: CommentsRequestUpdate): DocumentOperation;
/**
 * Only ADMIN_ADDRESS can update comments, primarily to toggle isPinned status. All other fields are immutable (marked with !) except displayName which is mutable. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateComments(commentId: string, data: CommentsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
   (Get Single Item)
 */
export declare function getComments(commentId: string): Promise<CommentsResponse | null>;
/**
 * Subscribes to changes in a single Comments document. (
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  )
 */
export declare function subscribeComments(callback: (data: CommentsResponse | null) => void, commentId: string): Promise<() => Promise<void>>;
/**
 * Get many Comments items from collection comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function getManyComments(filter?: string): Promise<CommentsResponse[]>;
/**
 * Subscribe to changes in Comments collection at comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function subscribeManyComments(callback: (data: CommentsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Comments items from collection comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function getAllComments(filter?: string): Promise<CommentsResponse[]>;
/**
 * Subscribe to changes in Comments collection at comments
 
  Read Operation Details: Public read. Anyone can view comments on artist profiles.
  
 */
export declare function subscribeAllComments(callback: (data: CommentsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Users can delete their own comments (walletAddress matches caller). ADMIN_ADDRESS can delete any comment for moderation purposes.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteComments(commentId: string): Promise<boolean>;
/**
 * Build a delete operation for Comments for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteComments(commentId: string): DocumentOperation;
export interface OperationsFulfillmentCostsRequest {
    orderId: string;
    nftCount: number | TimeOperation | IncrementOperation | TokenAmount;
    estimatedCostSOL: number | TimeOperation | IncrementOperation | TokenAmount;
    actualCostSOL?: number | TimeOperation | IncrementOperation | TokenAmount;
    timestamp: number | TimeOperation | IncrementOperation | TokenAmount;
    status: string;
}
export interface OperationsFulfillmentCostsResponse {
    orderId: string;
    nftCount: number;
    estimatedCostSOL: number;
    actualCostSOL?: number;
    timestamp: number;
    status: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a OperationsFulfillmentCosts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildOperationsFulfillmentCosts(costId: string, data?: OperationsFulfillmentCostsRequest): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) or OPERATIONS_WALLET can create fulfillment cost records. orderId, nftCount, estimatedCostSOL, and timestamp are immutable. status must be 'success' or 'insufficient_funds'. actualCostSOL is optional and set post-fulfillment. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setOperationsFulfillmentCosts(costId: string, data?: OperationsFulfillmentCostsRequest): Promise<boolean>;
export type OperationsFulfillmentCostsRequestUpdate = Partial<OperationsFulfillmentCostsRequest>;
/**
 * Build a OperationsFulfillmentCosts update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateOperationsFulfillmentCosts(costId: string, data: OperationsFulfillmentCostsRequestUpdate): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) or OPERATIONS_WALLET can update records, typically to set actualCostSOL after fulfillment completes. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateOperationsFulfillmentCosts(costId: string, data: OperationsFulfillmentCostsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
   (Get Single Item)
 */
export declare function getOperationsFulfillmentCosts(costId: string): Promise<OperationsFulfillmentCostsResponse | null>;
/**
 * Subscribes to changes in a single OperationsFulfillmentCosts document. (
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  )
 */
export declare function subscribeOperationsFulfillmentCosts(callback: (data: OperationsFulfillmentCostsResponse | null) => void, costId: string): Promise<() => Promise<void>>;
/**
 * Get many OperationsFulfillmentCosts items from collection operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function getManyOperationsFulfillmentCosts(filter?: string): Promise<OperationsFulfillmentCostsResponse[]>;
/**
 * Subscribe to changes in OperationsFulfillmentCosts collection at operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeManyOperationsFulfillmentCosts(callback: (data: OperationsFulfillmentCostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all OperationsFulfillmentCosts items from collection operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function getAllOperationsFulfillmentCosts(filter?: string): Promise<OperationsFulfillmentCostsResponse[]>;
/**
 * Subscribe to changes in OperationsFulfillmentCosts collection at operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeAllOperationsFulfillmentCosts(callback: (data: OperationsFulfillmentCostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface TransactionAuditsRequest {
    artistPayoutCalculated: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutExpected: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutSOL: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutStatus: string;
    artistPayoutUSD: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutTxHash: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    discrepancyReason?: string;
    packPriceUsdCents: number | TimeOperation | IncrementOperation | TokenAmount;
    purchaseId: string;
    shopifyOrderId: string;
    songId: string;
    solPriceUsd: number | TimeOperation | IncrementOperation | TokenAmount;
    validationPassed: boolean;
    validationTimestamp: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface TransactionAuditsResponse {
    artistPayoutCalculated: number;
    artistPayoutExpected: number;
    artistPayoutSOL: number;
    artistPayoutStatus: string;
    artistPayoutUSD: number;
    artistPayoutTxHash: string;
    createdAt: number;
    discrepancyReason?: string;
    packPriceUsdCents: number;
    purchaseId: string;
    shopifyOrderId: string;
    songId: string;
    solPriceUsd: number;
    validationPassed: boolean;
    validationTimestamp: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a TransactionAudits operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildTransactionAudits(auditId: string, data: TransactionAuditsRequest): DocumentOperation;
/**
 * Backend webhook only. Requires PROJECT_VAULT_ADDRESS authentication. Creates a new audit record with calculated vs expected payout amounts, validation result, and transaction details. All numeric fields are provided by the payout processing webhook. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setTransactionAudits(auditId: string, data: TransactionAuditsRequest): Promise<boolean>;
export type TransactionAuditsRequestUpdate = Partial<TransactionAuditsRequest>;
/**
 * Build a TransactionAudits update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateTransactionAudits(auditId: string, data: TransactionAuditsRequestUpdate): DocumentOperation;
/**
 * Backend webhook only. Requires PROJECT_VAULT_ADDRESS authentication. Can update artistPayoutStatus (e.g., pending -> passed/failed/discrepancy) and add artistPayoutTxHash after the SOL transaction completes. All other fields are immutable. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateTransactionAudits(auditId: string, data: TransactionAuditsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read access. Anyone can view audit log entries for transparency of payout validation history.
   (Get Single Item)
 */
export declare function getTransactionAudits(auditId: string): Promise<TransactionAuditsResponse | null>;
/**
 * Subscribes to changes in a single TransactionAudits document. (
  Read Operation Details: Public read access. Anyone can view audit log entries for transparency of payout validation history.
  )
 */
export declare function subscribeTransactionAudits(callback: (data: TransactionAuditsResponse | null) => void, auditId: string): Promise<() => Promise<void>>;
/**
 * Get many TransactionAudits items from collection transactionAudits
 
  Read Operation Details: Public read access. Anyone can view audit log entries for transparency of payout validation history.
  
 */
export declare function getManyTransactionAudits(filter?: string): Promise<TransactionAuditsResponse[]>;
/**
 * Subscribe to changes in TransactionAudits collection at transactionAudits
 
  Read Operation Details: Public read access. Anyone can view audit log entries for transparency of payout validation history.
  
 */
export declare function subscribeManyTransactionAudits(callback: (data: TransactionAuditsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all TransactionAudits items from collection transactionAudits
 
  Read Operation Details: Public read access. Anyone can view audit log entries for transparency of payout validation history.
  
 */
export declare function getAllTransactionAudits(filter?: string): Promise<TransactionAuditsResponse[]>;
/**
 * Subscribe to changes in TransactionAudits collection at transactionAudits
 
  Read Operation Details: Public read access. Anyone can view audit log entries for transparency of payout validation history.
  
 */
export declare function subscribeAllTransactionAudits(callback: (data: TransactionAuditsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
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
export interface PackPurchasesPayoutsRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PackPurchasesPayoutsResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a PackPurchasesPayouts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchasesPayouts(purchaseId: string, payoutId: string, data?: PackPurchasesPayoutsRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchasesPayouts(purchaseId: string, payoutId: string, data?: PackPurchasesPayoutsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect artist payout records.
   (Get Single Item)
 */
export declare function getPackPurchasesPayouts(purchaseId: string, payoutId: string): Promise<PackPurchasesPayoutsResponse | null>;
/**
 * Subscribes to changes in a single PackPurchasesPayouts document. (
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  )
 */
export declare function subscribePackPurchasesPayouts(callback: (data: PackPurchasesPayoutsResponse | null) => void, purchaseId: string, payoutId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchasesPayouts items from collection packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function getManyPackPurchasesPayouts(purchaseId: string, filter?: string): Promise<PackPurchasesPayoutsResponse[]>;
/**
 * Subscribe to changes in PackPurchasesPayouts collection at packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function subscribeManyPackPurchasesPayouts(callback: (data: PackPurchasesPayoutsResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchasesPayouts items from collection packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function getAllPackPurchasesPayouts(purchaseId: string, filter?: string): Promise<PackPurchasesPayoutsResponse[]>;
/**
 * Subscribe to changes in PackPurchasesPayouts collection at packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function subscribeAllPackPurchasesPayouts(callback: (data: PackPurchasesPayoutsResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
export interface PackPurchasesInfraFeesRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PackPurchasesInfraFeesResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a PackPurchasesInfraFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchasesInfraFees(purchaseId: string, feeId: string, data?: PackPurchasesInfraFeesRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchasesInfraFees(purchaseId: string, feeId: string, data?: PackPurchasesInfraFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
   (Get Single Item)
 */
export declare function getPackPurchasesInfraFees(purchaseId: string, feeId: string): Promise<PackPurchasesInfraFeesResponse | null>;
/**
 * Subscribes to changes in a single PackPurchasesInfraFees document. (
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  )
 */
export declare function subscribePackPurchasesInfraFees(callback: (data: PackPurchasesInfraFeesResponse | null) => void, purchaseId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchasesInfraFees items from collection packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function getManyPackPurchasesInfraFees(purchaseId: string, filter?: string): Promise<PackPurchasesInfraFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesInfraFees collection at packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function subscribeManyPackPurchasesInfraFees(callback: (data: PackPurchasesInfraFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchasesInfraFees items from collection packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function getAllPackPurchasesInfraFees(purchaseId: string, filter?: string): Promise<PackPurchasesInfraFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesInfraFees collection at packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function subscribeAllPackPurchasesInfraFees(callback: (data: PackPurchasesInfraFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
export interface PackPurchasesTreasuryFeesRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PackPurchasesTreasuryFeesResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a PackPurchasesTreasuryFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchasesTreasuryFees(purchaseId: string, feeId: string, data?: PackPurchasesTreasuryFeesRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchasesTreasuryFees(purchaseId: string, feeId: string, data?: PackPurchasesTreasuryFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
   (Get Single Item)
 */
export declare function getPackPurchasesTreasuryFees(purchaseId: string, feeId: string): Promise<PackPurchasesTreasuryFeesResponse | null>;
/**
 * Subscribes to changes in a single PackPurchasesTreasuryFees document. (
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  )
 */
export declare function subscribePackPurchasesTreasuryFees(callback: (data: PackPurchasesTreasuryFeesResponse | null) => void, purchaseId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchasesTreasuryFees items from collection packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function getManyPackPurchasesTreasuryFees(purchaseId: string, filter?: string): Promise<PackPurchasesTreasuryFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesTreasuryFees collection at packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function subscribeManyPackPurchasesTreasuryFees(callback: (data: PackPurchasesTreasuryFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchasesTreasuryFees items from collection packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function getAllPackPurchasesTreasuryFees(purchaseId: string, filter?: string): Promise<PackPurchasesTreasuryFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesTreasuryFees collection at packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function subscribeAllPackPurchasesTreasuryFees(callback: (data: PackPurchasesTreasuryFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
export interface SocialLinksRequest {
    wallet: AddressType;
    provider: string;
    profile: string;
    linkedAt: number | IncrementOperation | TokenAmount;
}
export interface SocialLinksResponse {
    wallet: string;
    provider: string;
    profile: string;
    linkedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SocialLinks operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSocialLinks(storageKey: string, data: SocialLinksRequest): DocumentOperation;
/**
 * Backend-only creation via PROJECT_VAULT_ADDRESS. Stores wallet, provider, profile JSON, and linkedAt timestamp. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSocialLinks(storageKey: string, data: SocialLinksRequest): Promise<boolean>;
export type SocialLinksRequestUpdate = Partial<SocialLinksRequest>;
/**
 * Build a SocialLinks update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSocialLinks(storageKey: string, data: SocialLinksRequestUpdate): DocumentOperation;
/**
 * Backend-only updates via PROJECT_VAULT_ADDRESS. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSocialLinks(storageKey: string, data: SocialLinksRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
   (Get Single Item)
 */
export declare function getSocialLinks(storageKey: string): Promise<SocialLinksResponse | null>;
/**
 * Subscribes to changes in a single SocialLinks document. (
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  )
 */
export declare function subscribeSocialLinks(callback: (data: SocialLinksResponse | null) => void, storageKey: string): Promise<() => Promise<void>>;
/**
 * Get many SocialLinks items from collection socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function getManySocialLinks(filter?: string): Promise<SocialLinksResponse[]>;
/**
 * Subscribe to changes in SocialLinks collection at socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeManySocialLinks(callback: (data: SocialLinksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SocialLinks items from collection socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function getAllSocialLinks(filter?: string): Promise<SocialLinksResponse[]>;
/**
 * Subscribe to changes in SocialLinks collection at socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeAllSocialLinks(callback: (data: SocialLinksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Backend-only deletion via PROJECT_VAULT_ADDRESS.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteSocialLinks(storageKey: string): Promise<boolean>;
/**
 * Build a delete operation for SocialLinks for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteSocialLinks(storageKey: string): DocumentOperation;
export interface WebhookFailuresRequest {
    webhookSource: string;
    path: string;
    failureReason: string;
    errorMessage: string;
    headers: string;
    bodyPreview: string;
    timestamp: number | IncrementOperation | TokenAmount;
    alertSent: boolean;
}
export interface WebhookFailuresResponse {
    webhookSource: string;
    path: string;
    failureReason: string;
    errorMessage: string;
    headers: string;
    bodyPreview: string;
    timestamp: number;
    alertSent: boolean;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a WebhookFailures operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildWebhookFailures(failureId: string, data: WebhookFailuresRequest): DocumentOperation;
/**
 * Backend (@constants.PROJECT_VAULT_ADDRESS) and admin (@constants.ADMIN_ADDRESS) only. Backend writes after a webhook (Shopify, Stripe, etc.) fails HMAC/signature/processing verification. Callers must truncate errorMessage and bodyPreview and must NOT include secrets in headers. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setWebhookFailures(failureId: string, data: WebhookFailuresRequest): Promise<boolean>;
export type WebhookFailuresRequestUpdate = Partial<WebhookFailuresRequest>;
/**
 * Build a WebhookFailures update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateWebhookFailures(failureId: string, data: WebhookFailuresRequestUpdate): DocumentOperation;
/**
 * Backend (@constants.PROJECT_VAULT_ADDRESS) and admin (@constants.ADMIN_ADDRESS) only. Backend updates alertSent to true once Discord notified. Admin may resolve records during cleanup. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateWebhookFailures(failureId: string, data: WebhookFailuresRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Admin (@constants.ADMIN_ADDRESS) and backend (@constants.PROJECT_VAULT_ADDRESS) only. Admin reads in admin UI to display failures; backend reads to count recent unalerted failures for Discord alert threshold detection. Regular users cannot read these internal failure logs.
   (Get Single Item)
 */
export declare function getWebhookFailures(failureId: string): Promise<WebhookFailuresResponse | null>;
/**
 * Subscribes to changes in a single WebhookFailures document. (
  Read Operation Details: Admin (@constants.ADMIN_ADDRESS) and backend (@constants.PROJECT_VAULT_ADDRESS) only. Admin reads in admin UI to display failures; backend reads to count recent unalerted failures for Discord alert threshold detection. Regular users cannot read these internal failure logs.
  )
 */
export declare function subscribeWebhookFailures(callback: (data: WebhookFailuresResponse | null) => void, failureId: string): Promise<() => Promise<void>>;
/**
 * Get many WebhookFailures items from collection webhookFailures
 
  Read Operation Details: Admin (@constants.ADMIN_ADDRESS) and backend (@constants.PROJECT_VAULT_ADDRESS) only. Admin reads in admin UI to display failures; backend reads to count recent unalerted failures for Discord alert threshold detection. Regular users cannot read these internal failure logs.
  
 */
export declare function getManyWebhookFailures(filter?: string): Promise<WebhookFailuresResponse[]>;
/**
 * Subscribe to changes in WebhookFailures collection at webhookFailures
 
  Read Operation Details: Admin (@constants.ADMIN_ADDRESS) and backend (@constants.PROJECT_VAULT_ADDRESS) only. Admin reads in admin UI to display failures; backend reads to count recent unalerted failures for Discord alert threshold detection. Regular users cannot read these internal failure logs.
  
 */
export declare function subscribeManyWebhookFailures(callback: (data: WebhookFailuresResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all WebhookFailures items from collection webhookFailures
 
  Read Operation Details: Admin (@constants.ADMIN_ADDRESS) and backend (@constants.PROJECT_VAULT_ADDRESS) only. Admin reads in admin UI to display failures; backend reads to count recent unalerted failures for Discord alert threshold detection. Regular users cannot read these internal failure logs.
  
 */
export declare function getAllWebhookFailures(filter?: string): Promise<WebhookFailuresResponse[]>;
/**
 * Subscribe to changes in WebhookFailures collection at webhookFailures
 
  Read Operation Details: Admin (@constants.ADMIN_ADDRESS) and backend (@constants.PROJECT_VAULT_ADDRESS) only. Admin reads in admin UI to display failures; backend reads to count recent unalerted failures for Discord alert threshold detection. Regular users cannot read these internal failure logs.
  
 */
export declare function subscribeAllWebhookFailures(callback: (data: WebhookFailuresResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Admin (@constants.ADMIN_ADDRESS) only. Used for cleanup/debugging of resolved failures. Regular users and backend cannot delete records.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteWebhookFailures(failureId: string): Promise<boolean>;
/**
 * Build a delete operation for WebhookFailures for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteWebhookFailures(failureId: string): DocumentOperation;
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
export interface ListeningHistoryGenresRequest {
    userId: AddressType;
    genre: string;
    playCount: number | TimeOperation | IncrementOperation | TokenAmount;
    lastPlayedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ListeningHistoryGenresResponse {
    userId: string;
    genre: string;
    playCount: number;
    lastPlayedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ListeningHistoryGenres operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequest): DocumentOperation;
/**
 * Authenticated user only — the caller's wallet must equal the $userId path segment. The userId field must match $userId and the genre field must match $genre to keep the document body consistent with its path. Frontend writes this record the first time a user plays a song in a given genre (playCount typically initialized to 1, lastPlayedAt to current Unix seconds). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequest): Promise<boolean>;
export type ListeningHistoryGenresRequestUpdate = Partial<ListeningHistoryGenresRequest>;
/**
 * Build a ListeningHistoryGenres update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequestUpdate): DocumentOperation;
/**
 * Only the owning user (@user.address == $userId) can update. Used by the frontend on each subsequent play to increment playCount and refresh lastPlayedAt (Unix seconds) for that (user, genre) pair. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateListeningHistoryGenres(userId: string, genre: string, data: ListeningHistoryGenresRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
   (Get Single Item)
 */
export declare function getListeningHistoryGenres(userId: string, genre: string): Promise<ListeningHistoryGenresResponse | null>;
/**
 * Subscribes to changes in a single ListeningHistoryGenres document. (
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  )
 */
export declare function subscribeListeningHistoryGenres(callback: (data: ListeningHistoryGenresResponse | null) => void, userId: string, genre: string): Promise<() => Promise<void>>;
/**
 * Get many ListeningHistoryGenres items from collection listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function getManyListeningHistoryGenres(userId: string, filter?: string): Promise<ListeningHistoryGenresResponse[]>;
/**
 * Subscribe to changes in ListeningHistoryGenres collection at listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function subscribeManyListeningHistoryGenres(callback: (data: ListeningHistoryGenresResponse[]) => void, userId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ListeningHistoryGenres items from collection listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function getAllListeningHistoryGenres(userId: string, filter?: string): Promise<ListeningHistoryGenresResponse[]>;
/**
 * Subscribe to changes in ListeningHistoryGenres collection at listeningHistory/${userId}/genres
 
  Read Operation Details: Public read. Anyone (including unauthenticated viewers) can read listening history records so Made For You queries and aggregate views work for any signed-in user. Returns userId, genre, playCount, lastPlayedAt.
  
 */
export declare function subscribeAllListeningHistoryGenres(callback: (data: ListeningHistoryGenresResponse[]) => void, userId: string, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Only the owning user (@user.address == $userId) can delete their own history record. No admin or backend deletion path.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteListeningHistoryGenres(userId: string, genre: string): Promise<boolean>;
/**
 * Build a delete operation for ListeningHistoryGenres for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteListeningHistoryGenres(userId: string, genre: string): DocumentOperation;
export interface PlaylistSongsSongsRequest {
    userAddress: AddressType;
    songId: string;
    addedAt: number | TimeOperation | IncrementOperation | TokenAmount;
    position: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PlaylistSongsSongsResponse {
    userAddress: string;
    songId: string;
    addedAt: number;
    position: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PlaylistSongsSongs operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPlaylistSongsSongs(userAddress: string, songId: string, data?: PlaylistSongsSongsRequest): DocumentOperation;
/**
 * Only the user themselves can add songs to their own playlist. The $userAddress path segment must equal @newData.userAddress, which must equal @user.address. userAddress and songId are immutable (readonly). addedAt is an immutable Unix timestamp in seconds set on creation. The client must supply a `position` (UInt) representing the sort index within the user's playlist (lower = earlier in the queue). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPlaylistSongsSongs(userAddress: string, songId: string, data?: PlaylistSongsSongsRequest): Promise<boolean>;
export type PlaylistSongsSongsRequestUpdate = Partial<PlaylistSongsSongsRequest>;
/**
 * Build a PlaylistSongsSongs update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePlaylistSongsSongs(userAddress: string, songId: string, data: PlaylistSongsSongsRequestUpdate): DocumentOperation;
/**
 * Only the owner ($userAddress == @user.address) can update their own playlist entry. Only the `position` field may change — userAddress, songId, and addedAt must remain identical between @data and @newData. Used for reordering songs within the playlist. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePlaylistSongsSongs(userAddress: string, songId: string, data: PlaylistSongsSongsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
   (Get Single Item)
 */
export declare function getPlaylistSongsSongs(userAddress: string, songId: string): Promise<PlaylistSongsSongsResponse | null>;
/**
 * Subscribes to changes in a single PlaylistSongsSongs document. (
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  )
 */
export declare function subscribePlaylistSongsSongs(callback: (data: PlaylistSongsSongsResponse | null) => void, userAddress: string, songId: string): Promise<() => Promise<void>>;
/**
 * Get many PlaylistSongsSongs items from collection playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function getManyPlaylistSongsSongs(userAddress: string, filter?: string): Promise<PlaylistSongsSongsResponse[]>;
/**
 * Subscribe to changes in PlaylistSongsSongs collection at playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function subscribeManyPlaylistSongsSongs(callback: (data: PlaylistSongsSongsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PlaylistSongsSongs items from collection playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function getAllPlaylistSongsSongs(userAddress: string, filter?: string): Promise<PlaylistSongsSongsResponse[]>;
/**
 * Subscribe to changes in PlaylistSongsSongs collection at playlistSongs/${userAddress}/songs
 
  Read Operation Details: Public read. Anyone can view any user's playlist (it shows on their profile). Sort client-side by `position` ascending for queue order.
  
 */
export declare function subscribeAllPlaylistSongsSongs(callback: (data: PlaylistSongsSongsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Only the user themselves can remove songs from their own playlist (the $userAddress path segment must equal @user.address).
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePlaylistSongsSongs(userAddress: string, songId: string): Promise<boolean>;
/**
 * Build a delete operation for PlaylistSongsSongs for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePlaylistSongsSongs(userAddress: string, songId: string): DocumentOperation;
export interface BeamUpRequestsRequest {
    songId: string;
    requesterWallet: AddressType;
    requesterEmail?: string;
    gasTxHash?: string;
    status: string;
    createdAt: number | IncrementOperation | TokenAmount;
}
export interface BeamUpRequestsResponse {
    songId: string;
    requesterWallet: string;
    requesterEmail?: string;
    gasTxHash?: string;
    status: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a BeamUpRequests operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildBeamUpRequests(requestId: string, data: BeamUpRequestsRequest): DocumentOperation;
/**
 * Authenticated users can create a beam-up request for any song. Caller must equal @newData.requesterWallet so users can only file requests on their own behalf. Optional email and gas transaction hash can be attached. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setBeamUpRequests(requestId: string, data: BeamUpRequestsRequest): Promise<boolean>;
export type BeamUpRequestsRequestUpdate = Partial<BeamUpRequestsRequest>;
/**
 * Build a BeamUpRequests update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateBeamUpRequests(requestId: string, data: BeamUpRequestsRequestUpdate): DocumentOperation;
/**
 * Two parties can update: (1) the song's artist (matched via get(/songs/<songId>).creator) can approve/reject/complete the request by changing status; (2) the original requester can edit their own request only while status is still 'pending'. The songId field is expected to remain stable; status flows pending -> approved/rejected -> completed. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateBeamUpRequests(requestId: string, data: BeamUpRequestsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
   (Get Single Item)
 */
export declare function getBeamUpRequests(requestId: string): Promise<BeamUpRequestsResponse | null>;
/**
 * Subscribes to changes in a single BeamUpRequests document. (
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  )
 */
export declare function subscribeBeamUpRequests(callback: (data: BeamUpRequestsResponse | null) => void, requestId: string): Promise<() => Promise<void>>;
/**
 * Get many BeamUpRequests items from collection beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function getManyBeamUpRequests(filter?: string): Promise<BeamUpRequestsResponse[]>;
/**
 * Subscribe to changes in BeamUpRequests collection at beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function subscribeManyBeamUpRequests(callback: (data: BeamUpRequestsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all BeamUpRequests items from collection beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function getAllBeamUpRequests(filter?: string): Promise<BeamUpRequestsResponse[]>;
/**
 * Subscribe to changes in BeamUpRequests collection at beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function subscribeAllBeamUpRequests(callback: (data: BeamUpRequestsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface RepostsRequest {
    songId: string;
    reposterAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface RepostsResponse {
    songId: string;
    reposterAddress: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Reposts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildReposts(repostId: string, data: RepostsRequest): DocumentOperation;
/**
 * Any authenticated user can create a repost. Caller must set reposterAddress to their own wallet (@newData.reposterAddress == @user.address). Frontend should set createdAt to current Unix seconds. Document ID is application-defined (typically '{songId}_{reposterAddress}' or a generated id). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setReposts(repostId: string, data: RepostsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
   (Get Single Item)
 */
export declare function getReposts(repostId: string): Promise<RepostsResponse | null>;
/**
 * Subscribes to changes in a single Reposts document. (
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  )
 */
export declare function subscribeReposts(callback: (data: RepostsResponse | null) => void, repostId: string): Promise<() => Promise<void>>;
/**
 * Get many Reposts items from collection reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function getManyReposts(filter?: string): Promise<RepostsResponse[]>;
/**
 * Subscribe to changes in Reposts collection at reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function subscribeManyReposts(callback: (data: RepostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Reposts items from collection reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function getAllReposts(filter?: string): Promise<RepostsResponse[]>;
/**
 * Subscribe to changes in Reposts collection at reposts
 
  Read Operation Details: Anyone can read all reposts. Used for public reposter lists, per-song repost counts on leaderboards, and per-user repost lists on profiles.
  
 */
export declare function subscribeAllReposts(callback: (data: RepostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Only the original reposter (@user.address == @data.reposterAddress) can delete their own repost, enabling un-repost behavior. Admin cannot delete on behalf of users.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteReposts(repostId: string): Promise<boolean>;
/**
 * Build a delete operation for Reposts for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteReposts(repostId: string): DocumentOperation;
export interface SongStreamsRequest {
    count: number | TimeOperation | IncrementOperation | TokenAmount;
    lastStreamedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SongStreamsResponse {
    count: number;
    lastStreamedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SongStreams operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSongStreams(songId: string, data: SongStreamsRequest): DocumentOperation;
/**
 * Only backend (signed with PROJECT_VAULT_ADDRESS) can create the initial stream record for a song. Frontend must call a backend route which validates and creates the record. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSongStreams(songId: string, data: SongStreamsRequest): Promise<boolean>;
export type SongStreamsRequestUpdate = Partial<SongStreamsRequest>;
/**
 * Build a SongStreams update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSongStreams(songId: string, data: SongStreamsRequestUpdate): DocumentOperation;
/**
 * Only backend (signed with PROJECT_VAULT_ADDRESS) can increment count and update lastStreamedAt. Prevents users from inflating their own counts. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSongStreams(songId: string, data: SongStreamsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
   (Get Single Item)
 */
export declare function getSongStreams(songId: string): Promise<SongStreamsResponse | null>;
/**
 * Subscribes to changes in a single SongStreams document. (
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  )
 */
export declare function subscribeSongStreams(callback: (data: SongStreamsResponse | null) => void, songId: string): Promise<() => Promise<void>>;
/**
 * Get many SongStreams items from collection songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function getManySongStreams(filter?: string): Promise<SongStreamsResponse[]>;
/**
 * Subscribe to changes in SongStreams collection at songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function subscribeManySongStreams(callback: (data: SongStreamsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SongStreams items from collection songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function getAllSongStreams(filter?: string): Promise<SongStreamsResponse[]>;
/**
 * Subscribe to changes in SongStreams collection at songStreams
 
  Read Operation Details: Anyone can read stream counts. Used for leaderboard and LiveChartCard display.
  
 */
export declare function subscribeAllSongStreams(callback: (data: SongStreamsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface FailedFulfillmentsRequest {
    purchaseId: string;
    purchaseSource: string;
    buyerAddress: AddressType;
    songId: string;
    packId: string;
    usdAmount: number | TimeOperation | IncrementOperation | TokenAmount;
    solAmount?: number | TimeOperation | IncrementOperation | TokenAmount;
    failureStage: string;
    failureReason: string;
    retryCount: number | TimeOperation | IncrementOperation | TokenAmount;
    lastRetryAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    resolvedAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface FailedFulfillmentsResponse {
    purchaseId: string;
    purchaseSource: string;
    buyerAddress: string;
    songId: string;
    packId: string;
    usdAmount: number;
    solAmount?: number;
    failureStage: string;
    failureReason: string;
    retryCount: number;
    lastRetryAt?: number;
    resolvedAt?: number;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a FailedFulfillments operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildFailedFulfillments(fulfillmentId: string, data: FailedFulfillmentsRequest): DocumentOperation;
/**
 * PROJECT_VAULT_ADDRESS (backend) only. Backend writes one record per fulfillment failure with purchaseId, buyerAddress, songId, packId, financial details, and failureStage ('fee-transfer' | 'airdrop' | 'both' | 'unknown'). purchaseId is immutable; retryCount starts at 0. createdAt is required (Unix seconds). (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setFailedFulfillments(fulfillmentId: string, data: FailedFulfillmentsRequest): Promise<boolean>;
export type FailedFulfillmentsRequestUpdate = Partial<FailedFulfillmentsRequest>;
/**
 * Build a FailedFulfillments update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateFailedFulfillments(fulfillmentId: string, data: FailedFulfillmentsRequestUpdate): DocumentOperation;
/**
 * PROJECT_VAULT_ADDRESS (backend) only. Backend increments retryCount, sets lastRetryAt, and sets resolvedAt (Unix seconds) when a retry succeeds. failureStage / failureReason may be updated to reflect the most recent retry attempt. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateFailedFulfillments(fulfillmentId: string, data: FailedFulfillmentsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Admin only. ADMIN_ADDRESS reads the failed-fulfillment queue for review and retry decisions. No other roles can read (contains sensitive purchase + failure-reason data).
   (Get Single Item)
 */
export declare function getFailedFulfillments(fulfillmentId: string): Promise<FailedFulfillmentsResponse | null>;
/**
 * Subscribes to changes in a single FailedFulfillments document. (
  Read Operation Details: Admin only. ADMIN_ADDRESS reads the failed-fulfillment queue for review and retry decisions. No other roles can read (contains sensitive purchase + failure-reason data).
  )
 */
export declare function subscribeFailedFulfillments(callback: (data: FailedFulfillmentsResponse | null) => void, fulfillmentId: string): Promise<() => Promise<void>>;
/**
 * Get many FailedFulfillments items from collection failedFulfillments
 
  Read Operation Details: Admin only. ADMIN_ADDRESS reads the failed-fulfillment queue for review and retry decisions. No other roles can read (contains sensitive purchase + failure-reason data).
  
 */
export declare function getManyFailedFulfillments(filter?: string): Promise<FailedFulfillmentsResponse[]>;
/**
 * Subscribe to changes in FailedFulfillments collection at failedFulfillments
 
  Read Operation Details: Admin only. ADMIN_ADDRESS reads the failed-fulfillment queue for review and retry decisions. No other roles can read (contains sensitive purchase + failure-reason data).
  
 */
export declare function subscribeManyFailedFulfillments(callback: (data: FailedFulfillmentsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all FailedFulfillments items from collection failedFulfillments
 
  Read Operation Details: Admin only. ADMIN_ADDRESS reads the failed-fulfillment queue for review and retry decisions. No other roles can read (contains sensitive purchase + failure-reason data).
  
 */
export declare function getAllFailedFulfillments(filter?: string): Promise<FailedFulfillmentsResponse[]>;
/**
 * Subscribe to changes in FailedFulfillments collection at failedFulfillments
 
  Read Operation Details: Admin only. ADMIN_ADDRESS reads the failed-fulfillment queue for review and retry decisions. No other roles can read (contains sensitive purchase + failure-reason data).
  
 */
export declare function subscribeAllFailedFulfillments(callback: (data: FailedFulfillmentsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: ADMIN_ADDRESS only. Admin can clear resolved entries from the queue manually after confirming successful retry.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteFailedFulfillments(fulfillmentId: string): Promise<boolean>;
/**
 * Build a delete operation for FailedFulfillments for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteFailedFulfillments(fulfillmentId: string): DocumentOperation;
export interface ProcessedSolSignaturesRequest {
    signature: string;
    walletAddress: AddressType;
    usdAmount: string;
    lamports: number | TimeOperation | IncrementOperation | TokenAmount;
    purchaseId?: string;
    processedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ProcessedSolSignaturesResponse {
    signature: string;
    walletAddress: string;
    usdAmount: string;
    lamports: number;
    purchaseId?: string;
    processedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ProcessedSolSignatures operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildProcessedSolSignatures(signature: string, data: ProcessedSolSignaturesRequest): DocumentOperation;
/**
 * Backend-only (Cloudflare Worker signs Tarobase requests with PROJECT_VAULT_PRIVATE_KEY, so @user.address resolves to @constants.PROJECT_VAULT_ADDRESS). Caller must pass the Solana tx signature as both the document ID ($signature) and the signature field - they must match. Backend writes this AFTER successful RPC verification of the on-chain transfer. Any subsequent write with the same signature will fail (duplicate key) - this is the anti-replay guarantee. processedAt is a Unix-seconds timestamp (UInt), NOT milliseconds. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setProcessedSolSignatures(signature: string, data: ProcessedSolSignaturesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read. Audit log contains no secrets - only public Solana tx signature, wallet address, verified USD/lamport amounts, optional purchaseId link, and processedAt timestamp. Used for audit, debugging, and lookup of consumed signatures.
   (Get Single Item)
 */
export declare function getProcessedSolSignatures(signature: string): Promise<ProcessedSolSignaturesResponse | null>;
/**
 * Subscribes to changes in a single ProcessedSolSignatures document. (
  Read Operation Details: Anyone can read. Audit log contains no secrets - only public Solana tx signature, wallet address, verified USD/lamport amounts, optional purchaseId link, and processedAt timestamp. Used for audit, debugging, and lookup of consumed signatures.
  )
 */
export declare function subscribeProcessedSolSignatures(callback: (data: ProcessedSolSignaturesResponse | null) => void, signature: string): Promise<() => Promise<void>>;
/**
 * Get many ProcessedSolSignatures items from collection processedSolSignatures
 
  Read Operation Details: Anyone can read. Audit log contains no secrets - only public Solana tx signature, wallet address, verified USD/lamport amounts, optional purchaseId link, and processedAt timestamp. Used for audit, debugging, and lookup of consumed signatures.
  
 */
export declare function getManyProcessedSolSignatures(filter?: string): Promise<ProcessedSolSignaturesResponse[]>;
/**
 * Subscribe to changes in ProcessedSolSignatures collection at processedSolSignatures
 
  Read Operation Details: Anyone can read. Audit log contains no secrets - only public Solana tx signature, wallet address, verified USD/lamport amounts, optional purchaseId link, and processedAt timestamp. Used for audit, debugging, and lookup of consumed signatures.
  
 */
export declare function subscribeManyProcessedSolSignatures(callback: (data: ProcessedSolSignaturesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ProcessedSolSignatures items from collection processedSolSignatures
 
  Read Operation Details: Anyone can read. Audit log contains no secrets - only public Solana tx signature, wallet address, verified USD/lamport amounts, optional purchaseId link, and processedAt timestamp. Used for audit, debugging, and lookup of consumed signatures.
  
 */
export declare function getAllProcessedSolSignatures(filter?: string): Promise<ProcessedSolSignaturesResponse[]>;
/**
 * Subscribe to changes in ProcessedSolSignatures collection at processedSolSignatures
 
  Read Operation Details: Anyone can read. Audit log contains no secrets - only public Solana tx signature, wallet address, verified USD/lamport amounts, optional purchaseId link, and processedAt timestamp. Used for audit, debugging, and lookup of consumed signatures.
  
 */
export declare function subscribeAllProcessedSolSignatures(callback: (data: ProcessedSolSignaturesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Backend-only (Cloudflare Worker signs Tarobase requests with PROJECT_VAULT_PRIVATE_KEY, so @user.address resolves to @constants.PROJECT_VAULT_ADDRESS). Used by a weekly Heartbeat task to prune entries older than 90 days, keeping this anti-replay audit log bounded. Old entries are safe to remove once the chargeback/replay window has passed - any reasonable replay attempt would have surfaced well before then.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteProcessedSolSignatures(signature: string): Promise<boolean>;
/**
 * Build a delete operation for ProcessedSolSignatures for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteProcessedSolSignatures(signature: string): DocumentOperation;
export interface RecoveryTransfersRequest {
    purchaseId: string;
    buyerAddress: AddressType;
    mintAddress: AddressType;
    amount: number | TimeOperation | IncrementOperation | TokenAmount;
    reason: string;
    status: string;
    txSignature?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    createdBy: AddressType;
}
export interface RecoveryTransfersResponse {
    purchaseId: string;
    buyerAddress: string;
    mintAddress: string;
    amount: number;
    reason: string;
    status: string;
    txSignature?: string;
    createdAt: number;
    createdBy: string;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a RecoveryTransfers operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildRecoveryTransfers(recoveryId: string, data?: RecoveryTransfersRequest): DocumentOperation;
/**
 * ONLY @constants.ADMIN_ADDRESS may create a recovery transfer. Admin MUST set createdBy == @constants.ADMIN_ADDRESS at create time (rule-enforced, prevents impersonation in audit trail). Creating the document atomically invokes the onchain hook: @TokenPlugin.transfer(PROJECT_VAULT_ADDRESS, buyerAddress, mintAddress, amount) — same vault-signing convention as songs/$songId/airdrops/$airdropId. If the transfer fails, document creation fails (atomic). If the document exists, the transfer succeeded onchain — admin should set status='pending' at create time; the real onchain success signal is the auto-populated tarobase_transaction_hash field. The optional txSignature field is reserved for callers who want to denormalize the signature at create time; otherwise rely on tarobase_transaction_hash. createdAt is Unix seconds at create. reason is a short admin-supplied tag (e.g. 'stuck_after_swap', 'partial_failure_recovery'). amount is in the token's smallest base units (matches songs/$songId/airdrops/$airdropId convention). purchaseId references the packPurchases/$purchaseId document being recovered. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setRecoveryTransfers(recoveryId: string, data?: RecoveryTransfersRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read (required because onchain data is inherently public on the blockchain). Anyone can inspect recovery transfer records. Sensitive operational context lives in the offchain packPurchases/$purchaseId record referenced by purchaseId.
   (Get Single Item)
 */
export declare function getRecoveryTransfers(recoveryId: string): Promise<RecoveryTransfersResponse | null>;
/**
 * Subscribes to changes in a single RecoveryTransfers document. (
  Read Operation Details: Public read (required because onchain data is inherently public on the blockchain). Anyone can inspect recovery transfer records. Sensitive operational context lives in the offchain packPurchases/$purchaseId record referenced by purchaseId.
  )
 */
export declare function subscribeRecoveryTransfers(callback: (data: RecoveryTransfersResponse | null) => void, recoveryId: string): Promise<() => Promise<void>>;
/**
 * Get many RecoveryTransfers items from collection recoveryTransfers
 
  Read Operation Details: Public read (required because onchain data is inherently public on the blockchain). Anyone can inspect recovery transfer records. Sensitive operational context lives in the offchain packPurchases/$purchaseId record referenced by purchaseId.
  
 */
export declare function getManyRecoveryTransfers(filter?: string): Promise<RecoveryTransfersResponse[]>;
/**
 * Subscribe to changes in RecoveryTransfers collection at recoveryTransfers
 
  Read Operation Details: Public read (required because onchain data is inherently public on the blockchain). Anyone can inspect recovery transfer records. Sensitive operational context lives in the offchain packPurchases/$purchaseId record referenced by purchaseId.
  
 */
export declare function subscribeManyRecoveryTransfers(callback: (data: RecoveryTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all RecoveryTransfers items from collection recoveryTransfers
 
  Read Operation Details: Public read (required because onchain data is inherently public on the blockchain). Anyone can inspect recovery transfer records. Sensitive operational context lives in the offchain packPurchases/$purchaseId record referenced by purchaseId.
  
 */
export declare function getAllRecoveryTransfers(filter?: string): Promise<RecoveryTransfersResponse[]>;
/**
 * Subscribe to changes in RecoveryTransfers collection at recoveryTransfers
 
  Read Operation Details: Public read (required because onchain data is inherently public on the blockchain). Anyone can inspect recovery transfer records. Sensitive operational context lives in the offchain packPurchases/$purchaseId record referenced by purchaseId.
  
 */
export declare function subscribeAllRecoveryTransfers(callback: (data: RecoveryTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
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
export interface WalletTransfersRequest {
    fromAddress: AddressType;
    toAddress: AddressType;
    amountLamports: number | TimeOperation | IncrementOperation | TokenAmount;
    amountSol: string;
    signature: string;
    tokenType: string;
    status: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    amountUsdc?: string;
}
export interface WalletTransfersResponse {
    fromAddress: string;
    toAddress: string;
    amountLamports: number;
    amountSol: string;
    signature: string;
    tokenType: string;
    status: string;
    createdAt: number;
    amountUsdc?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a WalletTransfers operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildWalletTransfers(transferId: string, data: WalletTransfersRequest): DocumentOperation;
/**
 * Authenticated users can create records for their own sends (fromAddress must match their wallet). The backend vault (PROJECT_VAULT_ADDRESS) can also create pending records on behalf of users during the server-side prepare flow. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setWalletTransfers(transferId: string, data: WalletTransfersRequest): Promise<boolean>;
export type WalletTransfersRequestUpdate = Partial<WalletTransfersRequest>;
/**
 * Build a WalletTransfers update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateWalletTransfers(transferId: string, data: WalletTransfersRequestUpdate): DocumentOperation;
/**
 * Backend vault only (PROJECT_VAULT_ADDRESS). Updates status from pending to confirmed/failed and sets the transaction signature after the user signs and broadcasts the transfer. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateWalletTransfers(transferId: string, data: WalletTransfersRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Publicly readable. Anyone can view the transfer audit log for transparency.
   (Get Single Item)
 */
export declare function getWalletTransfers(transferId: string): Promise<WalletTransfersResponse | null>;
/**
 * Subscribes to changes in a single WalletTransfers document. (
  Read Operation Details: Publicly readable. Anyone can view the transfer audit log for transparency.
  )
 */
export declare function subscribeWalletTransfers(callback: (data: WalletTransfersResponse | null) => void, transferId: string): Promise<() => Promise<void>>;
/**
 * Get many WalletTransfers items from collection walletTransfers
 
  Read Operation Details: Publicly readable. Anyone can view the transfer audit log for transparency.
  
 */
export declare function getManyWalletTransfers(filter?: string): Promise<WalletTransfersResponse[]>;
/**
 * Subscribe to changes in WalletTransfers collection at walletTransfers
 
  Read Operation Details: Publicly readable. Anyone can view the transfer audit log for transparency.
  
 */
export declare function subscribeManyWalletTransfers(callback: (data: WalletTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all WalletTransfers items from collection walletTransfers
 
  Read Operation Details: Publicly readable. Anyone can view the transfer audit log for transparency.
  
 */
export declare function getAllWalletTransfers(filter?: string): Promise<WalletTransfersResponse[]>;
/**
 * Subscribe to changes in WalletTransfers collection at walletTransfers
 
  Read Operation Details: Publicly readable. Anyone can view the transfer audit log for transparency.
  
 */
export declare function subscribeAllWalletTransfers(callback: (data: WalletTransfersResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
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
export interface CuratedTrendingRequest {
    songId: string;
    addedAt: number | TimeOperation | IncrementOperation | TokenAmount;
    addedBy: AddressType;
    order?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface CuratedTrendingResponse {
    songId: string;
    addedAt: number;
    addedBy: string;
    order?: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a CuratedTrending operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildCuratedTrending(songId: string, data?: CuratedTrendingRequest): DocumentOperation;
/**
 * Admin only (@user.address must equal @constants.ADMIN_ADDRESS). Document ID is the songId, enforcing uniqueness. Validates that the referenced song exists in /songs/$songId. The addedBy field must equal the caller's wallet, and songId must equal the document path segment. The `order` field is optional on create. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setCuratedTrending(songId: string, data?: CuratedTrendingRequest): Promise<boolean>;
export type CuratedTrendingRequestUpdate = Partial<CuratedTrendingRequest>;
/**
 * Build a CuratedTrending update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateCuratedTrending(songId: string, data: CuratedTrendingRequestUpdate): DocumentOperation;
/**
 * Admin only (@user.address must equal @constants.ADMIN_ADDRESS). Used for manual drag-to-reorder: admin updates the optional `order` field (lower = displayed first). Immutable fields (songId, addedBy, addedAt) cannot change — the rule enforces that @newData values for these fields equal the existing @data values, so effectively only `order` can be modified. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateCuratedTrending(songId: string, data: CuratedTrendingRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
   (Get Single Item)
 */
export declare function getCuratedTrending(songId: string): Promise<CuratedTrendingResponse | null>;
/**
 * Subscribes to changes in a single CuratedTrending document. (
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  )
 */
export declare function subscribeCuratedTrending(callback: (data: CuratedTrendingResponse | null) => void, songId: string): Promise<() => Promise<void>>;
/**
 * Get many CuratedTrending items from collection curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function getManyCuratedTrending(filter?: string): Promise<CuratedTrendingResponse[]>;
/**
 * Subscribe to changes in CuratedTrending collection at curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function subscribeManyCuratedTrending(callback: (data: CuratedTrendingResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all CuratedTrending items from collection curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function getAllCuratedTrending(filter?: string): Promise<CuratedTrendingResponse[]>;
/**
 * Subscribe to changes in CuratedTrending collection at curatedTrending
 
  Read Operation Details: Public. Anyone can read curated trending entries (used by homepage Trending section).
  
 */
export declare function subscribeAllCuratedTrending(callback: (data: CuratedTrendingResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Admin only (@user.address must equal @constants.ADMIN_ADDRESS). Removes the song from the curated trending list.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteCuratedTrending(songId: string): Promise<boolean>;
/**
 * Build a delete operation for CuratedTrending for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteCuratedTrending(songId: string): DocumentOperation;
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
export interface StreamEventsRequest {
    songId: string;
    userAddress: AddressType;
    duration: number | TimeOperation | IncrementOperation | TokenAmount;
    timestamp: number | TimeOperation | IncrementOperation | TokenAmount;
    source: string;
}
export interface StreamEventsResponse {
    songId: string;
    userAddress: string;
    duration: number;
    timestamp: number;
    source: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a StreamEvents operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildStreamEvents(eventId: string, data: StreamEventsRequest): DocumentOperation;
/**
 * Authenticated users can log their own streams (userAddress must match caller wallet). Backend vault and operations wallet can also log on behalf of users. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setStreamEvents(eventId: string, data: StreamEventsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
   (Get Single Item)
 */
export declare function getStreamEvents(eventId: string): Promise<StreamEventsResponse | null>;
/**
 * Subscribes to changes in a single StreamEvents document. (
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  )
 */
export declare function subscribeStreamEvents(callback: (data: StreamEventsResponse | null) => void, eventId: string): Promise<() => Promise<void>>;
/**
 * Get many StreamEvents items from collection streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function getManyStreamEvents(filter?: string): Promise<StreamEventsResponse[]>;
/**
 * Subscribe to changes in StreamEvents collection at streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function subscribeManyStreamEvents(callback: (data: StreamEventsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all StreamEvents items from collection streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function getAllStreamEvents(filter?: string): Promise<StreamEventsResponse[]>;
/**
 * Subscribe to changes in StreamEvents collection at streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function subscribeAllStreamEvents(callback: (data: StreamEventsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface SupportTicketsRequest {
    type: string;
    subject: string;
    message: string;
    status: string;
    userAddress?: AddressType;
    userEmail: string;
    claimantName?: string;
    contentUrl?: string;
    originalWorkUrl?: string;
    goodFaithStatement?: boolean;
    priority: string;
    adminNotes?: string;
    resolution?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    resolvedAt?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SupportTicketsResponse {
    type: string;
    subject: string;
    message: string;
    status: string;
    userAddress?: string;
    userEmail: string;
    claimantName?: string;
    contentUrl?: string;
    originalWorkUrl?: string;
    goodFaithStatement?: boolean;
    priority: string;
    adminNotes?: string;
    resolution?: string;
    createdAt: number;
    resolvedAt?: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SupportTickets operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSupportTickets(ticketId: string, data: SupportTicketsRequest): DocumentOperation;
/**
 * Any authenticated user (wallet-connected) or backend vault/operations wallet can create tickets. Frontend should enforce DMCA field completeness. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSupportTickets(ticketId: string, data: SupportTicketsRequest): Promise<boolean>;
export type SupportTicketsRequestUpdate = Partial<SupportTicketsRequest>;
/**
 * Build a SupportTickets update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSupportTickets(ticketId: string, data: SupportTicketsRequestUpdate): DocumentOperation;
/**
 * Admin or backend vault/operations only. Used for status changes, priority updates, admin notes, and resolutions. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSupportTickets(ticketId: string, data: SupportTicketsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
   (Get Single Item)
 */
export declare function getSupportTickets(ticketId: string): Promise<SupportTicketsResponse | null>;
/**
 * Subscribes to changes in a single SupportTickets document. (
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  )
 */
export declare function subscribeSupportTickets(callback: (data: SupportTicketsResponse | null) => void, ticketId: string): Promise<() => Promise<void>>;
/**
 * Get many SupportTickets items from collection supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function getManySupportTickets(filter?: string): Promise<SupportTicketsResponse[]>;
/**
 * Subscribe to changes in SupportTickets collection at supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function subscribeManySupportTickets(callback: (data: SupportTicketsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SupportTickets items from collection supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function getAllSupportTickets(filter?: string): Promise<SupportTicketsResponse[]>;
/**
 * Subscribe to changes in SupportTickets collection at supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function subscribeAllSupportTickets(callback: (data: SupportTicketsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface ErrorLogsRequest {
    level: string;
    message: string;
    stack?: string;
    context?: string;
    source: string;
    userAddress?: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    environment: string;
    appVersion: string;
    resolved: boolean;
}
export interface ErrorLogsResponse {
    level: string;
    message: string;
    stack?: string;
    context?: string;
    source: string;
    userAddress?: string;
    createdAt: number;
    environment: string;
    appVersion: string;
    resolved: boolean;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ErrorLogs operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildErrorLogs(logId: string, data: ErrorLogsRequest): DocumentOperation;
/**
 * Any authenticated user or backend vault/operations wallet can report errors. Frontend should capture component and action context. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setErrorLogs(logId: string, data: ErrorLogsRequest): Promise<boolean>;
export type ErrorLogsRequestUpdate = Partial<ErrorLogsRequest>;
/**
 * Build a ErrorLogs update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateErrorLogs(logId: string, data: ErrorLogsRequestUpdate): DocumentOperation;
/**
 * Admin or backend vault/operations only. Used to mark errors as resolved or add resolution notes. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateErrorLogs(logId: string, data: ErrorLogsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
   (Get Single Item)
 */
export declare function getErrorLogs(logId: string): Promise<ErrorLogsResponse | null>;
/**
 * Subscribes to changes in a single ErrorLogs document. (
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  )
 */
export declare function subscribeErrorLogs(callback: (data: ErrorLogsResponse | null) => void, logId: string): Promise<() => Promise<void>>;
/**
 * Get many ErrorLogs items from collection errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function getManyErrorLogs(filter?: string): Promise<ErrorLogsResponse[]>;
/**
 * Subscribe to changes in ErrorLogs collection at errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function subscribeManyErrorLogs(callback: (data: ErrorLogsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ErrorLogs items from collection errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function getAllErrorLogs(filter?: string): Promise<ErrorLogsResponse[]>;
/**
 * Subscribe to changes in ErrorLogs collection at errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function subscribeAllErrorLogs(callback: (data: ErrorLogsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface NotificationsRequest {
    recipientAddress: AddressType;
    type: string;
    actorAddress: string;
    actorName: string;
    referenceId: string;
    referenceTitle: string;
    message: string;
    isRead: boolean;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface NotificationsResponse {
    recipientAddress: string;
    type: string;
    actorAddress: string;
    actorName: string;
    referenceId: string;
    referenceTitle: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Notifications operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildNotifications(notificationId: string, data: NotificationsRequest): DocumentOperation;
/**
 * Only the backend server (PROJECT_VAULT_ADDRESS) can create notifications. Frontend clients cannot create notifications directly; they are generated server-side in response to platform events. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setNotifications(notificationId: string, data: NotificationsRequest): Promise<boolean>;
export type NotificationsRequestUpdate = Partial<NotificationsRequest>;
/**
 * Build a Notifications update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateNotifications(notificationId: string, data: NotificationsRequestUpdate): DocumentOperation;
/**
 * Only the recipient can update their own notifications. The typical use case is marking isRead from false to true. No other fields should be modified by recipients. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateNotifications(notificationId: string, data: NotificationsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
   (Get Single Item)
 */
export declare function getNotifications(notificationId: string): Promise<NotificationsResponse | null>;
/**
 * Subscribes to changes in a single Notifications document. (
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  )
 */
export declare function subscribeNotifications(callback: (data: NotificationsResponse | null) => void, notificationId: string): Promise<() => Promise<void>>;
/**
 * Get many Notifications items from collection notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function getManyNotifications(filter?: string): Promise<NotificationsResponse[]>;
/**
 * Subscribe to changes in Notifications collection at notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function subscribeManyNotifications(callback: (data: NotificationsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Notifications items from collection notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function getAllNotifications(filter?: string): Promise<NotificationsResponse[]>;
/**
 * Subscribe to changes in Notifications collection at notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function subscribeAllNotifications(callback: (data: NotificationsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface UsernamesRequest {
    userAddress: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface UsernamesResponse {
    userAddress: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Usernames operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUsernames(username: string, data: UsernamesRequest): DocumentOperation;
/**
 * Users can claim a username by creating a document with their wallet address as userAddress. Backend (PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET) and ADMIN_ADDRESS can also create username mappings. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setUsernames(username: string, data: UsernamesRequest): Promise<boolean>;
export type UsernamesRequestUpdate = Partial<UsernamesRequest>;
/**
 * Build a Usernames update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateUsernames(username: string, data: UsernamesRequestUpdate): DocumentOperation;
/**
 * Username mapping can be updated by the owner of the wallet address, or by backend/admin accounts. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateUsernames(username: string, data: UsernamesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
   (Get Single Item)
 */
export declare function getUsernames(username: string): Promise<UsernamesResponse | null>;
/**
 * Subscribes to changes in a single Usernames document. (
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  )
 */
export declare function subscribeUsernames(callback: (data: UsernamesResponse | null) => void, username: string): Promise<() => Promise<void>>;
/**
 * Get many Usernames items from collection usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function getManyUsernames(filter?: string): Promise<UsernamesResponse[]>;
/**
 * Subscribe to changes in Usernames collection at usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function subscribeManyUsernames(callback: (data: UsernamesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Usernames items from collection usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function getAllUsernames(filter?: string): Promise<UsernamesResponse[]>;
/**
 * Subscribe to changes in Usernames collection at usernames
 
  Read Operation Details: Public read. Anyone can look up which wallet address owns a username.
  
 */
export declare function subscribeAllUsernames(callback: (data: UsernamesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
export interface PortfolioHistorySnapshotsRequest {
    valueUsd: number | TimeOperation | IncrementOperation | TokenAmount;
    solValue: number | TimeOperation | IncrementOperation | TokenAmount;
    tokenValue: number | TimeOperation | IncrementOperation | TokenAmount;
    timestamp: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PortfolioHistorySnapshotsResponse {
    valueUsd: number;
    solValue: number;
    tokenValue: number;
    timestamp: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PortfolioHistorySnapshots operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequest): DocumentOperation;
/**
 * Users can only create snapshots for their own address. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequest): Promise<boolean>;
export type PortfolioHistorySnapshotsRequestUpdate = Partial<PortfolioHistorySnapshotsRequest>;
/**
 * Build a PortfolioHistorySnapshots update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequestUpdate): DocumentOperation;
/**
 * Users can only update their own snapshots. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Users can only read their own portfolio history snapshots.
   (Get Single Item)
 */
export declare function getPortfolioHistorySnapshots(userAddress: string, snapshotId: string): Promise<PortfolioHistorySnapshotsResponse | null>;
/**
 * Subscribes to changes in a single PortfolioHistorySnapshots document. (
  Read Operation Details: Users can only read their own portfolio history snapshots.
  )
 */
export declare function subscribePortfolioHistorySnapshots(callback: (data: PortfolioHistorySnapshotsResponse | null) => void, userAddress: string, snapshotId: string): Promise<() => Promise<void>>;
/**
 * Get many PortfolioHistorySnapshots items from collection portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function getManyPortfolioHistorySnapshots(userAddress: string, filter?: string): Promise<PortfolioHistorySnapshotsResponse[]>;
/**
 * Subscribe to changes in PortfolioHistorySnapshots collection at portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function subscribeManyPortfolioHistorySnapshots(callback: (data: PortfolioHistorySnapshotsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PortfolioHistorySnapshots items from collection portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function getAllPortfolioHistorySnapshots(userAddress: string, filter?: string): Promise<PortfolioHistorySnapshotsResponse[]>;
/**
 * Subscribe to changes in PortfolioHistorySnapshots collection at portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function subscribeAllPortfolioHistorySnapshots(callback: (data: PortfolioHistorySnapshotsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Users can only delete their own snapshots.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePortfolioHistorySnapshots(userAddress: string, snapshotId: string): Promise<boolean>;
/**
 * Build a delete operation for PortfolioHistorySnapshots for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePortfolioHistorySnapshots(userAddress: string, snapshotId: string): DocumentOperation;
export interface ApplePayDailyBudgetRequest {
    date: string;
    reservedUsd: number | IncrementOperation | TokenAmount;
    fulfilledUsd: number | IncrementOperation | TokenAmount;
    reservations: string;
    updatedAt: number | IncrementOperation | TokenAmount;
}
export interface ApplePayDailyBudgetResponse {
    date: string;
    reservedUsd: number;
    fulfilledUsd: number;
    reservations: string;
    updatedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ApplePayDailyBudget operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequest): DocumentOperation;
/**
 * Backend only. PROJECT_VAULT_ADDRESS creates the day's record on first checkout of the day with initial reservedUsd=0, fulfilledUsd=0, reservations='[]'. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequest): Promise<boolean>;
export type ApplePayDailyBudgetRequestUpdate = Partial<ApplePayDailyBudgetRequest>;
/**
 * Build a ApplePayDailyBudget update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequestUpdate): DocumentOperation;
/**
 * Backend only. PROJECT_VAULT_ADDRESS updates reservedUsd (increment on checkout creation, decrement on fulfillment/expiration) and fulfilledUsd (increment on webhook fulfillment). Also updates reservations JSON and updatedAt. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
   (Get Single Item)
 */
export declare function getApplePayDailyBudget(date: string): Promise<ApplePayDailyBudgetResponse | null>;
/**
 * Subscribes to changes in a single ApplePayDailyBudget document. (
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  )
 */
export declare function subscribeApplePayDailyBudget(callback: (data: ApplePayDailyBudgetResponse | null) => void, date: string): Promise<() => Promise<void>>;
/**
 * Get many ApplePayDailyBudget items from collection applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function getManyApplePayDailyBudget(filter?: string): Promise<ApplePayDailyBudgetResponse[]>;
/**
 * Subscribe to changes in ApplePayDailyBudget collection at applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function subscribeManyApplePayDailyBudget(callback: (data: ApplePayDailyBudgetResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ApplePayDailyBudget items from collection applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function getAllApplePayDailyBudget(filter?: string): Promise<ApplePayDailyBudgetResponse[]>;
/**
 * Subscribe to changes in ApplePayDailyBudget collection at applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function subscribeAllApplePayDailyBudget(callback: (data: ApplePayDailyBudgetResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
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
export {};
