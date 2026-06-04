import { IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
/**
 * Offchain audit log for webhook verification failures (HMAC, signature, parse errors). Backend-only writes; admin-only reads. Used to surface silent failures in an admin UI and to drive Discord alerts when failure clusters are detected.
 */
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
