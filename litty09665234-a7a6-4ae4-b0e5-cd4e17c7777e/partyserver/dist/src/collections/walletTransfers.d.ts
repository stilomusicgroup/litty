import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Audit log for user-initiated wallet-to-wallet SOL transfers. Records are created from the frontend after a successful Phantom-signed transaction. Each user can only create records for their own sends (fromAddress must match their wallet address).
 */
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
/**
 * Count WalletTransfers items in collection walletTransfers.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countWalletTransfers(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on WalletTransfers items in collection walletTransfers.
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
export declare function aggregateWalletTransfers(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
