/**
 * pack-fulfillment queue consumer
 *
 * Runs the durable multi-step fulfillment pipeline for a packPurchases record
 * without the ~30s wall-clock ceiling that waitUntil imposes on Cloudflare Workers.
 *
 * Pipeline (same as the old runAllSteps call in the webhook):
 *   1. runAllSteps(purchaseId) — price capture, token transfer, artist payout, NFT mint, notify
 *   2. Mark Shopify order as fulfilled if all steps completed
 *   3. Record fulfillment cost in operationsFulfillmentCosts
 *   4. Send receipt email via Resend (skipped if no email address)
 *
 * Idempotency: runAllSteps reads step flags (stepTokens/stepPayout/stepNft/stepNotify)
 * and skips already-completed steps, so retries are safe at any attempt count.
 *
 * Error handling: any unhandled throw causes the Poof queue runner to retry
 * according to the retryDelaySeconds + maxRetries config in queues.json.
 * After maxRetries the message is dead-lettered.
 */
import type { QueueHandler } from './index.js';
export interface PackFulfillmentPayload {
    /** ID of the packPurchases record to fulfill */
    purchaseId: string;
    /** Buyer email — used for receipt; empty string for Direct SOL purchases */
    email: string;
    /** Shopify order ID — used for Shopify fulfillment marking */
    orderId: string;
}
export declare const packFulfillment: QueueHandler<PackFulfillmentPayload>;
