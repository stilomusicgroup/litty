/**
 * Bonding curve buy → vault helper.
 *
 * Songs are launched via @PumpFunPlugin.createToken, so the entire token
 * supply lives in the bonding-curve PDA — the project vault never holds
 * song tokens. The airdrop hook on songs/$songId/airdrops transfers FROM
 * PROJECT_VAULT_ADDRESS, so it silently fails for fresh songs unless we
 * first buy tokens into the vault.
 *
 * This helper makes that happen before each setSongsAirdrops call:
 *   1. Project vault signs setSongsPayouts on songs/$songId/payouts/$id
 *      with recipient=PROJECT_VAULT_ADDRESS so OPERATIONS_WALLET (which
 *      actually holds SOL) sends SOL to the vault for the buy.
 *   2. Project vault signs setSongsBuys on songs/$songId/buys/$id; the
 *      onchain hook calls @PumpFunPlugin.buyExactSolIn(@user.address, ...),
 *      so vault pays SOL and tokens land in the vault. The hook also
 *      charges a 2% SOL platform fee, so we fund a bit extra.
 *
 * Idempotency is enforced via deterministic IDs derived from the
 * purchaseId, so retries / reconciliation runs do not double-buy.
 */

import {
  setSongsBuys,
  getSongsBuys,
  getSongs,
  updateSongs,
  setSongsSwaps,
  runGetTokenMintAddressQueryForSongs,
  runGetTokenBalanceQueryForSongs,
} from '../collections/songs.js';
import {
  getProcessedSolSignatures,
  setProcessedSolSignatures,
} from '../collections/processedSolSignatures.js';
import { runJupiterSwapQuoteQueryForCommonQueries } from '../collections/commonQueries.js';
import { Address, set } from '../db-client.js';
import { PROJECT_VAULT_ADDRESS } from '../constants.js';
import { getRpcUrlWithFallback } from './rpc-client.js';

export const PUMPFUN_BUY_PLATFORM_FEE_BPS = 200; // matches @constants.PLATFORM_FEE_BPS = "200"
export const PUMPFUN_BUY_SLIPPAGE_BPS = 500; // 5% slippage tolerance for bonding curve
// Reduced from 25% to 5% — the previous 25% was allowing vault buys to fill
// at prices up to 25% worse than quoted, silently transferring user value to
// the AMM. 5% matches the conservative default used by pump.fun's own UI and
// is sufficient for freshly-launched / thin-liquidity tokens under normal
// network conditions. The retry logic handles genuine congestion-induced
// failures, so we do not need a bloated slippage buffer.
export const VAULT_SOL_BUFFER_LAMPORTS = 5_000_000; // 0.005 SOL fee/rent buffer

// ─── Retry configuration for mainnet durability ──────────────────────────────

const MAX_BONDING_CURVE_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 2_000; // 2s base, exponential backoff
const RETRY_MAX_DELAY_MS = 15_000; // cap at 15s between retries

/**
 * Errors that indicate a transient mainnet issue (congestion, timeout,
 * rate-limit) and are safe to retry.  Permanent failures (insufficient
 * funds, invalid params, graduated token) are excluded.
 */
function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  // Timeout / expiry — the tx may have landed; retry is safe because
  // the helper uses deterministic IDs (idempotent).
  if (lower.includes('timeout') || lower.includes('expired') || lower.includes('timed out')) return true;
  // Network congestion / RPC overload
  if (lower.includes('rate limit') || lower.includes('429') || lower.includes('too many requests')) return true;
  if (lower.includes('blockhash') || lower.includes('block hash')) return true;
  if (lower.includes('recent blockhash') || lower.includes('not found')) return true;
  // General retryable patterns
  if (lower.includes('temporarily') || lower.includes('try again') || lower.includes('retry')) return true;
  if (lower.includes('transaction was not confirmed') || lower.includes('not confirmed')) return true;
  // Helius / RPC-specific
  if (lower.includes('helius') && (lower.includes('error') || lower.includes('failed'))) return true;
  return false;
}

/** Exponential backoff with jitter to avoid thundering-herd on retries. */
function delayForAttempt(attempt: number): number {
  const base = Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS);
  const jitter = base * 0.2 * Math.random(); // +/- 20%
  return Math.round(base + jitter);
}

export interface EstimateBuyArgs {
  packPriceUsdCents: number;
  tokenAmount: number;
  pricePerTokenUsd?: number;
  solUsd: number;
}

export type EstimateBuyResult =
  | { buyLamports: number; feeLamports: number; totalLamports: number }
  | { buyLamports: 0; feeLamports: 0; totalLamports: 0; error: string };

/**
 * Estimate the SOL (in lamports) required to buy `tokenAmount` song tokens
 * on the bonding curve, including the 2% PumpFun platform fee and a
 * slippage buffer.
 *
 * Returns an error when price data is unavailable — never guesses a fallback
 * price, because an arbitrary estimate can cause users to submit transactions
 * expecting prices that are wildly off.
 */
export function estimateBondingCurveBuyLamports(
  args: EstimateBuyArgs,
): EstimateBuyResult {
  const { tokenAmount, pricePerTokenUsd, solUsd } = args;

  if (!pricePerTokenUsd || pricePerTokenUsd <= 0 || tokenAmount <= 0) {
    return { buyLamports: 0, feeLamports: 0, totalLamports: 0, error: 'price_unavailable' };
  }

  if (solUsd <= 0) {
    return { buyLamports: 0, feeLamports: 0, totalLamports: 0, error: 'price_unavailable' };
  }

  const buyUsd = tokenAmount * pricePerTokenUsd * 1.10;
  const buyLamports = Math.ceil((buyUsd / solUsd) * 1e9);
  const feeLamports = Math.ceil((buyLamports * PUMPFUN_BUY_PLATFORM_FEE_BPS) / 10_000);
  const totalLamports = buyLamports + feeLamports + VAULT_SOL_BUFFER_LAMPORTS;
  return { buyLamports, feeLamports, totalLamports };
}

export interface EnsureVaultArgs {
  songId: string;
  /** Used to derive a deterministic buyId — retries reuse the same buy. */
  purchaseId: string;
  packPriceUsdCents: number;
  tokenAmount: number;
  pricePerTokenUsd?: number;
  solUsd: number;
  /**
   * If provided, bypasses estimateBondingCurveBuyLamports entirely and uses
   * this lamport amount as the buy size (before adding the PumpFun fee and
   * vault buffer). Use this when the caller has already computed the exact
   * SOL budget from purchaseAmountUsd × share / solPriceUsd.
   */
  solAmtOverrideLamports?: number;
  /** Optional callback to persist reconciliation errors to the database.
   *  Called with the error reason before returning ok=false. Use this to
   *  write the failure reason to a packPurchases or similar record so the
   *  admin dashboard can surface the real cause. */
  onError?: (reason: string) => Promise<void>;
}

export interface EnsureVaultResult {
  ok: boolean;
  reason?: string;
  buyId?: string;
  buyLamports?: number;
  /** Number of tokens now in the vault after this buy (base units). */
  tokensReceived?: number;
}

/**
 * Ensure the project vault holds song tokens before a setSongsAirdrops call.
 *
 * Steps (all signed by the default backend client = PROJECT_VAULT_ADDRESS):
 *   1. setSongsPayouts({ recipient: VAULT, solAmt }) → ops wallet sends SOL
 *      to the project vault.
 *   2. setSongsBuys({ solAmt, slip }) → vault swaps that SOL for song
 *      tokens via @PumpFunPlugin.buyExactSolIn. Tokens land in the vault.
 *
 * Returns ok=false with a reason on failure so callers can surface
 * an accurate error and skip the airdrop.
 */
export async function ensureVaultHasSongTokens(args: EnsureVaultArgs): Promise<EnsureVaultResult> {
  const { songId, purchaseId, packPriceUsdCents, tokenAmount, pricePerTokenUsd, solUsd, solAmtOverrideLamports } = args;

  // Helper that persists an error reason before returning, so the admin
  // dashboard can surface the real failure cause.
  const fail = async (reason: string): Promise<EnsureVaultResult> => {
    try { await args.onError?.(reason); } catch { /* best effort */ }
    return { ok: false, reason };
  };

  let buyLamports: number;
  let feeLamports: number;
  let totalLamports: number;

  if (solAmtOverrideLamports !== undefined && solAmtOverrideLamports > 0) {
    // Caller computed the exact budget from purchaseAmountUsd × share / solPriceUsd.
    // Just add the PumpFun platform fee and vault buffer on top.
    buyLamports = solAmtOverrideLamports;
    feeLamports = Math.ceil((buyLamports * PUMPFUN_BUY_PLATFORM_FEE_BPS) / 10_000);
    totalLamports = buyLamports + feeLamports + VAULT_SOL_BUFFER_LAMPORTS;
  } else {
    const est = estimateBondingCurveBuyLamports({
      packPriceUsdCents,
      tokenAmount,
      pricePerTokenUsd,
      solUsd,
    });
    if ('error' in est) {
      return fail(`Bonding curve buy estimate failed: ${est.error} — price data unavailable.`);
    }
    buyLamports = est.buyLamports;
    feeLamports = est.feeLamports;
    totalLamports = est.totalLamports;
  }

  if (buyLamports <= 0) {
    return fail('Computed bonding curve buy amount is 0 lamports — check SOL/USD price feed.');
  }

  // Idempotent IDs derived from purchaseId — retries reuse the same buy.
  const buyId = `buy-${purchaseId}`.slice(0, 60);

  // ─── Pre-flight idempotency: check if the buy already exists ───────────────
  try {
    const existingBuy = await getSongsBuys(songId, buyId);
    if (existingBuy) {
      // Strengthened check: the buy record may exist in DB but the on-chain swap
      // never confirmed (timeout, slippage). Verify tokens actually landed in the
      // vault before returning ok=true — otherwise we strand the purchase forever.
      let vaultBalance = 0;
      try {
        vaultBalance = await runGetTokenBalanceQueryForSongs(songId, {
          walletAddress: PROJECT_VAULT_ADDRESS,
        });
      } catch {
        vaultBalance = 0;
      }
      // Short poll: 2 retries x 1s if balance is still 0 (RPC lag)
      for (let poll = 0; poll < 2 && vaultBalance <= 0; poll++) {
        await new Promise((r) => setTimeout(r, 1_000));
        try {
          vaultBalance = await runGetTokenBalanceQueryForSongs(songId, {
            walletAddress: PROJECT_VAULT_ADDRESS,
          });
        } catch {
          vaultBalance = 0;
        }
      }
      if (vaultBalance > 0) {
        return { ok: true, buyId, buyLamports: totalLamports, tokensReceived: vaultBalance };
      }
      // Stale buy record — tokens never landed. Clear it and fall through to
      // attempt a fresh buy so the retry loop is unstranded.
      try {
        await set(`songs/${songId}/buys/${buyId}`, null);
      } catch (clearErr) {
        // Best-effort deletion; if it fails the next attempt may still see the
        // stale record and repeat this clearing logic.
      }
    }
  } catch {
    // Non-blocking — proceed to attempt the buy
  }

  // OPERATIONS_WALLET === PROJECT_VAULT_ADDRESS (same key — 9LLTjsWh…BUCk).
  // There is no separate funding step: the vault IS the operations wallet and
  // already holds SOL. Execute the bonding-curve buy directly.
  //
  // Hook on songs/$songId/buys/$buyId is:
  //   @PumpFunPlugin.buyExactSolIn(@user.address, mint, solAmt, slip)
  //   && @TokenPlugin.transfer(@user.address, ADMIN, SOL, solAmt * 200 // 10000)
  // Signed by PROJECT_VAULT_ADDRESS, so @user.address = vault, vault pays
  // SOL & receives tokens.
  let buyOk = false;
  let lastBuyErr: string | null = null;
  for (let attempt = 0; attempt <= MAX_BONDING_CURVE_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = delayForAttempt(attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      buyOk = await setSongsBuys(songId, buyId, {
        solAmt: buyLamports,
        slip: PUMPFUN_BUY_SLIPPAGE_BPS,
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      lastBuyErr = errMsg;
      if (isRetryableError(err)) {
        continue;
      }
      return fail(`bonding curve buy threw (non-retryable): ${errMsg}`);
    }
    if (!buyOk) {
      // `false` return = denied by policy or onchain hook rejection.
      // On mainnet this can also mean the tx timed out without a confirmed
      // receipt — treat it as retryable for the first few attempts.
      if (attempt < MAX_BONDING_CURVE_RETRIES) {
        continue;
      }
      return fail(
        'bonding curve buy denied after all retries — likely vault has insufficient SOL ' +
        'after funding (race condition), token already graduated off bonding curve, or slippage exceeded.',
      );
    }
    // Success
    break;
  }

  // ─── Post-buy: capture mintAddress if missing + token amount ───────────────
  let tokensReceived: number | undefined;
  try {
    const song = await getSongs(songId);
    let storedMint: string | undefined = (song as any)?.mintAddress;
    if (!storedMint || storedMint.trim() === '') {
      const realMint = await runGetTokenMintAddressQueryForSongs(songId);
      if (realMint && realMint.length > 0) {
        await updateSongs(songId, { mintAddress: realMint } as any);
        storedMint = realMint;
      }
    }

    if (storedMint) {
      const rpcUrl = await getRpcUrlWithFallback();
      if (rpcUrl) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const resp = await fetch(rpcUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTokenAccountsByOwner',
                params: [
                  PROJECT_VAULT_ADDRESS,
                  { mint: storedMint },
                  { encoding: 'jsonParsed' },
                ],
              }),
              signal: AbortSignal.timeout(15_000),
            });
            const json: any = await resp.json();
            const accounts: any[] = json?.result?.value ?? [];
            if (accounts.length > 0) {
              const rawAmount = accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.amount;
              const uiAmount = accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
              tokensReceived = rawAmount != null ? Number(rawAmount) : (uiAmount != null ? Number(uiAmount) : 0);
            } else {
              tokensReceived = 0;
            }
            break;
          } catch {
            if (attempt === 0) {
              await new Promise((r) => setTimeout(r, 1_000));
            }
          }
        }
      }
    }
  } catch {
    // Non-blocking — best effort mint capture and token amount read
  }

  return { ok: true, buyId, buyLamports: totalLamports, tokensReceived };
}

// ─── Bonding curve sell helper ───────────────────────────────────────────────

export interface BondingCurveSellArgs {
  songId: string;
  mintAddress: string;
  tokenAmount: number; // in whole tokens (will be converted to base units)
  walletAddress: string;
  slippageBps?: number;
  execute?: boolean; // if false, returns quote only
}

export interface BondingCurveSellResult {
  ok: boolean;
  signature?: string;
  solReceived?: number;
  quoteOutLamports?: number;
  tokenAmountBaseUnits?: number;
  reason?: string;
}

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const DEFAULT_TOKEN_DECIMALS = 6;

/**
 * Fetch a Jupiter sell quote for song tokens and optionally execute the swap
 * via setSongsSwaps (vault-signed). When execute=false, returns the quote
 * so the frontend can execute with the user's wallet.
 */
export async function bondingCurveSell(
  _env: Record<string, string>,
  args: BondingCurveSellArgs,
): Promise<BondingCurveSellResult> {
  const {
    songId,
    mintAddress,
    tokenAmount,
    walletAddress,
    slippageBps = PUMPFUN_BUY_SLIPPAGE_BPS,
    execute = false,
  } = args;

  if (!mintAddress || mintAddress.length < 32) {
    return { ok: false, reason: 'Invalid mintAddress' };
  }
  if (tokenAmount <= 0) {
    return { ok: false, reason: 'tokenAmount must be > 0' };
  }

  const tokenAmountBaseUnits = Math.floor(tokenAmount * 10 ** DEFAULT_TOKEN_DECIMALS);

  // Fetch Jupiter swap quote: song token → SOL
  let quoteOutLamports = 0;
  try {
    quoteOutLamports = await runJupiterSwapQuoteQueryForCommonQueries(`sell-${songId}-${Date.now()}`, {
      inputMint: mintAddress,
      outputMint: SOL_MINT,
      amount: String(tokenAmountBaseUnits),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Jupiter quote failed: ${errMsg}` };
  }

  if (!execute) {
    return {
      ok: true,
      quoteOutLamports,
      tokenAmountBaseUnits,
    };
  }

  // Execute the sell via vault-signed swap
  const swapId = `sell-${songId}-${walletAddress.slice(0, 8)}-${Date.now()}`.slice(0, 60);
  try {
    const swapOk = await setSongsSwaps(songId, swapId, {
      mint: Address.publicKey(mintAddress),
      amt: tokenAmountBaseUnits,
    });
    if (!swapOk) {
      return { ok: false, reason: 'setSongsSwaps returned false (policy denied or slippage exceeded)' };
    }
    return {
      ok: true,
      signature: swapId,
      solReceived: quoteOutLamports,
      quoteOutLamports,
      tokenAmountBaseUnits,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `Swap execution failed: ${errMsg}` };
  }
}
