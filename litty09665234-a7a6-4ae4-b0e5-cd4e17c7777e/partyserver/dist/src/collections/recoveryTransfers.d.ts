import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Admin-only onchain recovery transfers. Replaces the legacy raw-signed SPL transfer in the admin recovery API route. Creating a document atomically transfers @newData.amount of @newData.mintAddress from PROJECT_VAULT_ADDRESS to @newData.buyerAddress via @TokenPlugin.transfer, enforcing policy/audit/immutability the same way every other vault-signed token movement in this app does (see songs/$songId/airdrops/$airdropId).
 */
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
/**
 * Count RecoveryTransfers items in collection recoveryTransfers.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countRecoveryTransfers(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on RecoveryTransfers items in collection recoveryTransfers.
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
export declare function aggregateRecoveryTransfers(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
