// rebuild
/**
 * API Routes - Register all routes here.
 *
 * Two things to do when adding a route:
 * 1. Register the handler with app.get/post/put/delete/patch
 * 2. Add an entry to routeSpec[] so the API spec is generated for the platform
 *
 * For protected routes, use validatePoofAuth:
 *   import { validatePoofAuth } from '../lib/poof-auth.js';
 *   const { walletAddress } = await validatePoofAuth(c);
 */

import type { Hono } from 'hono';
import { z } from 'zod';
import bs58 from 'bs58';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createWalletClient, get } from '@pooflabs/server';
import { sendSuccess, ApiErrors } from '../lib/api-response.js';
import { validatePoofAuth } from '../lib/poof-auth.js';
import { getRpcUrl } from '../lib/config.js';
import { setPurchases, getPurchases, getManyPurchases, updatePurchases } from '../collections/purchases.js';
import { getSongDetails, getManySongDetails, updateSongDetails, setSongDetails } from '../collections/songDetails.js';
import { getSongs, getManySongs, getSongsAirdrops, runGetTokenBalanceQueryForSongs, runGetTokenMintAddressQueryForSongs, runGetBondingCurveProgressQueryForSongs, setSongsAirdrops, setSongs, updateSongs } from '../collections/songs.js';
import { getAlbums, runGetTokenMintAddressQueryForAlbums } from '../collections/albums.js';
import { setNftMints, getManyNftMints } from '../collections/nftMints.js';
import { getManyPacks } from '../collections/packs.js';
import { Time, set, Address, runQuery, Increment } from '../db-client.js';
import { getSongStreams, setSongStreams, updateSongStreams } from '../collections/songStreams.js';
import { getManyUsers, setUsers, getUsers } from '../collections/users.js';
import { getAppFiles, uploadAppFiles } from '../collections/appFiles.js';
import {
  getEditions,
  updateEditions,
  setEditionsMintNFT,
  setEditionsTransferToken,
  setEditionsPurchases,
  getManyEditionsPurchases,
} from '../collections/editions.js';
import {
  setPackPurchases,
  updatePackPurchases,
  getPackPurchases,
  getManyPackPurchases,
  PackPurchasesResponse,
} from '../collections/packPurchases.js';
import { getPacks } from '../collections/packs.js';
import { PROJECT_VAULT_ADDRESS, LIT_SAVINGS_WALLET, SHOPIFY_PRODUCT_ID, OPERATIONS_WALLET, MAX_DAILY_SOL_SPEND, VAULT_MIN_BALANCE_SOL, SOL_PRICE_MIN_USD, SOL_PRICE_MAX_USD, MIN_PURCHASE_USD, ADMIN_ADDRESS, APPLE_PAY_DAILY_CAP_CENTS } from '../constants.js';
import { setArtists, updateArtists, getArtists } from '../collections/artists.js';
import {
  setOperationsFulfillmentCosts,
  getManyOperationsFulfillmentCosts,
} from '../collections/operationsFulfillmentCosts.js';
import { getManyTransactionAudits } from '../collections/transactionAudits.js';
import { runAllSteps, runStepTokens, runStepAirdrop, runStepTreasuryTransfer, runStepInfraFee, runStepFundingFee, runStepPayout, runStepNft, runStepNotify, SHOPIFY_SHARES, DIRECT_SOL_SHARES } from '../utils/fulfillment-steps.js';
import { captureSolPriceUsd, scaleToMicroUsd } from '../utils/price-capture.js';
import { enqueueQueue } from '../lib/poof-queue.js';
import { getManyWebhookFailures, setWebhookFailures } from '../collections/webhookFailures.js';
import { getManyFailedFulfillments, getFailedFulfillments, updateFailedFulfillments, deleteFailedFulfillments } from '../collections/failedFulfillments.js';
import { logWebhookFailure } from '../utils/webhook-alerts.js';
import { getOrderByNumber, getOrderById, listRecentOrders, fulfillShopifyOrder, verifyOrderViaAdminApi } from '../utils/shopify-admin.js';
import type { ShopifyOrder } from '../utils/shopify-admin.js';
import { ensureVaultHasSongTokens, bondingCurveSell } from '../utils/bonding-curve-buy.js';
import { registerArtistWalletRoutes } from './artist-wallet.js';
import { registerSimulateBuyRoute } from './simulate-buy.js';
import { getProcessedSolSignatures, setProcessedSolSignatures } from '../collections/processedSolSignatures.js';
import { checkWalletRateLimit, checkChatRateLimit, ipRateLimitMiddleware } from '../utils/rate-limit.js';
import { createConnection, getRpcUrlWithFallback } from '../utils/rpc-client.js';
import { getManyStreamEvents } from '../collections/streamEvents.js';
import { setChatMessages } from '../collections/chatMessages.js';
import { setSupportTickets, getSupportTickets, updateSupportTickets } from '../collections/supportTickets.js';
import { setErrorLogs, updateErrorLogs } from '../collections/errorLogs.js';
import { getManyPriceHistory } from '../collections/priceHistory.js';

// ─── Pack Configuration (open-amount only — no fixed tiers) ────────────────────
//
// PACK_CONFIG tiers (studio/platinum/diamond/legend) have been removed.
// This file now uses open-amount (pay-what-you-want) checkout exclusively.
// The pack SKU used for open-amount orders is 'pack_studio' (the $1 Shopify variant).
// Fulfillment logic in fulfillment-steps.ts uses purchaseAmountUsd as the single source
// of truth for all lamport calculations — no static tier prices needed here.

interface PackConfig {
  id: string;
  sku: string;
  name: string;
  nftCount: number;
  artistPayout: number;
  priceUsd: number;
  platformSlice: number;
  tokenAmount?: number;
  price: string;
  tagline: string;
  gradient: string;
}

// Single open-amount pack entry — used by the webhook dedup check (packId lookup) and
// the seedPacksIfEmpty helper. All real pricing comes from purchaseAmountUsd.
const PACK_CONFIG: PackConfig[] = [
  { id: 'studio', sku: 'pack_studio', name: 'Open Amount', nftCount: 0, artistPayout: 0, priceUsd: 0, platformSlice: 0, price: 'Pay what you want', tagline: 'Support your artist', gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)' },
];

// ─── Operations Wallet Client ──────────────────────────────────────────────

/**
 * Create a wallet client for the operations treasury wallet.
 * Used as the fee payer for pack fulfillment on-chain operations.
 */
async function getOperationsWalletClient() {
  const key = process.env.OPERATIONS_WALLET_KEY;
  if (!key) throw new Error('OPERATIONS_WALLET_KEY not configured');
  return createWalletClient({ keypair: key });
}

/**
 * Get the operations wallet public key from environment or derive from keypair.
 */
function getOperationsWalletAddress(): string {
  if (process.env.OPERATIONS_WALLET_ADDRESS) {
    return process.env.OPERATIONS_WALLET_ADDRESS;
  }
  const key = process.env.OPERATIONS_WALLET_KEY;
  if (!key) throw new Error('OPERATIONS_WALLET_KEY not configured');
  const keypair = Keypair.fromSecretKey(bs58.decode(key));
  return keypair.publicKey.toBase58();
}

/**
 * Send an email alert via Resend API when operations wallet has insufficient funds.
 */
async function sendInsufficientFundsAlert(orderId: string, estimatedCost: number, balance: number) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'alerts@litstudio.online',
        to: ['ops@litstudio.online'],
        subject: `[URGENT] Operations Wallet Insufficient SOL - Order ${orderId}`,
        html: `<p>The operations wallet does not have enough SOL to fulfill order <strong>${orderId}</strong>.</p>
          <p>Estimated cost: <strong>${estimatedCost.toFixed(4)} SOL</strong></p>
          <p>Current balance: <strong>${balance.toFixed(4)} SOL</strong></p>
          <p>Please fund the operations wallet immediately.</p>`,
      }),
    });
  } catch (err) {
    console.error('[Operations] Failed to send insufficient funds alert:', err);
  }
}

/**
 * Sanitize a value before interpolating it into a Tarobase filter string.
 * Strips characters that could break out of the quoted string context (quotes, backslashes)
 * and any other non-safe characters beyond word chars, @, ., +, and -.
 */
function sanitizeFilterValueOrEmpty(value: string): string {
  return value.replace(/[\\"']/g, '').replace(/[^\w@.+\-]/g, '');
}

/**
 * Validate a basic email address format.
 * Returns false if the value contains characters used in filter injection attacks.
 */
function validateEmail(email: string): boolean {
  return /^[^\s@"'\\]+@[^\s@"'\\]+\.[^\s@"'\\]+$/.test(email);
}

// SHOPIFY_PRODUCT_ID is imported from ../constants.js
// ADMIN_ADDRESS is imported from ../constants.js (was previously re-declared as a local const — removed)

// ─── SOL price fetcher — delegates to price-capture.ts (canonical source) ────
//
// All SOL/USD fetching goes through captureSolPriceUsd() in utils/price-capture.ts.
// fetchSolPriceSafe is a thin wrapper around captureSolPriceUsd with a short-lived
// in-memory cache. It returns null when ALL sources fail — callers MUST handle null
// by aborting the transaction or returning an error. NEVER fall back to a hardcoded
// price: doing so would silently under/over pay recipients.

let _solPriceCache: { solUsd: number; fetchedAt: number; source: string } | null = null;
const SOL_PRICE_CACHE_TTL_MS = 60_000;

async function fetchSolPriceSafe(): Promise<{ priceUsd: number; source: string } | null> {
  const now = Date.now();
  if (_solPriceCache && now - _solPriceCache.fetchedAt < SOL_PRICE_CACHE_TTL_MS) {
    return { priceUsd: _solPriceCache.solUsd, source: _solPriceCache.source };
  }
  const captured = await captureSolPriceUsd(process.env.COINMARKETCAP_API_KEY);
  if (captured !== null) {
    _solPriceCache = { solUsd: captured.priceUsd, fetchedAt: now, source: captured.source };
    return { priceUsd: captured.priceUsd, source: captured.source };
  }
  if (_solPriceCache) {
    console.warn(`[SolPrice] Using stale cached price ${_solPriceCache.solUsd} USD (from ${_solPriceCache.source})`);
    _solPriceCache.fetchedAt = now;
    return { priceUsd: _solPriceCache.solUsd, source: `${_solPriceCache.source} (stale cache)` };
  }
  console.error('[SolPrice] ALL price sources failed. Returning null — caller must abort.');
  return null;
}

// ─── Token price fetcher (mint-specific) — robust multi-source fallback chain ──
//
// Fallback chain (2026-06-03):
//   1. pump.fun bonding-curve data
//   2. DexScreener (best liquidity pair)
//   3. Jupiter Price API v2
//   4. CoinMarketCap (address → symbol fallback)
//
// Every source is wrapped in try/catch and logs success/failure.

interface TokenPriceCacheEntry {
  priceUsd: number;
  priceSol: number | null;
  source: string;
  fetchedAt: number;
}

const _tokenPriceCache = new Map<string, TokenPriceCacheEntry>();
const TOKEN_PRICE_CACHE_TTL_MS = 30_000;

async function fetchPumpFunCoinData(mint: string): Promise<{ priceUsd: number; priceSol: number } | null> {
  try {
    const url = `https://frontend-api.pump.fun/coins/${mint}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[TokenPrice] pump.fun returned HTTP ${res.status} for mint=${mint}`);
      return null;
    }
    const coin = await res.json() as {
      usd_market_cap?: number;
      market_cap?: number;
      virtual_sol_reserves?: number;
      virtual_token_reserves?: number;
      total_supply?: number;
      sol_price?: number;
    };
    const vsr = Number(coin.virtual_sol_reserves);
    const vtr = Number(coin.virtual_token_reserves);
    const usdMc = Number(coin.usd_market_cap);
    const solMc = Number(coin.market_cap);
    const totalSupply = Number(coin.total_supply);
    const solPriceUsd = Number(coin.sol_price);

    let priceSol: number | null = null;
    let priceUsd: number | null = null;

    if (vsr > 0 && vtr > 0) {
      priceSol = (vsr / 1e9) / (vtr / 1e6);
    }

    if (priceSol != null && usdMc > 0 && solMc > 0) {
      const solUsd = usdMc / solMc;
      priceUsd = priceSol * solUsd;
    } else if (usdMc > 0 && totalSupply > 0) {
      priceUsd = usdMc / (totalSupply / 1e6);
    }

    if (priceUsd == null && priceSol != null && solPriceUsd > 0) {
      priceUsd = priceSol * solPriceUsd;
    }

    if (priceUsd != null && !isNaN(priceUsd) && priceSol != null && !isNaN(priceSol)) {
      console.log(`[TokenPrice] pump.fun succeeded for mint=${mint} priceUsd=$${priceUsd.toFixed(6)}`);
      return { priceUsd, priceSol };
    }
    console.warn(`[TokenPrice] pump.fun response for mint=${mint} missing computable price fields`);
    return null;
  } catch (err) {
    console.warn(`[TokenPrice] pump.fun fetch error for mint=${mint}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function fetchDexscreenerTokenPrice(mint: string): Promise<number | null> {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[TokenPrice] DexScreener returned HTTP ${res.status} for mint=${mint}`);
      return null;
    }
    const data = await res.json() as {
      pairs?: Array<{
        priceUsd?: string;
        liquidity?: { usd?: number };
        volume?: { h24?: number };
      }>;
    };
    const pairs = data?.pairs ?? [];
    if (pairs.length === 0) {
      console.warn(`[TokenPrice] DexScreener returned no pairs for mint=${mint}`);
      return null;
    }
    const best = pairs
      .filter((p) => p.priceUsd != null && p.priceUsd !== '')
      .sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0))[0];
    if (!best) {
      console.warn(`[TokenPrice] DexScreener pairs for mint=${mint} all missing priceUsd`);
      return null;
    }
    const price = parseFloat(best.priceUsd!);
    if (!isNaN(price) && price > 0) {
      console.log(`[TokenPrice] DexScreener succeeded for mint=${mint} priceUsd=$${price.toFixed(6)} (liquidity=$${best.liquidity?.usd ?? 0})`);
      return price;
    }
    return null;
  } catch (err) {
    console.warn(`[TokenPrice] DexScreener fetch error for mint=${mint}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function fetchJupiterTokenPrice(mint: string): Promise<number | null> {
  try {
    const url = `https://api.jup.ag/price/v2?ids=${mint}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[TokenPrice] Jupiter returned HTTP ${res.status} for mint=${mint}`);
      return null;
    }
    const data = await res.json() as { data?: Record<string, { price?: string }> };
    const priceStr = data?.data?.[mint]?.price;
    const price = priceStr ? parseFloat(priceStr) : null;
    if (price !== null && price > 0) {
      console.log(`[TokenPrice] Jupiter succeeded for mint=${mint} priceUsd=$${price.toFixed(6)}`);
      return price;
    }
    console.warn(`[TokenPrice] Jupiter response for mint=${mint} missing price field`);
    return null;
  } catch (err) {
    console.warn(`[TokenPrice] Jupiter fetch error for mint=${mint}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function fetchCoinMarketCapTokenPrice(mint: string, apiKey?: string): Promise<number | null> {
  if (!apiKey) return null;

  // Attempt 1: lookup by contract address
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?address=${mint}&convert=USD`,
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
      console.warn(`[TokenPrice] CoinMarketCap address lookup returned HTTP ${res.status} for mint=${mint}`);
    } else {
      const json = (await res.json()) as {
        data?: Record<string, Array<{ quote?: { USD?: { price?: number } } }>>;
        status?: { error_code?: number; error_message?: string };
      };
      const entries = Object.values(json.data ?? {});
      if (entries.length > 0 && Array.isArray(entries[0])) {
        const price = entries[0][0]?.quote?.USD?.price;
        if (typeof price === 'number' && price > 0) {
          console.log(`[TokenPrice] CoinMarketCap address lookup succeeded for mint=${mint} priceUsd=$${price.toFixed(6)}`);
          return price;
        }
      }
      console.warn(`[TokenPrice] CoinMarketCap address lookup empty data for mint=${mint}`);
    }
  } catch (err) {
    console.warn(`[TokenPrice] CoinMarketCap address lookup error for mint=${mint}:`, err instanceof Error ? err.message : String(err));
  }

  // Attempt 2: find symbol from our songs DB, then lookup by symbol
  try {
    const songs = await getManySongs(`where mintAddress = '${mint}' limit 1`);
    const symbol = (songs?.[0] as any)?.symbol;
    if (!symbol) {
      console.warn(`[TokenPrice] CoinMarketCap symbol fallback skipped — no symbol found for mint=${mint}`);
      return null;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?symbol=${symbol}&convert=USD`,
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
      console.warn(`[TokenPrice] CoinMarketCap symbol lookup returned HTTP ${res.status} for symbol=${symbol}`);
      return null;
    }

    const json = (await res.json()) as {
      data?: Record<string, Array<{ quote?: { USD?: { price?: number } } }>>;
    };
    const entries = Object.values(json.data ?? {});
    if (entries.length > 0 && Array.isArray(entries[0])) {
      const price = entries[0][0]?.quote?.USD?.price;
      if (typeof price === 'number' && price > 0) {
        console.log(`[TokenPrice] CoinMarketCap symbol lookup succeeded for symbol=${symbol} priceUsd=$${price.toFixed(6)}`);
        return price;
      }
    }
    console.warn(`[TokenPrice] CoinMarketCap symbol lookup empty data for symbol=${symbol}`);
    return null;
  } catch (err) {
    console.warn(`[TokenPrice] CoinMarketCap symbol lookup error for mint=${mint}:`, err instanceof Error ? err.message : String(err));
    return null;
  }
}

async function fetchTokenPriceSafe(
  mint: string,
  cmcApiKey?: string,
): Promise<{ priceUsd: number; priceSol: number | null; source: string } | null> {
  const now = Date.now();
  const cached = _tokenPriceCache.get(mint);
  if (cached && now - cached.fetchedAt < TOKEN_PRICE_CACHE_TTL_MS) {
    return { priceUsd: cached.priceUsd, priceSol: cached.priceSol, source: cached.source };
  }

  // Source 1: pump.fun
  const pumpFunResult = await fetchPumpFunCoinData(mint);
  if (pumpFunResult) {
    const entry: TokenPriceCacheEntry = {
      priceUsd: pumpFunResult.priceUsd,
      priceSol: pumpFunResult.priceSol,
      source: 'pumpfun',
      fetchedAt: now,
    };
    _tokenPriceCache.set(mint, entry);
    return { priceUsd: pumpFunResult.priceUsd, priceSol: pumpFunResult.priceSol, source: 'pumpfun' };
  }

  // Source 2: DexScreener
  const dexscreenerUsd = await fetchDexscreenerTokenPrice(mint);
  if (dexscreenerUsd != null) {
    let priceSol: number | null = null;
    const solPriceResult = await fetchSolPriceSafe();
    if (solPriceResult && solPriceResult.priceUsd > 0) {
      priceSol = dexscreenerUsd / solPriceResult.priceUsd;
    }
    const entry: TokenPriceCacheEntry = {
      priceUsd: dexscreenerUsd,
      priceSol,
      source: 'dexscreener',
      fetchedAt: now,
    };
    _tokenPriceCache.set(mint, entry);
    return { priceUsd: dexscreenerUsd, priceSol, source: 'dexscreener' };
  }

  // Source 3: Jupiter Price V2
  const jupiterUsd = await fetchJupiterTokenPrice(mint);
  if (jupiterUsd != null) {
    let priceSol: number | null = null;
    const solPriceResult = await fetchSolPriceSafe();
    if (solPriceResult && solPriceResult.priceUsd > 0) {
      priceSol = jupiterUsd / solPriceResult.priceUsd;
    }
    const entry: TokenPriceCacheEntry = {
      priceUsd: jupiterUsd,
      priceSol,
      source: 'jupiter',
      fetchedAt: now,
    };
    _tokenPriceCache.set(mint, entry);
    return { priceUsd: jupiterUsd, priceSol, source: 'jupiter' };
  }

  // Source 4: CoinMarketCap
  const cmcUsd = await fetchCoinMarketCapTokenPrice(mint, cmcApiKey);
  if (cmcUsd != null) {
    let priceSol: number | null = null;
    const solPriceResult = await fetchSolPriceSafe();
    if (solPriceResult && solPriceResult.priceUsd > 0) {
      priceSol = cmcUsd / solPriceResult.priceUsd;
    }
    const entry: TokenPriceCacheEntry = {
      priceUsd: cmcUsd,
      priceSol,
      source: 'coinmarketcap',
      fetchedAt: now,
    };
    _tokenPriceCache.set(mint, entry);
    return { priceUsd: cmcUsd, priceSol, source: 'coinmarketcap' };
  }

  // Stale cache rescue — return last known price even if expired
  if (cached) {
    console.warn(`[TokenPrice] Using stale cached price for mint=${mint}`);
    return { priceUsd: cached.priceUsd, priceSol: cached.priceSol, source: `${cached.source} (stale cache)` };
  }

  console.error(`[TokenPrice] ALL price sources failed for mint=${mint}`);
  return null;
}

// ─── Artist payout helpers removed ─────────────────────────────────────────────
//
// ARTIST_PAYOUT_RATIO (0.69) and executeArtistPayoutWithRetry have been removed.
// v20 tokenomics: artist earns 5% as SPL tokens via bonding curve (runStepPayout
// in fulfillment-steps.ts). No direct SOL payout to artist unless buyer leaves a tip.
// All payout logic is now in runStepPayout — do not re-add it here.

// ─── Shopify Storefront API helper ─────────────────────────────────────

const SHOPIFY_STOREFRONT_API_VERSION = '2024-10';

/**
 * Create a Shopify cart via the Storefront API and return its hosted checkoutUrl.
 * Classic /cart/<variant>:1 permalinks do not route through the custom domain,
 * so we use Storefront cartCreate which returns a fully-hosted checkout URL.
 */
async function createShopifyCart(
  variantId: string,
  attributes: Record<string, string>,
  env: { VITE_SHOPIFY_STOREFRONT_TOKEN?: string; SHOPIFY_STORE_DOMAIN_V2?: string },
  quantity: number = 1,
  note?: string,
): Promise<{ checkoutUrl: string; cartId: string }> {
  const token = env.VITE_SHOPIFY_STOREFRONT_TOKEN;
  if (!token) {
    throw new Error('VITE_SHOPIFY_STOREFRONT_TOKEN is not configured');
  }
  const domain = env.SHOPIFY_STORE_DOMAIN_V2;
  if (!domain) {
    throw new Error('SHOPIFY_STORE_DOMAIN_V2 not configured');
  }

  const endpoint = `https://${domain}/api/${SHOPIFY_STOREFRONT_API_VERSION}/graphql.json`;

  const query = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart { id checkoutUrl }
        userErrors { field message }
      }
    }
  `;

  const variables = {
    input: {
      lines: [
        {
          merchandiseId: `gid://shopify/ProductVariant/${variantId}`,
          quantity,
        },
      ],
      attributes: Object.entries(attributes).map(([key, value]) => ({ key, value })),
      ...(note ? { note } : {}),
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Shopify Storefront API ${res.status}: ${text}`);
  }

  const json = await res.json() as {
    data?: { cartCreate?: { cart?: { id: string; checkoutUrl: string }; userErrors?: { field: string[]; message: string }[] } };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${json.errors.map(e => e.message).join('; ')}`);
  }

  const result = json.data?.cartCreate;
  if (result?.userErrors?.length) {
    throw new Error(`Shopify cartCreate userErrors: ${result.userErrors.map(e => e.message).join('; ')}`);
  }

  if (!result?.cart?.checkoutUrl) {
    throw new Error('Shopify cartCreate returned no checkoutUrl');
  }

  return { checkoutUrl: result.cart.checkoutUrl, cartId: result.cart.id };
}

// Studio tier Shopify variant ID ($1/unit — used for both fixed checkout and open-amount)
const STUDIO_VARIANT_ID: string = '48722034589924';

// ─── Pack definitions ──────────────────────────────────────────────────

/**
 * Pack configuration matching the four tiers (Studio, Platinum, Diamond, Legend).
 * Used as fallback if database packs collection is empty.
 */
// ─── Pack configuration now imported from constants.ts (single source of truth) ──

// ─── Database seed for packs ──────────────────────────────────────────────

/**
 * Seed the packs database collection with the four tier definitions.
 * Called once on first request to ensure database has pack records.
 */
async function seedPacksIfEmpty(): Promise<void> {
  try {
    const existing = await getManyPacks('order by sortIndex asc limit 1');
    if (existing && existing.length > 0) return; // already seeded

    for (const p of PACK_CONFIG) {
      await set(`packs/${p.id}`, {
        name: p.name,
        priceUsd: p.priceUsd,
        priceSol: 0,
        nftCount: p.nftCount,
        tokenAmount: 1_500_000,
        artistPayout: p.artistPayout,
        platformSlice: p.platformSlice,
        sortIndex: PACK_CONFIG.indexOf(p),
        createdAt: Time.Now,
      });
    }
    console.log('[Seed] Pack database seeded with studio tier');
  } catch (err) {
    console.error('[Seed] Failed to seed packs:', err);
  }
}

// ─── Pack fulfillment helpers ───────────────────────────────────────────

// FALLBACK_TOKEN_AMOUNTS removed — v20 tokenomics uses lamport budget (purchaseAmountUsd)
// not per-pack token counts. runStepTokens sizes the bonding curve buy from the USD amount.

// calculateDynamicTokenAmount removed (Fix 1): it returned null when songDetails.currentPrice
// was missing (a phantom field never written anywhere), causing every purchase to land in
// pending_price_fetch. fulfillPackPurchase now writes the initial record and delegates
// the full pipeline to runAllSteps, which uses a lamport budget rather than a per-token price.

/**
 * Fulfill a single pack purchase: mint NFTs, airdrop tokens, record purchase.
 */
async function fulfillPackPurchase(params: {
  packId: string;
  packSku: string;
  songId: string;
  orderId: string;
  email: string;
  totalPriceCents: number;
  buyerWallet: string;
  /** Optional override for token amount — if not provided, calculated dynamically */
  tokenAmountOverride?: number;
  /** When true, buyer wallet is a placeholder — skip airdrops/NFT mints and mark pending_wallet */
  isPendingWallet?: boolean;
  /**
   * When provided, resume a partial fulfillment from an existing packPurchases record.
   * - Skips the initial setPackPurchases insert (reads existing record instead).
   * - Reuses purchaseId instead of generating a fresh UUID.
   * - Skips steps already marked succeeded in paymentReconciliation:
   *     bondingBuy, splAirdrop, nftMint, artistPayout.
   * - Updates the existing record's reconciliation rather than creating a new one.
   */
  resumePurchaseId?: string;
  /** Optional artist tip percentage (0–100). Tip comes out of fan token allocation; adds to artist SOL payout. */
  tipPercent?: number;
  /**
   * Source of buyer wallet — stored on the purchase record and read by runStepTokens
   * to apply the direct_sol bonus (+1.5% fan tokens). Values: 'direct_sol' | 'shopify' | 'cart_attr' | 'note_attr' | 'note_json' | 'email_lookup'.
   */
  walletSource?: string;
  /**
   * When true, skip calling runAllSteps after creating the purchase record.
   * Use this when the caller will enqueue a pack-fulfillment queue job to run
   * runAllSteps durably outside the request lifecycle. The function returns
   * { purchaseId, status: 'pending', errors: [] } in this mode.
   * Does NOT apply to resume paths (resumePurchaseId) or pending_wallet paths.
   */
  deferRunAllSteps?: boolean;
}): Promise<{ purchaseId: string; status: string; errors: string[]; _emailMeta?: Record<string, any> }> {
  const { packId, packSku, songId, orderId, email, totalPriceCents, buyerWallet, tokenAmountOverride, isPendingWallet, resumePurchaseId } = params;
  const purchaseWalletSource = params.walletSource ?? 'shopify';
  const tipPct = Math.min(100, Math.max(0, Math.round(params.tipPercent ?? 0)));
  const errors: string[] = [];

  // Determine which pack configuration to use
  const packConfig = PACK_CONFIG.find(p => p.sku === packSku);
  if (!packConfig) {
    return { purchaseId: '', status: 'failed', errors: [`Unknown pack SKU: ${packSku}`] };
  }

  // ─── Resume mode: load existing record + parse reconciliation ─────────────
  let existingRecord: PackPurchasesResponse | null = null;
  let resumeReconciliation: Record<string, string> = {};
  if (resumePurchaseId) {
    existingRecord = await getPackPurchases(resumePurchaseId);
    if (!existingRecord) {
      return { purchaseId: resumePurchaseId, status: 'failed', errors: [`Resume failed: no packPurchases record found for ${resumePurchaseId}`] };
    }
    if (existingRecord.paymentReconciliation) {
      try {
        resumeReconciliation = JSON.parse(existingRecord.paymentReconciliation) || {};
      } catch (err) {
        console.warn(`[Pack Resume] Failed to parse paymentReconciliation for ${resumePurchaseId}, treating as empty:`, err);
        resumeReconciliation = {};
      }
    }
    console.log(`[Pack Resume] Resuming ${resumePurchaseId} with reconciliation:`, JSON.stringify(resumeReconciliation));
  }

  // Legacy reconciliation flags — no longer used by fulfillPackPurchase (Fix 1).
  // runAllSteps tracks idempotency via stepTokens/stepPayout/stepNft/stepNotify flags.
  // Kept as reads so existing resume records don't throw on parse.

  // Generate purchase ID — deterministic from orderId+packId so that concurrent
  // Shopify webhook retries racing through the check-then-act path all target the
  // same document. The second writer attempts setPackPurchases on an already-existing
  // record and the pre-create idempotency guard below detects it and returns early.
  // (Previously the random suffix caused each concurrent request to create a distinct
  // record, bypassing the dedup query entirely — the TOCTOU described in Fix 2.)
  const purchaseId = resumePurchaseId
    ?? `pack-${sanitizeFilterValueOrEmpty(orderId)}-${sanitizeFilterValueOrEmpty(packId)}`;

  // ─── Fix 2: Deterministic-ID idempotency guard ──────────────────────────────
  // Because purchaseId is now derived deterministically from orderId+packId, two
  // concurrent Shopify webhook retries that both passed the outer dedup query will
  // both attempt to create the same document. Check whether a record with this exact
  // purchaseId already exists BEFORE writing anything. If it does and it is in any
  // non-failed/non-cancelled state, treat this call as a duplicate and return the
  // existing record idempotently. This collapses the TOCTOU window to a single atomic
  // getPackPurchases → return-if-found → setPackPurchases sequence.
  if (!resumePurchaseId) {
    try {
      const existingById = await getPackPurchases(purchaseId);
      if (existingById) {
        const existingStatus = (existingById as any).status as string;
        // Treat any non-terminal (not permanently failed/cancelled) status as
        // "already processing" — do not overwrite; the queue consumer will drive
        // the pipeline forward via runAllSteps.
        const TERMINAL_STATUSES = new Set(['failed', 'cancelled']);
        if (!TERMINAL_STATUSES.has(existingStatus)) {
          console.log(
            `[fulfillPackPurchase] IDEMPOTENT_RETURN — purchaseId=${purchaseId} already exists ` +
            `with status=${existingStatus} (orderId=${orderId} packId=${packId}). Returning without overwrite.`,
          );
          return {
            purchaseId,
            status: existingStatus,
            errors: [],
          };
        }
        // Terminal status — fall through to allow a fresh retry write.
        console.log(
          `[fulfillPackPurchase] purchaseId=${purchaseId} exists with terminal status=${existingStatus} — ` +
          `allowing fresh retry for orderId=${orderId} packId=${packId}.`,
        );
      }
    } catch (idempotencyErr) {
      // Non-blocking — if the read fails, proceed with the normal create path.
      console.warn(`[fulfillPackPurchase] Idempotency pre-check failed (non-blocking) for ${purchaseId}:`, idempotencyErr);
    }
  }

  // If wallet is not available, create the purchase record as pending_wallet and skip fulfillment.
  // buyerAddress is omitted entirely (field is optional) — the policy engine rejects empty-string Address values.
  if (isPendingWallet) {
    console.warn(`[Pack Webhook] No buyer wallet for order ${orderId}, creating pending_wallet purchase record`);
    const packConfig = PACK_CONFIG.find(p => p.sku === packSku) || PACK_CONFIG[0];
    const purchaseCreated = await setPackPurchases(purchaseId, {
      artistPayout: packConfig?.artistPayout ?? 0,
      buyerEmail: email,
      createdAt: Time.Now,
      nftCount: packConfig?.nftCount ?? 0,
      packId: packConfig?.id ?? packId,
      packName: packConfig?.name ?? 'Unknown Pack',
      platformSlice: Math.round(totalPriceCents * SHOPIFY_SHARES.infra),
      shopifyOrderId: orderId,
      status: 'pending_wallet',
      tokenAmount: 0, // v20: token amount sized from purchaseAmountUsd at fulfillment time
      songId,
    } as any);

    if (!purchaseCreated) {
      return { purchaseId, status: 'failed', errors: ['Failed to create pending_wallet purchase record'] };
    }

    console.log(`[Pack Webhook] Created pending_wallet purchase ${purchaseId} for order ${orderId}`);
    return { purchaseId, status: 'pending_wallet', errors: [], _emailMeta: { songTitle: 'Unknown Song', artistName: 'Unknown Artist', tokenAmount: 0 } };
  }

  // ─── Safeguard D — Order-ID idempotency ─────────────────────────────────────
  // Prevent double-spend on retry / admin resume. Checks whether a completed
  // fulfillment record already exists for this orderId + packId combination.
  // The webhook handler performs a similar check, but admin routes (repair, resume,
  // auto-fulfill) bypass it, so we guard here inside fulfillPackPurchase as well.
  // Note: resumePurchaseId is intentionally excluded — it's an explicit re-run request.
  if (!resumePurchaseId) {
    try {
      const existingCompleted = await getManyPackPurchases(
        `where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}" and packId = "${sanitizeFilterValueOrEmpty(packId)}" and status = "completed"`,
      );
      if (existingCompleted.length > 0) {
        const prior = existingCompleted[0];
        console.log(
          `[SAFEGUARD-D] ALREADY_FULFILLED — orderId=${orderId} packId=${packId} prior purchaseId=${prior.id} status=${prior.status}. Returning early to prevent double-spend.`,
        );
        return {
          purchaseId: prior.id,
          status: 'already_completed',
          errors: ['ALREADY_FULFILLED: A completed fulfillment record already exists for this order'],
        };
      }
    } catch (err) {
      // Query failure should NOT block fulfillment — the webhook dedup is the primary guard.
      console.warn(`[SAFEGUARD-D] Idempotency check failed (non-blocking) for orderId=${orderId}:`, err);
    }
  }

  // ─── Operations wallet pre-flight balance check ─────────────────────────────
  const nftCount = packConfig.nftCount;

  // CORRECT formula: purchaseAmountUsd is dollars (e.g. 2.0 for a $2 order — NOT cents, NOT 200).
  // totalPriceCents is in cents (e.g. 200 for a $2 order) — divide by 100 to get dollars.
  const purchaseAmountUsd = totalPriceCents / 100;

  // Estimate SOL amounts using the safe price fetcher (returns null on total failure)
  const solPriceResult = await fetchSolPriceSafe();
  if (!solPriceResult) {
    return { purchaseId, status: 'failed', errors: ['SOL/USD price unavailable — cannot process purchase'] };
  }
  const { priceUsd: solUsd, source: solPriceSource } = solPriceResult;

  // Safeguard C — SOL price-feed sanity bounds.
  // Reject prices outside [SOL_PRICE_MIN_USD, SOL_PRICE_MAX_USD] to protect against
  // stale or manipulated oracle reads silently inflating SOL outputs.
  const solPriceMin = parseFloat(SOL_PRICE_MIN_USD);
  const solPriceMax = parseFloat(SOL_PRICE_MAX_USD);
  if (solUsd < solPriceMin || solUsd > solPriceMax) {
    console.error(
      `[SAFEGUARD-C] PRICE_FEED_SUSPECT — orderId=${orderId} solUsd=${solUsd} (source: ${solPriceSource}) is outside sanity bounds [${solPriceMin}, ${solPriceMax}]`,
    );
    return { purchaseId, status: 'failed', errors: [`PRICE_FEED_SUSPECT: SOL price ${solUsd} from ${solPriceSource} is outside bounds [${solPriceMin}, ${solPriceMax}]`] };
  }

  // THE ONLY CORRECT PREFLIGHT FORMULA (v20 Shopify tokenomics):
  //   fanPct=0.90, artistPct=0.05, opsPct=0.03, treasuryPct=0.02
  //   purchaseAmountUsd = dollars (2.0 for a $2 order)
  //   solUsd = dollars per SOL (e.g. 89.0)
  const fanBudgetSOL     = (purchaseAmountUsd * 0.90) / solUsd;
  const artistBudgetSOL  = (purchaseAmountUsd * 0.05) / solUsd;
  const opsSOL           = (purchaseAmountUsd * 0.03) / solUsd;
  const treasurySOL      = (purchaseAmountUsd * 0.02) / solUsd;
  const bufferSOL        = 0.01; // flat buffer for priority fees / ATA rent

  const estimatedCost = fanBudgetSOL + artistBudgetSOL + opsSOL + treasurySOL + bufferSOL;

  // Verification log: a $2 order at $89/SOL must print totalRequiredSOL ≈ 0.032 SOL
  console.log(
    `[Preflight] totalRequiredSOL=${estimatedCost.toFixed(6)} SOL — ` +
    `purchaseAmountUsd=$${purchaseAmountUsd.toFixed(2)} solUsd=$${solUsd.toFixed(2)} ` +
    `fan=${fanBudgetSOL.toFixed(6)} artist=${artistBudgetSOL.toFixed(6)} ` +
    `ops=${opsSOL.toFixed(6)} treasury=${treasurySOL.toFixed(6)} buffer=${bufferSOL} ` +
    `orderId=${orderId}`,
  );

  // Skip pre-flight balance check on offchain/Poofnet — the simulated RPC
  // returns 0 for all addresses. This check is only meaningful on mainnet.
  const isOffchain = process.env.TAROBASE_CHAIN === 'offchain';
  if (!isOffchain) {
    try {
      const opsWalletAddress = getOperationsWalletAddress();
      let solBalance: number | null = null;
      let rpcError: Error | null = null;

      try {
        const { PublicKey: SolPublicKey } = await import('@solana/web3.js');
        const connection = await createConnection();
        const balance = await connection.getBalance(new SolPublicKey(opsWalletAddress));
        solBalance = balance / 1e9;
      } catch (err) {
        rpcError = err instanceof Error ? err : new Error(String(err));
        console.error('[OPERATIONS] Pre-flight balance query failed — failing closed:', err);
      }

      // Fail closed: if RPC errored, we can't confirm funds — block fulfillment
      if (rpcError) {
        console.error(`[OPERATIONS] RPC error blocked pre-flight check for order ${orderId} — marking pending_insufficient_funds`);

        const timestamp = Math.floor(Date.now() / 1000);
        await setOperationsFulfillmentCosts(`cost-${orderId}-${timestamp}`, {
          orderId,
          nftCount,
          estimatedCostSOL: Math.floor(estimatedCost * 1e9),
          timestamp,
          status: 'insufficient_funds',
        });

        // Write purchase record so the reconciler can pick it up on the next run after vault is funded.
        // purchaseAmountUsd MUST be included — runStepTokens reads it directly for lamport calculations.
        await setPackPurchases(purchaseId, {
          artistPayout: packConfig.artistPayout,
          buyerAddress: Address.publicKey(buyerWallet),
          buyerEmail: email,
          createdAt: Time.Now,
          nftCount,
          packId: packConfig.id,
          packName: packConfig.name,
          platformSlice: Math.round(totalPriceCents * SHOPIFY_SHARES.infra),
          shopifyOrderId: orderId,
          status: 'pending_insufficient_funds',
          tokenAmount: tokenAmountOverride ?? 0,
          songId,
          purchaseAmountUsd,        // dollars — required for reconciler to size lamport budgets
          walletSource: purchaseWalletSource,
          failureReason: `RPC error during pre-flight balance check: ${rpcError.message}`,
        } as any);

        await sendInsufficientFundsAlert(orderId, estimatedCost, -1);

        return { purchaseId, status: 'pending_insufficient_funds', errors: [`RPC error during pre-flight balance check: ${rpcError.message}`] };
      }

      if (solBalance !== null && solBalance < estimatedCost) {
        console.error(`[OPERATIONS] Insufficient SOL for order ${orderId}: balance=${solBalance.toFixed(4)}, estimated=${estimatedCost.toFixed(4)}`);

        // Record failed fulfillment cost
        const timestamp = Math.floor(Date.now() / 1000);
        await setOperationsFulfillmentCosts(`cost-${orderId}-${timestamp}`, {
          orderId,
          nftCount,
          estimatedCostSOL: Math.floor(estimatedCost * 1e9),
          timestamp,
          status: 'insufficient_funds',
        });

        // Write purchase record so the reconciler can pick it up on the next run after vault is funded.
        // purchaseAmountUsd MUST be included — runStepTokens reads it directly for lamport calculations.
        await setPackPurchases(purchaseId, {
          artistPayout: packConfig.artistPayout,
          buyerAddress: Address.publicKey(buyerWallet),
          buyerEmail: email,
          createdAt: Time.Now,
          nftCount,
          packId: packConfig.id,
          packName: packConfig.name,
          platformSlice: Math.round(totalPriceCents * SHOPIFY_SHARES.infra),
          shopifyOrderId: orderId,
          status: 'pending_insufficient_funds',
          tokenAmount: tokenAmountOverride ?? 0,
          songId,
          purchaseAmountUsd,        // dollars — required for reconciler to size lamport budgets
          walletSource: purchaseWalletSource,
          failureReason: `Insufficient vault SOL: balance=${solBalance.toFixed(4)}, required=${estimatedCost.toFixed(4)}`,
        } as any);

        // Send email alert
        await sendInsufficientFundsAlert(orderId, estimatedCost, solBalance);

        return { purchaseId, status: 'pending_insufficient_funds', errors: [`Insufficient operations wallet balance: ${solBalance.toFixed(4)} SOL < ${estimatedCost.toFixed(4)} SOL estimated`] };
      }

      if (solBalance !== null) {
        console.log(`[OPERATIONS] Pre-flight balance check passed: ${solBalance.toFixed(4)} SOL available, ${estimatedCost.toFixed(4)} SOL estimated for order ${orderId}`);
      } else {
        console.warn('[OPERATIONS] Balance check skipped due to error, proceeding with fulfillment');
      }
    } catch (err) {
      // Balance check failure should not block fulfillment — log and continue
      console.error('[OPERATIONS] Pre-flight balance check failed:', err);
    }

    // ─── Safeguard A — Daily SOL spend budget ─────────────────────────────────
    // Sum all successful fulfillment costs recorded today and refuse if adding
    // estimatedCost would push the daily total past MAX_DAILY_SOL_SPEND.
    // Uses the operationsFulfillmentCosts collection (same collection used to
    // audit individual fulfillment costs) — no separate dailySpend collection needed.
    try {
      const maxDailySpend = parseFloat(MAX_DAILY_SOL_SPEND);
      const todayStart = Math.floor(new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z').getTime() / 1000);
      const todayCosts = await getManyOperationsFulfillmentCosts(
        `where status = "success" and timestamp >= ${todayStart}`,
      );
      const todayTotalSOL = todayCosts.reduce((sum, c) => sum + (c.estimatedCostSOL / 1e9), 0);
      if (todayTotalSOL + estimatedCost > maxDailySpend) {
        console.error(
          `[SAFEGUARD-A] DAILY_BUDGET_EXCEEDED — orderId=${orderId} ` +
          `todaySpent=${todayTotalSOL.toFixed(4)} SOL estimatedCost=${estimatedCost.toFixed(4)} SOL ` +
          `limit=${maxDailySpend} SOL`,
        );
        return {
          purchaseId,
          status: 'failed',
          errors: [
            `DAILY_BUDGET_EXCEEDED: Daily SOL spend limit reached. ` +
            `Today: ${todayTotalSOL.toFixed(4)} SOL + this order: ${estimatedCost.toFixed(4)} SOL > limit: ${maxDailySpend} SOL`,
          ],
        };
      }
      console.log(
        `[SAFEGUARD-A] Daily budget OK — orderId=${orderId} ` +
        `todaySpent=${todayTotalSOL.toFixed(4)}/${maxDailySpend} SOL estimatedCost=${estimatedCost.toFixed(4)} SOL`,
      );
    } catch (err) {
      // Non-blocking: if the query fails, log and continue (fail-open for budget check only)
      console.warn(`[SAFEGUARD-A] Daily budget check failed (non-blocking) for orderId=${orderId}:`, err);
    }

    // ─── Safeguard B — Vault balance floor ────────────────────────────────────
    // Ensure the vault (PROJECT_VAULT_ADDRESS) never drops below VAULT_MIN_BALANCE_SOL
    // after this fulfillment — the user's "restaurant register float" invariant.
    try {
      const vaultFloor = parseFloat(VAULT_MIN_BALANCE_SOL);
      const { PublicKey: VaultPK } = await import('@solana/web3.js');
      const vaultConn = await createConnection();
      const vaultLamports = await vaultConn.getBalance(new VaultPK(PROJECT_VAULT_ADDRESS));
      const vaultBalance = vaultLamports / 1e9;
      if (vaultBalance - estimatedCost < vaultFloor) {
        console.error(
          `[SAFEGUARD-B] VAULT_FLOOR_BREACH — orderId=${orderId} ` +
          `vaultBalance=${vaultBalance.toFixed(4)} SOL estimatedCost=${estimatedCost.toFixed(4)} SOL ` +
          `floor=${vaultFloor} SOL projectedBalance=${(vaultBalance - estimatedCost).toFixed(4)} SOL`,
        );
        return {
          purchaseId,
          status: 'failed',
          errors: [
            `VAULT_FLOOR_BREACH: Executing this order would drop vault below ${vaultFloor} SOL floor. ` +
            `vault=${vaultBalance.toFixed(4)} SOL estimated=${estimatedCost.toFixed(4)} SOL floor=${vaultFloor} SOL`,
          ],
        };
      }
      console.log(
        `[SAFEGUARD-B] Vault floor OK — orderId=${orderId} ` +
        `vaultBalance=${vaultBalance.toFixed(4)} SOL estimatedCost=${estimatedCost.toFixed(4)} SOL ` +
        `floor=${vaultFloor} SOL projectedBalance=${(vaultBalance - estimatedCost).toFixed(4)} SOL`,
      );
    } catch (err) {
      // RPC failure for vault check: fail-closed to protect the vault floor.
      console.error(`[SAFEGUARD-B] Vault floor check RPC failed for orderId=${orderId} — failing closed:`, err);
      return {
        purchaseId,
        status: 'failed',
        errors: [`VAULT_FLOOR_BREACH: Could not verify vault balance — RPC error: ${String(err)}`],
      };
    }
  } else {
    console.log('[OPERATIONS] Skipping pre-flight balance check on Poofnet (offchain)');
  }
  // ─── End operations wallet pre-flight check ─────────────────────────────────

  // Get song details for NFT metadata and dynamic pricing
  const song = await getSongs(songId);
  const songDetails = await getSongDetails(songId);

  // Safety check: verify song exists onchain before attempting airdrop/mint
  if (!song) {
    const errMsg = `Song "${songId}" not found onchain — create it via POST /api/admin/songs/sync-to-chain first`;
    console.error(`[Pack Webhook] ${errMsg}`);
    try {
      await setWebhookFailures(`fail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, {
        webhookSource: 'pack-fulfillment',
        path: '/api/webhooks/packs/fulfill',
        failureReason: 'song-not-found',
        errorMessage: errMsg,
        headers: JSON.stringify({ songId, purchaseId, orderId }),
        bodyPreview: `song ${songId} not found for purchase ${purchaseId}`,
        timestamp: Math.floor(Date.now() / 1000),
        alertSent: false,
      });
    } catch (logErr) {
      console.error('[Pack Webhook] Failed to log webhook failure:', logErr);
    }
    return { purchaseId, status: 'failed', errors: [errMsg] };
  }

  const songName = song?.name ?? 'Unknown Song';
  const coverImage = songDetails?.coverImage ?? '';

  // Fix 1: Write the initial purchase record with status 'pending', then delegate
  // the entire delivery pipeline to runAllSteps. This replaces the broken
  // calculateDynamicTokenAmount → pending_price_fetch path. runAllSteps is fully
  // idempotent — it skips steps already marked complete — so webhook retries are safe.
  //
  // platformSlice (SHOPIFY_SHARES.infra of purchaseAmountUsd in cents) is written here
  // for audit trail consistency with the actual infra fee amount.
  const tipAmountUsd = tipPct > 0
    ? Math.floor(totalPriceCents * tipPct / 100)
    : 0;

  // ─── Pre-flight mintAddress check — fail fast ─────────────────────────────
  // If the song has no mintAddress, the purchase pipeline will fail at step 7
  // (token swap) after multiple retries. Detect it here before creating the
  // purchase record so the error is immediate and actionable.
  const mintPreCheck = (song as any)?.mintAddress;
  if (!mintPreCheck || mintPreCheck.trim() === '') {
    const errMsg = `SONG_MINT_ADDRESS_MISSING: song ${songId} has no mintAddress — purchases cannot be fulfilled. Admin must run POST /api/admin/songs/${songId}/capture-mint before purchases can be fulfilled.`;
    console.error(`[fulfillPackPurchase] ${errMsg}`);

    // Write a failed purchase record so Shopify doesn't keep retrying and
    // the admin dashboard surfaces the issue.
    try {
      await setPackPurchases(purchaseId, {
        artistPayout: packConfig.artistPayout,
        buyerAddress: Address.publicKey(buyerWallet),
        buyerEmail: email,
        createdAt: Time.Now,
        nftCount: packConfig.nftCount,
        packId: packConfig.id,
        packName: packConfig.name,
        platformSlice: Math.round(totalPriceCents * SHOPIFY_SHARES.infra),
        shopifyOrderId: orderId,
        status: 'failed',
        failureReason: errMsg,
        tokenAmount: 0,
        songId,
        purchaseAmountUsd: totalPriceCents / 100,
        walletSource: purchaseWalletSource,
      } as any);
    } catch (writeErr) {
      console.error('[fulfillPackPurchase] Could not write failed purchase record for mintAddress check:', writeErr);
    }

    return { purchaseId, status: 'failed', errors: [errMsg] };
  }
  // ─── End pre-flight mintAddress check ─────────────────────────────────────

  if (!resumePurchaseId) {
    const purchaseCreated = await setPackPurchases(purchaseId, {
      artistPayout: packConfig.artistPayout,
      buyerAddress: Address.publicKey(buyerWallet),
      buyerEmail: email,
      createdAt: Time.Now,
      nftCount: packConfig.nftCount,
      packId: packConfig.id,
      packName: packConfig.name,
      platformSlice: Math.round(totalPriceCents * SHOPIFY_SHARES.infra), // infra share of purchaseAmountUsd in cents
      shopifyOrderId: orderId,
      status: 'pending',
      tokenAmount: tokenAmountOverride ?? 0, // v20: sized from purchaseAmountUsd at step 1
      songId,
      purchaseAmountUsd: totalPriceCents / 100,
      walletSource: purchaseWalletSource, // propagated from cartAttrs/noteAttrs/default
      ...(tipPct > 0 ? { tipPercent: tipPct, tipAmountUsd } : {}),
    } as any);

    if (!purchaseCreated) {
      // Distinguish a policy-rule uniqueness block from a genuine write failure.
      // When the Tarobase create rule fires (get(/packPurchases/$purchaseId) == null), the
      // set() call is rejected and setPackPurchases returns false — it does NOT throw.
      // We detect this case by checking whether the document already exists: if it does,
      // another request created it first (race or webhook retry) and this is a safe dup.
      let isDuplicateBlock = false;
      try {
        const existingAfterFail = await getPackPurchases(purchaseId);
        if (existingAfterFail) {
          isDuplicateBlock = true;
          console.log(
            `[fulfillPackPurchase] DUPLICATE_POLICY_BLOCK — purchaseId=${purchaseId} already exists ` +
            `(status=${existingAfterFail.status}). Policy rule rejected our create; returning duplicate signal.`,
          );
        }
      } catch (dupCheckErr) {
        // Non-blocking — if we can't read back, treat as real failure below.
        console.warn(`[fulfillPackPurchase] Post-fail existence check threw for ${purchaseId}:`, dupCheckErr);
      }
      if (isDuplicateBlock) {
        return { purchaseId, status: 'duplicate_purchase', errors: [] };
      }
      return { purchaseId, status: 'failed', errors: ['Failed to create purchase record'] };
    }

    // deferRunAllSteps: caller will enqueue the pack-fulfillment queue job.
    if (params.deferRunAllSteps) {
      console.log(`[fulfillPackPurchase] Record ${purchaseId} created — deferring runAllSteps to queue consumer`);
      return { purchaseId, status: 'pending', errors: [] };
    }
  }

  // Run the full 4-step pipeline (price capture → tokens → payout → notify).
  // runAllSteps reads the current step flags, skips already-completed steps, and
  // writes the final status ('completed' | 'partial' | 'pending_price_fetch').
  console.log(`[Pack Webhook] Delegating fulfillment for ${purchaseId} to runAllSteps`);
  const stepsResult = await runAllSteps(purchaseId);
  const finalStatus = stepsResult.finalStatus;

  // Mark Shopify order as fulfilled only when ALL on-chain steps succeeded.
  // Token delivery is the authoritative signal — if it worked, Shopify gets marked.
  // On partial failure, leave the order unfulfilled so ops can investigate.
  // Failure here does NOT fail the whole flow — tokens were already delivered.
  if (finalStatus === 'completed') {
    const shopifyEnv = {
      SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
      SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
    };
    if (shopifyEnv.SHOPIFY_ADMIN_API_TOKEN && shopifyEnv.SHOPIFY_STORE_DOMAIN_V2) {
      try {
        const fulfillResult = await fulfillShopifyOrder(shopifyEnv, orderId);
        if (fulfillResult.fulfilled) {
          console.log(`[ShopifyFulfill] Order ${orderId} marked fulfilled (fulfillmentId=${fulfillResult.fulfillmentId})`);
          await updatePackPurchases(purchaseId, { shopifyFulfilled: true } as any);
        } else {
          console.warn(`[ShopifyFulfill] Order ${orderId} not fulfilled: ${fulfillResult.reason}`);
          await updatePackPurchases(purchaseId, { shopifyFulfilled: false } as any);
        }
      } catch (err) {
        console.error(`[ShopifyFulfill] Unexpected error for order ${orderId}:`, err);
        await updatePackPurchases(purchaseId, { shopifyFulfilled: false } as any);
      }
    } else {
      console.warn(`[ShopifyFulfill] Skipping — SHOPIFY_ADMIN_API_TOKEN or SHOPIFY_STORE_DOMAIN_V2 not configured`);
    }
  }

  // Record fulfillment cost in operationsFulfillmentCosts collection
  const costTimestamp = Math.floor(Date.now() / 1000);
  const costStatus = finalStatus === 'completed' ? 'success' : 'failed';
  const costRecord = await setOperationsFulfillmentCosts(`cost-${orderId}-${costTimestamp}`, {
    orderId,
    nftCount: 0,
    estimatedCostSOL: Math.floor(estimatedCost * 1e9),
    actualCostSOL: Math.floor(estimatedCost * 1e9),
    timestamp: costTimestamp,
    status: costStatus,
  });
  if (!costRecord) {
    console.warn(`[OPERATIONS] Failed to record fulfillment cost for order ${orderId}`);
  }

  console.log(
    `[Pack Webhook] Purchase ${purchaseId} finalized via runAllSteps: ` +
    `status=${finalStatus} tokens=${stepsResult.stepTokens} payout=${stepsResult.stepPayout}`,
  );

  // Read back final record to populate email metadata
  const finalRecord = await getPackPurchases(purchaseId);
  const tokenAmountFinal = (finalRecord as any)?.tokenAmount ?? 0;
  const splTxHashFinal = (finalRecord as any)?.splTxHash ?? '';

  return {
    purchaseId,
    status: finalStatus,
    errors,
    _emailMeta: {
      email,
      songTitle: songDetails?.title ?? songName,
      artistName: songDetails?.artist ?? 'Unknown Artist',
      coverImage: coverImage || undefined,
      tokenAmount: tokenAmountFinal,
      tokenSymbol: song?.symbol,
      splTxHash: stepsResult.stepTokens ? splTxHashFinal : undefined,
      nftTxHash: undefined,
      editionNumber: undefined,
    },
  };
}

/**
 * Generate a wallet-bound, time-bound HMAC-SHA256 claim token.
 *
 * Token format: "<expiresAt>.<hmac>"
 *   expiresAt — Unix seconds (15 minutes from now)
 *   hmac      — HMAC-SHA256( purchaseId | email | walletAddress | expiresAt )
 *
 * Binding walletAddress into the HMAC means a token issued for wallet A cannot
 * be replayed by wallet B even if the token string is intercepted.
 * The 15-minute expiry closes the replay window to near-zero.
 */
async function generateClaimToken(
  purchaseId: string,
  email: string,
  walletAddress: string,
  expiresAt: number,
): Promise<string> {
  const secret = process.env.CLAIM_TOKEN_SECRET;
  if (!secret) throw new Error('CLAIM_TOKEN_SECRET not configured');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  // Include all four fields so the HMAC is bound to this exact context.
  const payload = `claim:${purchaseId}:${email.toLowerCase()}:${walletAddress}:${expiresAt}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload),
  );
  // Convert to URL-safe base64
  const bytes = new Uint8Array(signature);
  const base64 = btoa(String.fromCharCode(...bytes));
  const hmac = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${expiresAt}.${hmac}`;
}

/**
 * Verify a claim token produced by generateClaimToken.
 * Returns the parsed expiresAt on success; throws a descriptive error on failure.
 * Callers should surface a GENERIC "Invalid claim" message to the client.
 */
async function verifyClaimToken(
  token: string,
  purchaseId: string,
  email: string,
  walletAddress: string,
): Promise<void> {
  // Parse token structure
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) throw new Error('Malformed token');

  const expiresAtStr = token.slice(0, dotIdx);
  const providedHmac = token.slice(dotIdx + 1);
  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt)) throw new Error('Malformed token expiry');

  // Check expiry (Unix seconds)
  const nowSecs = Math.floor(Date.now() / 1000);
  if (nowSecs > expiresAt) throw new Error('Token expired');

  // Recompute expected HMAC and compare in constant time
  const expectedToken = await generateClaimToken(purchaseId, email, walletAddress, expiresAt);
  const expectedHmac = expectedToken.slice(expectedToken.indexOf('.') + 1);

  if (providedHmac.length !== expectedHmac.length) throw new Error('Token mismatch');
  const enc = new TextEncoder();
  const a = enc.encode(providedHmac);
  const b = enc.encode(expectedHmac);
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a[i] ^ b[i];
  }
  if (mismatch !== 0) throw new Error('Token mismatch');
}

// OAuth Routes (uncomment to enable social login)
// See: .claude/skills/oauth/SKILL.md for setup instructions
import { oauthCallbackHandler } from './oauth-callback.js';
import { getSocialLinkHandler, deleteSocialLinkHandler } from './social-links.js';

/**
 * Route spec for API documentation/display.
 * Keep this in sync with the actual route registrations below.
 */
export interface RouteSpec {
  method: string;
  path: string;
  description: string;
  auth: boolean;
}

export const routeSpec: RouteSpec[] = [
  { method: 'GET', path: '/health', description: 'Health check', auth: false },
  // OAuth routes (uncomment when enabled):
  { method: 'GET', path: '/api/oauth/callback', description: 'OAuth callback', auth: false },
  { method: 'GET', path: '/api/social-links/:provider', description: 'Get social link', auth: true },
  { method: 'DELETE', path: '/api/social-links/:provider', description: 'Unlink social account', auth: true },

  { method: 'GET', path: '/api/webhooks/shopify/status', description: 'Get recent purchase records (admin only)', auth: true },
  { method: 'GET', path: '/api/songs/:songId/access', description: 'Check token-gated access to song audio', auth: true },
  { method: 'GET', path: '/api/songs/:songId/stream', description: 'Token-gated audio redirect — returns 302 to CDN URL for full access, 401 for preview', auth: false },
  { method: 'POST', path: '/api/songs/:songId/buy', description: 'Rate-limited pre-flight for bonding curve buys (max 10/min per wallet)', auth: true },
  { method: 'GET', path: '/api/songs/:songId/holders', description: 'Get token holder count for a song via Solana RPC', auth: false },
  { method: 'POST', path: '/api/purchases/claim-token', description: 'Get a wallet-bound claim token by proving email ownership of a purchase (requires authentication)', auth: true },
  { method: 'GET', path: '/api/purchases/by-order/:orderId', description: 'Look up pack purchases by Shopify order ID (authenticated — own purchases only)', auth: true },
  { method: 'POST', path: '/api/purchases/claim/:purchaseId', description: 'Claim purchased tokens with verified claim token and email. For pending_wallet pack purchases, runs full fulfillment pipeline.', auth: true },
  { method: 'POST', path: '/api/editions/purchase', description: 'Fulfill a collectible edition purchase — authenticates buyer, validates edition availability, then mints NFT and transfers bundled SPL token to buyer via backend vault', auth: true },
  { method: 'GET', path: '/api/og/song/:songId', description: 'Returns an HTML page with Open Graph meta tags for social share previews of a song. Crawlers get OG tags; humans are redirected to the SPA.', auth: false },
  { method: 'POST', path: '/api/packs/checkout', description: 'Generate Shopify checkout URL for a pack + song combination', auth: false },
  { method: 'POST', path: '/api/packs/checkout/open-amount', description: 'Create Shopify draft order for pay-what-you-want amount', auth: false },
  { method: 'GET', path: '/api/validate-checkout', description: 'Validate that a song exists before checkout', auth: false },
  { method: 'GET', path: '/api/packs', description: 'List available pack tiers with pricing and SKU info', auth: false },
  { method: 'POST', path: '/api/webhooks/packs/fulfill', description: 'Shopify pack order webhook - validates HMAC, fulfills pack purchases by minting NFTs and airdropping tokens', auth: false },
  { method: 'GET', path: '/api/webhooks/packs/status', description: 'View recent pack purchases (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/artists/:artistAddress/verify', description: 'Set or unset artist verification status (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/payouts/retry/:purchaseId', description: 'Retry a failed or pending artist SOL payout for a specific pack purchase (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/payouts/pending', description: 'List pack purchases with pending, failed, or retrying artist SOL payouts (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/operations/balance', description: 'Monitor operations wallet balance and fulfillment costs (admin only)', auth: true },
  { method: 'GET', path: '/api/health/full', description: 'Full system health check — returns status of all critical dependencies', auth: false },
  { method: 'GET', path: '/api/purchases/recent', description: 'Returns the last 10 purchase records (admin only)', auth: true },
  { method: 'GET', path: '/api/packs/config', description: 'Returns the current pack tier configuration', auth: false },
  { method: 'GET', path: '/api/token-price', description: 'SOL/USD price (no mint param) or token-specific USD/SOL price (with ?mint=). Fallback chain: pump.fun → DexScreener → Jupiter V2 → CoinMarketCap', auth: false },
  { method: 'GET', path: '/api/swap/quote', description: 'Proxy Jupiter quote API for swap quotes', auth: false },
  { method: 'POST', path: '/api/swap/transaction', description: 'Proxy Jupiter swap API for swap transactions', auth: false },
  { method: 'GET', path: '/api/admin/purchases/pending', description: 'List pending pack purchases awaiting wallet addresses (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/fulfill-manual', description: 'Manually fulfill a pending pack purchase with a provided wallet address (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/fulfill-new', description: 'Create and fulfill a new pack purchase for an order that missed the webhook (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/sync-to-chain', description: 'Sync songs from offchain database to onchain collection using vault wallet (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/packs/dry-run', description: 'Dry-run test of pack fulfillment pipeline for all tiers (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/transaction-audits', description: 'List all transaction audit records ordered by createdAt desc (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/webhook-failures', description: 'List recent webhook verification failures (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/shopify/order/:orderNumber', description: 'Fetch a single Shopify order by order number via Admin API (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/shopify/recent-orders', description: 'List recent Shopify orders cross-referenced with our packPurchases DB (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/auto-fulfill-by-order', description: 'Auto-fulfill a stuck order by fetching pack SKU and email from Shopify and running the fulfillment pipeline (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/fulfill-by-shopify-id', description: 'Fulfill a stuck order by its internal Shopify order ID (not order number) — fetches from Shopify and runs fulfillment pipeline (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/repair/:purchaseId', description: 'Resume a partial pack purchase: re-runs only the failed steps using paymentReconciliation state (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/:id/resume', description: 'Retry failed fulfillment steps for a stuck purchase using v20 step flags. Admin only.', auth: true },
  { method: 'POST', path: '/api/admin/purchases/:id/reenqueue', description: 'Re-enqueue a stuck pack purchase into the durable pack-fulfillment queue consumer (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/purchases/:id/cancel', description: 'Tombstone-cancel a pack purchase record — sets status=cancelled with audit fields (admin only)', auth: true },
  { method: 'DELETE', path: '/api/admin/purchases/:id', description: 'Tombstone-cancel a single pack purchase record (sets status=cancelled, does not hard-delete — admin only)', auth: true },
  { method: 'POST', path: '/api/direct-sol-purchase', description: 'Verify an on-chain direct SOL purchase tx and run v20 fulfillment pipeline with 1.5% fan bonus', auth: false },
  { method: 'GET', path: '/api/admin/failed-fulfillments', description: 'List all unresolved failed fulfillment records (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/retry-fulfillment', description: 'Retry a failed fulfillment by re-running the failed steps. On success, sets resolvedAt. Admin only.', auth: true },
  { method: 'DELETE', path: '/api/admin/failed-fulfillments/:fulfillmentId', description: 'Delete a failedFulfillments record (admin manually resolved offline). Admin only.', auth: true },
  { method: 'GET', path: '/api/health', description: 'Health check — returns vault address, SOL balance, network (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/wallet-status', description: 'Wallet status — operations wallet balance and PDA info (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/pending-orders', description: 'List of pending pack purchases awaiting fulfillment (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/fulfill', description: 'Manual fulfillment of a pack purchase order (admin only)', auth: true },
  { method: 'GET', path: '/api/admin/pending-songs', description: 'List all song submissions pending admin approval (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/approve', description: 'Approve a song submission — optionally override launch mode and create onchain token if auto (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/reject', description: 'Reject a song submission with a reason — sends email notification if artistEmail is set (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/request-changes', description: 'Request changes on a song submission — sends email notification if artistEmail is set (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/set-approved', description: 'Simple approval toggle for a song (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/set-paused', description: 'Pause/unpause a song (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/set-hidden', description: 'Hide/unhide a song from public listings (admin only)', auth: true },
  { method: 'POST', path: '/api/admin/songs/:songId/set-swap-eligible', description: 'Toggle swap eligibility for a song (admin only)', auth: true },
  { method: 'POST', path: '/api/artists/ensure-wallet', description: 'Create or retrieve a Privy embedded Solana wallet for the authenticated artist and persist it to their profile', auth: true },
  { method: 'GET', path: '/api/wallet/:address/tokens', description: 'Scan all SPL token accounts for a wallet and return non-zero balances', auth: false },
  { method: 'POST', path: '/api/songs/:songId/stream', description: 'Record a song stream', auth: true },
  { method: 'POST', path: '/api/songs/:songId/sell', description: 'Get a sell quote or execute a vault sell for song tokens', auth: true },
  { method: 'POST', path: '/api/songs/:songId/simulate-buy', description: 'Pre-flight simulation for bonding curve buys — checks graduation and SOL balance', auth: true },
  { method: 'POST', path: '/api/admin/purchases/:purchaseId/recover-trapped-tokens', description: 'Recovery: direct SPL transfer of trapped tokens from vault to buyer for a needs_review/partial_failure purchase where tokenAmount=0. Admin only.', auth: true },
  { method: 'GET', path: '/api/songs/:mint/holders', description: 'Fetch real on-chain token holders for a mint via Helius DAS getTokenAccounts. Returns top 20 holders with balance and percentage.', auth: false },
  { method: 'GET', path: '/api/songs/:mint/candles', description: 'OHLC candles for a song token. Primary: pump.fun. Fallback: synthetic candles from priceHistory snapshots', auth: false },
  { method: 'GET', path: '/api/admin/stream-analytics', description: 'Stream analytics aggregated data (admin only)', auth: true },
  { method: 'POST', path: '/api/support/ticket', description: 'Submit a support or DMCA ticket', auth: false },
  { method: 'PATCH', path: '/api/support/ticket/:id', description: 'Update a support ticket (admin only)', auth: true },
  { method: 'POST', path: '/api/error-log', description: 'Log an error from frontend or backend', auth: false },
  { method: 'PATCH', path: '/api/error-log/:id/resolve', description: 'Mark an error log as resolved (admin only)', auth: true },
  { method: 'POST', path: '/api/notifications/like', description: 'Create a like notification for the song creator', auth: true },
  { method: 'POST', path: '/api/notifications/follow', description: 'Create a follow notification for the artist', auth: true },
  { method: 'POST', path: '/api/notifications/repost', description: 'Create a repost notification for the song creator', auth: true },
  { method: 'POST', path: '/api/chat/messages', description: 'Create a chat message with content moderation and rate limiting', auth: true },
];

/**
 * Escape a string for safe interpolation into HTML attributes/content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build an HTML page with Open Graph meta tags for a song share preview.
 * Social crawlers (Twitter, Discord, Slack, iMessage) read the OG tags.
 * Human visitors get auto-redirected to the SPA song page via JavaScript.
 */
function buildOgHtml(params: {
  title: string;
  description: string;
  image: string;
  url: string;
  songTitle: string;
  artistName: string;
  symbol: string;
}): string {
  const { title, description, image, url, songTitle, artistName, symbol } = params;
  const safeTitle = escapeHtml(title);
  const safeDesc = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeUrl = escapeHtml(url);
  const safeSongTitle = escapeHtml(songTitle);
  const safeArtist = escapeHtml(artistName);
  const safeSymbol = escapeHtml(symbol);

  // Extra escape for URLs placed inside <meta> and <script> contexts
  const escUrl = (u: string) => u.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeRedirectUrl = escUrl(url);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle} | Lit Studios</title>

  <!-- Open Graph -->
  <meta property="og:type" content="music.song">
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDesc}">
  ${safeImage ? `<meta property="og:image" content="${safeImage}">` : ''}
  <meta property="og:url" content="${safeUrl}">
  <meta property="og:site_name" content="Lit Studios">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${safeImage ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDesc}">
  ${safeImage ? `<meta name="twitter:image" content="${safeImage}">` : ''}
  <meta name="twitter:site" content="@LitStudios">

  <!-- Canonical -->
  <link rel="canonical" href="${safeUrl}">

  <!-- Auto-redirect human visitors to the SPA -->
  <meta http-equiv="refresh" content="0;url=${safeRedirectUrl}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', system-ui, sans-serif;
      background: #0a0612;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      text-align: center;
      padding: 3rem 2rem;
      max-width: 400px;
    }
    .cover {
      width: 200px;
      height: 200px;
      border-radius: 16px;
      object-fit: cover;
      margin: 0 auto 1.5rem;
      box-shadow: 0 8px 32px rgba(139,92,246,0.3);
      border: 2px solid rgba(139,92,246,0.3);
    }
    .placeholder {
      width: 200px;
      height: 200px;
      border-radius: 16px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #1a1030, #2d1b69);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid rgba(139,92,246,0.3);
    }
    .placeholder svg { opacity: 0.4; }
    h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.25rem; }
    .artist { color: rgba(220,214,240,0.6); font-size: 0.95rem; margin-bottom: 1rem; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      background: rgba(139,92,246,0.2);
      color: #a78bfa;
      border: 1px solid rgba(139,92,246,0.3);
      margin-bottom: 1.5rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .redirect {
      color: rgba(220,214,240,0.4);
      font-size: 0.8rem;
    }
    .redirect a { color: #a78bfa; text-decoration: none; }
    .redirect a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    ${safeImage
      ? `<img class="cover" src="${safeImage}" alt="${safeSongTitle}">`
      : `<div class="placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg></div>`
    }
    <h1>${safeSongTitle}</h1>
    <p class="artist">${safeArtist}</p>
    ${safeSymbol ? `<div class="badge">$${safeSymbol}</div>` : ''}
    <p class="redirect">Redirecting to <a href="${safeRedirectUrl}">Lit Studios</a>...</p>
  </div>
  <script>window.location.replace("${safeRedirectUrl}");</script>
</body>
</html>`;
}

/**
 * Fallback OG HTML page when no songId is provided.
 */
function buildOgFallbackHtml(): string {
  const baseUrl = 'https://litstudios.online';
  const escUrl = (u: string) => u.replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeBaseUrl = escUrl(baseUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Lit Studios</title>
  <meta property="og:title" content="Lit Studios">
  <meta property="og:description" content="Trade music on Solana. Every song is a token.">
  <meta property="og:url" content="${safeBaseUrl}">
  <meta property="og:site_name" content="Lit Studios">
  <meta name="twitter:card" content="summary">
  <meta http-equiv="refresh" content="0;url=${safeBaseUrl}">
</head>
<body>
  <p>Redirecting to <a href="${safeBaseUrl}">Lit Studios</a>...</p>
  <script>window.location.replace("${safeBaseUrl}");</script>
</body>
</html>`;
}

// ─── Email Receipt ───────────────────────────────────────────────────────────

/**
 * Build an HTML email receipt for a purchase.
 */
function buildReceiptEmail(params: {
  songTitle: string;
  artistName: string;
  coverImage?: string;
  editionNumber?: string;
  tokenAmount?: number;
  tokenSymbol?: string;
  splTxHash?: string;
  nftTxHash?: string;
  currentPrice?: string;
}): string {
  const {
    songTitle, artistName, coverImage, editionNumber,
    tokenAmount, tokenSymbol, splTxHash, nftTxHash, currentPrice,
  } = params;

  const safeTitle = songTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeArtist = artistName.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const coverSection = coverImage
    ? `<img src="${coverImage}" alt="${safeTitle}" width="200" height="200" style="width:200px;height:200px;border-radius:16px;object-fit:cover;display:block;margin:0 auto 24px;border:2px solid rgba(139,92,246,0.4);" />`
    : '';

  const editionSection = editionNumber
    ? `<p style="margin:0 0 8px;color:#a78bfa;font-size:14px;font-weight:600;">Edition ${editionNumber}</p>`
    : '';

  const tokenSection = tokenAmount
    ? `<p style="margin:0 0 8px;color:#e0d7ff;font-size:14px;">
        <span style="color:#6b7280;">SPL Tokens received:</span>
        <strong style="color:#a78bfa;">${tokenAmount.toLocaleString()} ${tokenSymbol ?? 'tokens'}</strong>
       </p>`
    : '';

  const priceSection = currentPrice
    ? `<p style="margin:0 0 8px;color:#e0d7ff;font-size:14px;">
        <span style="color:#6b7280;">Token price at purchase:</span>
        <strong style="color:#22c55e;">${currentPrice}</strong>
       </p>`
    : '';

  const splLink = splTxHash
    ? `<a href="https://solscan.io/tx/${splTxHash}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 16px;background:rgba(139,92,246,0.2);color:#a78bfa;text-decoration:none;border-radius:8px;font-size:13px;border:1px solid rgba(139,92,246,0.3);">View SPL Transaction</a>`
    : '';

  const nftLink = nftTxHash
    ? `<a href="https://solscan.io/tx/${nftTxHash}" style="display:inline-block;margin:0 8px 8px 0;padding:8px 16px;background:rgba(139,92,246,0.2);color:#a78bfa;text-decoration:none;border-radius:8px;font-size:13px;border:1px solid rgba(139,92,246,0.3);">View NFT Mint</a>`
    : '';

  const txSection = (splLink || nftLink)
    ? `<div style="margin:20px 0;">${splLink}${nftLink}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You now own ${safeTitle} on-chain</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:'Segoe UI',system-ui,sans-serif;color:#e0d7ff;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;">
      <div style="display:inline-block;padding:12px 24px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;margin-bottom:16px;">
        <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:0.15em;">LIT STUDIO</span>
      </div>
      <p style="margin:0;color:rgba(220,214,240,0.5);font-size:13px;">On-Chain Music Ownership</p>
    </div>

    <!-- Main card -->
    <div style="background:linear-gradient(145deg,rgba(30,20,60,0.9),rgba(15,10,30,0.95));border:1px solid rgba(139,92,246,0.25);border-radius:20px;padding:32px;margin-bottom:24px;">

      ${coverSection}

      <h1 style="margin:0 0 8px;font-size:26px;font-weight:900;color:#fff;text-align:center;">${safeTitle}</h1>
      <p style="margin:0 0 24px;color:rgba(220,214,240,0.6);text-align:center;font-size:15px;">by ${safeArtist}</p>

      <div style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:12px;padding:20px;margin-bottom:20px;">
        ${editionSection}
        ${tokenSection}
        ${priceSection}
        <p style="margin:0;color:#e0d7ff;font-size:14px;">
          <span style="color:#6b7280;">Status:</span>
          <strong style="color:#22c55e;">Confirmed on Solana</strong>
        </p>
      </div>

      ${txSection}

      <!-- Phantom instructions -->
      <div style="background:rgba(0,0,0,0.3);border-radius:12px;padding:16px;margin-bottom:20px;">
        <p style="margin:0 0 8px;color:#a78bfa;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Access Your NFT</p>
        <p style="margin:0;color:rgba(220,214,240,0.65);font-size:14px;line-height:1.6;">
          Open <strong style="color:#fff;">Phantom</strong> &rarr; <strong style="color:#fff;">Collectibles tab</strong> to see your music NFT. Your SPL tokens will appear in your wallet automatically.
        </p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;">
        <a href="https://litstudio.online/collection" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:12px;font-weight:800;font-size:15px;box-shadow:0 0 24px rgba(139,92,246,0.4);">
          View Your Collection
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:rgba(220,214,240,0.35);font-size:12px;line-height:1.6;">
      <p style="margin:0 0 4px;">You received this because you made a purchase on Lit Studio.</p>
      <p style="margin:0;"><a href="https://litstudio.online" style="color:rgba(139,92,246,0.7);text-decoration:none;">litstudio.online</a></p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Send a purchase receipt email via Resend API.
 * Falls back to logging receiptData on the purchase record if RESEND_API_KEY is not set.
 */
async function sendPurchaseReceipt(params: {
  resendApiKey: string | undefined;
  toEmail: string;
  songTitle: string;
  artistName: string;
  coverImage?: string;
  editionNumber?: string;
  tokenAmount?: number;
  tokenSymbol?: string;
  splTxHash?: string;
  nftTxHash?: string;
  currentPrice?: string;
  purchaseId: string;
}): Promise<{ sent: boolean; receiptData: string }> {
  const { resendApiKey, toEmail, purchaseId, ...emailParams } = params;

  const receiptData = JSON.stringify({
    purchaseId,
    to: toEmail,
    songTitle: emailParams.songTitle,
    artistName: emailParams.artistName,
    tokenAmount: emailParams.tokenAmount,
    sentAt: new Date().toISOString(),
  });

  if (!resendApiKey) {
    console.log(`[Receipt] RESEND_API_KEY not configured — logging receipt for ${purchaseId}`);
    return { sent: false, receiptData };
  }

  const html = buildReceiptEmail(emailParams);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'noreply@litstudio.online',
        to: [toEmail],
        subject: `You now own ${emailParams.songTitle} on-chain 🎵`,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      console.error(`[Receipt] Resend API error ${res.status}: ${errText}`);
      return { sent: false, receiptData };
    }

    console.log(`[Receipt] Email sent to ${toEmail} for purchase ${purchaseId}`);
    return { sent: true, receiptData };
  } catch (err) {
    console.error('[Receipt] Failed to call Resend API:', err);
    return { sent: false, receiptData };
  }
}

/**
 * Timing-safe string comparison to prevent HMAC timing attacks.
 * Compares two strings in constant time regardless of their content.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verify Shopify HMAC-SHA256 signature using crypto.subtle (Cloudflare Workers compatible).
 */
async function verifyShopifyHmac(secret: string, body: string, hmacHeader: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const computed = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return timingSafeEqual(computed, hmacHeader);
}

export function registerRoutes(app: Hono): void {
  // Health check
  app.get('/health', (c) => sendSuccess(c, { status: 'ok', timestamp: Date.now() }));

  // GET /api/token-price — returns SOL/USD price (no mint) or mint-specific price (?mint=)
  app.get('/api/token-price', ipRateLimitMiddleware(), async (c) => {
    try {
      const mint = c.req.query('mint');

      if (mint && mint.trim().length > 0) {
        const result = await fetchTokenPriceSafe(mint.trim(), process.env.COINMARKETCAP_API_KEY);
        if (!result) {
          return sendSuccess(c, { price: null, source: null });
        }
        return sendSuccess(c, {
          priceUsd: result.priceUsd,
          priceSol: result.priceSol,
          source: result.source,
          cachedAt: Date.now(),
          cacheTtlMs: TOKEN_PRICE_CACHE_TTL_MS,
        });
      }

      const solPriceResult = await fetchSolPriceSafe();
      if (!solPriceResult) {
        return ApiErrors.internal(c, 'SOL/USD price unavailable from all sources');
      }
      const { priceUsd, source } = solPriceResult;
      return sendSuccess(c, {
        solUsd: priceUsd,
        source,
        cachedAt: Date.now(),
        cacheTtlMs: SOL_PRICE_CACHE_TTL_MS,
      });
    } catch (err) {
      console.error('[token-price] Token price fetch failed:', err);
      return ApiErrors.internal(c, 'Failed to fetch token price');
    }
  });

  // GET /api/swap/quote — proxy to Jupiter quote API
  app.get('/api/swap/quote', ipRateLimitMiddleware(), async (c) => {
    try {
      const query = c.req.query();
      const params = new URLSearchParams(query);
      const url = `https://quote-api.jup.ag/v6/quote?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      return sendSuccess(c, data);
    } catch (err) {
      console.error('[swap/quote] Jupiter quote proxy failed:', err);
      return ApiErrors.internal(c, 'Failed to fetch swap quote');
    }
  });

  // POST /api/swap/transaction — proxy to Jupiter swap API
  app.post('/api/swap/transaction', ipRateLimitMiddleware(), async (c) => {
    try {
      const body = await c.req.json();
      const res = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      return sendSuccess(c, data);
    } catch (err) {
      console.error('[swap/transaction] Jupiter swap proxy failed:', err);
      return ApiErrors.internal(c, 'Failed to fetch swap transaction');
    }
  });

  // GET /api/songs/:songId/holders — returns token holder count via Solana RPC
  app.get('/api/songs/:songId/holders', ipRateLimitMiddleware(), async (c) => {
    try {
      const { songId } = c.req.param();
      const songData = await getSongs(songId);
      if (!songData) return ApiErrors.notFound(c, 'Song not found');

      const mintAddress = songData?.mintAddress;
      if (!mintAddress) return ApiErrors.badRequest(c, 'Song has no mint address');

      // Try onchain query first (more reliable for pump.fun tokens)
      try {
        const progress = await runGetBondingCurveProgressQueryForSongs(songId);
        // If we got progress, the token exists on pump.fun bonding curve
        // For bonding curve tokens, use the bonding curve PDA + global pool as 2 "holders"
        // plus any external holders from RPC
        if (typeof progress === 'number' && progress >= 0) {
          // Fall through to RPC for real holder count
        }
      } catch {
        // Query not available, continue with RPC
      }

      const connection = await createConnection(c.env);
      const mintPubkey = new PublicKey(mintAddress);

      const largestAccounts = await connection.getTokenLargestAccounts(mintPubkey);
      const holderCount = largestAccounts.value.filter(
        (account) => account.uiAmount != null && account.uiAmount > 0
      ).length;

      return sendSuccess(c, { holderCount });
    } catch (err) {
      console.error('[holders] Error fetching holders:', err);
      return ApiErrors.internal(c, 'Failed to fetch holder count');
    }
  });

  // POST /api/songs/:songId/sell — get sell quote or execute vault sell
  app.post('/api/songs/:songId/sell', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const songId = c.req.param('songId');
    if (!songId) return ApiErrors.badRequest(c, 'songId is required');

    let body: { mintAddress?: string; tokenAmount?: number; slippageBps?: number; execute?: boolean };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { mintAddress, tokenAmount, slippageBps, execute } = body;
    if (!mintAddress || typeof mintAddress !== 'string') {
      return ApiErrors.badRequest(c, 'mintAddress is required');
    }
    if (!tokenAmount || tokenAmount <= 0) {
      return ApiErrors.badRequest(c, 'tokenAmount must be > 0');
    }

    const result = await bondingCurveSell(c.env as any, {
      songId,
      mintAddress,
      tokenAmount,
      walletAddress,
      slippageBps,
      execute: execute ?? false,
    });

    if (!result.ok) {
      return ApiErrors.badRequest(c, result.reason ?? 'Sell failed');
    }

    return sendSuccess(c, {
      signature: result.signature,
      solReceived: result.solReceived,
      quoteOutLamports: result.quoteOutLamports,
      tokenAmountBaseUnits: result.tokenAmountBaseUnits,
      executed: execute ?? false,
    });
  });

  // OAuth routes (uncomment to enable):
  app.get('/api/oauth/callback', oauthCallbackHandler);
  app.get('/api/social-links/:provider', getSocialLinkHandler);
  app.delete('/api/social-links/:provider', deleteSocialLinkHandler);

  // LEGACY — DISABLED. Shopify must use /api/webhooks/packs/fulfill.
  // This endpoint returns 200 so Shopify stops retrying, but does not process orders.
  app.post('/api/webhooks/shopify', async (c) => {
    return sendSuccess(c, { received: true, reason: 'deprecated_endpoint' });
  });

  // GET /api/webhooks/shopify/status — admin monitoring endpoint
  app.get('/api/webhooks/shopify/status', async (c) => {
    await validatePoofAuth(c, true);
    const purchases = await getManyPurchases('order by createdAt desc limit 20');
    return sendSuccess(c, { purchases });
  });

  // POST /api/purchases/claim-token — get a wallet-bound, time-bound claim token
  // Requires authentication. The issuing wallet address is bound into the token HMAC,
  // so a token issued for wallet A cannot be consumed by wallet B.
  app.post('/api/purchases/claim-token', ipRateLimitMiddleware(10), async (c) => {
    // SECURITY: require an authenticated wallet before issuing any token.
    const { walletAddress } = await validatePoofAuth(c);

    let body: { purchaseId?: string; email?: string };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { purchaseId, email } = body;

    if (!purchaseId || !email) {
      return ApiErrors.badRequest(c, 'purchaseId and email are required');
    }

    // Try packPurchases first (pending_wallet flow), then fall back to purchases
    const packPurchase = await getPackPurchases(purchaseId);
    const storedEmail = packPurchase?.buyerEmail ?? null;

    let resolvedEmail: string | null = storedEmail;
    if (!resolvedEmail) {
      const purchase = await getPurchases(purchaseId);
      resolvedEmail = purchase?.email ?? null;
    }

    // Use a generic error for all not-found / mismatch cases to prevent enumeration.
    if (!resolvedEmail || resolvedEmail.toLowerCase() !== email.toLowerCase()) {
      return ApiErrors.unauthorized(c, 'Invalid claim');
    }

    // Token expires in 15 minutes
    const expiresAt = Math.floor(Date.now() / 1000) + 15 * 60;

    try {
      const claimToken = await generateClaimToken(purchaseId, email, walletAddress, expiresAt);
      return sendSuccess(c, { claimToken, purchaseId });
    } catch (err) {
      console.error('[ClaimToken] Failed to generate claim token:', err);
      return ApiErrors.internal(c, 'Failed to generate claim token');
    }
  });

  // GET /api/purchases/by-order/:orderId — look up pack purchases by Shopify order ID
  // Requires authentication — returns only purchases owned by the authenticated wallet
  app.get('/api/purchases/by-order/:orderId', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);

    const orderId = c.req.param('orderId');
    if (!orderId || !/^[\w-]+$/.test(orderId)) {
      return ApiErrors.badRequest(c, 'Invalid order ID format');
    }

    const sanitizedOrderId = sanitizeFilterValueOrEmpty(orderId);
    const results = await getManyPackPurchases(`where shopifyOrderId = "${sanitizedOrderId}"`);

    // Filter to only purchases owned by the authenticated wallet
    const ownedResults = results.filter((r: any) => r.buyerAddress === walletAddress);

    // Return only safe fields — never expose buyerEmail or buyerAddress
    const safeResults = ownedResults.map((r: any) => ({
      id: r.id,
      status: r.status,
      songId: r.songId,
      nftCount: r.nftCount,
      tokenAmount: r.tokenAmount,
      shopifyOrderId: r.shopifyOrderId,
      createdAt: r.createdAt,
      packId: r.packId,
      packName: r.packName,
      splTxHash: r.splTxHash,
      nftTxHashes: r.nftTxHashes,
    }));

    return sendSuccess(c, { purchases: safeResults });
  });

  // POST /api/purchases/claim/:purchaseId — securely claim a purchase
  // Requires: authenticated wallet + valid claimToken + matching email
  // On claim: update purchase with real wallet, create user record if needed, trigger airdrop
  // For pending_wallet pack purchases: runs full fulfillment pipeline
  app.post('/api/purchases/claim/:purchaseId', ipRateLimitMiddleware(10), async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const purchaseId = c.req.param('purchaseId');

    if (!purchaseId) {
      return ApiErrors.badRequest(c, 'Missing purchaseId parameter');
    }

    let body: { claimToken?: string; email?: string };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { claimToken, email } = body;

    if (!claimToken) {
      return ApiErrors.badRequest(c, 'Claim token is required');
    }

    if (!email) {
      return ApiErrors.badRequest(c, 'Email is required');
    }

    // Try to find the purchase in packPurchases first (pending_wallet flow)
    const packPurchase = await getPackPurchases(purchaseId);

    if (packPurchase && packPurchase.status === 'pending_wallet') {
      // Verify email matches (generic error to prevent enumeration)
      if (packPurchase.buyerEmail.toLowerCase() !== email.toLowerCase()) {
        return ApiErrors.unauthorized(c, 'Invalid claim');
      }

      // Verify wallet-bound, time-bound claim token
      try {
        await verifyClaimToken(claimToken, purchaseId, email, walletAddress);
      } catch (err) {
        console.error('[Claim] Pack claim token verification failed:', err);
        return ApiErrors.unauthorized(c, 'Invalid claim');
      }

      // Update pack purchase with real wallet
      const updated = await updatePackPurchases(purchaseId, {
        buyerAddress: Address.publicKey(walletAddress),
        walletSource: 'connected',
        status: 'pending',
      } as any);

      if (!updated) {
        console.error(`[Claim] Failed to update pack purchase ${purchaseId}`);
        return ApiErrors.internal(c, 'Failed to claim purchase');
      }

      // Check/create user record
      try {
        const existingUsers = await getManyUsers(`where email = "${sanitizeFilterValueOrEmpty(email)}"`);
        if (existingUsers.length === 0) {
          await setUsers(walletAddress, {
            email,
            walletAddress: Address.publicKey(walletAddress),
            displayName: email.split('@')[0],
          });
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Claim] Created user record for ${email} with wallet ${walletAddress}`);
        }
      } catch (err) {
        console.error(`[Claim] Failed to check/create user record for ${email}:`, err);
      }

      // Trigger full pack fulfillment pipeline via runAllSteps (canonical idempotent pipeline).
      // runAllSteps reads step flags (stepTokens/stepPayout/stepNft/stepNotify) so re-running
      // after a partial failure only retries the failed steps — no double-spend risk.
      // This replaces the old fulfillPackLineItem call which bypassed step flags and had
      // a duplicate runStepPayout bug.
      try {
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Claim] Running runAllSteps for pack purchase ${purchaseId} (wallet now: ${walletAddress})`);
        const stepsResult = await runAllSteps(purchaseId);
        const claimStatus = stepsResult.finalStatus === 'completed' ? 'completed' : 'partial';
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Claim] runAllSteps complete for ${purchaseId}: tokens=${stepsResult.stepTokens} payout=${stepsResult.stepPayout} notify=${stepsResult.stepNotify} → ${claimStatus}`);
        return sendSuccess(c, {
          purchaseId,
          status: claimStatus,
          walletAddress,
          message: 'Purchase claimed and fulfilled',
          tokenAirdropStatus: stepsResult.stepTokens,
          payoutStatus: stepsResult.stepPayout,
        });
      } catch (err) {
        console.error(`[Claim] runAllSteps failed for ${purchaseId}:`, err);
        // Non-fatal — wallet was already updated; buyer can retry claim
      }

      return sendSuccess(c, {
        purchaseId,
        status: 'pending_fulfillment',
        walletAddress,
        message: 'Purchase claimed, fulfillment pending',
      });
    }

    // Fallback to original purchases collection flow
    const purchase = await getPurchases(purchaseId);
    if (!purchase) {
      // Generic error to prevent enumeration
      return ApiErrors.unauthorized(c, 'Invalid claim');
    }

    // Verify purchase is claimable (status must be pending, pending_claim, or pending_wallet)
    if (purchase.status !== 'pending' && purchase.status !== 'pending_claim' && purchase.status !== 'pending_wallet') {
      return ApiErrors.badRequest(c, 'Purchase has already been claimed or processed');
    }

    // Verify email matches the purchase record (case-insensitive; generic error for enumeration safety)
    if (purchase.email.toLowerCase() !== email.toLowerCase()) {
      return ApiErrors.unauthorized(c, 'Invalid claim');
    }

    // Verify wallet-bound, time-bound claim token
    try {
      await verifyClaimToken(claimToken, purchaseId, email, walletAddress);
    } catch (err) {
      console.error('[Claim] Purchase claim token verification failed:', err);
      return ApiErrors.unauthorized(c, 'Invalid claim');
    }

    // All checks passed — update purchase with real wallet and mark completed
    const updated = await updatePurchases(purchaseId, {
      walletAddress,
      status: 'completed',
    });

    if (!updated) {
      console.error(`[Claim] Failed to update purchase ${purchaseId}`);
      return ApiErrors.internal(c, 'Failed to claim purchase');
    }

    // Check if user record exists for this email; create one if not
    try {
      const existingUsers = await getManyUsers(`email = "${sanitizeFilterValueOrEmpty(email)}"`);
      if (existingUsers.length === 0) {
        const displayName = email.split('@')[0];
        await setUsers(walletAddress, {
          email,
          walletAddress: Address.publicKey(walletAddress),
          displayName,
        });
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Claim] Created user record for ${email} with wallet ${walletAddress}`);
      }
    } catch (err) {
      console.error(`[Claim] Failed to check/create user record for ${email}:`, err);
      // Non-fatal — purchase is already claimed
    }

    // Trigger airdrop to the real wallet
    try {
      const tokenAmount = purchase.tokenAmount ?? 1000000;
      const songId = purchase.songId;
      const airdropId = crypto.randomUUID().replace(/-/g, '');
      const airdropCreated = await set(`songs/${songId}/airdrops/${airdropId}`, {
        recipient: Address.publicKey(walletAddress),
        amount: tokenAmount,
        purchaseId,
        createdAt: Time.Now,
      });

      if (airdropCreated) {
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Claim] Airdrop created: ${airdropId} of ${tokenAmount} to ${walletAddress}`);
      } else {
        console.warn(`[Claim] Airdrop creation returned false (policy denied)`);
      }
    } catch (err) {
      console.error('[Claim] Failed to create airdrop:', err);
      // Non-fatal — purchase is claimed, airdrop can be retried
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Claim] Purchase ${purchaseId} claimed by wallet ${walletAddress}`);

    return sendSuccess(c, {
      purchaseId,
      status: 'completed',
      walletAddress,
      message: 'Purchase claimed successfully',
    });
  });

  // Stripe routes have been removed from this application. Shopify-only.

  // POST /api/editions/purchase — fulfill a collectible edition purchase
  // SECURITY: The buyer's wallet address is derived from the authenticated JWT, never from the request body.
  // All onchain operations (NFT mint, token transfer) are performed by the backend vault (PROJECT_VAULT_ADDRESS).
  // SOL payment from buyer to artist is enforced via the policy passthrough collection
  // (editions/$editionId/pay/$payId) which reads priceSol and artistAddress from the parent edition document.
  // The client must provide the payId used when calling the pay subcollection; the backend verifies
  // (1) no completed purchase already exists for this buyer+edition (double-fulfillment prevention),
  // (2) no existing purchase references the same payId (replay prevention).
  app.post('/api/editions/purchase', ipRateLimitMiddleware(10), async (c) => {
    const { walletAddress: buyerAddress } = await validatePoofAuth(c);

    let body: { editionId?: string; buyerEmail?: string; metadataUri?: string; payId?: string };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { editionId, buyerEmail, metadataUri, payId } = body;

    if (!editionId || typeof editionId !== 'string') {
      return ApiErrors.badRequest(c, 'Missing required field: editionId');
    }
    if (!buyerEmail || typeof buyerEmail !== 'string') {
      return ApiErrors.badRequest(c, 'Missing required field: buyerEmail');
    }
    if (!payId || typeof payId !== 'string') {
      return ApiErrors.badRequest(c, 'Missing required field: payId');
    }

    // Validate email format
    if (!validateEmail(buyerEmail)) {
      return ApiErrors.badRequest(c, 'Invalid email address');
    }

    // Sanitize payId to prevent filter injection — allow only alphanumeric, dash, underscore
    if (!/^[\w-]+$/.test(payId)) {
      return ApiErrors.badRequest(c, 'Invalid payId format');
    }

    // Fetch the edition to verify it exists and has remaining supply
    const edition = await getEditions(editionId);
    if (!edition) {
      return ApiErrors.notFound(c, 'Edition not found');
    }
    if (edition.remaining <= 0) {
      return ApiErrors.badRequest(c, 'This edition is sold out');
    }

    // --- PAYMENT VERIFICATION ---

    // 1. Double-fulfillment prevention: check if this buyer already has a completed purchase for this edition
    const sanitizedBuyerAddress = sanitizeFilterValueOrEmpty(buyerAddress);
    const existingBuyerPurchases = await getManyEditionsPurchases(
      editionId,
      `where buyerAddress = '${sanitizedBuyerAddress}' and status = 'completed'`,
    );

    if (existingBuyerPurchases.length > 0) {
      console.warn(`[editions/purchase] Double-fulfillment blocked — buyer ${buyerAddress} already owns edition ${editionId}`);
      return ApiErrors.badRequest(c, 'You already own this edition');
    }

    // 2. Replay prevention: check that no existing purchase references this payId (stored in orderId)
    const sanitizedPayId = sanitizeFilterValueOrEmpty(payId);
    const existingPayIdPurchases = await getManyEditionsPurchases(
      editionId,
      `where orderId = '${sanitizedPayId}'`,
    );

    if (existingPayIdPurchases.length > 0) {
      console.warn(`[editions/purchase] Replay blocked — payId ${payId} already used for edition ${editionId}`);
      return ApiErrors.badRequest(c, 'This payment has already been fulfilled');
    }

    // --- END PAYMENT VERIFICATION ---

    // Deterministic purchaseId acts as an atomic claim: one purchase per buyer per edition.
    // Concurrent requests from the same wallet will collide on the same document ID.
    const purchaseId = `${editionId}-${buyerAddress.slice(0, 16)}`.slice(0, 60);
    const mintId = `${purchaseId}-mint`;
    const transferId = `${purchaseId}-transfer`;
    const resolvedMetadataUri = metadataUri || edition.coverImage || `https://arweave.net/edition-${editionId}`;

    // Atomically decrement remaining supply BEFORE minting.
    // Two concurrent requests both passing the remaining > 0 check above will
    // race here; the second may drive remaining below 0, which we detect and reject.
    const remainingDecremented = await updateEditions(editionId, {
      remaining: Increment.by(-1),
    });
    if (!remainingDecremented) {
      return ApiErrors.internal(c, 'Failed to reserve edition supply');
    }

    // Re-read edition to confirm we did not oversell
    const editionAfterDecrement = await getEditions(editionId);
    const remainingAfter = (editionAfterDecrement as any)?.remaining ?? -1;
    if (remainingAfter < 0) {
      // Oversold — mark purchase as oversold and reject
      await setEditionsPurchases(editionId, purchaseId, {
        editionId,
        buyerEmail,
        buyerAddress,
        orderId: payId,
        solPrice: edition.priceSol,
        status: 'oversold',
        createdAt: Time.Now,
      });
      return ApiErrors.badRequest(c, 'This edition is sold out');
    }

    // Create purchase audit record (status: pending)
    const purchaseCreated = await setEditionsPurchases(editionId, purchaseId, {
      editionId,
      buyerEmail,
      buyerAddress,
      orderId: payId,
      solPrice: edition.priceSol,
      status: 'pending',
      createdAt: Time.Now,
    });

    if (!purchaseCreated) {
      return ApiErrors.internal(c, 'Failed to initiate purchase record');
    }

    // Mint the Metaplex NFT to the buyer
    const mintSuccess = await setEditionsMintNFT(editionId, mintId, {
      buyerAddress: Address.publicKey(buyerAddress),
      metadataUri: resolvedMetadataUri,
    });

    // Transfer the bundled SPL token to the buyer
    const transferSuccess = await setEditionsTransferToken(editionId, transferId, {
      buyerAddress: Address.publicKey(buyerAddress),
      amount: 1,
    });

    const fulfillmentStatus = mintSuccess && transferSuccess ? 'completed' : 'partial_failure';

    // Update purchase record with fulfillment outcome
    await setEditionsPurchases(editionId, purchaseId, {
      editionId,
      buyerEmail,
      buyerAddress,
      orderId: payId,
      solPrice: edition.priceSol,
      status: fulfillmentStatus,
      createdAt: Time.Now,
    });

    if (!mintSuccess || !transferSuccess) {
      return ApiErrors.internal(c, 'Purchase partially failed — NFT or token delivery failed. Please contact support.');
    }

    return sendSuccess(c, {
      purchaseId,
      mintId,
      transferId,
      status: 'completed',
    });
  });

  // GET /api/songs/:songId/access — token-gated audio access check
  app.get('/api/songs/:songId/access', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const songId = c.req.param('songId');

    if (!songId) {
      return ApiErrors.badRequest(c, 'Missing songId parameter');
    }

    // Fetch song details (offchain metadata with audioUrl and minTokensRequired)
    const details = await getSongDetails(songId);
    if (!details) {
      return ApiErrors.notFound(c, 'Song not found');
    }

    // Fetch onchain song data
    const song = await getSongs(songId);
    if (!song) {
      return ApiErrors.notFound(c, 'Song token not found');
    }

    const minTokensRequired = details.streamRequirement ?? 0;

    // If free streaming (no token gate), grant access immediately
    if (minTokensRequired <= 0) {
      return sendSuccess(c, {
        canAccess: true,
        audioUrl: details.audioUrl ?? null,
        minTokensRequired: 0,
        tokenBalance: 0,
      });
    }

    // Check the user's token balance using the getTokenBalance query
    let rawBalance = 0;
    try {
      rawBalance = await runGetTokenBalanceQueryForSongs(songId, { walletAddress });
    } catch (error) {
      console.error(`Failed to query token balance for song ${songId}, wallet ${walletAddress}:`, error);
      // If balance query fails, deny access for gated songs
      return ApiErrors.unauthorized(c, 'Unable to verify token balance. Please try again.');
    }

    // Token has 6 decimals: 1 token = 1,000,000 raw units
    // minTokensRequired is in whole tokens, rawBalance is in smallest units
    const TOKEN_DECIMALS = 6;
    const requiredRawBalance = minTokensRequired * Math.pow(10, TOKEN_DECIMALS);
    const humanBalance = rawBalance / Math.pow(10, TOKEN_DECIMALS);

    if (rawBalance >= requiredRawBalance) {
      return sendSuccess(c, {
        canAccess: true,
        audioUrl: details.audioUrl ?? null,
        minTokensRequired,
        tokenBalance: humanBalance,
      });
    }

    // Insufficient tokens
    return ApiErrors.unauthorized(c, `Insufficient token balance to access this song. You need ${minTokensRequired} $${song.symbol} tokens but have ${humanBalance.toFixed(2)}. Buy tokens to unlock streaming.`);
  });

  // GET /api/songs/:songId/stream — proxy audio with token-gated full access
  app.get('/api/songs/:songId/stream', ipRateLimitMiddleware(), async (c) => {
    const songId = c.req.param('songId');
    if (!songId) {
      return ApiErrors.badRequest(c, 'Missing songId parameter');
    }

    const details = await getSongDetails(songId);
    if (!details) {
      return ApiErrors.notFound(c, 'Song not found');
    }

    const audioUrl = details.audioUrl ?? details.audiusStreamUrl ?? null;
    if (!audioUrl) {
      return ApiErrors.notFound(c, 'No audio available for this song');
    }

    // Determine if user has full access
    let hasFullAccess = false;
    let walletAddress: string | null = null;

    try {
      const auth = await validatePoofAuth(c);
      walletAddress = auth.walletAddress;
    } catch {
      // No auth = preview mode only
    }

    if (walletAddress) {
      const song = await getSongs(songId);
      const minTokensRequired = details.streamRequirement ?? 0;

      if (minTokensRequired <= 0) {
        hasFullAccess = true;
      } else {
        // Check token balance
        try {
          const rawBalance = await runGetTokenBalanceQueryForSongs(songId, { walletAddress });
          const TOKEN_DECIMALS = 6;
          const requiredRawBalance = minTokensRequired * Math.pow(10, TOKEN_DECIMALS);
          if (rawBalance >= requiredRawBalance) {
            hasFullAccess = true;
          }
        } catch (err) {
          console.error(`[Stream] Token balance query failed for ${songId} wallet ${walletAddress}:`, err);
        }

        // Check pack purchases as fallback
        if (!hasFullAccess) {
          try {
            const sanitizedWallet = sanitizeFilterValueOrEmpty(walletAddress);
            const sanitizedSongId = sanitizeFilterValueOrEmpty(songId);
            const purchases = await getManyPackPurchases(
              `where buyerAddress = "${sanitizedWallet}" and songId = "${sanitizedSongId}" and status = "completed"`,
            );
            if (purchases.length > 0) {
              hasFullAccess = true;
            }
          } catch (err) {
            console.error(`[Stream] Pack purchase query failed for ${songId} wallet ${walletAddress}:`, err);
          }
        }
      }
    }

    // Offload audio delivery to CDN — redirect instead of proxying bytes through the worker
    if (!hasFullAccess) {
      return ApiErrors.unauthorized(c, 'Preview mode — buy tokens to unlock full streaming');
    }
    return c.redirect(audioUrl, 302);
  });

  // POST /api/songs/:songId/buy — rate-limited pre-flight for bonding curve buys
  app.post('/api/songs/:songId/buy', ipRateLimitMiddleware(), async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const songId = c.req.param('songId');
    if (!songId) {
      return ApiErrors.badRequest(c, 'Missing songId parameter');
    }

    const rateLimitHit = checkWalletRateLimit(c, walletAddress);
    if (rateLimitHit) {
      return rateLimitHit;
    }

    const song = await getSongs(songId);
    if (!song) {
      return ApiErrors.notFound(c, 'Song not found');
    }

    return sendSuccess(c, { allowed: true, songId, walletAddress });
  });

  // GET /api/og/song/:songId — OG meta tag page for social share previews
  app.get('/api/og/song/:songId', ipRateLimitMiddleware(), async (c) => {
    const songId = c.req.param('songId');

    if (!songId) {
      return c.html(buildOgFallbackHtml());
    }

    // Fetch offchain song details for title, artist, cover image
    const details = await getSongDetails(songId);
    // Fetch onchain song data for symbol
    const song = await getSongs(songId);

    const title = details?.title ?? song?.name ?? 'Unknown Song';
    const artistName = details?.artist ?? 'Unknown Artist';
    const coverImage = details?.coverImage ?? '';
    const symbol = song?.symbol ?? '';
    const genre = details?.genre ?? '';

    // Build the canonical SPA URL that humans should land on
    const appBaseUrl = process.env.FRONTEND_URL?.replace(/\/$/, '') ?? 'https://litstudios.online';
    const canonicalUrl = `${appBaseUrl}/song/${songId}`;

    // Build description with token symbol if available
    const descriptionParts = [`Trade "${title}" by ${artistName} on Lit Studios`];
    if (symbol) descriptionParts.push(`Ticker: $${symbol}`);
    if (genre) descriptionParts.push(genre);
    const description = descriptionParts.join(' | ');

    const html = buildOgHtml({
      title: `${title} by ${artistName}`,
      description,
      image: coverImage,
      url: canonicalUrl,
      songTitle: title,
      artistName,
      symbol,
    });

    return c.html(html);
  });

  // ─── Pack Purchase Routes ─────────────────────────────────────────────────────

  // POST /api/webhooks/packs/fulfill — Shopify pack order webhook
  // Receives Shopify order data, fulfills pack purchases by minting NFTs and airdropping tokens
  app.post('/api/webhooks/packs/fulfill', async (c) => {
    // FROZEN toggle via env var — no redeploy needed to halt fulfillment
    const FULFILLMENT_FROZEN = (c.env as Record<string, unknown>).FULFILLMENT_FROZEN === 'true';
    if (FULFILLMENT_FROZEN) {
      if ((c.env as any).LOG_LEVEL !== 'silent') console.log('[Pack Webhook] FROZEN — returning 200 without enqueueing (vault drain freeze 2026-05-19)');
      return sendSuccess(c, { frozen: true, reason: 'fulfillment_halted_vault_drain_2026_05_19' });
    }

    const secretV2 = (process.env.SHOPIFY_WEBHOOK_SECRET_V2 ?? '').trim();
    const secretV1 = (process.env.SHOPIFY_WEBHOOK_SECRET ?? '').trim();
    const secrets = [secretV2, secretV1].filter(Boolean);

    // Helper: collect safe request headers for logging
    const getLoggableHeaders = () => {
      const keys = ['x-shopify-topic', 'x-shopify-shop-domain', 'x-shopify-webhook-id', 'x-shopify-order-id', 'x-shopify-api-version', 'content-type', 'user-agent'];
      const h: Record<string, string> = {};
      for (const k of keys) {
        const v = c.req.header(k);
        if (v) h[k] = v;
      }
      return h;
    };

    if (secrets.length === 0) {
      console.error('No Shopify webhook secret is configured (checked SHOPIFY_WEBHOOK_SECRET_V2 and SHOPIFY_WEBHOOK_SECRET)');
      // Log the misconfiguration so it shows up in the failures dashboard
      void logWebhookFailure({
        webhookSource: 'shopify',
        path: '/api/webhooks/packs/fulfill',
        failureReason: 'missing_secret',
        errorMessage: 'Neither SHOPIFY_WEBHOOK_SECRET_V2 nor SHOPIFY_WEBHOOK_SECRET is configured',
        rawHeaders: getLoggableHeaders(),
        rawBody: '',
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      });
      return ApiErrors.internal(c, 'Webhook secret not configured');
    }

    const rawBody = await c.req.text();
    const hmacHeader = c.req.header('X-Shopify-Hmac-Sha256') ?? '';

    if (!hmacHeader) {
      void logWebhookFailure({
        webhookSource: 'shopify',
        path: '/api/webhooks/packs/fulfill',
        failureReason: 'missing_hmac_header',
        errorMessage: 'X-Shopify-Hmac-Sha256 header was absent from the request',
        rawHeaders: getLoggableHeaders(),
        rawBody: '',
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      });
      return ApiErrors.badRequest(c, 'Missing HMAC signature header');
    }

    let isValid = false;
    let lastError: unknown;
    for (const secret of secrets) {
      try {
        if (await verifyShopifyHmac(secret, rawBody, hmacHeader)) {
          isValid = true;
          break;
        }
      } catch (hmacErr) {
        lastError = hmacErr;
        // Continue to try next secret
      }
    }

    if (!isValid && lastError) {
      void logWebhookFailure({
        webhookSource: 'shopify',
        path: '/api/webhooks/packs/fulfill',
        failureReason: 'hmac_verify_error',
        errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
        rawHeaders: getLoggableHeaders(),
        rawBody: '',
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      });
      return ApiErrors.unauthorized(c, 'Invalid HMAC signature');
    }

    if (!isValid) {
      void logWebhookFailure({
        webhookSource: 'shopify',
        path: '/api/webhooks/packs/fulfill',
        failureReason: 'invalid_hmac',
        errorMessage: 'Computed HMAC-SHA256 does not match X-Shopify-Hmac-Sha256 header using any configured secret (checked SHOPIFY_WEBHOOK_SECRET_V2 and SHOPIFY_WEBHOOK_SECRET).',
        rawHeaders: getLoggableHeaders(),
        rawBody: '',
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      });
      return ApiErrors.unauthorized(c, 'Invalid HMAC signature');
    }

    // ── Replay attack protection ───────────────────────────────────────────────
    const webhookId = c.req.header('X-Shopify-Webhook-Id') ?? '';
    const webhookTimestamp = c.req.header('X-Shopify-Webhook-Timestamp') ?? '';

    if (!webhookId) {
      return ApiErrors.badRequest(c, 'Missing X-Shopify-Webhook-Id header');
    }

    // Timestamp validation: reject webhooks older than 5 minutes (300 seconds)
    if (webhookTimestamp) {
      const ts = parseInt(webhookTimestamp, 10);
      const nowSec = Math.floor(Date.now() / 1000);
      if (!isNaN(ts) && Math.abs(nowSec - ts) > 300) {
        console.warn(`[Pack Webhook] Rejecting stale webhook: id=${webhookId} timestamp=${ts} now=${nowSec} delta=${nowSec - ts}s`);
        void logWebhookFailure({
          webhookSource: 'shopify',
          path: '/api/webhooks/packs/fulfill',
          failureReason: 'stale_webhook',
          errorMessage: `Webhook timestamp ${ts} is more than 300s from server time ${nowSec}`,
          rawHeaders: getLoggableHeaders(),
          rawBody: '',
          discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
        });
        return sendSuccess(c, { received: true, reason: 'stale_webhook' });
      }
    }

    // Deduplication: check if this webhook ID has already been processed
    try {
      const existing = await get(`processedWebhooks/${webhookId}`);
      if (existing) {
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] Duplicate webhook id=${webhookId} — returning 200 without reprocessing`);
        return sendSuccess(c, { received: true, reason: 'duplicate_webhook_id' });
      }
    } catch (dedupErr) {
      // Dedup check failure should not block processing — log and continue
      console.warn(`[Pack Webhook] Dedup check failed for id=${webhookId}:`, dedupErr);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseErr) {
      void logWebhookFailure({
        webhookSource: 'shopify',
        path: '/api/webhooks/packs/fulfill',
        failureReason: 'json_parse_error',
        errorMessage: parseErr instanceof Error ? parseErr.message : String(parseErr),
        rawHeaders: getLoggableHeaders(),
        rawBody: '',
        discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
      });
      return ApiErrors.badRequest(c, 'Invalid JSON payload');
    }

    const email: string = payload.email ?? '';
    const orderId: string = String(payload.id ?? '');
    const lineItems: any[] = Array.isArray(payload.line_items) ? payload.line_items : [];
    const totalPrice = payload.total_price ?? '0';
    const totalPriceCents = Math.round(parseFloat(String(totalPrice)) * 100);

    if (!email || !validateEmail(email)) {
      return ApiErrors.badRequest(c, 'Valid email is required');
    }

    if (!orderId) {
      return ApiErrors.badRequest(c, 'Missing order id');
    }

    // Filter to pack SKUs only
    const packLineItems = lineItems.filter((item: any) =>
      PACK_CONFIG.some(p => p.sku === item.sku),
    );

    if (packLineItems.length === 0) {
      return sendSuccess(c, { received: true, reason: 'no_pack_items' });
    }

    // Get songId and packId from custom attributes
    // Shopify Storefront API cartCreate with input.attributes arrives as payload.attributes
    // — an array of {key, value} objects. This must be checked FIRST.
    const cartAttrs = Array.isArray(payload.attributes)
      ? Object.fromEntries(payload.attributes.map((a: any) => [a.key ?? a.name, a.value]))
      : {};
    const noteAttrs = Array.isArray(payload.note_attributes)
      ? Object.fromEntries(payload.note_attributes.map((a: any) => [a.name, a.value]))
      : (payload.note_attributes ?? {});
    const lineProps = Array.isArray(payload.line_items?.[0]?.properties)
      ? Object.fromEntries(payload.line_items[0].properties.map((p: any) => [p.name, p.value]))
      : {};

    // Resolve songId, packId, mintType, and tipPercent — check cartAttrs (Storefront API) FIRST
    let songId = cartAttrs.songId ?? noteAttrs.songId ?? lineProps.songId ?? '';
    let packId = cartAttrs.packId ?? noteAttrs.packId ?? lineProps.packId ?? '';
    let mintType = cartAttrs.mintType ?? noteAttrs.mintType ?? lineProps.mintType ?? '';
    let packSku = cartAttrs.packSku ?? (packLineItems[0]?.sku ?? '');
    const webhookTipPercent = Math.min(100, Math.max(0, parseInt(cartAttrs.tipPercent ?? noteAttrs.tipPercent ?? lineProps.tipPercent ?? '0', 10) || 0));

    // FIX 3: Derive purchaseAmountUsd from cart attribute first (open-amount checkout sets this),
    // falling back to payload.total_price. All downstream calculations use this value.
    // cartAttrs.amountUsd is set by /api/packs/checkout/open-amount as a string like "5.00".
    const cartAmountUsdStr = cartAttrs.amountUsd ?? noteAttrs.amountUsd;
    const purchaseAmountUsd: number = cartAmountUsdStr
      ? parseFloat(cartAmountUsdStr)
      : parseFloat(String(payload.total_price ?? '0'));
    // Override totalPriceCents to reflect the actual purchase amount (not just total_price)
    const purchaseAmountUsdCents = Math.round(purchaseAmountUsd * 100);

    // Fallback 1: parse the note field if it contains JSON
    if (!songId && payload.note) {
      try {
        const noteObj = JSON.parse(payload.note);
        songId = noteObj.songId || songId;
        packId = noteObj.packId || packId;
        packSku = noteObj.packSku || packSku;
      } catch { /* not JSON, skip */ }
    }

    // Fallback 2: line_item.sku — parse songId when formatted as "song-<id>" or use raw value
    if (!songId && packLineItems.length > 0) {
      for (const item of packLineItems) {
        const sku: string = item.sku ?? '';
        if (sku.startsWith('song-')) {
          songId = sku.slice('song-'.length);
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] songId resolved from line_item.sku (song- prefix): ${songId}`);
          break;
        }
        // If sku is not a known pack SKU, treat it as a raw songId
        if (sku && !PACK_CONFIG.some(p => p.sku === sku)) {
          songId = sku;
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] songId resolved from line_item.sku (raw): ${songId}`);
          break;
        }
      }
    }

    // Fallback 3: line_item.properties array — look for songId / song_id / _songId keys
    if (!songId && lineItems.length > 0) {
      const songIdKeys = new Set(['songId', 'song_id', '_songId', 'SongId', 'song-id']);
      for (const item of lineItems) {
        if (!Array.isArray(item.properties)) continue;
        for (const prop of item.properties as Array<{ name: string; value: string }>) {
          if (songIdKeys.has(prop.name) && prop.value) {
            songId = prop.value;
            if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] songId resolved from line_item.properties["${prop.name}"]: ${songId}`);
            break;
          }
        }
        if (songId) break;
      }
    }

    if (!songId) {
      console.error('[Pack Webhook] songId missing — tried: note_attributes, cart attributes, line_item.properties, line_item.sku (song- prefix + raw), note JSON. Order id:', orderId, 'email:', email);
      return ApiErrors.badRequest(c, 'Missing songId in order attributes');
    }

    // Resolve buyer wallet — priority order:
    // 1) walletAddress from cart attributes (Storefront API cartCreate input.attributes)
    // 2) walletAddress from note_attributes (Admin API draft orders, legacy)
    // 3) walletAddress parsed from the order note JSON (open-amount checkout fallback)
    // 4) existing user lookup by email
    // 5) null → mark as pending_wallet (buyer must claim via authenticated flow)
    let buyerWallet: string | null = null;
    let walletSource: 'cart_attr' | 'note_attr' | 'note_json' | 'email_lookup' | null = null;

    const cartWallet = cartAttrs.walletAddress ?? cartAttrs.wallet_address;
    const noteAttrWallet = noteAttrs.walletAddress ?? noteAttrs.wallet_address;
    let noteJsonWallet: string | undefined;
    if (payload.note) {
      try {
        const noteObj = JSON.parse(payload.note);
        noteJsonWallet = noteObj.walletAddress ?? noteObj.wallet_address;
      } catch { /* note is not JSON — ignore */ }
    }

    // Fix 5: Solana base58 addresses are 32–44 chars, base58 charset only.
    // The previous check (length >= 32) accepted Ethereum 0x... addresses (42 chars).
    const isValidSolanaAddress = (addr: string): boolean =>
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

    if (cartWallet && typeof cartWallet === 'string' && isValidSolanaAddress(cartWallet)) {
      buyerWallet = cartWallet;
      walletSource = 'cart_attr';
    } else if (noteAttrWallet && typeof noteAttrWallet === 'string' && isValidSolanaAddress(noteAttrWallet)) {
      buyerWallet = noteAttrWallet;
      walletSource = 'note_attr';
    } else if (noteJsonWallet && isValidSolanaAddress(noteJsonWallet)) {
      buyerWallet = noteJsonWallet;
      walletSource = 'note_json';
    } else {
      const existingUsers = await getManyUsers(`where email = "${sanitizeFilterValueOrEmpty(email)}"`);
      if (existingUsers.length > 0 && existingUsers[0].walletAddress) {
        buyerWallet = existingUsers[0].walletAddress;
        walletSource = 'email_lookup';
      }
    }

    if (buyerWallet) {
      if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] Resolved buyer wallet via ${walletSource}: ${buyerWallet.slice(0, 6)}...${buyerWallet.slice(-4)} (order ${orderId})`);
    }

    if (!buyerWallet) {
      console.warn(`[Pack Webhook] No wallet available for order ${orderId} (email: ${email}), marking as pending_wallet`);
    }

    // Fix 7: Derive purchaseWalletSource from cartAttrs first, then noteAttrs, then default 'shopify'.
    // This populates the walletSource field on the packPurchase record so fulfillment-steps.ts
    // can correctly apply the direct_sol bonus (+1.5% fan tokens) when applicable.
    const purchaseWalletSource: string =
      cartAttrs.walletSource ?? noteAttrs.walletSource ?? 'shopify';

    // ── Security: Shopify Admin API verification ──────────────────────────────────
    // The HMAC signature proves the request originated from Shopify's servers, but it
    // does NOT prove the payload fields are trustworthy — if the webhook secret leaked
    // an attacker could forge a validly signed body with arbitrary email/line_items/price.
    //
    // This block fetches the order from the Shopify Admin REST API using only the
    // order.id from the signed payload (treating the body as authentication only, not
    // as data). Every field used by fulfillment is derived from the Admin response.
    //
    // verifyOrderViaAdminApi NEVER throws. It returns a typed sentinel so we can
    // decide whether to fall through to HMAC-only verification or hard-reject.
    // The webhook MUST return 200 in all non-HMAC-failure paths so Shopify stops
    // retrying — the only acceptable non-200 is a genuine HMAC failure (401 above).
    const shopifyAdminEnv = {
      SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
      SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
    };

    const adminResult = await verifyOrderViaAdminApi(shopifyAdminEnv, orderId);

    // adminOrder is non-null only when adminResult.verified is true.
    let adminOrder: ShopifyOrder | null = adminResult.order;

    if (!adminResult.verified) {
      const adminFailReason = adminResult.reason;
      switch (adminFailReason) {
        case 'not_found':
          // Order genuinely not found in Admin API — possible forged payload.
          // Return 200 so Shopify does not retry; log for investigation.
          console.error(`[Pack Webhook] Admin API: order ${orderId} not found — rejecting webhook (shopify_admin_verified=false)`);
          void logWebhookFailure({
            webhookSource: 'shopify',
            path: '/api/webhooks/packs/fulfill',
            failureReason: 'admin_order_not_found',
            errorMessage: `Order ${orderId} returned 404 from Admin API — possible forged payload`,
            rawHeaders: getLoggableHeaders(),
            rawBody: rawBody.slice(0, 500),
            discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
          });
          return sendSuccess(c, { received: true, reason: 'order_not_found_in_admin' });

        case 'auth_failed':
          // 401 or 403 — token wrong format or missing scope. Fall through to
          // HMAC-only so purchases are not blocked while the token is fixed.
          console.warn(
            `[Pack Webhook] Admin API auth failed for order ${orderId} (401/403) — ` +
            `proceeding with HMAC-only verification. Check SHOPIFY_ADMIN_API_TOKEN format and read_orders scope.`,
          );
          void logWebhookFailure({
            webhookSource: 'shopify',
            path: '/api/webhooks/packs/fulfill',
            failureReason: 'admin_api_auth_failed',
            errorMessage: `Admin API returned 401/403 for order ${orderId} — token may be wrong format or lack read_orders scope`,
            rawHeaders: getLoggableHeaders(),
            rawBody: '',
            discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
          });
          // Fall through to HMAC-only path (no return)
          break;

        case 'no_token':
          // SHOPIFY_ADMIN_API_TOKEN not set — already warned inside verifyOrderViaAdminApi.
          // Fall through to HMAC-only.
          break;

        case 'admin_unavailable':
          // Network error or unexpected 5xx from Shopify Admin. Fall through to
          // HMAC-only so a transient Shopify outage doesn't block purchases.
          console.warn(`[Pack Webhook] Admin API unavailable for order ${orderId} — proceeding with HMAC-only verification`);
          break;
      }
      // HMAC-only path: payload fields come from the signed webhook body as-is.
      if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] shopify_admin_verified=false reason=${adminFailReason} order=${orderId} — using HMAC-only data`);
    } else {
      // Admin verification succeeded — adminOrder already set from adminResult.order above.

      // Verify financial_status — only fulfill paid orders.
      if (adminOrder.financial_status !== 'paid') {
        console.warn(`[Pack Webhook] Admin API: order ${orderId} financial_status="${adminOrder.financial_status}" (not paid) — rejecting webhook`);
        void logWebhookFailure({
          webhookSource: 'shopify',
          path: '/api/webhooks/packs/fulfill',
          failureReason: 'order_not_paid',
          errorMessage: `Order ${orderId} financial_status="${adminOrder.financial_status}" — only "paid" orders are fulfilled`,
          rawHeaders: getLoggableHeaders(),
          rawBody: '',
          discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
        });
        return sendSuccess(c, { received: true, reason: `order_not_paid:${adminOrder.financial_status}` });
      }

      // Verify Admin id matches the webhook payload id (sanity check against response spoofing).
      const adminOrderId = String(adminOrder.id);
      if (adminOrderId !== orderId) {
        console.error(`[Pack Webhook] Admin API id mismatch: payload.id=${orderId} vs admin.id=${adminOrderId} — rejecting webhook`);
        return ApiErrors.badRequest(c, 'Order ID mismatch between webhook and Admin API');
      }

      if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] shopify_admin_verified=true financial_status=${adminOrder.financial_status} order=${orderId}`);

      // Override all fulfillment data with Admin API values — treat the webhook body
      // as origin authentication only. The Admin response is the authoritative source.
      if (adminOrder.email) {
        (payload as any).email = adminOrder.email;
      }
      if (Array.isArray(adminOrder.line_items) && adminOrder.line_items.length > 0) {
        (payload as any).line_items = adminOrder.line_items;
      }
      if (Array.isArray(adminOrder.note_attributes)) {
        (payload as any).note_attributes = adminOrder.note_attributes;
      }
      if (adminOrder.total_price !== undefined) {
        (payload as any).total_price = adminOrder.total_price;
      }
    }

    // Re-derive variables from the (now Admin-verified) payload so the rest of the
    // handler operates on trusted data. These shadow the body-derived values above.
    const verifiedEmail: string = (payload as any).email ?? email;
    const verifiedLineItems: any[] = Array.isArray((payload as any).line_items)
      ? (payload as any).line_items
      : lineItems;
    const verifiedNoteAttrs: Record<string, string> = Array.isArray((payload as any).note_attributes)
      ? Object.fromEntries((payload as any).note_attributes.map((a: any) => [a.name, a.value]))
      : noteAttrs;
    const verifiedTotalPriceStr: string = String((payload as any).total_price ?? totalPrice ?? '0');
    const verifiedTotalPriceCents = cartAmountUsdStr
      ? Math.round(parseFloat(cartAmountUsdStr) * 100)
      : Math.round(parseFloat(verifiedTotalPriceStr) * 100);

    // Create pack-purchase records synchronously (fast: DB write only) and enqueue
    // the slow fulfillment steps (token transfers, NFT mints) to the durable
    // pack-fulfillment queue consumer. This replaces the old waitUntil pattern
    // which had a ~30s wall-clock budget causing fulfillment timeouts.

    // Use Admin-verified values for all fulfillment work.
    // verifiedEmail / verifiedLineItems / verifiedNoteAttrs / verifiedTotalPriceCents
    // were derived from the Admin API response (or the original body if Admin is not configured).

    // Re-derive buyer wallet from verified attributes so wallet resolution uses Admin data.
    let verifiedBuyerWallet: string | null = buyerWallet; // start with pre-verified value
    if (adminOrder) {
      // Admin order available — re-resolve wallet from Admin-sourced note_attributes and line_item.properties.
      const adminNoteAttrs: Record<string, string> = verifiedNoteAttrs;
      const adminLineProps: Record<string, string> = Array.isArray(verifiedLineItems[0]?.properties)
        ? Object.fromEntries(verifiedLineItems[0].properties.map((p: any) => [p.name, p.value]))
        : {};

      const adminCartWallet = cartAttrs.walletAddress ?? cartAttrs.wallet_address; // cartAttrs comes from Storefront, not order body
      const adminNoteWallet = adminNoteAttrs.walletAddress ?? adminNoteAttrs.wallet_address;
      const adminLineWallet = adminLineProps.walletAddress ?? adminLineProps.wallet_address;

      const isValidSolAddr = (addr: string) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr);

      if (adminCartWallet && typeof adminCartWallet === 'string' && isValidSolAddr(adminCartWallet)) {
        verifiedBuyerWallet = adminCartWallet;
      } else if (adminNoteWallet && typeof adminNoteWallet === 'string' && isValidSolAddr(adminNoteWallet)) {
        verifiedBuyerWallet = adminNoteWallet;
      } else if (adminLineWallet && typeof adminLineWallet === 'string' && isValidSolAddr(adminLineWallet)) {
        verifiedBuyerWallet = adminLineWallet;
      } else if (!verifiedBuyerWallet) {
        // Fall back to email lookup if none of the above resolved
        const adminEmailUsers = await getManyUsers(`where email = "${sanitizeFilterValueOrEmpty(verifiedEmail)}"`);
        if (adminEmailUsers.length > 0 && adminEmailUsers[0].walletAddress) {
          verifiedBuyerWallet = adminEmailUsers[0].walletAddress;
        }
      }
    }

    // Re-filter pack line items from Admin-verified line items
    const verifiedPackLineItems = verifiedLineItems.filter((item: any) =>
      PACK_CONFIG.some(p => p.sku === item.sku),
    );
    // If Admin line items don't match any pack SKUs (e.g. Admin API unavailable and
    // packLineItems was already filtered correctly), fall back to the pre-verified set.
    const finalPackLineItems = verifiedPackLineItems.length > 0 ? verifiedPackLineItems : packLineItems;

    const webhookResults: { purchaseId: string; status: string; errors: string[] }[] = [];
    for (const item of finalPackLineItems) {
      // Resolve pack config for this line item
      const resolvedPackId = packId || item.sku?.replace('pack_', '') || 'unknown';
      const resolvedPackSku = item.sku ?? packSku;

      // Use verifiedTotalPriceCents (Admin-verified price) as the authoritative purchase amount.
      // Clamp to the canonical PACK_CONFIG price so discounts/coupons can't reduce the artist
      // SOL payout below the expected pack price.
      const lineItemPackConfig = PACK_CONFIG.find(p => p.sku === resolvedPackSku);
      const clampedTotalPriceCents = lineItemPackConfig
        ? Math.max(verifiedTotalPriceCents, lineItemPackConfig.priceUsd)
        : verifiedTotalPriceCents;

      // Deduplication check: prevent double-fulfillment if Shopify re-sends the webhook.
      // Only skip if fulfillment already completed (completed / partial).
      // If status is pending_wallet (empty wallet placeholder) and we now have a real wallet,
      // resume fulfillment instead of skipping.
      const existingPurchases = await getManyPackPurchases(
        `where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}" and packId = "${sanitizeFilterValueOrEmpty(resolvedPackId)}"`,
      );
      if (existingPurchases.length > 0) {
        const existing = existingPurchases[0];
        const isCompleted = existing.status === 'completed';
        const isPartial = existing.status === 'partial';
        const isPendingWalletRecord = existing.status === 'pending_wallet' || existing.buyerAddress === '';

        // Detect whether the partial record has any FAILED reconciliation steps
        // we can repair on this webhook retry. If yes, resume instead of skipping.
        let partialHasFailedStep = false;
        if (isPartial && existing.paymentReconciliation) {
          try {
            const recon = JSON.parse(existing.paymentReconciliation) as Record<string, string>;
            partialHasFailedStep = Object.values(recon).some((v) => v === 'failed');
          } catch {
            partialHasFailedStep = false;
          }
        }

        if (isCompleted) {
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} already fulfilled (status: completed, purchaseId: ${existing.id}), skipping`,
          );
          webhookResults.push({ purchaseId: existing.id, status: 'already_completed', errors: [] });
          continue;
        }

        if (isPartial && partialHasFailedStep && verifiedBuyerWallet) {
          // Partial record with failures — re-enqueue to repair the failed steps via queue.
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} is partial with failed steps (purchaseId: ${existing.id}), re-enqueuing`,
          );
          try {
            await enqueueQueue(c, 'pack-fulfillment', {
              purchaseId: existing.id,
              email: verifiedEmail,
              orderId,
            });
            webhookResults.push({ purchaseId: existing.id, status: 'enqueued_resume', errors: [] });
          } catch (err) {
            console.error(`[Pack Webhook] Failed to re-enqueue partial fulfillment for ${existing.id}:`, err);
            webhookResults.push({ purchaseId: existing.id, status: 'failed', errors: [String(err)] });
          }
          continue;
        }

        if (isPartial) {
          // Partial without parseable failed steps — preserve old behavior (skip).
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} already partial (purchaseId: ${existing.id}), skipping`,
          );
          webhookResults.push({ purchaseId: existing.id, status: 'already_completed', errors: [] });
          continue;
        }

        if (isPendingWalletRecord && verifiedBuyerWallet) {
          // We now have a real wallet — resume fulfillment via fulfillPackPurchase then enqueue.
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} has pending_wallet record (purchaseId: ${existing.id}), resuming with wallet ${verifiedBuyerWallet}`,
          );
          try {
            const result = await fulfillPackPurchase({
              packId: resolvedPackId,
              packSku: resolvedPackSku,
              songId,
              orderId,
              email: verifiedEmail,
              totalPriceCents: clampedTotalPriceCents,
              buyerWallet: verifiedBuyerWallet,
              isPendingWallet: false,
              deferRunAllSteps: true,
              ...(webhookTipPercent > 0 ? { tipPercent: webhookTipPercent } : {}),
            });
            if (result.purchaseId && result.status !== 'failed') {
              await enqueueQueue(c, 'pack-fulfillment', {
                purchaseId: result.purchaseId,
                email: verifiedEmail,
                orderId,
              });
              webhookResults.push({ purchaseId: result.purchaseId, status: 'enqueued', errors: [] });
            } else {
              webhookResults.push({ purchaseId: result.purchaseId, status: result.status, errors: result.errors });
            }
          } catch (err) {
            console.error(`[Pack Webhook] Failed to resume pending_wallet fulfillment for ${existing.id}:`, err);
            webhookResults.push({ purchaseId: existing.id, status: 'failed', errors: [String(err)] });
          }
          continue;
        }

        // Resume failed / partial_failure records by re-enqueuing to the durable queue.
        // runAllSteps inside the consumer is fully idempotent — it skips steps already marked complete.
        if (existing.status === 'failed' || existing.status === 'partial_failure') {
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} status=${existing.status} (purchaseId: ${existing.id}), re-enqueuing via pack-fulfillment queue`,
          );
          try {
            await enqueueQueue(c, 'pack-fulfillment', {
              purchaseId: existing.id,
              email: verifiedEmail,
              orderId,
            });
            webhookResults.push({ purchaseId: existing.id, status: 'enqueued_resume', errors: [] });
          } catch (err) {
            console.error(`[Pack Webhook] Failed to re-enqueue failed fulfillment for ${existing.id}:`, err);
            webhookResults.push({ purchaseId: existing.id, status: 'failed', errors: [String(err)] });
          }
          continue;
        }

        // Resume pending_price_fetch records by re-enqueuing (runAllSteps will retry step 0).
        if (existing.status === 'pending_price_fetch') {
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} status=pending_price_fetch (purchaseId: ${existing.id}), re-enqueuing`,
          );
          try {
            await enqueueQueue(c, 'pack-fulfillment', {
              purchaseId: existing.id,
              email: verifiedEmail,
              orderId,
            });
            webhookResults.push({ purchaseId: existing.id, status: 'enqueued_resume', errors: [] });
          } catch (err) {
            console.error(`[Pack Webhook] Failed to re-enqueue pending_price_fetch fulfillment for ${existing.id}:`, err);
            webhookResults.push({ purchaseId: existing.id, status: 'failed', errors: [String(err)] });
          }
          continue;
        }

        // Existing record is in some other non-terminal state — skip to avoid double processing
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
          `[Pack Webhook] Dedup: order ${orderId} + pack ${resolvedPackId} exists with status ${existing.status} (purchaseId: ${existing.id}), skipping`,
        );
        webhookResults.push({ purchaseId: existing.id, status: existing.status, errors: [] });
        continue;
      }

      // New purchase: create the record synchronously (fast), then enqueue fulfillment.
      try {
        const resolvedWallet = verifiedBuyerWallet || '';
        const isPendingWallet = !verifiedBuyerWallet;
        const result = await fulfillPackPurchase({
          packId: resolvedPackId,
          packSku: resolvedPackSku,
          songId,
          orderId,
          email: verifiedEmail,
          totalPriceCents: clampedTotalPriceCents,
          buyerWallet: resolvedWallet,
          isPendingWallet,
          walletSource: purchaseWalletSource, // Fix 7: cartAttrs.walletSource → noteAttrs.walletSource → 'shopify'
          // deferRunAllSteps: true for non-pending-wallet purchases — the queue consumer
          // runs runAllSteps durably with no time ceiling.
          ...(!isPendingWallet ? { deferRunAllSteps: true } : {}),
          ...(webhookTipPercent > 0 ? { tipPercent: webhookTipPercent } : {}),
        });

        // Policy-rule uniqueness block: the Tarobase create rule rejected our write because
        // the document already exists (a concurrent request or Shopify retry already created
        // pack-{orderId}-{packId}). This is a safe duplicate — the order is already being
        // processed. Return HTTP 200 immediately so Shopify does not keep retrying.
        if (result.status === 'duplicate_purchase') {
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
            `[Pack Webhook] DUPLICATE_POLICY_BLOCK for order ${orderId} pack ${resolvedPackId} ` +
            `(purchaseId: ${result.purchaseId}) — policy uniqueness rule rejected create. ` +
            `Returning 200 to suppress Shopify retry.`,
          );
          return sendSuccess(c, { duplicate: true, purchaseId: result.purchaseId, orderId });
        }

        // 'already_completed' is returned by the deterministic-ID idempotency guard
        // and by Safeguard-D when a completed record already exists — skip enqueue.
        const alreadyDone = result.status === 'completed' || result.status === 'already_completed';
        if (result.purchaseId && result.status !== 'failed' && !isPendingWallet && !alreadyDone) {
          // Enqueue the durable fulfillment job.
          await enqueueQueue(c, 'pack-fulfillment', {
            purchaseId: result.purchaseId,
            email: verifiedEmail,
            orderId,
          });
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] Enqueued pack-fulfillment job for purchase ${result.purchaseId} (order ${orderId})`);
          webhookResults.push({ purchaseId: result.purchaseId, status: 'enqueued', errors: [] });
        } else {
          webhookResults.push({ purchaseId: result.purchaseId, status: result.status, errors: result.errors });
        }
      } catch (err) {
        console.error(`[Pack Webhook] Failed to create purchase record for order ${orderId}:`, err);
        webhookResults.push({ purchaseId: '', status: 'failed', errors: [String(err)] });
      }
    }
    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Pack Webhook] Webhook processing complete for order ${orderId}: ${webhookResults.length} packs queued`);

    // ── Move Apple Pay reservation to fulfilled ────────────────────────────────
    void (async () => {
      try {
        const orderDateKey = new Date((payload as any).created_at ?? Date.now()).toISOString().slice(0, 10);
        const budget = await get(`applePayDailyBudget/${orderDateKey}`);
        if (!budget) return;
        const reservations: Array<{cartId: string; amountCents: number; reservedAt: number}> =
          budget.reservations ? JSON.parse(budget.reservations) : [];
        // Match by cartId if available in cart attributes, otherwise by approximate amount
        const webhookCartId = cartAttrs.cartId ?? noteAttrs.cartId ?? lineProps.cartId ?? undefined;
        const purchasedCents = Math.round(Number(purchaseAmountUsd ?? 0) * 100);
        const matchIndex = webhookCartId
          ? reservations.findIndex(r => r.cartId === webhookCartId)
          : reservations.findIndex(r => r.amountCents === purchasedCents);
        const matched = matchIndex >= 0 ? reservations[matchIndex] : null;
        const toMove = matched ? matched.amountCents : purchasedCents;
        const remaining = reservations.filter((_, i) => i !== matchIndex);
        const nowSec = Math.floor(Date.now() / 1000);
        await set(`applePayDailyBudget/${orderDateKey}`, {
          ...budget,
          reservedUsd: Math.max(0, Number(budget.reservedUsd ?? 0) - toMove),
          fulfilledUsd: Number(budget.fulfilledUsd ?? 0) + toMove,
          reservations: JSON.stringify(remaining),
          updatedAt: nowSec,
        });
      } catch (err) {
        console.error('[webhook] Failed to update Apple Pay daily budget:', err);
      }
    })();

    // Mark webhook as processed to prevent replay attacks
    try {
      await set(`processedWebhooks/${webhookId}`, { processedAt: Math.floor(Date.now() / 1000) });
    } catch (markErr) {
      console.warn(`[Pack Webhook] Failed to mark webhook id=${webhookId} as processed:`, markErr);
    }

    return sendSuccess(c, {
      received: true,
      orderId,
      packsQueued: packLineItems.length,
    });
  });

  // GET /api/webhooks/packs/status — View recent pack purchases (admin only)
  app.get('/api/webhooks/packs/status', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);
    const purchases = await getManyPackPurchases('order by createdAt desc limit 50');
    return sendSuccess(c, { purchases });
  });

  // GET /api/packs — list available pack tiers from database or fallback
  app.get('/api/packs', ipRateLimitMiddleware(), async (c) => {
    const dbPacks = await getManyPacks('order by sortIndex asc');
    if (dbPacks && dbPacks.length > 0) {
      return sendSuccess(c, {
        packs: dbPacks.map(p => ({
          id: p.id,
          name: p.name,
          price: `$${(p.priceUsd / 100).toFixed(2)}`,
          priceCents: p.priceUsd,
          nftCount: p.nftCount,
          tokenAmount: p.tokenAmount,
          artistPayout: p.artistPayout,
          platformSlice: p.platformSlice,
          priceSol: p.priceSol,
        })),
      });
    }
    // Fallback to hardcoded packs
    return sendSuccess(c, { packs: PACK_CONFIG });
  });

  // POST /api/admin/artists/:artistAddress/verify — set or unset artist verification (admin only)
  app.post('/api/admin/artists/:artistAddress/verify', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    // Additional check: only LIT_SAVINGS_WALLET can call this
    if (walletAddress !== LIT_SAVINGS_WALLET) {
      return ApiErrors.unauthorized(c, 'Only the Lit admin wallet can verify artists');
    }

    const artistAddress = c.req.param('artistAddress');
    if (!artistAddress) {
      return ApiErrors.badRequest(c, 'Missing artistAddress parameter');
    }

    let body: { isVerified?: boolean };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    if (typeof body.isVerified !== 'boolean') {
      return ApiErrors.badRequest(c, 'isVerified (boolean) is required');
    }

    const { isVerified } = body;

    // Check if artist document exists
    const existing = await getArtists(artistAddress);
    let success: boolean;
    if (existing) {
      success = await updateArtists(artistAddress, { isVerified });
    } else {
      // Create a minimal artist record with verified status
      success = await setArtists(artistAddress, {
        name: artistAddress,
        walletAddress: Address.publicKey(artistAddress),
        isVerified,
      });
    }

    if (!success) {
      return ApiErrors.internal(c, 'Failed to update artist verification status');
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin] Artist ${artistAddress} isVerified set to ${isVerified} by ${walletAddress}`);
    return sendSuccess(c, { artistAddress, isVerified });
  });

  // POST /api/admin/payouts/retry/:purchaseId — retry a failed/pending artist SOL payout
  app.post('/api/admin/payouts/retry/:purchaseId', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const purchaseId = c.req.param('purchaseId');
    if (!purchaseId) {
      return ApiErrors.badRequest(c, 'purchaseId is required');
    }

    // Look up the pack purchase
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
      return ApiErrors.notFound(c, `Pack purchase not found: ${purchaseId}`);
    }

    // Check if payout is already paid
    if (purchase.artistPayoutStatus === 'paid') {
      return ApiErrors.badRequest(c, `Payout for ${purchaseId} is already completed`);
    }

    // Resolve artist address from the song's creator field
    const song = await getSongs(purchase.songId || '');
    if (!song) {
      return ApiErrors.notFound(c, `Song not found for purchase ${purchaseId}`);
    }
    const songCreator = song.creator;
    if (!songCreator || songCreator === PROJECT_VAULT_ADDRESS || songCreator === OPERATIONS_WALLET) {
      return ApiErrors.badRequest(c, `No valid artist address for song ${song.id} — creator is PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET or missing`);
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin Payout Retry] Retrying payout for ${purchaseId} by ${walletAddress}`);
    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin Payout Retry] artistAddress: ${songCreator}, purchaseAmountUsd: ${purchase.purchaseAmountUsd}`);

    // v20 tokenomics: delegate to runStepPayout (uses purchaseAmountUsd as source of truth)
    const { runStepPayout } = await import('../utils/fulfillment-steps.js');
    await runStepPayout(purchaseId);

    // Re-read the purchase to get the updated status
    const updatedPurchase = await getPackPurchases(purchaseId);

    return sendSuccess(c, {
      purchaseId,
      artistPayoutStatus: updatedPurchase?.artistPayoutStatus ?? 'unknown',
      artistPayoutTxHash: updatedPurchase?.artistPayoutTxHash ?? null,
      artistAddress: songCreator,
    });
  });

  // GET /api/admin/payouts/pending — list pack purchases with pending/failed/retrying artist payouts
  app.get('/api/admin/payouts/pending', async (c) => {
    await validatePoofAuth(c, true);

    const allPending = await getManyPackPurchases(`where artistPayoutStatus = 'pending' order by createdAt desc limit 100`);
    const allFailed = await getManyPackPurchases(`where artistPayoutStatus = 'failed' order by createdAt desc limit 100`);
    const allRetrying = await getManyPackPurchases(`where artistPayoutStatus = 'retrying' order by createdAt desc limit 100`);

    const combined = [...allPending, ...allFailed, ...allRetrying];
    // Sort by createdAt descending
    combined.sort((a, b) => b.createdAt - a.createdAt);

    const results = combined.map(p => ({
      purchaseId: p.id,
      songId: p.songId ?? null,
      packName: p.packName,
      buyerEmail: p.buyerEmail,
      artistPayoutUSD: p.artistPayoutUSD ?? null,
      artistPayoutSOL: p.artistPayoutSOL ?? null,
      artistPayoutStatus: p.artistPayoutStatus ?? 'unknown',
      createdAt: p.createdAt,
    }));

    return sendSuccess(c, { count: results.length, payouts: results });
  });

  // GET /api/admin/operations/balance — monitor operations wallet balance and fulfillment costs
  app.get('/api/admin/operations/balance', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    try {
      const opsAddress = getOperationsWalletAddress();

      let solBalance = 0;
      let ordersCanProcess = 0;

      try {
        const { PublicKey: SolPublicKey } = await import('@solana/web3.js');
        const connection = await createConnection(c.env);
        const balance = await connection.getBalance(new SolPublicKey(opsAddress));
        solBalance = balance / 1e9;
      } catch {
        console.warn('[Operations Balance] Balance query failed, using 0 as fallback');
      }

      // Get last 5 fulfillment costs
      const last5 = await getManyOperationsFulfillmentCosts('order by timestamp desc limit 5');

      // Calculate average cost from successful fulfillments
      const successful = last5.filter(r => r.status === 'success' && r.actualCostSOL);
      const avgCost = successful.length > 0
        ? successful.reduce((sum, r) => sum + ((r.actualCostSOL ?? 0) / 1e9), 0) / successful.length
        : 0.08; // default estimate

      ordersCanProcess = avgCost > 0 ? Math.floor(solBalance / (avgCost + 0.01)) : 0;

      return sendSuccess(c, {
        walletAddress: opsAddress,
        solBalance,
        estimatedOrdersCanProcess: ordersCanProcess,
        averageOrderCost: avgCost,
        lastFiveFulfillmentCosts: last5.map(r => ({
          orderId: r.orderId,
          estimatedCost: r.estimatedCostSOL / 1e9,
          actualCost: r.actualCostSOL ? r.actualCostSOL / 1e9 : null,
          timestamp: r.timestamp,
          status: r.status,
        })),
      });
    } catch (err) {
      console.error('[Operations] Failed to get operations balance:', err);
      return ApiErrors.internal(c, 'Failed to retrieve operations wallet balance');
    }
  });

  // ─── Health Dashboard Routes ──────────────────────────────────────────────

  // GET /api/health/full — public health check for all critical dependencies
  app.get('/api/health/full', async (c) => {
    return sendSuccess(c, {
      shopifyWebhookSecretConfigured: !!process.env.SHOPIFY_WEBHOOK_SECRET,
      storefrontTokenConfigured: !!process.env.VITE_SHOPIFY_STOREFRONT_TOKEN,
      privyConfigured: !!process.env.PRIVY_APP_ID,
      variantIdConfigured: STUDIO_VARIANT_ID !== 'REPLACE_WITH_VARIANT_ID',
      platformWallet: PROJECT_VAULT_ADDRESS,
      litSavingsWallet: LIT_SAVINGS_WALLET,
      timestamp: Date.now(),
    });
  });

  // GET /api/purchases/recent — last 10 purchase records (admin only)
  app.get('/api/purchases/recent', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);
    const purchases = await getManyPackPurchases('order by createdAt desc limit 10');
    return sendSuccess(c, { purchases });
  });

  // GET /api/packs/config — returns hardcoded pack configuration (public)
  // NOTE: tokenAmount values here are FALLBACK defaults for when no live song price data
  // is available. Real token amounts are calculated dynamically at purchase time.
  app.get('/api/packs/config', ipRateLimitMiddleware(), async (c) => {
    return sendSuccess(c, { packs: PACK_CONFIG });
  });

  // GET /api/validate-checkout?songId=xxx — validates that a song exists before checkout
  app.get('/api/validate-checkout', ipRateLimitMiddleware(), async (c) => {
    const songId = c.req.query('songId');
    if (!songId) {
      return ApiErrors.badRequest(c, 'songId query parameter is required');
    }
    try {
      const song = await getSongs(songId);
      if (!song) {
        return sendSuccess(c, { valid: false, reason: 'song-not-available' });
      }
      return sendSuccess(c, { valid: true, song: { id: song.id, name: song.name, symbol: song.symbol } });
    } catch (err) {
      console.error('[validate-checkout] Error:', err);
      return ApiErrors.internal(c, 'Failed to validate checkout');
    }
  });

  // POST /api/packs/checkout — generate Shopify checkout URL for a pack + song
  app.post('/api/packs/checkout', async (c) => {
    let body: { songId?: string; packId?: string; packTier?: string; tipPercent?: number; walletAddress?: string; walletSource?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { songId, packId, packTier } = body ?? {};
    const tipPctCheckout = Math.min(100, Math.max(0, Math.round(body?.tipPercent ?? 0)));
    const tierId = packTier ?? packId;
    if (!tierId) {
      return ApiErrors.badRequest(c, 'packTier or packId is required');
    }
    if (tierId !== 'studio') {
      return ApiErrors.badRequest(c, `Invalid pack tier: ${tierId}. Only 'studio' is accepted.`);
    }
    if (!songId) {
      return ApiErrors.badRequest(c, 'songId is required');
    }

    // Use the single studio variant ID
    const variantId = STUDIO_VARIANT_ID;

    // Look up pack from database first, fallback to hardcoded
    const pack = await getPacks(packId || tierId);
    let packConfig = PACK_CONFIG.find(p => p.id === tierId);
    if (pack) {
      packConfig = {
        id: pack.id,
        name: pack.name || tierId,
        price: `$${(pack.priceUsd / 100).toFixed(2)}`,
        priceUsd: pack.priceUsd,
        sku: `pack_${pack.id}`,
        nftCount: pack.nftCount,
        artistPayout: pack.artistPayout,
        platformSlice: pack.platformSlice ?? 0,
        tagline: `${pack.nftCount} NFT${pack.nftCount > 1 ? 's' : ''}`,
        gradient: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
      };
    }

    if (!packConfig) {
      return ApiErrors.notFound(c, `Pack "${tierId}" not found`);
    }

    // Create a Shopify cart via Storefront API and use its hosted checkoutUrl.
    // The custom domain does not route /cart/<variantId>:1 to Shopify, so
    // classic cart permalinks 404. Storefront cartCreate returns a fully-hosted
    // Shopify checkout URL that works regardless of storefront routing.
    const walletAddress = body?.walletAddress ?? '';
    const walletSource = body?.walletSource ?? '';
    const attributes: Record<string, string> = {
      ...(songId ? { songId } : {}),
      packId: tierId,
      packSku: packConfig.sku,
      mintType: 'both',
      ...(tipPctCheckout > 0 ? { tipPercent: String(tipPctCheckout) } : {}),
      ...(walletAddress ? { wallet_address: walletAddress } : {}),
      ...(walletSource ? { wallet_source: walletSource } : {}),
    };

    let checkoutUrl: string;
    try {
      const cart = await createShopifyCart(variantId, attributes, c.env as any);
      checkoutUrl = cart.checkoutUrl;
    } catch (err) {
      console.error('[Checkout] Shopify cartCreate failed:', err);
      return ApiErrors.internal(c, `Failed to create Shopify cart: ${err instanceof Error ? err.message : String(err)}`);
    }

    return sendSuccess(c, {
      checkoutUrl,
      pack: {
        id: packConfig.id,
        name: packConfig.name,
        price: packConfig.price,
        nftCount: packConfig.nftCount,
        tokenAmount: 0, // v20: token amount sized from purchaseAmountUsd at fulfillment time
        sku: packConfig.sku,
      },
    });
  });

  // POST /api/packs/checkout/open-amount — create Shopify Storefront cart for pay-what-you-want
  // Uses the $1 Studio variant (ID 48722034589924) with quantity = round(amountUsd) to approximate
  // the requested USD amount via the Storefront cartCreate API (which does not support custom prices).
  app.post('/api/packs/checkout/open-amount', ipRateLimitMiddleware(10), async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    // MIN_PURCHASE_USD is the authoritative server-side minimum from constants.ts
    const minPurchaseUsd = parseFloat(MIN_PURCHASE_USD);

    const schema = z.object({
      songId: z.string().optional(),
      amountUsd: z.number().min(minPurchaseUsd, `amountUsd must be at least $${minPurchaseUsd.toFixed(2)}`),
      walletAddress: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      tipPercent: z.number().min(0).max(20).default(0).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map(i => i.message).join('; ');
      return ApiErrors.badRequest(c, msg);
    }

    const { songId, amountUsd, walletAddress, email, tipPercent = 0 } = parsed.data;

    // Server-side minimum enforcement using MIN_PURCHASE_USD from constants — do not trust client
    if (amountUsd < minPurchaseUsd) {
      return ApiErrors.badRequest(c, `amountUsd must be at least $${minPurchaseUsd.toFixed(2)} (MIN_PURCHASE_USD)`);
    }

    // Apply 2.5% platform fee
    const feeAmount = Math.round(amountUsd * 0.025 * 100) / 100;
    const totalAmount = Math.round((amountUsd + feeAmount) * 100) / 100;

    // Use the $1 Studio variant with quantity = round(totalAmount) to approximate the open amount.
    // The Storefront API does not support custom per-line-item pricing, so we use integer quantity
    // as a proxy for dollar amount. Amounts are rounded to the nearest whole dollar.
    const OPEN_AMOUNT_VARIANT_ID = STUDIO_VARIANT_ID; // $1/unit studio variant
    const quantity = Math.max(1, Math.round(totalAmount));
    const priceStr = amountUsd.toFixed(2);

    // Guest checkout: empty walletAddress triggers pending_wallet flow in webhook
    const resolvedWallet = walletAddress ?? '';

    const cartAttributes: Record<string, string> = {
      ...(songId ? { songId } : {}),
      mintType: 'both',
      walletAddress: resolvedWallet,
      tipPercent: String(tipPercent),
      amountUsd: priceStr,
      walletSource: 'shopify',
    };
    if (email) {
      cartAttributes.guestEmail = email;
    }

    let checkoutUrl: string;
    let cartId: string;

    // Build a JSON-formatted order note containing the wallet address as a
    // fallback channel in case Shopify drops cart attributes from the order
    // payload. The webhook handler parses note JSON when cart attributes are
    // missing or empty.
    const notePayload: Record<string, unknown> = {
      walletAddress: resolvedWallet,
      songId,
      tipPercent,
      amountUsd: priceStr,
      mintType: 'both',
    };
    if (email) {
      notePayload.guestEmail = email;
    }
    const noteJson = JSON.stringify(notePayload);

    // ── Daily Apple Pay cap check ─────────────────────────────────────────────
    const todayKey = new Date().toISOString().slice(0, 10); // "2026-06-02"
    const DAILY_CAP_CENTS = parseInt(APPLE_PAY_DAILY_CAP_CENTS, 10);
    const totalAmountCents = Math.round(totalAmount * 100);

    const existingBudget = await get(`applePayDailyBudget/${todayKey}`);
    const reserved = existingBudget ? Number(existingBudget.reservedUsd ?? 0) : 0;
    const fulfilled = existingBudget ? Number(existingBudget.fulfilledUsd ?? 0) : 0;
    if (reserved + fulfilled + totalAmountCents > DAILY_CAP_CENTS) {
      console.warn(`[open-amount] Daily cap reached: reserved=${reserved} fulfilled=${fulfilled} requested=${totalAmountCents} cap=${DAILY_CAP_CENTS}`);
      return ApiErrors.badRequest(c, 'Apple Pay purchases are temporarily paused for today. Please try again tomorrow.');
    }

    try {
      const walletLog = resolvedWallet
        ? `wallet=${resolvedWallet.slice(0, 6)}...${resolvedWallet.slice(-4)}`
        : 'wallet=guest';
      if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[open-amount] Creating Storefront cart: variantId=${OPEN_AMOUNT_VARIANT_ID} qty=${quantity} amountUsd=${priceStr} ${walletLog}`);
      const cart = await createShopifyCart(
        OPEN_AMOUNT_VARIANT_ID,
        cartAttributes,
        c.env as any,
        quantity,
        noteJson,
      );
      checkoutUrl = cart.checkoutUrl;
      cartId = cart.cartId;
      if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[open-amount] Storefront cart created: cartId=${cartId} checkoutUrl=${checkoutUrl}`);

      // ── Record reservation (blocking — must succeed before returning checkout URL)
      try {
        const nowSec = Math.floor(Date.now() / 1000);
        const freshBudget = await get(`applePayDailyBudget/${todayKey}`);
        const freshReserved = freshBudget ? Number(freshBudget.reservedUsd ?? 0) : 0;
        const freshFulfilled = freshBudget ? Number(freshBudget.fulfilledUsd ?? 0) : 0;

        if (freshReserved + freshFulfilled + totalAmountCents > DAILY_CAP_CENTS) {
          console.warn(`[open-amount] Daily cap reached on re-check: reserved=${freshReserved} fulfilled=${freshFulfilled} requested=${totalAmountCents} cap=${DAILY_CAP_CENTS}`);
          return ApiErrors.badRequest(c, 'Daily limit reached');
        }

        const existingReservations: Array<{cartId: string; amountCents: number; reservedAt: number}> =
          freshBudget?.reservations ? JSON.parse(freshBudget.reservations) : [];
        const newEntry = { cartId, amountCents: totalAmountCents, reservedAt: nowSec };
        await set(`applePayDailyBudget/${todayKey}`, {
          date: todayKey,
          reservedUsd: freshReserved + totalAmountCents,
          fulfilledUsd: freshFulfilled,
          reservations: JSON.stringify([...existingReservations, newEntry]),
          updatedAt: nowSec,
        });
      } catch (err) {
        console.error('[open-amount] Failed to record daily budget reservation:', err);
        return ApiErrors.badRequest(c, 'Daily limit reached');
      }
    } catch (err) {
      console.error('[open-amount] Shopify Storefront cartCreate error:', err);
      return ApiErrors.internal(c, 'Could not create checkout');
    }

    return sendSuccess(c, {
      checkoutUrl,
      cartId,
      originalAmount: amountUsd,
      feeAmount,
      totalAmount,
    });
  });

  // GET /api/admin/purchases/pending — list pending pack purchases (admin only)
  app.get('/api/admin/purchases/pending', async (c) => {
    await validatePoofAuth(c, true);

    const pendingWallet = await getManyPackPurchases(`where status = 'pending_wallet' order by createdAt desc limit 50`);
    const pending = await getManyPackPurchases(`where status = 'pending' order by createdAt desc limit 50`);
    const pendingInsufficient = await getManyPackPurchases(`where status = 'pending_insufficient_funds' order by createdAt desc limit 50`);

    const combined = [...pendingWallet, ...pending, ...pendingInsufficient];
    combined.sort((a, b) => b.createdAt - a.createdAt);

    // Deduplicate by shopifyOrderId (same order may appear in multiple queries)
    const seen = new Set<string>();
    const deduped = combined.filter(p => {
      if (seen.has(p.shopifyOrderId)) return false;
      seen.add(p.shopifyOrderId);
      return true;
    });

    return sendSuccess(c, { purchases: deduped });
  });

  // POST /api/admin/purchases/fulfill-manual — manually fulfill a pending pack purchase
  app.post('/api/admin/purchases/fulfill-manual', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);

    let body: { purchaseId?: string; buyerWallet?: string; orderId?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    if (!body?.buyerWallet) {
      return ApiErrors.badRequest(c, 'buyerWallet is required');
    }

    // Validate the wallet address format
    try {
      new PublicKey(body.buyerWallet);
    } catch {
      return ApiErrors.badRequest(c, 'Invalid wallet address format');
    }

    // Look up the pending purchase record
    let purchase: PackPurchasesResponse | null = null;
    if (body.purchaseId) {
      purchase = await getPackPurchases(body.purchaseId);
    } else if (body.orderId) {
      const results = await getManyPackPurchases(`where shopifyOrderId = "${sanitizeFilterValueOrEmpty(body.orderId)}" and (status = 'pending_wallet' or status = 'pending' or status = 'pending_insufficient_funds') order by createdAt desc limit 1`);
      purchase = results.length > 0 ? results[0] : null;
    }

    if (!purchase) {
      return ApiErrors.notFound(c, 'No pending purchase found');
    }

    if (purchase.status === 'completed') {
      return sendSuccess(c, { status: 'already_completed', message: 'Purchase already fulfilled', purchase });
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Manual Fulfill] Admin ${adminWallet} manually fulfilling purchase ${purchase.id} for buyer ${body.buyerWallet}`);

    // Call the same fulfillment function used by the webhook
    const result = await fulfillPackPurchase({
      packId: purchase.packId,
      packSku: `pack_${purchase.packId}`,
      songId: purchase.songId ?? '',
      orderId: purchase.shopifyOrderId,
      email: purchase.buyerEmail,
      totalPriceCents: Math.round((purchase.purchaseAmountUsd ?? 0) * 100),
      buyerWallet: body.buyerWallet,
    });

    if (result.status === 'completed') {
      return sendSuccess(c, {
        status: 'fulfilled',
        message: 'Purchase fulfilled successfully',
        purchaseId: result.purchaseId,
        nftTxHashes: purchase.nftTxHashes,
        splTxHash: purchase.splTxHash,
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.error(`[Manual Fulfill] Errors:`, result.errors);
      return ApiErrors.internal(c, `Fulfillment had issues: ${result.errors.join('; ')}`);
    }

    return sendSuccess(c, {
      status: result.status,
      message: `Purchase status: ${result.status}`,
      purchaseId: result.purchaseId,
    });
  });

  // POST /api/admin/purchases/fulfill-new — create and fulfill a pack purchase for an order that missed the webhook
  app.post('/api/admin/purchases/fulfill-new', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);

    let body: { orderId?: string; email?: string; buyerWallet?: string; packSku?: string; songId?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    // Validate required fields
    const { orderId, email, buyerWallet, packSku } = body || {};
    if (!orderId) return ApiErrors.badRequest(c, 'orderId is required');
    if (!email || !validateEmail(email)) return ApiErrors.badRequest(c, 'Valid email is required');
    if (!buyerWallet) return ApiErrors.badRequest(c, 'buyerWallet is required');
    if (!packSku) return ApiErrors.badRequest(c, 'packSku is required');

    // Validate the wallet address format
    try {
      new PublicKey(buyerWallet);
    } catch {
      return ApiErrors.badRequest(c, 'Invalid buyer wallet address format');
    }

    // Look up the pack config
    const packConfig = PACK_CONFIG.find(p => p.sku === packSku);
    if (!packConfig) {
      return ApiErrors.badRequest(c, `Unknown pack SKU: ${packSku}. Available: ${PACK_CONFIG.map(p => p.sku).join(', ')}`);
    }

    // Check if a purchase already exists for this order
    const existingPurchase = await getPackPurchases(`pack-${orderId}-${packConfig.id}`);
    if (existingPurchase && existingPurchase.status === 'completed') {
      return sendSuccess(c, { status: 'already_completed', message: 'Purchase already fulfilled', purchase: existingPurchase });
    }

    // Determine songId
    let songId = body.songId || '';
    if (!songId) {
      // Get any available song as default
      const songs = await getManySongs('limit 1');
      if (songs && songs.length > 0) {
        songId = songs[0].id;
      }
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Fulfill-New] Admin ${adminWallet} creating new pack purchase for order ${orderId}, email ${email}, pack ${packSku}, wallet ${buyerWallet}`);

    // Calculate total price
    const totalPriceCents = packConfig.priceUsd;

    const result = await fulfillPackPurchase({
      packId: packConfig.id,
      packSku: packConfig.sku,
      songId,
      orderId,
      email,
      totalPriceCents,
      buyerWallet,
    });

    if (result.status === 'completed') {
      return sendSuccess(c, {
        status: 'fulfilled',
        message: 'Pack purchase created and fulfilled successfully',
        purchaseId: result.purchaseId,
        orderId,
        email,
        packSku: packConfig.sku,
        packName: packConfig.name,
        buyerWallet,
        songId,
      });
    }

    if (result.errors && result.errors.length > 0) {
      console.error(`[Fulfill-New] Errors:`, result.errors);
      return ApiErrors.internal(c, `Fulfillment had issues: ${result.errors.join('; ')}`);
    }

    return sendSuccess(c, {
      status: result.status,
      message: `Purchase status: ${result.status}`,
      purchaseId: result.purchaseId,
      orderId,
      email,
      packSku: packConfig.sku,
      buyerWallet,
      songId,
    });
  });

  // POST /api/admin/songs/sync-to-chain — sync songs from offchain database to onchain collection (admin only)
  app.post('/api/admin/songs/sync-to-chain', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);

    let body: { songIds?: string[] } | undefined;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    // Get all songs if no specific IDs provided
    const allSongs = await getManySongs();
    const songIds = body?.songIds?.length
      ? body.songIds
      : allSongs.map(s => s.id);

    if (songIds.length === 0) {
      return ApiErrors.badRequest(c, 'No songs to sync. Add songs first or specify songIds.');
    }

    const results: Array<{ songId: string; status: 'already_exists' | 'synced' | 'failed'; error?: string }> = [];

    for (const songId of songIds) {
      try {
        // Check if song already exists (onchain)
        const existing = await getSongs(songId);
        if (existing) {
          results.push({ songId, status: 'already_exists' });
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Sync-to-Chain] Song ${songId} already exists onchain, skipping`);
          continue;
        }

        // Try to get song data from offchain (allSongs includes all songs)
        const songData = allSongs.find(s => s.id === songId);
        if (!songData) {
          results.push({ songId, status: 'failed', error: 'Song not found in database' });
          console.error(`[Sync-to-Chain] Song ${songId} not found in database`);
          continue;
        }

        // Create onchain using vault wallet (setSongs via @pooflabs/server signs with PROJECT_VAULT_ADDRESS)
        const created = await setSongs(songId, {
          name: songData.name,
          symbol: songData.symbol,
          uri: songData.uri || '',
          creator: Address.publicKey(songData.creator),
        });

        if (created) {
          results.push({ songId, status: 'synced' });
          if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Sync-to-Chain] Song ${songId} synced onchain successfully`);
          // FIX 1: Capture and store the real mint address immediately after creation.
          try {
            const realMint = await runGetTokenMintAddressQueryForSongs(songId);
            if (realMint && realMint.length > 0) {
              await updateSongs(songId, { mintAddress: realMint } as any);
              if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Sync-to-Chain] Stored mintAddress for song ${songId}: ${realMint}`);
            } else {
              console.error(`[Sync-to-Chain] CRITICAL: empty mintAddress for song ${songId} — drift risk on balance checks`);
            }
          } catch (mintErr) {
            console.error(`[Sync-to-Chain] Failed to capture mintAddress for song ${songId}:`, mintErr);
          }
        } else {
          results.push({ songId, status: 'failed', error: 'setSongs returned false (policy denied)' });
          console.error(`[Sync-to-Chain] Song ${songId} setSongs returned false`);
        }
      } catch (err) {
        results.push({ songId, status: 'failed', error: String(err) });
        console.error(`[Sync-to-Chain] Song ${songId} sync failed:`, err);
      }
    }

    const synced = results.filter(r => r.status === 'synced').length;
    const alreadyExists = results.filter(r => r.status === 'already_exists').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return sendSuccess(c, {
      total: results.length,
      synced,
      alreadyExists,
      failed,
      results: results.filter(r => r.status !== 'already_exists'),
    });
  });

  // GET /api/admin/packs/dry-run — simulate pack fulfillment for all tiers without executing onchain operations
  app.get('/api/admin/packs/dry-run', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);

    try {
      // Optional query parameter to test a single tier
      const url = new URL(c.req.url);
      const tierParam = url.searchParams.get('tier')?.toLowerCase();

      // Resolve which tiers to test
      const tiersToTest = tierParam
        ? PACK_CONFIG.filter(p => p.id === tierParam)
        : PACK_CONFIG;

      if (tierParam && tiersToTest.length === 0) {
        return ApiErrors.badRequest(c, `Unknown tier: ${tierParam}. Valid tiers: ${PACK_CONFIG.map(p => p.id).join(', ')}`);
      }

      // Fetch SOL price once for all tiers — canonical source: price-capture.ts
      let solUsd = 0;
      {
        const captured = await captureSolPriceUsd(process.env.COINMARKETCAP_API_KEY);
        const fallback = captured ? null : await fetchSolPriceSafe();
        if (!captured && !fallback) {
          return ApiErrors.internal(c, 'SOL/USD price unavailable');
        }
        solUsd = captured ? captured.priceUsd : fallback!.priceUsd;
      }

      // Get operations wallet balance
      const opsAddress = getOperationsWalletAddress();
      let opsBalanceSol = 0;
      let balanceCheckError = false;

      try {
        const { PublicKey: SolPublicKey } = await import('@solana/web3.js');
        const connection = await createConnection(c.env);
        const balance = await connection.getBalance(new SolPublicKey(opsAddress));
        opsBalanceSol = balance / 1e9;
      } catch (err) {
        console.error('[Dry-Run] Failed to get operations wallet balance:', err);
        balanceCheckError = true;
      }

      // Get available songs for songDetails check
      const songs = await getManySongs('limit 1');
      const songDetailsAvailable = songs && songs.length > 0;

      // Simulate fulfillment for each tier
      const tierResults = tiersToTest.map((packConfig) => {
        const priceCents = packConfig.priceUsd;
        const nftCount = packConfig.nftCount;

        // Dry-run token amount estimate: not applicable in v20 (lamport budget drives token sizing).
        const tokenAmount = 0; // token amount determined at fulfillment time from purchaseAmountUsd

        // v20 tokenomics: 5% artist token buy + 3% platform fees (no direct SOL payout to artist)
        const artistPayoutUSD = (priceCents / 100) * 0.05; // 5% artist token bonding curve budget
        const artistPayoutSol = solUsd > 0 ? artistPayoutUSD / solUsd : 0;

        // Platform fee: infra share of pack price in USD (SHOPIFY_SHARES.infra = 2%)
        const platformFeeUSD = (priceCents * SHOPIFY_SHARES.infra) / 100;
        const platformFeeSol = solUsd > 0 ? platformFeeUSD / solUsd : 0;

        // Bonding curve buy: vault must hold song tokens before airdrop.
        // In v20 the airdrop budget is derived directly from purchaseAmountUsd × airdrop share.
        const airdropBudgetUsd = (priceCents / 100) * SHOPIFY_SHARES.airdrop;
        const bondingBuySol = solUsd > 0 ? airdropBudgetUsd / solUsd : 0;

        // Estimate total onchain cost (same formula as fulfillPackPurchase)
        const estimatedTotalSol = (nftCount * 0.005)     // NFT minting: ~0.005 SOL per NFT
          + (3 * 0.002)                                   // SPL airdrop: ~0.002 SOL per airdrop
          + artistPayoutSol                                // Artist SOL payout
          + platformFeeSol                                 // Platform fee
          + bondingBuySol                                  // Bonding curve buy + 2% pump fee
          + 0.02;                                          // Buffer

        const balanceSufficient = !balanceCheckError && opsBalanceSol >= estimatedTotalSol;

        // Determine readiness for each step
        const readiness = {
          packConfig: 'PASS' as const,
          tokenAmountCalculation: tokenAmount > 0 ? 'PASS' as const : 'FAIL' as const,
          artistPayoutCalculation: solUsd > 0 ? 'PASS' as const : 'WARN_FALLBACK' as const,
          platformFeeCalculation: solUsd > 0 ? 'PASS' as const : 'WARN_FALLBACK' as const,
          balanceCheck: balanceCheckError ? 'FAIL' as const : (balanceSufficient ? 'PASS' as const : 'FAIL' as const),
          songDetailsAvailable: songDetailsAvailable ? 'PASS' as const : 'WARN_USE_FALLBACK' as const,
        };

        const allPass = Object.values(readiness).every(v => v === 'PASS');

        return {
          tier: packConfig.id,
          name: packConfig.name,
          priceUsd: packConfig.price,
          priceCents,
          nftCount,
          tokenAmount,
          artistPayoutUsd: `$${artistPayoutUSD.toFixed(2)}`,
          artistPayoutSol: solUsd > 0 ? artistPayoutSol.toFixed(4) : 'N/A',
          platformFeeUsd: `$${platformFeeUSD.toFixed(2)}`,
          platformFeeSol: solUsd > 0 ? platformFeeSol.toFixed(4) : 'N/A',
          estimatedTotalSol: estimatedTotalSol.toFixed(4),
          balanceSufficient,
          readiness,
          overallStatus: allPass ? 'PASS' : 'NEEDS_ATTENTION',
          whatWouldHappen: [
            `Bonding curve buy: ~${bondingBuySol.toFixed(4)} SOL ops→vault then vault→pump.fun for ${tokenAmount.toLocaleString()} song tokens`,
            `SPL airdrop: ${tokenAmount.toLocaleString()} tokens to buyer wallet`,
            `NFT mint: ${nftCount} NFT${nftCount > 1 ? 's' : ''} for "${packConfig.name}"`,
            `Artist payout: $${artistPayoutUSD.toFixed(2)} (${artistPayoutSol.toFixed(4)} SOL) to ${process.env.ARTIST_WALLET_ADDRESS || 'ARTIST_WALLET_ADDRESS'}`,
            `Platform fee: $${platformFeeUSD.toFixed(2)} (${platformFeeSol.toFixed(4)} SOL) to ${PROJECT_VAULT_ADDRESS}`,
            `Estimated total onchain cost: ${estimatedTotalSol.toFixed(4)} SOL`,
          ],
        };
      });

      return sendSuccess(c, {
        dryRun: true,
        timestamp: new Date().toISOString(),
        adminWallet,
        opsWalletAddress: opsAddress,
        opsBalanceSol: balanceCheckError ? 'UNAVAILABLE' : opsBalanceSol.toFixed(4),
        solUsdPrice: solUsd.toFixed(2),
        songDetailsAvailable,
        tiers: tierResults,
      });
    } catch (err) {
      console.error('[Dry-Run] Error during dry-run:', err);
      return ApiErrors.internal(c, 'Failed to execute dry-run');
    }
  });

  // GET /api/admin/transaction-audits — admin route to list all transaction audit records
  app.get('/api/admin/transaction-audits', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const audits = await getManyTransactionAudits('order by createdAt desc limit 200');
    return sendSuccess(c, { audits, walletAddress });
  });

  // GET /api/admin/webhook-failures — list recent webhook verification failures (admin only)
  app.get('/api/admin/webhook-failures', async (c) => {
    await validatePoofAuth(c, true);
    const failures = await getManyWebhookFailures('order by timestamp desc limit 100');
    return sendSuccess(c, { failures });
  });

  // GET /api/admin/shopify/order/:orderNumber — fetch a Shopify order by order number
  app.get('/api/admin/shopify/order/:orderNumber', async (c) => {
    await validatePoofAuth(c, true);

    const orderNumber = c.req.param('orderNumber');
    if (!orderNumber) return ApiErrors.badRequest(c, 'orderNumber param is required');

    if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
      return ApiErrors.internal(c, 'Shopify Admin API token not configured');
    }

    try {
      const order = await getOrderByNumber(
        {
          SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
          SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
        },
        orderNumber,
      );
      if (!order) return ApiErrors.notFound(c, `No Shopify order found with number #${orderNumber}`);
      return sendSuccess(c, { order });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid admin token')) return ApiErrors.internal(c, 'Shopify Admin API token is invalid or expired');
      return ApiErrors.internal(c, `Failed to fetch Shopify order: ${msg}`);
    }
  });

  // GET /api/admin/shopify/recent-orders — list recent orders cross-referenced with packPurchases
  app.get('/api/admin/shopify/recent-orders', async (c) => {
    await validatePoofAuth(c, true);

    if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
      return ApiErrors.internal(c, 'Shopify Admin API token not configured');
    }

    try {
      const orders = await listRecentOrders(
        {
          SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
          SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
        },
        25,
      );

      // Cross-reference with our packPurchases collection
      // Collect all shopify order IDs as strings for lookup
      const orderIds = orders.map(o => String(o.id));

      // Fetch all packPurchases for these order IDs using getMany with IN-style filter
      // Tarobase doesn't support IN queries, so we fetch recent purchases and filter in memory
      const recentPurchases = await getManyPackPurchases('order by createdAt desc limit 200');

      // Build a map: shopifyOrderId -> packPurchase records
      const purchasesByOrderId: Record<string, typeof recentPurchases> = {};
      for (const p of recentPurchases) {
        const oid = String(p.shopifyOrderId ?? '');
        if (!oid) continue;
        if (!purchasesByOrderId[oid]) purchasesByOrderId[oid] = [];
        purchasesByOrderId[oid].push(p);
      }

      // Annotate each Shopify order with our DB state
      const annotated = orders.map(order => {
        const oid = String(order.id);
        const ourPurchases = purchasesByOrderId[oid] ?? [];
        return {
          shopifyOrderId: oid,
          orderNumber: order.order_number,
          name: order.name,
          email: order.email || order.customer?.email || '',
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          createdAt: order.created_at,
          totalPrice: order.total_price,
          currency: order.currency,
          lineItems: order.line_items.map(li => ({
            sku: li.sku,
            title: li.title,
            quantity: li.quantity,
            price: li.price,
            fulfillmentStatus: li.fulfillment_status,
          })),
          // Our DB state
          inOurDb: ourPurchases.length > 0,
          ourPurchases: ourPurchases.map(p => ({
            purchaseId: p.id,
            status: p.status,
            packId: p.packId,
            packName: p.packName,
            artistPayoutStatus: p.artistPayoutStatus,
            buyerEmail: p.buyerEmail,
            buyerAddress: p.buyerAddress,
            createdAt: p.createdAt,
          })),
        };
      });

      return sendSuccess(c, { orders: annotated, total: annotated.length });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('invalid admin token')) return ApiErrors.internal(c, 'Shopify Admin API token is invalid or expired');
      return ApiErrors.internal(c, `Failed to fetch Shopify orders: ${msg}`);
    }
  });

  // POST /api/admin/purchases/auto-fulfill-by-order — auto-fulfill a stuck order by order number
  app.post('/api/admin/purchases/auto-fulfill-by-order', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);

    if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
      return ApiErrors.internal(c, 'Shopify Admin API token not configured');
    }

    let body: { orderNumber?: string | number; buyerWallet?: string; songId?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { orderNumber, buyerWallet: overrideBuyerWallet, songId: overrideSongId } = body || {};
    if (!orderNumber) return ApiErrors.badRequest(c, 'orderNumber is required');

    // Step 1: Fetch the order from Shopify
    let order;
    try {
      order = await getOrderByNumber(
        {
          SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
          SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
        },
        orderNumber,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return ApiErrors.internal(c, `Failed to fetch Shopify order: ${msg}`);
    }

    if (!order) {
      return ApiErrors.notFound(c, `No Shopify order found with number #${orderNumber}`);
    }

    // Step 2: Extract email
    const email = order.email || order.customer?.email || '';
    if (!email || !validateEmail(email)) {
      return ApiErrors.badRequest(c, `Shopify order #${orderNumber} has no valid email address`);
    }

    // Step 3: Extract first pack line item's SKU
    const packLineItems = order.line_items.filter(li => {
      const sku = li.sku ?? '';
      return PACK_CONFIG.some(p => p.sku === sku);
    });

    if (packLineItems.length === 0) {
      return ApiErrors.badRequest(c, `No pack line items found in order #${orderNumber}. Line item SKUs: ${order.line_items.map(li => li.sku || '(no sku)').join(', ')}`);
    }

    const firstPackItem = packLineItems[0];
    const packSku = firstPackItem.sku;
    const packConfig = PACK_CONFIG.find(p => p.sku === packSku);
    if (!packConfig) {
      return ApiErrors.badRequest(c, `Unknown pack SKU: ${packSku}`);
    }

    // Step 4: Determine buyer wallet
    // Priority: explicit override > existing packPurchase record for this order > existing user by email
    const orderId = String(order.id);
    let buyerWallet = overrideBuyerWallet || '';

    if (!buyerWallet) {
      // Try existing packPurchase for this order
      const existing = await getManyPackPurchases(
        `where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}"`,
      );
      if (existing.length > 0 && existing[0].buyerAddress) {
        buyerWallet = existing[0].buyerAddress;
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Auto-Fulfill] Found existing purchase wallet: ${buyerWallet}`);
      }
    }

    if (!buyerWallet) {
      // Try user lookup by email
      const users = await getManyUsers(`where email = "${sanitizeFilterValueOrEmpty(email)}"`);
      if (users.length > 0 && users[0].walletAddress) {
        buyerWallet = users[0].walletAddress;
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Auto-Fulfill] Found user wallet by email: ${buyerWallet}`);
      }
    }

    if (!buyerWallet) {
      return ApiErrors.badRequest(
        c,
        `Could not determine buyer wallet for order #${orderNumber} (email: ${email}). ` +
        'Pass buyerWallet in the request body to override.',
      );
    }

    // Validate wallet format
    try {
      new PublicKey(buyerWallet);
    } catch {
      return ApiErrors.badRequest(c, `Invalid buyer wallet address: ${buyerWallet}`);
    }

    // Step 5: Determine songId
    // Priority: explicit override > note_attributes > first available song
    const noteAttrs = Array.isArray(order.note_attributes)
      ? Object.fromEntries(order.note_attributes.map((a: { name: string; value: string }) => [a.name, a.value]))
      : {};
    let songId = overrideSongId || noteAttrs.songId || '';

    if (!songId) {
      const songs = await getManySongs('limit 1');
      if (songs && songs.length > 0) {
        songId = songs[0].id;
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Auto-Fulfill] Using first available song: ${songId}`);
      }
    }

    if (!songId) {
      return ApiErrors.badRequest(c, 'Could not determine songId. Pass songId in the request body to override.');
    }

    // Step 6: Check for existing completed purchase (dedup)
    const existingPurchases = await getManyPackPurchases(
      `where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}" and packId = "${sanitizeFilterValueOrEmpty(packConfig.id)}"`,
    );
    if (existingPurchases.length > 0 && existingPurchases[0].status === 'completed') {
      return sendSuccess(c, {
        status: 'already_completed',
        message: 'Purchase already fulfilled',
        purchase: existingPurchases[0],
        shopifyOrderNumber: order.order_number,
        email,
        packSku,
        buyerWallet,
      });
    }

    const totalPriceCents = packConfig.priceUsd;

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
      `[Auto-Fulfill] Admin ${adminWallet} auto-fulfilling order #${order.order_number} ` +
      `(id: ${orderId}), email: ${email}, pack: ${packSku}, wallet: ${buyerWallet}, song: ${songId}`,
    );

    // Step 7: Run the fulfillment pipeline
    const result = await fulfillPackPurchase({
      packId: packConfig.id,
      packSku: packConfig.sku,
      songId,
      orderId,
      email,
      totalPriceCents,
      buyerWallet,
    });

    return sendSuccess(c, {
      status: result.status,
      message: result.status === 'completed'
        ? 'Pack purchase auto-fulfilled successfully'
        : `Purchase status: ${result.status}`,
      purchaseId: result.purchaseId,
      shopifyOrderId: orderId,
      shopifyOrderNumber: order.order_number,
      email,
      packSku: packConfig.sku,
      packName: packConfig.name,
      buyerWallet,
      songId,
      errors: result.errors,
    });
  });

  // POST /api/admin/purchases/fulfill-by-shopify-id — fulfill a stuck order by its internal Shopify order ID
  app.post('/api/admin/purchases/fulfill-by-shopify-id', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);

    if (!process.env.SHOPIFY_ADMIN_API_TOKEN) {
      return ApiErrors.internal(c, 'Shopify Admin API token not configured');
    }

    let body: { shopifyOrderId?: string; buyerWallet?: string; songId?: string } | undefined;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { shopifyOrderId: inputOrderId, buyerWallet: overrideBuyerWallet, songId: overrideSongId } = body || {};
    if (!inputOrderId) return ApiErrors.badRequest(c, 'shopifyOrderId is required');

    // Fetch order by its internal Shopify ID
    let order;
    try {
      order = await getOrderById(
        {
          SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
          SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
        },
        inputOrderId,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return ApiErrors.internal(c, `Failed to fetch Shopify order: ${msg}`);
    }

    if (!order) {
      return ApiErrors.notFound(c, `No Shopify order found with id ${inputOrderId}`);
    }

    const email = order.email || order.customer?.email || '';
    if (!email || !validateEmail(email)) {
      return ApiErrors.badRequest(c, `Shopify order ${inputOrderId} has no valid email address`);
    }

    const packLineItems = order.line_items.filter(li => {
      const sku = li.sku ?? '';
      return PACK_CONFIG.some(p => p.sku === sku);
    });

    if (packLineItems.length === 0) {
      return ApiErrors.badRequest(c, `No pack line items found in order ${inputOrderId}. Line item SKUs: ${order.line_items.map(li => li.sku || '(no sku)').join(', ')}`);
    }

    const firstPackItem = packLineItems[0];
    const packSku = firstPackItem.sku;
    const packConfig = PACK_CONFIG.find(p => p.sku === packSku);
    if (!packConfig) {
      return ApiErrors.badRequest(c, `Unknown pack SKU: ${packSku}`);
    }

    const orderId = String(order.id);
    let buyerWallet = overrideBuyerWallet || '';

    if (!buyerWallet) {
      const existing = await getManyPackPurchases(
        `where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}"`,
      );
      if (existing.length > 0 && existing[0].buyerAddress) {
        buyerWallet = existing[0].buyerAddress;
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Fulfill-By-ID] Found existing purchase wallet: ${buyerWallet}`);
      }
    }

    if (!buyerWallet) {
      const users = await getManyUsers(`where email = "${sanitizeFilterValueOrEmpty(email)}"`);
      if (users.length > 0 && users[0].walletAddress) {
        buyerWallet = users[0].walletAddress;
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Fulfill-By-ID] Found user wallet by email: ${buyerWallet}`);
      }
    }

    if (!buyerWallet) {
      return ApiErrors.badRequest(
        c,
        `Could not determine buyer wallet for order ${inputOrderId} (email: ${email}). ` +
        'Pass buyerWallet in the request body to override.',
      );
    }

    try {
      new PublicKey(buyerWallet);
    } catch {
      return ApiErrors.badRequest(c, `Invalid buyer wallet address: ${buyerWallet}`);
    }

    const noteAttrs = Array.isArray(order.note_attributes)
      ? Object.fromEntries(order.note_attributes.map((a: { name: string; value: string }) => [a.name, a.value]))
      : {};
    let songId = overrideSongId || noteAttrs.songId || '';

    if (!songId) {
      const songs = await getManySongs('limit 1');
      if (songs && songs.length > 0) {
        songId = songs[0].id;
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Fulfill-By-ID] Using first available song: ${songId}`);
      }
    }

    if (!songId) {
      return ApiErrors.badRequest(c, 'Could not determine songId. Pass songId in the request body to override.');
    }

    const existingPurchases = await getManyPackPurchases(
      `where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}" and packId = "${sanitizeFilterValueOrEmpty(packConfig.id)}"`,
    );
    if (existingPurchases.length > 0 && existingPurchases[0].status === 'completed') {
      return sendSuccess(c, {
        status: 'already_completed',
        message: 'Purchase already fulfilled',
        purchase: existingPurchases[0],
        shopifyOrderId: orderId,
        shopifyOrderNumber: order.order_number,
        email,
        packSku,
        buyerWallet,
      });
    }

    const totalPriceCents = packConfig.priceUsd;

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(
      `[Fulfill-By-ID] Admin ${adminWallet} fulfilling order id ${orderId} (#${order.order_number}), ` +
      `email: ${email}, pack: ${packSku}, wallet: ${buyerWallet}, song: ${songId}`,
    );

    const result = await fulfillPackPurchase({
      packId: packConfig.id,
      packSku: packConfig.sku,
      songId,
      orderId,
      email,
      totalPriceCents,
      buyerWallet,
    });

    return sendSuccess(c, {
      status: result.status,
      message: result.status === 'completed'
        ? 'Pack purchase fulfilled successfully'
        : `Purchase status: ${result.status}`,
      purchaseId: result.purchaseId,
      shopifyOrderId: orderId,
      shopifyOrderNumber: order.order_number,
      email,
      packSku: packConfig.sku,
      packName: packConfig.name,
      buyerWallet,
      songId,
      errors: result.errors,
    });
  });

  // POST /api/admin/purchases/repair/:purchaseId — Resume a partial pack purchase by re-running only failed steps.
  app.post('/api/admin/purchases/repair/:purchaseId', async (c) => {
    const { walletAddress: adminWallet } = await validatePoofAuth(c, true);
    const purchaseId = c.req.param('purchaseId');
    if (!purchaseId) {
      return ApiErrors.badRequest(c, 'purchaseId path param required');
    }
    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Repair Purchase] admin=${adminWallet} purchaseId=${purchaseId}`);

    const existing = await getPackPurchases(purchaseId);
    if (!existing) {
      return ApiErrors.notFound(c, `No packPurchases record found for ${purchaseId}`);
    }
    if (existing.status === 'completed') {
      return ApiErrors.badRequest(c, `Purchase ${purchaseId} is already completed — nothing to repair`);
    }

    const packConfig = PACK_CONFIG.find(p => p.id === existing.packId) ?? PACK_CONFIG.find(p => p.sku === existing.packId);
    if (!packConfig) {
      return ApiErrors.internal(c, `Unknown packId on existing record: ${existing.packId}`);
    }
    if (!existing.songId) {
      return ApiErrors.internal(c, `Existing record ${purchaseId} has no songId — cannot repair without a song`);
    }
    if (!existing.buyerAddress || existing.buyerAddress === '') {
      return ApiErrors.badRequest(c, `Existing record ${purchaseId} is missing a buyer wallet (status: ${existing.status}). Use the manual fulfill endpoint to attach a wallet first.`);
    }

    // Enqueue via the durable pack-fulfillment queue instead of running inline.
    // runAllSteps is idempotent — the consumer skips steps already flagged complete.
    let job: Awaited<ReturnType<typeof enqueueQueue>>;
    try {
      job = await enqueueQueue(c, 'pack-fulfillment', {
        purchaseId,
        email: existing.buyerEmail,
        orderId: existing.shopifyOrderId,
      });
    } catch (err) {
      console.error(`[Repair Purchase] Failed to enqueue purchase ${purchaseId}:`, err);
      return ApiErrors.internal(c, `Failed to enqueue fulfillment job: ${String(err)}`);
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Repair Purchase] Enqueued purchase ${purchaseId} as job ${job.jobId}`);

    return sendSuccess(c, {
      purchaseId,
      jobId: job.jobId,
      status: 'enqueued',
    });
  });

  // ─── POST /api/admin/purchases/:id/resume — v20 step-flag based resume ─────
  // Enqueues the purchase into the durable pack-fulfillment queue instead of
  // running fulfillment inline. This avoids Cloudflare Worker timeouts (50ms CPU /
  // 30s wall-clock) that can leave the purchase in a partial state. The queue
  // consumer is idempotent — steps already flagged complete are skipped on retry.
  app.post('/api/admin/purchases/:id/resume', async (c) => {
    await validatePoofAuth(c, true);
    const id = c.req.param('id');
    if (!id) return ApiErrors.badRequest(c, 'purchaseId path param required');

    const existing = await getPackPurchases(id);
    if (!existing) return ApiErrors.notFound(c, `No packPurchases record found for ${id}`);

    const allowedStatuses = ['failed', 'partial_failure', 'partial', 'pending_price_fetch', 'pending'];
    if (!allowedStatuses.includes(existing.status)) {
      return ApiErrors.badRequest(
        c,
        `Purchase ${id} has status "${existing.status}" — only ${allowedStatuses.join(', ')} records can be resumed`,
      );
    }

    try {
      const job = await enqueueQueue(c, 'pack-fulfillment', {
        purchaseId: id,
        email: (existing as any).buyerEmail ?? '',
        orderId: (existing as any).shopifyOrderId ?? '',
      });
      return sendSuccess(c, { purchaseId: id, jobId: job.jobId, queued: true });
    } catch (err) {
      console.error(`[Admin Resume] Failed to enqueue purchase ${id}:`, err);
      return ApiErrors.internal(c, `Failed to enqueue fulfillment job: ${String(err)}`);
    }
  });

  // ─── POST /api/admin/purchases/:id/reenqueue — re-enqueue a stuck purchase ──
  // Re-enqueues a packPurchase record into the pack-fulfillment queue consumer.
  // Use this to manually trigger fulfillment for records that are stuck in
  // partial_failure, failed, or pending_price_fetch without waiting for the
  // heartbeat reconciler. The queue consumer is idempotent — steps already marked
  // complete in the step flags (stepTokens/stepPayout/stepNft/stepNotify) are skipped.
  // Note: you can also trigger queue jobs directly from the Poof Cloud Queues tab.
  app.post('/api/admin/purchases/:id/reenqueue', async (c) => {
    await validatePoofAuth(c, true);

    const purchaseId = c.req.param('id');
    if (!purchaseId) return ApiErrors.badRequest(c, 'purchaseId is required');

    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) return ApiErrors.notFound(c, `Purchase ${purchaseId} not found`);

    const allowedStatuses = ['failed', 'partial_failure', 'partial', 'pending_price_fetch', 'pending'];
    if (!allowedStatuses.includes(purchase.status)) {
      return ApiErrors.badRequest(c, `Purchase ${purchaseId} has status "${purchase.status}" — only ${allowedStatuses.join(', ')} records can be re-enqueued`);
    }

    try {
      const job = await enqueueQueue(c, 'pack-fulfillment', {
        purchaseId,
        email: (purchase as any).buyerEmail ?? '',
        orderId: (purchase as any).shopifyOrderId ?? '',
      });
      return sendSuccess(c, { purchaseId, jobId: job.jobId, status: 'enqueued' });
    } catch (err) {
      console.error(`[Admin] Failed to re-enqueue purchase ${purchaseId}:`, err);
      return ApiErrors.internal(c, `Failed to enqueue fulfillment job: ${String(err)}`);
    }
  });

  // ─── POST /api/admin/purchases/:id/cancel — tombstone-cancel a pack purchase ──
  app.post('/api/admin/purchases/:id/cancel', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const id = c.req.param('id');
    if (!id) return ApiErrors.badRequest(c, 'Purchase ID is required');

    const { get: dbGet, set: dbSet } = await import('@pooflabs/server');
    const existing = await dbGet('packPurchases/' + id);
    if (!existing) return ApiErrors.notFound(c, 'Purchase record not found');

    if ((existing as any).status === 'cancelled') {
      return sendSuccess(c, { alreadyCancelled: true });
    }

    const now = Math.floor(Date.now() / 1000);
    await dbSet('packPurchases/' + id, {
      ...(existing as object),
      status: 'cancelled',
      cancelledAt: now,
      cancelledBy: walletAddress,
    });

    return sendSuccess(c, { success: true, cancelled: true });
  });

  // ─── DELETE /api/admin/purchases/:id — tombstone-cancel a single pack purchase ─
  // Tombstones instead of hard-deleting so Shopify webhook retries are handled safely.
  app.delete('/api/admin/purchases/:id', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const id = c.req.param('id');
    if (!id) return ApiErrors.badRequest(c, 'Purchase ID is required');

    const { get: dbGet, set: dbSet } = await import('@pooflabs/server');
    const existing = await dbGet('packPurchases/' + id);
    if (!existing) return ApiErrors.notFound(c, 'Purchase record not found');

    if ((existing as any).status === 'cancelled') {
      return sendSuccess(c, { cancelled: true, id, alreadyCancelled: true });
    }

    const now = Math.floor(Date.now() / 1000);
    await dbSet('packPurchases/' + id, {
      ...(existing as object),
      status: 'cancelled',
      cancelledAt: now,
      cancelledBy: walletAddress,
    });

    return sendSuccess(c, { cancelled: true, id });
  });

  // ─── POST /api/direct-sol-purchase — verify on-chain tx and run fulfillment ─
  // Buyer sent SOL directly to OPERATIONS_WALLET via Phantom. Backend verifies
  // the tx on-chain, then runs the 4-step fulfillment with walletSource='direct_sol'
  // so the fan gets +1.5% more tokens (Apple Pay savings passed back).
  app.post('/api/direct-sol-purchase', async (c) => {
    let body: { txSignature?: string; songId?: string; usdAmount?: number; buyerAddress?: string };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { txSignature, songId, usdAmount, buyerAddress } = body;
    if (!txSignature) return ApiErrors.badRequest(c, 'txSignature is required');
    if (!songId) return ApiErrors.badRequest(c, 'songId is required');
    if (!usdAmount || usdAmount < 1) return ApiErrors.badRequest(c, 'usdAmount must be >= 1');
    if (!buyerAddress) return ApiErrors.badRequest(c, 'buyerAddress is required');

    // Anti-replay pre-check: reject immediately if this signature was already consumed.
    // This runs BEFORE the expensive RPC call to avoid wasting an RPC roundtrip on replays.
    const existingSig = await getProcessedSolSignatures(txSignature);
    if (existingSig) {
      return ApiErrors.badRequest(c, 'Transaction signature has already been processed');
    }

    // Deduplicate: check if this tx was already processed
    const existing = await getManyPackPurchases(`where shopifyOrderId = "${txSignature.slice(0, 32).replace(/[^\w]/g, '')}"`);
    if (existing.length > 0) {
      return ApiErrors.badRequest(c, 'Transaction already processed');
    }

    // Verify the transaction on-chain: confirm it was sent to our OPERATIONS_WALLET
    // SECURITY: any RPC failure is a hard rejection — we never skip verification.
    let verifiedLamports = 0;
    {
      try {
        const { PublicKey: SolPubkey } = await import('@solana/web3.js');
        const conn = await createConnection(c.env);
        const txInfo = await conn.getTransaction(txSignature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        });

        if (!txInfo) {
          return ApiErrors.badRequest(c, 'Transaction not found on-chain or not yet confirmed');
        }

        // Verify destination is the OPERATIONS_WALLET
        const opsAddress = OPERATIONS_WALLET;
        const accountKeys = txInfo.transaction.message.staticAccountKeys ?? txInfo.transaction.message.getAccountKeys?.().staticAccountKeys ?? [];
        const opsIndex = accountKeys.findIndex((k: any) => k.toBase58?.() === opsAddress);

        if (opsIndex < 0) {
          return ApiErrors.badRequest(c, 'Transaction destination does not match OPERATIONS_WALLET');
        }

        // Verify SOL was received (post - pre balance for the ops wallet must be > 0)
        const preBalance = txInfo.meta?.preBalances?.[opsIndex] ?? 0;
        const postBalance = txInfo.meta?.postBalances?.[opsIndex] ?? 0;
        const receivedLamports = postBalance - preBalance;

        if (receivedLamports <= 0) {
          return ApiErrors.badRequest(c, 'Transaction did not transfer SOL to OPERATIONS_WALLET');
        }

        verifiedLamports = receivedLamports;
      } catch (err) {
        // Hard reject on ANY RPC failure — never proceed without on-chain verification.
        // The buyer can retry once the RPC recovers; we must not allow self-reported amounts.
        console.error('[DirectSOL] RPC verification error — rejecting request:', err);
        return ApiErrors.badRequest(c, `On-chain verification failed: ${(err as any)?.message ?? 'RPC error'}. Please retry in a moment.`);
      }
    }

    // SECURITY: Cross-check the claimed usdAmount against what was actually received on-chain.
    // Use fetchSolPriceSafe (returns null on total failure). Allow 5% tolerance to account
    // for SOL price drift between the time the buyer submitted the tx and now.
    {
      const verifyPriceResult = await fetchSolPriceSafe();
      if (!verifyPriceResult) {
        return ApiErrors.badRequest(c, 'SOL/USD price unavailable — cannot verify payment');
      }
      const { priceUsd: verifyPriceUsd } = verifyPriceResult;
      const actualUsd = (verifiedLamports / 1e9) * verifyPriceUsd;
      const TOLERANCE = 0.05; // 5%
      if (usdAmount > actualUsd * (1 + TOLERANCE)) {
        return ApiErrors.badRequest(
          c,
          `Claimed amount ($${usdAmount}) exceeds on-chain payment (~$${actualUsd.toFixed(2)} at current SOL price). Please retry with the correct amount.`,
        );
      }
    }

    // Anti-replay write: lock the signature before entering fulfillment so it can never be
    // replayed even if fulfillment crashes. The policy enforces create-only (no updates),
    // so a concurrent request that races past the pre-check will fail here at the policy layer.
    {
      const sigWritten = await setProcessedSolSignatures(txSignature, {
        signature: txSignature,
        walletAddress: Address.publicKey(buyerAddress),
        usdAmount: String(usdAmount),
        lamports: verifiedLamports,
        processedAt: Math.floor(Date.now() / 1000),
      });

      if (!sigWritten) {
        // The policy layer rejected the write. The most likely cause is a concurrent request
        // that beat us to the lock — treat as duplicate rather than 500.
        return ApiErrors.badRequest(c, 'Transaction signature has already been processed');
      }
    }

    // Look up the song
    const song = await getSongs(songId);
    if (!song) return ApiErrors.notFound(c, `Song ${songId} not found`);

    // ── Step 0: Capture SOL/USD price BEFORE any lamport calculation ──────────
    // captureSolPriceUsd is the canonical helper (price-capture.ts).
    // fetchSolPriceSafe returns null on total failure — caller must abort.
    const capturedPriceResult = await captureSolPriceUsd(process.env.COINMARKETCAP_API_KEY);
    const fallbackPriceResult = capturedPriceResult ? null : await fetchSolPriceSafe();
    if (!capturedPriceResult && !fallbackPriceResult) {
      return ApiErrors.internal(c, 'SOL/USD price unavailable — cannot calculate token amount');
    }
    const solPriceUsd = capturedPriceResult ? capturedPriceResult.priceUsd : fallbackPriceResult!.priceUsd;

    // Find the appropriate pack config or use a custom entry
    const approxPriceUsdCents = Math.round(usdAmount * 100);
    const packConfig = PACK_CONFIG.reduce<typeof PACK_CONFIG[0]>((closest, p) =>
      Math.abs(p.priceUsd - approxPriceUsdCents) < Math.abs(closest.priceUsd - approxPriceUsdCents) ? p : closest,
      PACK_CONFIG[0],
    );

    // Token amount is determined at fulfillment time by the bonding curve buy.
    // Store 0 at creation, like Shopify — the pipeline computes actual tokens during step 1.
    const tokenAmount = 0;

    // Use txSignature-derived ID as the shopifyOrderId to deduplicate
    const orderId = `direct-${txSignature.slice(0, 20)}`;
    const purchaseId = `direct-${orderId}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;

    // Determine initial status: if price capture failed, mark pending_price_fetch
    // so the heartbeat reconciler can retry step 0 later.
    const solPriceAtPurchaseUsd = capturedPriceResult ? scaleToMicroUsd(capturedPriceResult.priceUsd) : undefined;
    const solPriceTimestamp = capturedPriceResult ? capturedPriceResult.timestampMs : undefined;
    const initialStatus = capturedPriceResult ? 'pending' : 'pending_price_fetch';

    // Create the purchase record — write captured price fields at record creation
    // so the pipeline has them before any lamport math runs
    const purchaseCreated = await setPackPurchases(purchaseId, {
      artistPayout: packConfig.artistPayout,
      buyerAddress: Address.publicKey(buyerAddress),
      buyerEmail: '',
      createdAt: Time.Now,
      nftCount: packConfig.nftCount,
      packId: packConfig.id,
      packName: packConfig.name,
      platformSlice: Math.round(approxPriceUsdCents * (DIRECT_SOL_SHARES.infra + DIRECT_SOL_SHARES.funding)),
      shopifyOrderId: orderId,
      status: initialStatus,
      tokenAmount,
      songId,
      purchaseAmountUsd: usdAmount,
      walletSource: 'direct_sol',
      stepTokens: false,
      stepPayout: false,
      stepNft: false,
      stepNotify: false,
      ...(solPriceAtPurchaseUsd !== undefined ? { solPriceAtPurchaseUsd } : {}),
      ...(solPriceTimestamp !== undefined ? { solPriceTimestamp } : {}),
    } as any);

    if (!purchaseCreated) {
      return ApiErrors.internal(c, 'Failed to create purchase record');
    }

    // Enqueue the durable fulfillment job unconditionally — the queue consumer
    // calls runAllSteps which runs runStepCapturePrice first, so even when
    // price capture failed here the consumer will handle the pending_price_fetch
    // record.  Previously this was skipped on price-capture failure, leaving the
    // purchase stranded until the 5-minute heartbeat reconciler found it.
    try {
      await enqueueQueue(c, 'pack-fulfillment', {
        purchaseId,
        email: '',  // Direct SOL purchases have no email — consumer skips receipt
        orderId,
      });
    } catch (enqueueErr) {
      // Non-fatal: still return success. The heartbeat reconciler will pick
      // up the pending record on its next run if the queue job was not delivered.
    }

    if (!capturedPriceResult) {
      // Price capture failed — record is saved as pending_price_fetch.
      // The queue consumer (runAllSteps) will retry step 0 on its own schedule.
      return sendSuccess(c, {
        purchaseId,
        songId,
        usdAmount,
        tokenAmount,
        walletSource: 'direct_sol',
        message: 'Direct SOL purchase accepted — price fetch pending, fulfillment will retry automatically',
        solscanUrl: `https://solscan.io/tx/${txSignature}`,
      });
    }

    return sendSuccess(c, {
      purchaseId,
      songId,
      usdAmount,
      tokenAmount,
      walletSource: 'direct_sol',
      message: 'Direct SOL purchase accepted — tokens incoming shortly',
      solscanUrl: `https://solscan.io/tx/${txSignature}`,
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // NEW ADMIN API ROUTES (bearer-token authenticated, for external admin tools)
  // ──────────────────────────────────────────────────────────────────────────

  // GET /api/health — Admin-only health check
  app.get('/api/health', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const opsAddress = process.env.OPERATIONS_WALLET_ADDRESS || PROJECT_VAULT_ADDRESS;

    let solBalance = 0;
    try {
      const rpcUrl = await getRpcUrlWithFallback(c.env);
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [opsAddress],
        }),
      });
      const data = (await response.json()) as any;
      solBalance = data?.result?.value ? data.result.value / 1e9 : 0;
    } catch (err) {
      console.error('[Health] SOL balance fetch failed:', err);
    }

    const commit = process.env.CF_PAGES_COMMIT_SHA || new Date().toISOString();

    return sendSuccess(c, {
      ok: true,
      vault: opsAddress,
      sol: solBalance,
      network: 'mainnet-beta',
      commit,
    });
  });

  // GET /api/admin/wallet-status — Admin-only wallet status
  app.get('/api/admin/wallet-status', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const opsAddress = process.env.OPERATIONS_WALLET_ADDRESS || PROJECT_VAULT_ADDRESS;

    let opsSol = 0;
    try {
      const rpcUrl = await getRpcUrlWithFallback(c.env);
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [opsAddress],
        }),
      });
      const data = (await response.json()) as any;
      opsSol = data?.result?.value ? data.result.value / 1e9 : 0;
    } catch (err) {
      console.error('[Wallet Status] Operations wallet balance fetch failed:', err);
    }

    // Also check SPL token balances in the vault for all songs
    const songTokenBalances: Array<{ songId: string; symbol: string; balance: number; mintAddress: string }> = [];
    try {
      const songs = await getManySongs('order by tarobase_created_at desc limit 50');
      for (const song of songs) {
        try {
          const mintAddress = await runGetTokenMintAddressQueryForSongs(song.id);
          const balance = await runQuery(`songs/${song.id}`, 'getTokenBalance', { walletAddress: opsAddress });
          if (balance > 0) {
            songTokenBalances.push({
              songId: song.id,
              symbol: song.symbol ?? '',
              balance,
              mintAddress,
            });
          }
        } catch {
          // Skip songs where token mint address can't be resolved
        }
      }
    } catch (err) {
      console.error('[Wallet Status] SPL token balance query failed:', err);
    }

    return sendSuccess(c, {
      operationsWallet: opsAddress,
      operationsSol: opsSol,
      vaultSplTokenBalances: songTokenBalances,
      pdaWallet: null,
      pdaSol: 0,
      mintAuthority: opsAddress,
      network: 'mainnet-beta',
    });
  });

  // GET /api/admin/pending-orders — Admin-only pending orders list
  app.get('/api/admin/pending-orders', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    const pendingOrders = await getManyPackPurchases(
      "where status = 'pending_wallet' or status = 'pending_oversold' or status = 'partial' order by createdAt asc limit 100",
    );

    const result = (pendingOrders ?? []).map((p: PackPurchasesResponse) => ({
      orderId: p.id,
      shopifyOrderId: p.shopifyOrderId,
      buyerWallet: p.buyerAddress || '',
      email: p.buyerEmail,
      songId: p.songId,
      packId: p.packId,
      packName: p.packName,
      status: p.status,
      createdAt: p.createdAt,
    }));

    return sendSuccess(c, { pendingOrders: result });
  });

  // POST /api/admin/fulfill — Admin-only manual fulfillment
  app.post('/api/admin/fulfill', async (c) => {
    const { walletAddress } = await validatePoofAuth(c, true);

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { orderId, buyerWallet } = body;
    if (!orderId) {
      return ApiErrors.badRequest(c, 'orderId is required');
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin Fulfill] Starting fulfillment for orderId=${orderId}, buyerWallet=${buyerWallet || 'not provided'}`);

    // Look up the packPurchase record
    let purchase: PackPurchasesResponse | null = null;
    try {
      purchase = await getPackPurchases(orderId);
    } catch {
      // orderId might be a shopifyOrderId, search for it
      const matches = await getManyPackPurchases(`where shopifyOrderId = "${sanitizeFilterValueOrEmpty(orderId)}" limit 1`);
      if (matches.length > 0) {
        purchase = matches[0];
      }
    }

    if (!purchase) {
      console.error(`[Admin Fulfill] No packPurchase found for orderId=${orderId}`);
      return ApiErrors.notFound(c, `No order found: ${orderId}`);
    }

    // Use the buyerWallet from the request if provided, otherwise use the stored one
    const resolvedWallet = buyerWallet || purchase.buyerAddress;
    if (!resolvedWallet) {
      return ApiErrors.badRequest(c, 'No buyer wallet available. Provide buyerWallet in the request body.');
    }

    // Resolve pack config
    const packCfg = PACK_CONFIG.find(p => p.id === purchase.packId) ?? PACK_CONFIG.find(p => p.sku === purchase.packId);
    if (!packCfg) {
      console.error(`[Admin Fulfill] Unknown packId: ${purchase.packId}`);
      return ApiErrors.badRequest(c, `Unknown pack: ${purchase.packId}`);
    }

    if (!purchase.songId) {
      return ApiErrors.badRequest(c, 'Order has no songId');
    }

    try {
      const result = await fulfillPackPurchase({
        packId: packCfg.id,
        packSku: packCfg.sku,
        songId: purchase.songId,
        orderId: purchase.shopifyOrderId,
        email: purchase.buyerEmail,
        totalPriceCents: packCfg.priceUsd,
        buyerWallet: resolvedWallet,
        resumePurchaseId: purchase.id,
      });

      const { _emailMeta: _ignored, ...resultWithoutMeta } = result as any;

      if (result.status === 'completed') {
        if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin Fulfill] SUCCESS for orderId=${orderId}: purchaseId=${result.purchaseId}`);
        return sendSuccess(c, { ok: true, signature: resultWithoutMeta.txHash || '', packMint: purchase.songId });
      }

      const errorSummary = (result.errors && result.errors.length > 0) ? result.errors.join('; ') : 'fulfillment incomplete';
      console.error(`[Admin Fulfill] PARTIAL/FAILED for orderId=${orderId}: ${errorSummary}`);

      return sendSuccess(c, {
        ok: false,
        stage: result.status === 'partial' ? 'mint' : 'fulfill',
        error: errorSummary,
        signature: resultWithoutMeta.txHash || '',
      });
    } catch (err: any) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[Admin Fulfill] ERROR for orderId=${orderId}:`, err);

      return sendSuccess(c, {
        ok: false,
        stage: 'fulfill',
        error: errorMessage,
      });
    }
  });

  // ─── Admin Approval Queue ─────────────────────────────────────────────────

  // Helper: send email via Resend
  async function sendResendEmail(env: Record<string, unknown>, opts: {
    to: string;
    subject: string;
    text: string;
  }): Promise<void> {
    const apiKey = env.RESEND_API_KEY as string | undefined;
    if (!apiKey) return;
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'noreply@lit.studio',
          to: [opts.to],
          subject: opts.subject,
          text: opts.text,
        }),
      });
    } catch (err) {
      console.error('[Resend] Failed to send email:', err);
    }
  }

  // GET /api/admin/pending-songs
  app.get('/api/admin/pending-songs', async (c) => {
    await validatePoofAuth(c, true);

    const allDetails = await getManySongDetails();
    const pending = allDetails.filter(d =>
      d.approvalStatus === 'pending' ||
      (!d.approved && (d.approvalStatus == null || d.approvalStatus === ''))
    );

    // Sort by submittedAt desc (most recent first), nulls last
    pending.sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));

    // Join with songs for token name/symbol (best-effort)
    const songIds = pending.map(d => d.id);
    const onchainMap: Record<string, { name?: string; symbol?: string }> = {};
    if (songIds.length > 0) {
      try {
        const onchainSongs = await getManySongs();
        for (const s of onchainSongs) {
          if (songIds.includes(s.id)) {
            onchainMap[s.id] = { name: s.name, symbol: s.symbol };
          }
        }
      } catch {
        // non-fatal — onchain data is best-effort
      }
    }

    const result = pending.map(d => ({
      ...d,
      onchainName: onchainMap[d.id]?.name,
      onchainSymbol: onchainMap[d.id]?.symbol,
    }));

    return sendSuccess(c, { songs: result, total: result.length });
  });

  // POST /api/admin/songs/:songId/approve
  app.post('/api/admin/songs/:songId/approve', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { launchMode?: string } = {};
    try { body = await c.req.json(); } catch { /* optional body */ }

    const details = await getSongDetails(songId);
    if (!details) return ApiErrors.notFound(c, 'Song not found');

    const launchMode = body.launchMode ?? details.launchMode ?? 'manual';

    // ─────────────────────────────────────────────────────────────────────────
    // MINT ADDRESS CAPTURE — happens BEFORE setting approved=true.
    // The song must NEVER transition to approved/live status unless mintAddress
    // is confirmed written to the database. This prevents the bug where songs
    // are approved without a mintAddress, causing every purchase to fail with
    // MINT_ADDRESS_NOT_VERIFIED.
    // ─────────────────────────────────────────────────────────────────────────

    let realMintAddress = '';
    let mintAttempts = 0;
    const MAX_MINT_ATTEMPTS = 5;
    const MINT_DELAY_MS = 2000;

    if (launchMode === 'auto') {
      // AUTO: Create onchain token via PumpFunPlugin, then capture mint.
      try {
        const vaultClient = await createWalletClient({ keypair: (c.env as any).TAROBASE_SOLANA_KEYPAIR });
        const tokenName = details.title ?? 'Untitled';
        const tokenSymbol = details.tokenSymbol ?? tokenName.slice(0, 6).toUpperCase().replace(/\s+/g, '');
        const tokenUri = details.coverImage ?? '';
        const tokenCreator = details.artistAddress;
        const launched = await vaultClient.set(`songs/${songId}`, {
          name: tokenName,
          symbol: tokenSymbol,
          uri: tokenUri,
          creator: tokenCreator,
          audiusStreamUrl: details.audiusStreamUrl,
          audiusTrackId: details.audiusTrackId,
        });
        if (!launched) {
          console.error(`[Admin Approve] Failed to create onchain token for song ${songId}`);
          return ApiErrors.internal(c, 'Failed to create onchain token for song');
        }
      } catch (err) {
        console.error('[Admin Approve] Error creating onchain token:', err);
        return ApiErrors.internal(c, 'Token creation failed — song not approved');
      }
    }

    // Both paths: read mint address with retries.
    // Auto path: pump.fun propagation can take several seconds.
    // Manual path: token was created externally, need to capture the existing mint.
    for (mintAttempts = 1; mintAttempts <= MAX_MINT_ATTEMPTS; mintAttempts++) {
      realMintAddress = await runGetTokenMintAddressQueryForSongs(songId);
      if (realMintAddress && realMintAddress.length > 0) break;
      if (mintAttempts < MAX_MINT_ATTEMPTS) {
        await new Promise(r => setTimeout(r, MINT_DELAY_MS));
      }
    }

    if (!realMintAddress || realMintAddress.length === 0) {
      console.error(`[Admin Approve] mintAddress query returned empty after ${MAX_MINT_ATTEMPTS} attempts for song ${songId} — blocking approval`);
      return ApiErrors.internal(c, 'Could not read mint address after token creation — pump.fun may not have propagated the token yet. Wait and retry approval.');
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin Approve] mintAddress confirmed after ${mintAttempts} attempt(s): ${realMintAddress}`);

    // Write mint address to database
    const mintWritten = await updateSongs(songId, { mintAddress: realMintAddress } as any);
    if (!mintWritten) {
      console.error(`[Admin Approve] Failed to write mintAddress for song ${songId} (mint=${realMintAddress}) — blocking approval`);
      return ApiErrors.internal(c, 'Approval blocked: mintAddress confirmed on chain but DB write failed. Retry approval.');
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[Admin Approve] Captured and stored mintAddress for song ${songId}: ${realMintAddress}`);

    // ─────────────────────────────────────────────────────────────────────────
    // ONLY NOW set the song to approved — mint address is confirmed in DB.
    // ─────────────────────────────────────────────────────────────────────────
    const ok = await updateSongDetails(songId, {
      approved: true,
      approvalStatus: 'approved',
      rejectionReason: undefined,
      changesRequested: undefined,
      launchMode,
    } as any);

    if (!ok) return ApiErrors.internal(c, 'Failed to update song details');

    return sendSuccess(c, { approved: true, songId, launchMode, mintAddress: realMintAddress });
  });

  // POST /api/admin/songs/:songId/reject
  app.post('/api/admin/songs/:songId/reject', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { reason?: string } = {};
    try { body = await c.req.json(); } catch { /* fallthrough */ }

    if (!body.reason || body.reason.trim() === '') {
      return ApiErrors.badRequest(c, 'reason is required');
    }

    const details = await getSongDetails(songId);
    if (!details) return ApiErrors.notFound(c, 'Song not found');

    const ok = await updateSongDetails(songId, {
      approved: false,
      approvalStatus: 'rejected',
      rejectionReason: body.reason.trim(),
    } as any);

    if (!ok) return ApiErrors.internal(c, 'Failed to update song details');

    // Send email notification if artistEmail is set
    if (details.artistEmail) {
      await sendResendEmail(c.env as Record<string, unknown>, {
        to: details.artistEmail,
        subject: 'Your submission was not approved',
        text: `Hi ${details.artist ?? 'there'},\n\nUnfortunately your song "${details.title}" was not approved for the marketplace at this time.\n\nReason: ${body.reason.trim()}\n\nYou can resubmit with changes.\n\nThank you,\nThe Lit Studio Team`,
      });
    }

    return sendSuccess(c, { rejected: true, songId });
  });

  // POST /api/admin/songs/:songId/request-changes
  app.post('/api/admin/songs/:songId/request-changes', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { message?: string } = {};
    try { body = await c.req.json(); } catch { /* fallthrough */ }

    if (!body.message || body.message.trim() === '') {
      return ApiErrors.badRequest(c, 'message is required');
    }

    const details = await getSongDetails(songId);
    if (!details) return ApiErrors.notFound(c, 'Song not found');

    const ok = await updateSongDetails(songId, {
      approvalStatus: 'changesRequested',
      changesRequested: body.message.trim(),
    } as any);

    if (!ok) return ApiErrors.internal(c, 'Failed to update song details');

    // Send email notification if artistEmail is set
    if (details.artistEmail) {
      await sendResendEmail(c.env as Record<string, unknown>, {
        to: details.artistEmail,
        subject: 'Changes requested for your submission',
        text: `Hi ${details.artist ?? 'there'},\n\nWe have reviewed your submission "${details.title}" and have some feedback before we can approve it.\n\nRequested changes:\n${body.message.trim()}\n\nPlease update your submission and resubmit.\n\nThank you,\nThe Lit Studio Team`,
      });
    }

    return sendSuccess(c, { changesRequested: true, songId });
  });

  // POST /api/admin/songs/:songId/set-approved — simple approval toggle (admin only)
  app.post('/api/admin/songs/:songId/set-approved', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { approved?: boolean } = {};
    try { body = await c.req.json(); } catch { /* fallthrough */ }

    if (typeof body.approved !== 'boolean') {
      return ApiErrors.badRequest(c, 'approved boolean is required');
    }

    const details = await getSongDetails(songId);
    if (!details) return ApiErrors.notFound(c, 'Song not found');

    const ok = await updateSongDetails(songId, {
      approved: body.approved,
      approvalStatus: body.approved ? 'approved' : 'rejected',
    } as any);

    if (!ok) return ApiErrors.internal(c, 'Failed to update song details');

    return sendSuccess(c, { approved: body.approved, songId });
  });

  // POST /api/admin/songs/:songId/set-paused — pause/unpause toggle (admin only)
  app.post('/api/admin/songs/:songId/set-paused', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { paused?: boolean } = {};
    try { body = await c.req.json(); } catch { /* fallthrough */ }

    if (typeof body.paused !== 'boolean') {
      return ApiErrors.badRequest(c, 'paused boolean is required');
    }

    const song = await getSongs(songId);
    if (!song) return ApiErrors.notFound(c, 'Song not found');

    const ok = await updateSongs(songId, { paused: body.paused } as any);
    if (!ok) return ApiErrors.internal(c, 'Failed to update song');

    return sendSuccess(c, { paused: body.paused, songId });
  });

  // POST /api/admin/songs/:songId/set-hidden — hide/unhide toggle (admin only)
  app.post('/api/admin/songs/:songId/set-hidden', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { hidden?: boolean } = {};
    try { body = await c.req.json(); } catch { /* fallthrough */ }

    if (typeof body.hidden !== 'boolean') {
      return ApiErrors.badRequest(c, 'hidden boolean is required');
    }

    const song = await getSongs(songId);
    if (!song) return ApiErrors.notFound(c, 'Song not found');

    const ok = await updateSongs(songId, { hidden: body.hidden } as any);
    if (!ok) return ApiErrors.internal(c, 'Failed to update song');

    return sendSuccess(c, { hidden: body.hidden, songId });
  });

  // POST /api/admin/songs/:songId/set-swap-eligible — swap eligibility toggle (admin only)
  app.post('/api/admin/songs/:songId/set-swap-eligible', async (c) => {
    await validatePoofAuth(c, true);

    const songId = c.req.param('songId');
    let body: { swapEligible?: boolean } = {};
    try { body = await c.req.json(); } catch { /* fallthrough */ }

    if (typeof body.swapEligible !== 'boolean') {
      return ApiErrors.badRequest(c, 'swapEligible boolean is required');
    }

    const song = await getSongs(songId);
    if (!song) return ApiErrors.notFound(c, 'Song not found');

    const ok = await updateSongs(songId, { swapEligible: body.swapEligible } as any);
    if (!ok) return ApiErrors.internal(c, 'Failed to update song');

    return sendSuccess(c, { swapEligible: body.swapEligible, songId });
  });

  // POST /api/songs/:songId/stream — record one stream for a song
  app.post('/api/songs/:songId/stream', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);

    const songId = c.req.param('songId');
    if (!songId) return ApiErrors.badRequest(c, 'songId is required');

    const nowSec = Math.floor(Date.now() / 1000);
    const bucket = Math.floor(nowSec / 30);
    const dedupId = `dedup_${walletAddress}_${songId}_${bucket}`;

    // Server-side deduplication: reject duplicate streams within the same 30s bucket
    const dedupRecord = await get(`streamEvents/${dedupId}`) as { timestamp?: number } | null;
    if (dedupRecord) {
      const existing = await getSongStreams(songId);
      return sendSuccess(c, { count: existing?.count ?? 0, deduplicated: true });
    }

    // Write dedup record into streamEvents (immutable — duplicates fail on next request)
    await set(`streamEvents/${dedupId}`, {
      songId,
      userAddress: Address.publicKey(walletAddress),
      duration: 0,
      timestamp: nowSec,
      source: 'streamDedup',
    });

    const existing = await getSongStreams(songId);
    if (existing) {
      const newCount = (existing.count ?? 0) + 1;
      await updateSongStreams(songId, {
        count: Increment.by(1),
        lastStreamedAt: nowSec,
      });
      return sendSuccess(c, { count: newCount });
    } else {
      await setSongStreams(songId, {
        count: 1,
        lastStreamedAt: nowSec,
      });
      return sendSuccess(c, { count: 1 });
    }
  });

  // Artist Privy embedded wallet creation
  registerArtistWalletRoutes(app);

  // Bonding curve buy simulation
  registerSimulateBuyRoute(app);

  // ── Failed Fulfillments: admin retry queue ────────────────────────────────────

  // GET /api/admin/failed-fulfillments — list all unresolved records
  app.get('/api/admin/failed-fulfillments', async (c) => {
    await validatePoofAuth(c, true);
    // Fetch all, filter unresolved client-side (resolvedAt null/undefined/0)
    const all = await getManyFailedFulfillments('order by createdAt desc limit 200');
    const unresolved = all.filter((r) => !r.resolvedAt);
    return sendSuccess(c, { failedFulfillments: unresolved, total: unresolved.length });
  });

  // POST /api/admin/retry-fulfillment — re-run failed steps for a failedFulfillments record
  //
  // Dispatches to the specific step indicated by record.failureStage so that admin
  // retries only the step that failed. Idempotency flags on the purchase record
  // ensure previously-completed steps are always skipped.
  //
  // Recognized failureStage values:
  //   'airdrop'           → runStepAirdrop (then continues full pipeline on success)
  //   'treasury-transfer' → runStepTreasuryTransfer only
  //   'infra-fee'         → runStepInfraFee only
  //   'funding-fee'       → runStepFundingFee only
  //   anything else       → runAllSteps (full pipeline, idempotent)
  app.post('/api/admin/retry-fulfillment', async (c) => {
    await validatePoofAuth(c, true);

    let body: { fulfillmentId?: string };
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const { fulfillmentId } = body;
    if (!fulfillmentId) return ApiErrors.badRequest(c, 'fulfillmentId is required');

    const record = await getFailedFulfillments(fulfillmentId);
    if (!record) return ApiErrors.notFound(c, `Failed fulfillment record ${fulfillmentId} not found`);

    if (record.resolvedAt) {
      return sendSuccess(c, { alreadyResolved: true, resolvedAt: record.resolvedAt });
    }

    const { purchaseId, failureStage } = record;

    // Increment retry counter + update lastRetryAt immediately
    await updateFailedFulfillments(fulfillmentId, {
      retryCount: (record.retryCount ?? 0) + 1,
      lastRetryAt: Time.Now,
    });

    // Dispatch to the correct step based on failureStage.
    // Each step respects its idempotency flag — safe to re-run on already-completed steps.
    let stepOk = false;
    let stepsResult: import('../utils/fulfillment-steps.js').StepsResult | null = null;

    try {
      switch (failureStage) {
        case 'airdrop': {
          // Airdrop failed — retry the airdrop, then run the full pipeline if it succeeds.
          // The full pipeline is idempotent: fee steps and payout/NFT/notify will skip
          // their respective idempotency flags if already done.
          const airdropOk = await runStepAirdrop(purchaseId);
          if (airdropOk) {
            stepsResult = await runAllSteps(purchaseId);
            stepOk = stepsResult.stepTokens;
          } else {
            stepOk = false;
          }
          break;
        }

        case 'treasury-transfer': {
          // Only the treasury outbound transfer failed. Airdrop already delivered.
          // After treasury succeeds, check if all fee steps are now done and
          // if so mark stepTokens + run payout/NFT/notify.
          const treasuryOk = await runStepTreasuryTransfer(purchaseId);
          if (treasuryOk) {
            stepsResult = await runAllSteps(purchaseId);
            stepOk = stepsResult.stepTreasuryTransfer;
          } else {
            stepOk = false;
          }
          break;
        }

        case 'infra-fee': {
          const infraOk = await runStepInfraFee(purchaseId);
          if (infraOk) {
            stepsResult = await runAllSteps(purchaseId);
            stepOk = stepsResult.stepInfraFee;
          } else {
            stepOk = false;
          }
          break;
        }

        case 'funding-fee': {
          const fundingOk = await runStepFundingFee(purchaseId);
          if (fundingOk) {
            stepsResult = await runAllSteps(purchaseId);
            stepOk = stepsResult.stepFundingFee;
          } else {
            stepOk = false;
          }
          break;
        }

        default: {
          // Unknown or legacy failureStage — run the full idempotent pipeline.
          stepsResult = await runAllSteps(purchaseId);
          stepOk = stepsResult.stepTokens;
          break;
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await updateFailedFulfillments(fulfillmentId, {
        failureReason: `Retry threw: ${errMsg}`,
      });
      return ApiErrors.internal(c, `Retry failed: ${errMsg}`);
    }

    if (stepOk) {
      // The specific failed step now succeeded — mark this record resolved.
      const statusSummary = stepsResult
        ? `airdrop=${stepsResult.stepAirdrop} treasury=${stepsResult.stepTreasuryTransfer} infra=${stepsResult.stepInfraFee} funding=${stepsResult.stepFundingFee} payout=${stepsResult.stepPayout} nft=${stepsResult.stepNft} notify=${stepsResult.stepNotify}`
        : `stage=${failureStage} retried successfully`;

      const wrote = await updateFailedFulfillments(fulfillmentId, {
        resolvedAt: Time.Now,
        failureReason: `Resolved by admin retry (stage=${failureStage}). ${statusSummary}`,
      });
      if (!wrote) {
        return ApiErrors.internal(c, 'Failed to mark fulfillment record as resolved');
      }
      return sendSuccess(c, {
        resolved: true,
        fulfillmentId,
        purchaseId,
        failureStage,
        finalStatus: stepsResult?.finalStatus ?? 'completed',
        steps: stepsResult ? {
          airdrop: stepsResult.stepAirdrop,
          treasuryTransfer: stepsResult.stepTreasuryTransfer,
          infraFee: stepsResult.stepInfraFee,
          fundingFee: stepsResult.stepFundingFee,
          tokens: stepsResult.stepTokens,
          payout: stepsResult.stepPayout,
          nft: stepsResult.stepNft,
          notify: stepsResult.stepNotify,
        } : null,
      });
    } else {
      // Still failing — update reason but leave resolvedAt null
      await updateFailedFulfillments(fulfillmentId, {
        failureReason: `Retry ${(record.retryCount ?? 0) + 1} failed (stage=${failureStage}). Check webhookFailures collection for step-level errors.`,
      });
      return sendSuccess(c, {
        resolved: false,
        fulfillmentId,
        purchaseId,
        failureStage,
        finalStatus: stepsResult?.finalStatus ?? 'partial',
        message: `Retry attempted for stage=${failureStage} but step still failing. Record updated with new retryCount.`,
      });
    }
  });

  // DELETE /api/admin/failed-fulfillments/:fulfillmentId — admin manually resolved offline
  app.delete('/api/admin/failed-fulfillments/:fulfillmentId', async (c) => {
    await validatePoofAuth(c, true);
    const fulfillmentId = c.req.param('fulfillmentId');
    if (!fulfillmentId) return ApiErrors.badRequest(c, 'fulfillmentId is required');

    const record = await getFailedFulfillments(fulfillmentId);
    if (!record) return ApiErrors.notFound(c, 'Failed fulfillment record not found');

    const deleted = await deleteFailedFulfillments(fulfillmentId);
    if (!deleted) return ApiErrors.internal(c, 'Failed to delete record — check admin policy');

    return sendSuccess(c, { deleted: true, fulfillmentId });
  });

  // ─── POST /api/admin/purchases/:purchaseId/recover-trapped-tokens — DELIVERABLE A ──
  // Recovery endpoint for purchases stuck at needs_review/partial_failure/cancelled with
  // tokenAmount=0 (i.e. tokens were bought into the vault but never airdropped to buyer).
  //
  // Admin provides the exact mint address and base-unit amount to transfer.
  // Performs a direct SPL token transfer from PROJECT_VAULT to the purchase buyerAddress,
  // then marks the purchase as success and writes a songsAirdrops audit row.
  //
  // IMPORTANT: Call POST /api/admin/songs/:songId/set-mint-address FIRST so that
  // subsequent normal fulfillment runs use the correct ATA.
  app.post('/api/admin/purchases/:purchaseId/recover-trapped-tokens', async (c) => {
    const { walletAddress: adminWallet, poofIdToken: adminToken } = await validatePoofAuth(c, true);
    const purchaseId = c.req.param('purchaseId');
    if (!purchaseId) return ApiErrors.badRequest(c, 'purchaseId is required');

    let body: unknown;
    try { body = await c.req.json(); } catch { return ApiErrors.badRequest(c, 'Invalid JSON body'); }

    const schema = z.object({
      mintAddress: z.string().min(32).max(44),
      amount: z.string().regex(/^\d+$/, 'amount must be a decimal integer string (base units)'),
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return ApiErrors.badRequest(c, `Invalid body: ${parsed.error.issues.map(i => i.message).join(', ')}`);

    const { mintAddress, amount: amountStr } = parsed.data;
    const amountBigInt = BigInt(amountStr);

    // Validate mint pubkey
    try { new PublicKey(mintAddress); } catch {
      return ApiErrors.badRequest(c, `mintAddress "${mintAddress}" is not a valid Solana public key`);
    }

    // Load purchase
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) return ApiErrors.notFound(c, `Purchase ${purchaseId} not found`);

    // Gate: only allow recovery for terminal/failed statuses with no tokens delivered
    const RECOVERABLE_STATUSES = new Set(['needs_review', 'partial_failure', 'cancelled']);
    if (!RECOVERABLE_STATUSES.has(purchase.status)) {
      return ApiErrors.badRequest(c, `Purchase status is "${purchase.status}" — can only recover needs_review, partial_failure, or cancelled purchases`);
    }
    if ((purchase.tokenAmount ?? 0) > 0) {
      return ApiErrors.badRequest(c, `Purchase tokenAmount=${purchase.tokenAmount} > 0 — tokens were already delivered, nothing to recover`);
    }

    const buyerAddress = (purchase as any).buyerAddress as string | undefined;
    if (!buyerAddress) return ApiErrors.badRequest(c, 'Purchase has no buyerAddress — wallet must be set before recovery');

    // Validate buyerAddress is a valid Solana pubkey before attempting transfer
    try { new PublicKey(buyerAddress); } catch {
      return ApiErrors.badRequest(c, `Purchase buyerAddress "${buyerAddress}" is not a valid Solana public key`);
    }

    // Verify vault holds >= amount of the mint on-chain before attempting transfer
    let vaultBalance = BigInt(0);
    try {
      const rpcUrl = await getRpcUrlWithFallback(c.env);
      const resp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'getTokenAccountsByOwner',
          params: [PROJECT_VAULT_ADDRESS, { mint: mintAddress }, { encoding: 'jsonParsed' }],
        }),
      });
      const json: any = await resp.json();
      const accounts: any[] = json?.result?.value ?? [];
      if (accounts.length > 0) {
        const raw = accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.amount;
        if (raw) vaultBalance = BigInt(raw);
      }
    } catch (err) {
      return ApiErrors.internal(c, `Failed to query vault token balance: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (amountBigInt > vaultBalance) {
      return ApiErrors.badRequest(c, `Requested amount=${amountStr} exceeds vault balance=${vaultBalance.toString()} for mint ${mintAddress}`);
    }

    // Idempotency gate: refuse recovery if any recoveryTransfers record already exists
    // for this purchaseId. This prevents duplicate transfers when the first transfer
    // succeeded on-chain but the packPurchases update failed (leaving the purchase in a
    // recoverable status with tokenAmount still 0). We check by purchaseId (not recoveryId)
    // so that any mintAddress used for a prior attempt blocks all subsequent attempts.
    const { getManyRecoveryTransfers } = await import('../collections/recoveryTransfers.js');
    const existingRecoveries = await getManyRecoveryTransfers(`where purchaseId = "${sanitizeFilterValueOrEmpty(purchaseId)}"`);
    if (existingRecoveries.length > 0) {
      const existing = existingRecoveries[0];
      return ApiErrors.badRequest(c, `Purchase ${purchaseId} already has a recovery transfer (recoveryId=${existing.id}, txSig=${existing.txSignature ?? existing.tarobase_transaction_hash ?? 'pending'}). Cannot recover the same purchase twice — check the purchase status and reconcile if needed.`);
    }

    // Write to the recoveryTransfers onchain collection. The create hook atomically
    // calls @TokenPlugin.transfer(PROJECT_VAULT_ADDRESS, buyerAddress, mintAddress, amount),
    // bypassing direct SPL transaction construction. This goes through Poof policy/audit/
    // idempotency like every other vault-signed token movement in this app.
    //
    // The collection create rule requires @user.address == @constants.ADMIN_ADDRESS.
    // The backend vault signs by default, but vault != admin. We forward the admin's
    // verified JWT via _overrides so Tarobase evaluates the write as the admin user.
    //
    // recoveryId is deterministic: retrying the same purchaseId+mintAddress hits the same
    // document path — Tarobase will reject the duplicate create if it already exists,
    // preventing double-transfers. The mintAddress prefix disambiguates across mints.
    const mintSlug = mintAddress.slice(0, 8);
    const recoveryId = `recovery-${purchaseId.replace(/[^a-z0-9]/gi, '')}-${mintSlug}`;

    let txSig = '';
    try {
      const adminAuthOverrides = {
        _getAuthHeaders: async () => ({
          Authorization: `Bearer ${adminToken}`,
          'X-Wallet-Address': adminWallet,
        }),
        _walletAddress: adminWallet,
      };

      const transferOk = await set(
        `recoveryTransfers/${recoveryId}`,
        {
          purchaseId,
          buyerAddress: Address.publicKey(buyerAddress),
          mintAddress: Address.publicKey(mintAddress),
          amount: Number(amountBigInt),
          reason: 'stuck_after_swap',
          status: 'pending',
          createdAt: Time.Now,
          createdBy: Address.publicKey(adminWallet),
        },
        { _overrides: adminAuthOverrides },
      );

      if (!transferOk) {
        console.error(`[recover-trapped-tokens] recoveryTransfers set returned false for ${purchaseId} — policy denied or hook failed`);
        return ApiErrors.internal(c, `Recovery transfer was denied by policy — the admin wallet may not match ADMIN_ADDRESS, the collection document may already exist (duplicate), or the vault balance check in the hook failed. recoveryId=${recoveryId}`);
      }

      // Read back the tarobase_transaction_hash written by the hook (populated after onchain commit)
      const { getRecoveryTransfers } = await import('../collections/recoveryTransfers.js');
      const recoveryDoc = await getRecoveryTransfers(recoveryId);
      txSig = recoveryDoc?.tarobase_transaction_hash ?? recoveryDoc?.txSignature ?? '';
      if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[recover-trapped-tokens] recoveryTransfers hook succeeded: recoveryId=${recoveryId} txHash=${txSig} — ${amountStr} tokens of ${mintAddress} → ${buyerAddress}`);
    } catch (err) {
      console.error(`[recover-trapped-tokens] recoveryTransfers set threw for ${purchaseId}:`, err);
      return ApiErrors.internal(c, `Recovery transfer failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // tokenAmount stored as raw base units (same convention as normal airdrop step).
    // The human-readable amount (base_units / 10^6) is returned in the response but
    // NOT stored — UInt field would truncate a float and base units is the source of truth.
    const tokenAmountBaseUnits = Number(amountBigInt);
    const DECIMALS = 6;
    const humanAmount = tokenAmountBaseUnits / Math.pow(10, DECIMALS);

    // Update purchase record: mark success.
    const songId = (purchase as any).songId as string | undefined;
    const now = Math.floor(Date.now() / 1000);
    const recoveryNote = JSON.stringify({ recoveryId, recoveryTxSig: txSig, recoveredAt: now, recoveredFromTrappedSwap: true });
    const updateOk = await updatePackPurchases(purchaseId, {
      status: 'success' as any,
      tokenAmount: tokenAmountBaseUnits,
      splTxHash: txSig,
      airdropCompleted: true,
      paymentReconciliation: recoveryNote,
    } as any);
    if (!updateOk) {
      // Transfer happened but purchase state wasn't updated — this is a blocking incident.
      // Returning success would allow a second recovery attempt (double-payout).
      // Return 500 so the admin knows the purchase must be reconciled before any further recovery.
      console.error(`[recover-trapped-tokens] CRITICAL: transfer succeeded (recoveryId=${recoveryId} txSig=${txSig}) but failed to update purchase ${purchaseId} — purchase state not reconciled, refusing recovery`);
      return ApiErrors.internal(c, `Recovery transfer executed (txSig=${txSig}) but purchase state could not be updated. The purchase ${purchaseId} must be reconciled manually before any further recovery attempts.`);
    }

    // Write songsAirdrops audit row (same shape as the normal airdrop step)
    if (songId) {
      try {
        const airdropId = `recovery-${purchaseId.replace(/[^a-z0-9]/gi, '')}`;
        const airdropOk = await setSongsAirdrops(songId, airdropId, {
          recipient: Address.publicKey(buyerAddress),
          amount: Number(amountBigInt),
        });
        if (!airdropOk) {
          console.warn(`[recover-trapped-tokens] setSongsAirdrops audit write returned false for ${purchaseId} — on-chain transfer already complete at ${txSig}`);
        }
      } catch (auditErr) {
        console.warn(`[recover-trapped-tokens] Failed to write songsAirdrops audit for ${purchaseId} (non-fatal, transfer already complete):`, auditErr);
      }
    }

    if ((c.env as any).LOG_LEVEL !== 'silent') console.log(`[recover-trapped-tokens] Recovery complete for ${purchaseId}: recoveryId=${recoveryId} txSig=${txSig} amount=${humanAmount} (${amountStr} base units) → ${buyerAddress}`);
    return sendSuccess(c, {
      success: true,
      recoveryId,
      txSig,
      solscanUrl: txSig ? `https://solscan.io/tx/${txSig}` : null,
      purchaseId,
      buyerAddress,
      mintAddress,
      amountBaseUnits: amountStr,
      amountHuman: humanAmount,
    });
  });


  // ─── Candles cache (30-second in-memory TTL) ─────────────────────────────────
  const candlesCache = new Map<string, { data: unknown; expiresAt: number }>();

  // Pump.fun timeframe mapping: UI param → pump.fun minutes value
  const TF_MAP: Record<string, number> = {
    '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440,
  };

  type PumpCandle = {
    open: number; high: number; low: number; close: number;
    volume: number; timestamp: number;
  };

  // ─── Synthetic candle builder from priceHistory snapshots ────────────────────
  function buildSyntheticCandles(
    snapshots: Array<{ createdAt?: number; price?: number }>,
    bucketSeconds: number,
  ): Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> {
    const buckets = new Map<number, { open: number; high: number; low: number; close: number; firstTs: number; lastTs: number }>();
    for (const s of snapshots) {
      const ts = s.createdAt ?? 0;
      const price = s.price ?? 0;
      if (ts === 0 || price === 0) continue;
      const bucket = Math.floor(ts / bucketSeconds) * bucketSeconds;
      const existing = buckets.get(bucket);
      if (existing) {
        if (price > existing.high) existing.high = price;
        if (price < existing.low) existing.low = price;
        if (ts < existing.firstTs) {
          existing.firstTs = ts;
          existing.open = price;
        }
        if (ts > existing.lastTs) {
          existing.lastTs = ts;
          existing.close = price;
        }
      } else {
        buckets.set(bucket, { open: price, high: price, low: price, close: price, firstTs: ts, lastTs: ts });
      }
    }
    return Array.from(buckets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([t, b]) => ({ t, o: b.open, h: b.high, l: b.low, c: b.close, v: 0 }));
  }

  // GET /api/songs/:mint/candles — fetch OHLC candles from pump.fun, fallback to priceHistory
  app.get('/api/songs/:mint/candles', ipRateLimitMiddleware(), async (c) => {
    const mint = c.req.param('mint');
    if (!mint || mint.trim() === '') {
      return ApiErrors.badRequest(c, 'Missing or empty mint param');
    }

    const tfParam = c.req.query('tf') ?? '15m';
    const tfMinutes = TF_MAP[tfParam];
    if (tfMinutes === undefined) {
      return ApiErrors.badRequest(c, `Invalid tf param. Allowed: ${Object.keys(TF_MAP).join(', ')}`);
    }

    const cacheKey = `${mint}:${tfParam}`;
    const now = Date.now();
    const cached = candlesCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return sendSuccess(c, cached.data);
    }

    // Primary: pump.fun candlesticks
    try {
      const url = `https://frontend-api-v3.pump.fun/candlesticks/${mint}?offset=0&limit=1000&timeframe=${tfMinutes}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const raw = await res.json() as PumpCandle[];
        const candles = Array.isArray(raw)
          ? raw.map((r) => ({
              t: typeof r.timestamp === 'number' ? r.timestamp : 0,
              o: r.open ?? 0,
              h: r.high ?? 0,
              l: r.low ?? 0,
              c: r.close ?? 0,
              v: r.volume ?? 0,
            }))
          : [];

        const payload = { candles };
        if (candlesCache.size >= 500) {
          candlesCache.delete(candlesCache.keys().next().value);
        }
        candlesCache.set(cacheKey, { data: payload, expiresAt: now + 30_000 });
        return sendSuccess(c, payload);
      }

      console.warn(`[candles] pump.fun returned HTTP ${res.status} for mint=${mint} tf=${tfParam}`);
      if (res.status === 404) {
        // Token not on pump.fun — fall through to priceHistory fallback
      }
      // Non-404 error — fall through to priceHistory fallback
    } catch (err) {
      console.warn(`[candles] pump.fun fetch error for mint=${mint}:`, err instanceof Error ? err.message : String(err));
    }

    // Fallback: build synthetic candles from priceHistory snapshots
    try {
      const songs = await getManySongs(`where mintAddress = '${mint}' limit 1`);
      const songId = (songs?.[0] as any)?.id;
      if (songId) {
        const snapshots = await getManyPriceHistory(`where songId = '${songId}' order by createdAt desc limit 2000`);
        if (snapshots && snapshots.length > 0) {
          const bucketSeconds = tfMinutes * 60;
          const candles = buildSyntheticCandles(snapshots, bucketSeconds);
          const payload = { candles };
          if (candlesCache.size >= 500) {
            candlesCache.delete(candlesCache.keys().next().value);
          }
          candlesCache.set(cacheKey, { data: payload, expiresAt: now + 30_000 });
          console.log(`[candles] Built ${candles.length} synthetic candles from priceHistory for mint=${mint} tf=${tfParam}`);
          return sendSuccess(c, payload);
        }
      }
    } catch (err) {
      console.warn(`[candles] priceHistory fallback failed for mint=${mint}:`, err instanceof Error ? err.message : String(err));
    }

    // Nothing available — return empty array gracefully
    return sendSuccess(c, { candles: [] });
  });

  // GET /api/wallet/:address/tokens — scan all SPL token accounts for a wallet
  app.get('/api/wallet/:address/tokens', async (c) => {
    const address = c.req.param('address');
    if (!address || address.trim() === '') {
      return ApiErrors.badRequest(c, 'Missing or empty address param');
    }

    try {
      const rpcUrl = await getRpcUrlWithFallback(c.env);
      const resp = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getTokenAccountsByOwner',
          params: [
            address,
            { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
            { encoding: 'jsonParsed' },
          ],
        }),
      });

      if (!resp.ok) {
        throw new Error(`RPC returned ${resp.status}`);
      }

      const json = await resp.json() as any;
      const accounts = json?.result?.value ?? [];

      const tokens: { mint: string; amount: number; rawAmount: string; decimals: number }[] = [];
      for (const acct of accounts) {
        const info = acct?.account?.data?.parsed?.info;
        const mint = info?.mint;
        const amountRaw = info?.tokenAmount?.amount;
        const decimals = info?.tokenAmount?.decimals ?? 0;

        if (!mint || amountRaw == null) continue;
        if (Number(amountRaw) === 0) continue;

        tokens.push({
          mint,
          amount: info?.tokenAmount?.uiAmount ?? Number(amountRaw) / Math.pow(10, decimals),
          rawAmount: String(amountRaw),
          decimals,
        });
      }

      return sendSuccess(c, { tokens });
    } catch (err) {
      console.error(`[wallet-tokens] Failed to fetch tokens for ${address}:`, err instanceof Error ? err.message : String(err));
      return ApiErrors.internal(c, 'Failed to fetch wallet tokens');
    }
  });

  // GET /api/songs/:mint/holders — fetch real on-chain token holders via Helius DAS
  app.get('/api/songs/:mint/holders', async (c) => {
    const mint = c.req.param('mint');
    if (!mint || mint.trim() === '') {
      return ApiErrors.badRequest(c, 'Missing or empty mint param');
    }

    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) {
      console.error('[holders] HELIUS_API_KEY not configured');
      return ApiErrors.internal(c, 'HELIUS_API_KEY not configured');
    }

    try {
      const ownerBalances = new Map<string, number>();
      let page = 1;
      const limit = 1000;

      while (true) {
        const resp = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: `holders-${page}`,
            method: 'getTokenAccounts',
            params: { mint, page, limit },
          }),
        });

        if (!resp.ok) {
          throw new Error(`Helius responded ${resp.status}`);
        }

        const json = await resp.json() as { result?: { token_accounts?: Array<{ owner: string; amount: number }> } };
        const accounts = json.result?.token_accounts ?? [];

        for (const acct of accounts) {
          if (!acct.owner || acct.amount <= 0) continue;
          ownerBalances.set(acct.owner, (ownerBalances.get(acct.owner) ?? 0) + acct.amount);
        }

        if (accounts.length < limit) break;
        page++;
      }

      const totalSupply = Array.from(ownerBalances.values()).reduce((s, v) => s + v, 0);
      const totalHolders = ownerBalances.size;

      const holders = Array.from(ownerBalances.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([owner, balance]) => ({
          owner,
          balance,
          percentage: totalSupply > 0 ? Math.round((balance / totalSupply) * 10000) / 100 : 0,
        }));

      return sendSuccess(c, { holders, totalHolders, totalSupply });
    } catch (err) {
      console.error('[holders] Failed to fetch holders:', err);
      return ApiErrors.internal(c, 'Failed to fetch holders');
    }
  });

  // ─── Stream Analytics (admin only) ──────────────────────────────────────────

  app.get('/api/admin/stream-analytics', async (c) => {
    await validatePoofAuth(c, true);

    const nowSec = Math.floor(Date.now() / 1000);
    const thirtyDaysAgo = nowSec - 30 * 24 * 60 * 60;

    try {
      const events = await getManyStreamEvents(`where timestamp > ${thirtyDaysAgo}`);
      const realEvents = events.filter((e) => e.source !== 'streamDedup');
      const totalStreams = realEvents.length;
      const uniqueListeners = new Set(realEvents.map((e) => e.userAddress).filter(Boolean)).size;

      // Streams today
      const startOfToday = nowSec - (nowSec % 86400);
      const streamsToday = realEvents.filter((e) => e.timestamp >= startOfToday).length;

      // Daily streams (last 30 days)
      const dailyMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date((nowSec - i * 86400) * 1000);
        const key = d.toISOString().split('T')[0];
        dailyMap.set(key, 0);
      }
      for (const e of realEvents) {
        const d = new Date(e.timestamp * 1000);
        const key = d.toISOString().split('T')[0];
        if (dailyMap.has(key)) {
          dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
        }
      }
      const dailyStreams = Array.from(dailyMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Top 10 songs by stream count
      const songCounts = new Map<string, number>();
      for (const e of realEvents) {
        songCounts.set(e.songId, (songCounts.get(e.songId) ?? 0) + 1);
      }
      const topSongs = Array.from(songCounts.entries())
        .map(([songId, count]) => ({ songId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return sendSuccess(c, {
        dailyStreams,
        topSongs,
        totalStreams,
        uniqueListeners,
        streamsToday,
      });
    } catch (err) {
      console.error('[stream-analytics] Failed:', err);
      return ApiErrors.internal(c, 'Failed to fetch stream analytics');
    }
  });

  // ─── Support Tickets ────────────────────────────────────────────────────────

  app.post('/api/support/ticket', async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const type = body?.type;
    const subject = body?.subject?.trim();
    const message = body?.message?.trim();
    const userEmail = body?.userEmail?.trim();
    const claimantName = body?.claimantName?.trim();
    const contentUrl = body?.contentUrl?.trim();
    const originalWorkUrl = body?.originalWorkUrl?.trim();
    const goodFaithStatement = body?.goodFaithStatement === true;

    if (type !== 'support' && type !== 'dmca') {
      return ApiErrors.badRequest(c, "type must be 'support' or 'dmca'");
    }

    if (type === 'support') {
      if (!subject || !message) {
        return ApiErrors.badRequest(c, 'subject and message are required for support tickets');
      }
    } else if (type === 'dmca') {
      if (!claimantName || !userEmail || !contentUrl || !goodFaithStatement) {
        return ApiErrors.badRequest(c, 'claimantName, userEmail, contentUrl, and goodFaithStatement (true) are required for DMCA tickets');
      }
    }

    if (userEmail && !validateEmail(userEmail)) {
      return ApiErrors.badRequest(c, 'Invalid email address');
    }

    const ticketId = crypto.randomUUID();
    const created = await setSupportTickets(ticketId, {
      type,
      subject: subject || (type === 'dmca' ? 'DMCA Takedown Request' : ''),
      message: message || '',
      status: 'open',
      userEmail: userEmail || '',
      claimantName: claimantName || undefined,
      contentUrl: contentUrl || undefined,
      originalWorkUrl: originalWorkUrl || undefined,
      goodFaithStatement: type === 'dmca' ? goodFaithStatement : undefined,
      priority: 'normal',
      createdAt: Time.Now,
    });

    if (!created) {
      return ApiErrors.internal(c, 'Failed to create support ticket');
    }

    return sendSuccess(c, { ticketId, status: 'open' });
  });

  app.patch('/api/support/ticket/:id', async (c) => {
    await validatePoofAuth(c, true);
    const ticketId = c.req.param('id');
    if (!ticketId) return ApiErrors.badRequest(c, 'ticket id is required');

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const updateData: any = {};
    if (body.status !== undefined) updateData.status = body.status;
    if (body.adminNotes !== undefined) updateData.adminNotes = body.adminNotes;
    if (body.resolution !== undefined) updateData.resolution = body.resolution;
    if (body.priority !== undefined) updateData.priority = body.priority;
    if (body.resolvedAt !== undefined) updateData.resolvedAt = body.resolvedAt;
    if (body.status === 'resolved' || body.status === 'closed') {
      updateData.resolvedAt = Math.floor(Date.now() / 1000);
    }

    const updated = await updateSupportTickets(ticketId, updateData);
    if (!updated) {
      return ApiErrors.internal(c, 'Failed to update support ticket');
    }

    const ticket = await getSupportTickets(ticketId);
    return sendSuccess(c, { ticket });
  });

  // ─── Error Logging ──────────────────────────────────────────────────────────

  app.post('/api/error-log', async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return ApiErrors.badRequest(c, 'Invalid JSON body');
    }

    const level = body?.level;
    const message = body?.message?.trim();
    const source = body?.source?.trim();

    if (!message || !source) {
      return ApiErrors.badRequest(c, 'message and source are required');
    }
    if (level !== 'error' && level !== 'warn' && level !== 'info') {
      return ApiErrors.badRequest(c, "level must be 'error', 'warn', or 'info'");
    }

    const logId = crypto.randomUUID();
    const env = (c.env as any)?.ENV ?? (c.env as any)?.WORKER_ENV ?? 'unknown';

    const created = await setErrorLogs(logId, {
      level,
      message,
      stack: body.stack || undefined,
      context: body.context || undefined,
      source,
      userAddress: body.userAddress || undefined,
      createdAt: Time.Now,
      environment: env,
      appVersion: body.appVersion || 'unknown',
      resolved: false,
    });

    if (!created) {
      return ApiErrors.internal(c, 'Failed to log error');
    }

    return sendSuccess(c, { logged: true });
  });

  app.patch('/api/error-log/:id/resolve', async (c) => {
    await validatePoofAuth(c, true);
    const logId = c.req.param('id');
    if (!logId) return ApiErrors.badRequest(c, 'log id is required');

    const updated = await updateErrorLogs(logId, { resolved: true });
    if (!updated) {
      return ApiErrors.internal(c, 'Failed to resolve error log');
    }

    return sendSuccess(c, { resolved: true });
  });

  // ── Notification Routes ────────────────────────────────────────────────────

  app.post('/api/notifications/like', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const body = await c.req.json();
    const parsed = z.object({ songId: z.string() }).safeParse(body);
    if (!parsed.success) {
      return ApiErrors.badRequest(c, parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { songId } = parsed.data;

    const song = await getSongs(songId);
    if (!song) {
      return ApiErrors.notFound(c, 'Song not found');
    }

    const user = await getUsers(walletAddress);
    const actorName = user?.displayName || walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);

    await set(`notifications/like_${walletAddress}_${songId}_${Date.now()}`, {
      recipientAddress: song.creator,
      type: 'like',
      actorAddress: walletAddress,
      actorName,
      referenceId: songId,
      referenceTitle: song.name,
      message: 'liked your song',
      isRead: false,
      createdAt: Time.Now,
    });

    return sendSuccess(c, { created: true });
  });

  app.post('/api/notifications/follow', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const body = await c.req.json();
    const parsed = z.object({ artistAddress: z.string() }).safeParse(body);
    if (!parsed.success) {
      return ApiErrors.badRequest(c, parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { artistAddress } = parsed.data;

    const user = await getUsers(walletAddress);
    const actorName = user?.displayName || walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);

    const artist = await getArtists(artistAddress);
    const referenceTitle = artist?.name || artistAddress.slice(0, 4) + '...' + artistAddress.slice(-4);

    await set(`notifications/follow_${walletAddress}_${artistAddress}_${Date.now()}`, {
      recipientAddress: artistAddress,
      type: 'follow',
      actorAddress: walletAddress,
      actorName,
      referenceId: artistAddress,
      referenceTitle,
      message: 'started following you',
      isRead: false,
      createdAt: Time.Now,
    });

    return sendSuccess(c, { created: true });
  });

  app.post('/api/notifications/repost', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const body = await c.req.json();
    const parsed = z.object({ songId: z.string() }).safeParse(body);
    if (!parsed.success) {
      return ApiErrors.badRequest(c, parsed.error.issues.map((i) => i.message).join(', '));
    }
    const { songId } = parsed.data;

    const song = await getSongs(songId);
    if (!song) {
      return ApiErrors.notFound(c, 'Song not found');
    }

    const user = await getUsers(walletAddress);
    const actorName = user?.displayName || walletAddress.slice(0, 4) + '...' + walletAddress.slice(-4);

    await set(`notifications/repost_${walletAddress}_${songId}_${Date.now()}`, {
      recipientAddress: song.creator,
      type: 'repost',
      actorAddress: walletAddress,
      actorName,
      referenceId: songId,
      referenceTitle: song.name,
      message: 'reposted your song',
      isRead: false,
      createdAt: Time.Now,
    });

    return sendSuccess(c, { created: true });
  });

  // POST /api/chat/messages — create a chat message with moderation and rate limiting
  app.post('/api/chat/messages', async (c) => {
    const { walletAddress } = await validatePoofAuth(c);
    const body = await c.req.json();

    const schema = z.object({
      content: z.string().min(1).max(280),
      displayName: z.string().max(50).optional(),
      arenaId: z.string().max(50).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join('; ');
      return ApiErrors.badRequest(c, msg);
    }

    const { content, displayName, arenaId } = parsed.data;

    // Content moderation checks
    const trimmed = content.trim();
    if (!trimmed) {
      return ApiErrors.badRequest(c, 'Message cannot be empty');
    }

    // Profanity filter
    const BANNED_WORDS = [
      'nigger', 'nigga', 'faggot', 'fag', 'kike', 'spic', 'chink', 'gook',
      'retard', 'cunt', 'twat', 'bitch', 'whore', 'slut',
      'tranny', 'dyke', 'wetback', 'cracker', 'spook',
    ];
    const lowerContent = trimmed.toLowerCase();
    const hasProfanity = BANNED_WORDS.some((word) => {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerContent);
    });
    if (hasProfanity) {
      return ApiErrors.badRequest(c, 'Message contains inappropriate content');
    }

    // ALL CAPS check
    if (trimmed.length > 10) {
      const letters = trimmed.replace(/[^a-zA-Z]/g, '');
      if (letters.length > 0) {
        const upperCount = letters.replace(/[^A-Z]/g, '').length;
        if (upperCount / letters.length > 0.7) {
          return ApiErrors.badRequest(c, 'Message cannot be mostly uppercase');
        }
      }
    }

    // Repeated characters check
    if (/(.)(\1{4,})/.test(trimmed)) {
      return ApiErrors.badRequest(c, 'Message contains excessive repeated characters');
    }

    // Rate limit
    const rateLimitResponse = checkChatRateLimit(c, walletAddress);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Create message
    const messageId = `${walletAddress}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const success = await setChatMessages(messageId, {
      walletAddress: Address.publicKey(walletAddress),
      displayName: displayName ?? undefined,
      content: trimmed,
      isPinned: false,
      createdAt: Time.Now,
      arenaId: arenaId ?? undefined,
    });

    if (!success) {
      return ApiErrors.internal(c, 'Failed to create chat message');
    }

    return sendSuccess(c, { messageId, status: 'sent' });
  });

}
