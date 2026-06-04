import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
/**
 * Admin retry queue for failed purchase fulfillments. Backend writes records here when ANY step (fee transfer, airdrop, or both) fails during pack/song purchase fulfillment, ensuring all-or-nothing atomicity per project policy. Admin can read, retry, and resolve entries.
 */
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
