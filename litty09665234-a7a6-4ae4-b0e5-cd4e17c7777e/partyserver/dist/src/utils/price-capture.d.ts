/**
 * SOL/USD price capture helper.
 *
 * DESIGN CONSTRAINTS:
 * - Every call performs a fresh network fetch — NO module-level cache.
 *   The caller stores the captured price on the purchase record; downstream
 *   code reads from there. This ensures each purchase gets its own
 *   point-in-time price.
 * - Never throws. Returns null on total failure so the caller can mark
 *   the purchase as `pending_price_fetch` and retry via heartbeat.
 * - Fallback chain: CoinMarketCap v2 → Jupiter Price API v2.
 * - Hardcoded fallback prices are explicitly forbidden here — callers must
 *   handle null and schedule a retry rather than guess a price.
 */
export interface CapturedSolPrice {
    priceUsd: number;
    timestampMs: number;
    source: 'coinmarketcap' | 'jupiter';
}
/**
 * Fetch a fresh SOL/USD price for a single purchase.
 *
 * Tries CoinMarketCap first, then Jupiter. Returns null when BOTH fail —
 * the caller must mark the purchase `pending_price_fetch` and retry.
 * DO NOT fall back to a hardcoded price: doing so would silently under/over
 * pay recipients.
 *
 * @param cmcApiKey  Value of the COINMARKETCAP_API_KEY env variable.
 */
export declare function captureSolPriceUsd(cmcApiKey?: string): Promise<CapturedSolPrice | null>;
/**
 * Scale a USD price to micro-USD integer for storage in Poof (no Float type).
 * Example: $245.67 → 245_670_000
 */
export declare function scaleToMicroUsd(priceUsd: number): number;
/**
 * Unscale micro-USD back to a USD float.
 * Example: 245_670_000 → 245.67
 */
export declare function unscaleFromMicroUsd(microUsd: number): number;
/**
 * Calculate lamports from a USD amount using a captured micro-USD price.
 *
 * @param amountUsd     Amount in USD (e.g. 10.99)
 * @param microUsdPrice solPriceAtPurchaseUsd field from the packPurchase record
 */
export declare function calcLamportsFromCapturedPrice(amountUsd: number, microUsdPrice: number): number;
