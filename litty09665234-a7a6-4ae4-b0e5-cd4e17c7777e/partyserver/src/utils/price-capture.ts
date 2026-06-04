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

// Module-level in-memory cache with 60-second TTL
const priceCache = new Map<string, { price: number; fetchedAt: number; source: 'coinmarketcap' | 'jupiter' }>();
const CACHE_TTL_MS = 60_000;

function getCachedPrice(): CapturedSolPrice | null {
  const entry = priceCache.get('SOL');
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
    priceCache.delete('SOL');
    return null;
  }
  return { priceUsd: entry.price, timestampMs: entry.fetchedAt, source: entry.source };
}

function setCachedPrice(price: number, source: 'coinmarketcap' | 'jupiter'): void {
  priceCache.set('SOL', { price, fetchedAt: Date.now(), source });
}

/**
 * Attempt to fetch SOL/USD from CoinMarketCap v2 endpoint.
 * Returns the price in USD or null on any failure.
 */
async function tryCoinMarketCap(apiKey: string): Promise<number | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=SOL',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey,
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[PriceCapture] CoinMarketCap returned HTTP ${res.status}`);
      return null;
    }

    // v2 endpoint wraps each symbol in an array keyed by symbol name
    type CmcV2Shape = {
      data?: {
        SOL?: Array<{ quote?: { USD?: { price?: number } } }>;
      };
    };
    const json = (await res.json()) as CmcV2Shape;
    const price = json?.data?.SOL?.[0]?.quote?.USD?.price;
    if (typeof price === 'number' && price > 0) {
      return price;
    }
    console.warn('[PriceCapture] CoinMarketCap response missing price field');
    return null;
  } catch (err) {
    console.warn(
      '[PriceCapture] CoinMarketCap fetch failed:',
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
}

/**
 * Attempt to fetch SOL/USD from Jupiter Price API v2.
 * Returns the price in USD or null on any failure.
 */
async function tryJupiter(): Promise<number | null> {
  // Wrapped SOL mint address
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://api.jup.ag/price/v2?ids=${SOL_MINT}`,
      {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[PriceCapture] Jupiter returned HTTP ${res.status}`);
      return null;
    }

    type JupV2Shape = { data?: Record<string, { price?: string }> };
    const json = (await res.json()) as JupV2Shape;
    const priceStr = json?.data?.[SOL_MINT]?.price;
    const price = priceStr ? parseFloat(priceStr) : null;
    if (price !== null && price > 0) {
      return price;
    }
    console.warn('[PriceCapture] Jupiter response missing price field');
    return null;
  } catch (err) {
    console.warn(
      '[PriceCapture] Jupiter fetch failed:',
      err instanceof Error ? err.message : String(err),
    );
    return null;
  }
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
export async function captureSolPriceUsd(
  cmcApiKey?: string,
): Promise<CapturedSolPrice | null> {
  const cached = getCachedPrice();
  if (cached) {
    console.log(
      `[PriceCapture] Using cached SOL/USD: $${cached.priceUsd.toFixed(4)} (age=${Date.now() - cached.timestampMs}ms)`,
    );
    return cached;
  }

  const timestampMs = Date.now();

  // Source 1: CoinMarketCap (primary)
  if (cmcApiKey) {
    const price = await tryCoinMarketCap(cmcApiKey);
    if (price !== null) {
      setCachedPrice(price, 'coinmarketcap');
      console.log(
        `[PriceCapture] CoinMarketCap: $${price.toFixed(4)} at ${new Date(timestampMs).toISOString()}`,
      );
      return { priceUsd: price, timestampMs, source: 'coinmarketcap' };
    }
  } else {
    console.warn(
      '[PriceCapture] COINMARKETCAP_API_KEY not provided — skipping primary source',
    );
  }

  // Source 2: Jupiter (fallback)
  const price = await tryJupiter();
  if (price !== null) {
    setCachedPrice(price, 'jupiter');
    console.log(
      `[PriceCapture] Jupiter fallback: $${price.toFixed(4)} at ${new Date(timestampMs).toISOString()}`,
    );
    return { priceUsd: price, timestampMs, source: 'jupiter' };
  }

  // Both sources failed — signal the caller to retry
  console.error(
    '[PriceCapture] ALL sources failed — cannot provide SOL/USD price for this purchase',
  );
  return null;
}

/**
 * Scale a USD price to micro-USD integer for storage in Poof (no Float type).
 * Example: $245.67 → 245_670_000
 */
export function scaleToMicroUsd(priceUsd: number): number {
  return Math.floor(priceUsd * 1_000_000);
}

/**
 * Unscale micro-USD back to a USD float.
 * Example: 245_670_000 → 245.67
 */
export function unscaleFromMicroUsd(microUsd: number): number {
  return microUsd / 1_000_000;
}

/**
 * Calculate lamports from a USD amount using a captured micro-USD price.
 *
 * @param amountUsd     Amount in USD (e.g. 10.99)
 * @param microUsdPrice solPriceAtPurchaseUsd field from the packPurchase record
 */
export function calcLamportsFromCapturedPrice(
  amountUsd: number,
  microUsdPrice: number,
): number {
  const usdPrice = unscaleFromMicroUsd(microUsdPrice);
  return Math.floor((amountUsd / usdPrice) * 1_000_000_000);
}
