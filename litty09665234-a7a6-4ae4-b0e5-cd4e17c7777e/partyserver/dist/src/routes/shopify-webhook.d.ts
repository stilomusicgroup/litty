/**
 * Legacy shopify webhook file — kept for PackConfig type and getPackBySku export.
 *
 * The active Shopify webhook handler is registered inline in routes/index.ts at
 * POST /api/webhooks/packs/fulfill. That handler is the only one Shopify calls.
 *
 * fulfillPackLineItem and registerPackWebhookRoutes have been DELETED (2026-05-19).
 * Both functions were legacy code that:
 *   - Bypassed treasury/infra/safeguards
 *   - Never wrote bondingCurveBuySubmitted idempotency flag
 *   - Fired runStepPayout in a detached promise
 *   - Set infraFeeStatus/treasuryFeeStatus=true without doing the work
 * The canonical pipeline is runAllSteps() in utils/fulfillment-steps.ts.
 */
export interface PackConfig {
    id: string;
    sku: string;
    name: string;
    nftCount: number;
    artistPayout: number;
    priceUsd: number;
    platformSlice: number;
    price: string;
    tagline: string;
    gradient: string;
}
/**
 * Return the open-amount pack descriptor for any recognised pack_* SKU,
 * or undefined for unrecognised SKUs (so webhook dedup continues to work).
 */
export declare function getPackBySku(sku: string): PackConfig | undefined;
