import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
/**
 * Audit trail for Shopify webhook purchases. Only the backend (PROJECT_VAULT_ADDRESS) can create and update these records.
 */
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
