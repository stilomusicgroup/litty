import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Anti-replay protection record for Solana transaction signatures consumed by POST /api/direct-sol-purchase. Once the backend verifies a Solana tx signature via RPC, it writes a record here keyed by signature so duplicate submissions are rejected (immutable audit log).
 */
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
 * Count ProcessedSolSignatures items in collection processedSolSignatures.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countProcessedSolSignatures(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on ProcessedSolSignatures items in collection processedSolSignatures.
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
export declare function aggregateProcessedSolSignatures(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
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
