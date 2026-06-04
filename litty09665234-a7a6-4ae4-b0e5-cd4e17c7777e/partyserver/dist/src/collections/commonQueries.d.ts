import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Read-only queries for wallet balances and swap quotes. Supports SOL/USDC/SPL token balance lookups, Jupiter swap quotes, and Meteora dynamic bonding curve quotes.
 */
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
/**
 * Count CommonQueries items in collection commonQueries.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countCommonQueries(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on CommonQueries items in collection commonQueries.
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
export declare function aggregateCommonQueries(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
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
export {};
