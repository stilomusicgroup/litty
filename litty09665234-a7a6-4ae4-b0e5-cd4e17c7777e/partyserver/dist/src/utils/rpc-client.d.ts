/**
 * Solana RPC client with Helius fallback.
 *
 * Tries the primary RPC first; on connection error or timeout,
 * falls back to Helius. Logs which endpoint was used.
 */
import { Connection } from '@solana/web3.js';
/**
 * Return the best available RPC URL, trying primary first then Helius fallback.
 */
export declare function getRpcUrlWithFallback(env?: unknown): Promise<string>;
/**
 * Create a Solana Connection using the best available RPC endpoint.
 * Tries primary first, falls back to Helius on failure.
 */
export declare function createConnection(env?: unknown, commitment?: 'confirmed' | 'finalized' | 'processed'): Promise<Connection>;
