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
// SOL price fetching is now exclusively handled by price-capture.ts — no duplicate cache here.
// ARTIST_PAYOUT_RATIO (0.69) removed: v20 tokenomics routes artist earnings through 5% SPL
// tokens on the bonding curve (runStepPayout in fulfillment-steps.ts).
// executeArtistPayoutWithRetry removed: all payout logic lives in runStepPayout.
// ─── Pack SKU lookup ──────────────────────────────────────────────────────────
//
// Open-amount build: any pack_* SKU is treated as the open-amount pack.
// The static pack tiers (studio/platinum/diamond/legend) no longer exist —
// all pricing comes from purchaseAmountUsd stored on the packPurchase record.
/** Synthetic open-amount pack returned for any recognised pack_* SKU. */
const OPEN_AMOUNT_PACK = {
    id: 'studio',
    sku: 'pack_studio',
    name: 'Open Amount',
    nftCount: 0,
    artistPayout: 0,
    priceUsd: 0,
    platformSlice: 0,
    price: 'Pay what you want',
    tagline: 'Support your artist',
    gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
};
/**
 * Return the open-amount pack descriptor for any recognised pack_* SKU,
 * or undefined for unrecognised SKUs (so webhook dedup continues to work).
 */
export function getPackBySku(sku) {
    // Accept any pack_* SKU — the actual price comes from purchaseAmountUsd
    if (typeof sku === 'string' && sku.startsWith('pack_')) {
        return { ...OPEN_AMOUNT_PACK, sku };
    }
    return undefined;
}
