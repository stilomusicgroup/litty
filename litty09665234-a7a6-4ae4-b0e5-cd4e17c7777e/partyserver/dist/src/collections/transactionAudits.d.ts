import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Transaction audit log for recording every artist SOL payout attempt with math validation details. Created by webhook backend after payout processing.
 */
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
/**
 * Count TransactionAudits items in collection transactionAudits.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countTransactionAudits(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on TransactionAudits items in collection transactionAudits.
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
export declare function aggregateTransactionAudits(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
