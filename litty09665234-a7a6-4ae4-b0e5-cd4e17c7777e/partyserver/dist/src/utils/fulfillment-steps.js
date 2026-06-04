/**
 * Idempotent fulfillment pipeline for pack purchases.
 *
 * Pipeline order (each step is independently retryable via idempotency flags):
 *
 *   Step 0: runStepCapturePrice — capture SOL/USD price (MUST run before any lamport math)
 *   Step 1: runStepAirdrop     — bonding curve buy → vault balance poll → fan token airdrop to buyer
 *                                 (airdropCompleted flag). GATE: if this fails, abort everything.
 *   Step 2: runStepTreasuryTransfer — outbound SOL from vault to TREASURY_WALLET (treasury %)
 *                                     (treasuryTransferCompleted flag)
 *   Step 3: runStepInfraFee    — vault-retained, recorded as accounted-for (infraFeeAccounted flag)
 *   Step 4: runStepFundingFee  — vault-retained, recorded as accounted-for (fundingFeeAccounted flag)
 *   Step 5: runStepPayout      — artist token buy + airdrop to artist wallet (stepPayout flag)
 *   Step 6: runStepNft         — NFT minting/transfer (stepNft flag)
 *   Step 7: runStepNotify      — buyer notification email (stepNotify flag)
 *
 * Once runStepAirdrop sets airdropCompleted=true, fee steps 2-4 proceed independently.
 * A failure in any fee step writes to failedFulfillments with the specific failureStage
 * so admin can retry just that step from the admin panel.
 *
 * stepTokens (legacy flag) is set true as soon as the airdrop (step 1a) succeeds.
 * Fee step failures (treasury, infra, funding) are independent back-office concerns
 * and no longer block payout/NFT/notify from reaching the buyer.
 *
 * Both the Shopify webhook AND the resume admin route call these same helpers so
 * there is no logic duplication.
 */
import { getSongs, setSongsAirdrops, runGetTokenBalanceQueryForSongs } from '../collections/songs.js';
import { runTokenPriceUsdQueryForSongDetails } from '../collections/songDetails.js';
import { getPackPurchases, updatePackPurchases, setPackPurchasesPayouts, setPackPurchasesInfraFees, setPackPurchasesTreasuryFees, } from '../collections/packPurchases.js';
import { setWebhookFailures } from '../collections/webhookFailures.js';
import { setFailedFulfillments } from '../collections/failedFulfillments.js';
import { Time, Address } from '../db-client.js';
import { ensureVaultHasSongTokens } from './bonding-curve-buy.js';
import { PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, TREASURY_WALLET as TREASURY_WALLET_CONST } from '../constants.js';
import { captureSolPriceUsd, scaleToMicroUsd, unscaleFromMicroUsd, } from './price-capture.js';
import { getRpcUrlWithFallback } from './rpc-client.js';
// ─── Wallet constants ─────────────────────────────────────────────────────────
// INFRA_WALLET is the recipient recorded in the infra fee audit sub-document
// (packPurchases/infraFees). The infra share is vault-retained — no separate
// outbound SOL transfer — so the recipient IS the operations/vault wallet
// (same address as PROJECT_VAULT_ADDRESS). This creates a self-sustaining
// float: fees collected replenish the gas costs the ops wallet spends.
// Do NOT route infra fees to ADMIN_ADDRESS — that wallet is for admin access
// control only, not for receiving purchase fees.
export const INFRA_WALLET = OPERATIONS_WALLET;
export const TREASURY_WALLET = TREASURY_WALLET_CONST;
// ─── Canonical tokenomics constants (2026-05-18 canonical split) ─────────────
//
// Two distinct splits, one per payment path. The sum of the four buckets must
// equal exactly 1.0. These percentages are applied to purchaseAmountUsd.
//
// Shopify (Apple Pay):
//   90.0% → fan token airdrop (bonding curve buy → buyer wallet)
//   5.0%  → artist tokens (bonding curve buy → artist wallet, handled in runStepPayout)
//   2.0%  → treasury wallet (outbound SOL transfer to TREASURY_WALLET)
//   3.0%  → infra fee (vault-retained, accounted-for via infraFeeAccounted flag)
//           NOTE: The infra and funding buckets stay in the vault; only the treasury
//           transfer is an outbound on-chain transaction.
//
// Direct SOL (Phantom / DEX):
//   92.0% → fan token airdrop (bonding curve buy → buyer wallet)
//   5.0%  → artist tokens (bonding curve buy → artist wallet, handled in runStepPayout)
//   1.5%  → treasury wallet (outbound SOL transfer to TREASURY_WALLET)
//   1.5%  → infra fee (vault-retained, accounted-for via infraFeeAccounted flag)
//
// Artist token share (5%) is kept as a separate constant used by runStepPayout.
// It is NOT included in the per-path shares below to avoid double-counting.
//
// Funding bucket: the residual after airdrop + artist + treasury + infra.
// Shopify: 90 + 5 + 2 + 3 = 100 ✓
// Direct:  92 + 5 + 1.5 + 1.5 = 100 ✓
export const SHOPIFY_SHARES = { airdrop: 0.90, treasury: 0.02, infra: 0.03, funding: 0.00 };
export const DIRECT_SOL_SHARES = { airdrop: 0.92, treasury: 0.015, infra: 0.015, funding: 0.00 };
// Startup assertion — fails loudly if either split drifts from 1.0
// (artist share 0.05 is accounted separately in ARTIST_TOKEN_SHARE)
const ARTIST_SHARE = 0.05;
const _shopifySum = SHOPIFY_SHARES.airdrop + SHOPIFY_SHARES.treasury + SHOPIFY_SHARES.infra + SHOPIFY_SHARES.funding + ARTIST_SHARE;
const _directSolSum = DIRECT_SOL_SHARES.airdrop + DIRECT_SOL_SHARES.treasury + DIRECT_SOL_SHARES.infra + DIRECT_SOL_SHARES.funding + ARTIST_SHARE;
if (Math.abs(_shopifySum - 1.0) > 1e-9)
    throw new Error(`FATAL: SHOPIFY_SHARES sum is ${_shopifySum}, must be 1.0`);
if (Math.abs(_directSolSum - 1.0) > 1e-9)
    throw new Error(`FATAL: DIRECT_SOL_SHARES sum is ${_directSolSum}, must be 1.0`);
// Convenience alias for runStepPayout
export const ARTIST_TOKEN_SHARE = ARTIST_SHARE; // 5% — same across both paths
// ─── Helper: vault token balance — direct RPC when mintAddress known ──────────
//
// The policy query runGetTokenBalanceQueryForSongs derives the mint from
// @data.name and @data.symbol. If those fields ever drift from the metadata
// used when the real PumpFun mint was created, the balance poll silently checks
// the WRONG ATA and always returns 0. That was the root cause of the $NOTHIN
// vault drain (6 swap attempts, each returning 0 balance because the derived
// mint ≠ wCh1zmorewNhT5oWSccy5HTSvD92VtzpoQqgTQ1FkN6).
//
// This helper checks songs.mintAddress first. If set, it reads the vault's
// Associated Token Account (ATA) for that exact mint via a direct JSON-RPC
// call, bypassing the policy derivation entirely. Falls back to the policy
// query when mintAddress is absent (backwards-compat for songs not yet audited).
async function getVaultTokenBalance(songIdStr) {
    // Fetch the song record to see if mintAddress is stored
    const song = await getSongs(songIdStr);
    const storedMint = song?.mintAddress;
    if (storedMint && storedMint.length > 0) {
        // Direct RPC: getTokenAccountsByOwner for vault ATA
        const rpcUrl = await getRpcUrlWithFallback();
        if (rpcUrl) {
            try {
                const fetchWithRetry = async () => {
                    let lastErr;
                    for (let attempt = 1; attempt <= 2; attempt++) {
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
                                signal: AbortSignal.timeout(15000),
                            });
                            return resp;
                        }
                        catch (err) {
                            lastErr = err instanceof Error ? err : new Error(String(err));
                            if (attempt === 1) {
                                await new Promise(r => setTimeout(r, 1000));
                            }
                        }
                    }
                    throw new Error(`[getVaultTokenBalance] RPC failed after 2 attempts for song ${songIdStr} mint=${storedMint.slice(0, 8)}...: ${lastErr?.message}`);
                };
                const resp = await fetchWithRetry();
                const json = await resp.json();
                const accounts = json?.result?.value ?? [];
                if (accounts.length > 0) {
                    const uiAmount = accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmount;
                    // uiAmount can be null if 0; treat null as 0
                    const rawAmount = accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.amount;
                    const balance = rawAmount != null ? Number(rawAmount) : (uiAmount != null ? Number(uiAmount) : 0);
                    return balance;
                }
                // No ATA found for this mint — vault holds 0 tokens for it
                return 0;
            }
            catch (_rpcErr) {
                // Fall through to policy query
            }
        }
    }
    // Fallback: use policy query (derives mint from @data.name, @data.symbol)
    return runGetTokenBalanceQueryForSongs(songIdStr, { walletAddress: PROJECT_VAULT_ADDRESS });
}
// ─── Helper: write a failedFulfillments record ────────────────────────────────
async function writeFailedFulfillment(params) {
    const { purchaseId, failureStage, errorMessage, songIdVal = '', buyerAddr = '', purchaseSource = 'unknown', packIdVal = '', usdAmt = 0, solPriceAtPurchaseUsd, } = params;
    try {
        const fulfillmentId = `fail-${purchaseId}-${failureStage}-${Math.random().toString(36).slice(2, 10)}`;
        const solAmt = solPriceAtPurchaseUsd
            ? Math.floor(usdAmt / (solPriceAtPurchaseUsd / 1000000) * 1000000000)
            : undefined;
        const wrote = await setFailedFulfillments(fulfillmentId, {
            purchaseId,
            purchaseSource,
            buyerAddress: Address.publicKey(buyerAddr || PROJECT_VAULT_ADDRESS),
            songId: songIdVal,
            packId: packIdVal,
            usdAmount: Math.round(usdAmt * 100), // store as cents
            ...(solAmt !== undefined ? { solAmount: solAmt } : {}),
            failureStage,
            failureReason: errorMessage,
            retryCount: 0,
            createdAt: Time.Now,
        });
        if (!wrote) {
            // setFailedFulfillments denied — check policy allows PROJECT_VAULT_ADDRESS
        }
    }
    catch (_ffErr) {
        // Best-effort failure tracking — do not throw
    }
}
// ─── Failure logger ───────────────────────────────────────────────────────────
async function logFailure(params) {
    const { purchaseId, step, errorMessage, songId } = params;
    try {
        await setWebhookFailures(`fail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, {
            webhookSource: 'fulfillment-step',
            path: `/fulfillment/${step}`,
            failureReason: `step-${step}-failed`,
            errorMessage,
            headers: JSON.stringify({ purchaseId, step, songId }),
            bodyPreview: `step ${step} failed for ${purchaseId}`,
            timestamp: Math.floor(Date.now() / 1000),
            alertSent: false,
        });
    }
    catch (_writeErr) {
        // Best-effort failure logging — do not throw
    }
}
// ─── Build NFT metadata ───────────────────────────────────────────────────────
function buildNftMetadata(params) {
    const { songName, packName, songSymbol, edition, totalEditions, artist, genre, duration, coverImage, audioUrl, songId } = params;
    const hasAudio = !!audioUrl && audioUrl.length > 0;
    const metadata = {
        name: `${songName} #${edition} of ${totalEditions}`,
        image: coverImage || '',
        description: `Pack purchase: ${packName} for "${songName}"`,
        properties: {
            category: hasAudio ? 'audio' : 'image',
            files: [{ uri: coverImage || '', type: 'image/png' }],
            creators: [{ address: artist, share: 100 }],
        },
        sellerFeeBasisPoints: 200,
        attributes: [
            { trait_type: 'Artist', value: artist },
            { trait_type: 'Genre', value: genre || 'Unknown' },
            { trait_type: 'Edition', value: `${edition} of ${totalEditions}` },
            { trait_type: 'Duration', value: duration || 'N/A' },
            { trait_type: 'Platform', value: 'Lit Studio' },
            { trait_type: 'Pack', value: packName },
            { trait_type: 'Song', value: songName },
        ],
    };
    if (hasAudio) {
        metadata.animation_url = `${audioUrl}?ext=mp3`;
        metadata.properties.files.push({ uri: `${audioUrl}?ext=mp3`, type: 'audio/mpeg' });
    }
    return metadata;
}
// ─── Send claim email ─────────────────────────────────────────────────────────
async function sendClaimEmail(params) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        return;
    }
    const { toEmail, songName, packName, nftCount, tokenAmount, walletAddress, purchaseId } = params;
    const shortWallet = walletAddress.length > 10 ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : walletAddress;
    const claimUrl = `${process.env.FRONTEND_URL ?? 'https://litstudio.online'}/claim/${purchaseId}?email=${encodeURIComponent(toEmail)}`;
    const html = `<!DOCTYPE html><html><body style="background:#0a0a0f;font-family:sans-serif;margin:0;padding:40px 20px;">
    <div style="max-width:560px;margin:0 auto;background:#141414;border-radius:16px;border:1px solid rgba(139,92,246,0.2);padding:32px;">
      <h1 style="color:#fff;font-size:22px;margin-bottom:12px;">Your ${packName} is Ready!</h1>
      <p style="color:rgba(220,214,240,0.7);font-size:14px;margin-bottom:20px;">Your Lit Studios purchase has been processed.</p>
      <table style="width:100%;margin-bottom:24px;">
        <tr><td style="color:rgba(220,214,240,0.5);font-size:13px;padding:4px 0;">Song</td><td style="color:#fff;font-size:13px;text-align:right;">${songName}</td></tr>
        <tr><td style="color:rgba(220,214,240,0.5);font-size:13px;padding:4px 0;">Pack</td><td style="color:#fff;font-size:13px;text-align:right;">${packName}</td></tr>
        <tr><td style="color:rgba(220,214,240,0.5);font-size:13px;padding:4px 0;">NFTs</td><td style="color:#fff;font-size:13px;text-align:right;">${nftCount}</td></tr>
        <tr><td style="color:rgba(220,214,240,0.5);font-size:13px;padding:4px 0;">Tokens</td><td style="color:#00D4FF;font-size:13px;text-align:right;font-weight:700;">~${tokenAmount.toLocaleString()}</td></tr>
        <tr><td style="color:rgba(220,214,240,0.5);font-size:13px;padding:4px 0;">Wallet</td><td style="color:#fff;font-size:13px;text-align:right;font-family:monospace;">${shortWallet}</td></tr>
      </table>
      <div style="text-align:center;margin-bottom:20px;">
        <a href="${claimUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6d28d9,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;">Claim Your Assets</a>
      </div>
      <p style="color:rgba(220,214,240,0.3);font-size:12px;text-align:center;">Purchase ID: ${purchaseId}</p>
    </div>
  </body></html>`;
    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: 'alerts@litstudio.online', to: [toEmail], subject: `Your ${packName} is ready!`, html }),
        });
        if (!res.ok) {
            // Resend error — non-fatal
        }
    }
    catch (_err) {
        // Email send failure — non-fatal
    }
}
// ─── STEP 0: Capture SOL/USD price ───────────────────────────────────────────
/**
 * Step 0 — Capture the SOL/USD price at the exact moment of purchase
 * confirmation and persist it on the packPurchase record BEFORE any lamport
 * calculation runs.
 *
 * Attempts a single price fetch (CMC first, then Jupiter fallback — both
 * providers are tried inside captureSolPriceUsd). If both fail the purchase is
 * marked `pending_price_fetch` and the function returns null — the caller must
 * NOT proceed with the pipeline. The heartbeat reconciler (`reconcile-stuck-
 * purchases`) will pick up `pending_price_fetch` records and retry on its own
 * schedule. A Worker request timeout (in-request sleep loops) is intentionally
 * avoided here.
 *
 * Returns the captured micro-USD price on success, or null on failure.
 */
export async function runStepCapturePrice(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return null;
    }
    // Idempotency: if already captured, return the stored value immediately
    if (typeof purchase.solPriceAtPurchaseUsd === 'number' && purchase.solPriceAtPurchaseUsd > 0) {
        return purchase.solPriceAtPurchaseUsd;
    }
    const cmcKey = process.env.COINMARKETCAP_API_KEY;
    const captured = await captureSolPriceUsd(cmcKey);
    if (captured === null) {
        await updatePackPurchases(purchaseId, { status: 'pending_price_fetch' });
        await logFailure({
            purchaseId,
            step: 'stepCapturePrice',
            errorMessage: 'Price fetch failed: CMC + Jupiter both returned null. Will retry via heartbeat reconciler.',
        });
        return null;
    }
    const microUsd = scaleToMicroUsd(captured.priceUsd);
    const written = await updatePackPurchases(purchaseId, {
        solPriceAtPurchaseUsd: microUsd,
        solPriceTimestamp: captured.timestampMs,
    });
    if (!written) {
        return null;
    }
    return microUsd;
}
async function buildFulfillmentContext(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return null;
    }
    const { songId, buyerAddress, walletSource } = purchase;
    const songIdStr = songId;
    const isDirectSol = walletSource === 'direct_sol';
    if (!songIdStr || !buyerAddress) {
        return null;
    }
    const solPriceAtPurchaseUsd = purchase.solPriceAtPurchaseUsd;
    if (!solPriceAtPurchaseUsd || solPriceAtPurchaseUsd <= 0) {
        return null;
    }
    const solPriceUsd = unscaleFromMicroUsd(solPriceAtPurchaseUsd);
    const rawPurchaseAmountUsd = purchase.purchaseAmountUsd;
    if (rawPurchaseAmountUsd == null || rawPurchaseAmountUsd <= 0) {
        const errMsg = `purchaseAmountUsd missing or zero on purchase ${purchaseId} — cannot build fulfillment context. Field must be set at purchase creation time.`;
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'build-context',
            errorMessage: errMsg,
            songIdVal: songIdStr,
            buyerAddr: buyerAddress,
        });
        return null;
    }
    const purchaseAmountUsd = rawPurchaseAmountUsd;
    const shares = isDirectSol ? DIRECT_SOL_SHARES : SHOPIFY_SHARES;
    const lamports = (pct) => Math.floor((purchaseAmountUsd * pct) / solPriceUsd * 1000000000);
    return {
        purchaseId,
        songIdStr,
        buyerAddress: buyerAddress,
        purchaseSource: isDirectSol ? 'direct-sol' : 'shopify',
        packIdVal: purchase.packId ?? '',
        isDirectSol,
        shares,
        purchaseAmountUsd,
        solPriceUsd,
        airdropLamports: lamports(shares.airdrop),
        treasuryLamports: lamports(shares.treasury),
        infraLamports: lamports(shares.infra),
        fundingLamports: lamports(shares.funding ?? 0),
        artistTokenBudgetLamports: lamports(ARTIST_TOKEN_SHARE),
    };
}
// ─── STEP AIRDROP ─────────────────────────────────────────────────────────────
/**
 * Step 1a — Buy fan tokens on the bonding curve (using airdrop budget) then
 * airdrop them to the buyer's wallet. This is the GATE: if it fails, all
 * downstream steps are aborted and a failedFulfillments record is written.
 *
 * Idempotency: checked via `airdropCompleted` flag on the purchase record.
 * On success, sets airdropCompleted=true + splTxHash + bondingCurveBuyId + tokenAmount.
 */
export async function runStepAirdrop(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    // Idempotency
    if (purchase.airdropCompleted === true) {
        return true;
    }
    // Non-retriable swap-failure guard: if a previous swap attempt permanently
    // failed, never retry — admin must investigate and clear swapFailedAt manually.
    if (purchase.swapFailedAt) {
        const errMsg = `Swap previously failed at ${purchase.swapFailedAt} for ${purchaseId} — non-retriable. Admin must clear swapFailedAt before retry.`;
        await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: errMsg });
        return false;
    }
    // ── Pre-swap invariant: mintAddress must be set on the song record ─────────
    // If mintAddress is absent, the vault balance poll will use the policy query
    // which derives mint from @data.name/@data.symbol. Any drift between those
    // fields and the real on-chain metadata produces a silent wrong-ATA read that
    // always returns 0 — causing the reconciler to retry the swap indefinitely
    // (the $NOTHIN vault drain pattern). Abort here rather than drain SOL silently.
    {
        const { songId: airdropSongId } = purchase;
        if (airdropSongId) {
            const songForCheck = await getSongs(airdropSongId);
            const storedMintCheck = songForCheck?.mintAddress;
            if (!storedMintCheck || storedMintCheck.trim() === '') {
                const errMsg = `MINT_ADDRESS_NOT_VERIFIED: song ${airdropSongId} has no mintAddress stored — ` +
                    `balance poll would use policy-derived mint (name/symbol) which may not match the real PumpFun mint. ` +
                    `Run the mintAddress audit (POST /api/admin/songs/${airdropSongId}/capture-mint) before retrying. Aborting swap to prevent vault drain.`;
                await updatePackPurchases(purchaseId, { status: 'partial_failure' });
                await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: errMsg, songId: airdropSongId });
                await writeFailedFulfillment({
                    purchaseId,
                    failureStage: 'airdrop',
                    errorMessage: errMsg,
                    songIdVal: airdropSongId,
                });
                return false;
            }
        }
    }
    // Post-swap idempotency guard: if the bonding curve buy was already submitted
    // (flag written immediately after ensureVaultHasSongTokens returns ok), skip the
    // swap entirely and go straight to balance verification. This prevents re-firing
    // the swap on retries when the buy landed on-chain but the worker died before
    // writing airdropCompleted. Without this guard, each retry drains additional SOL.
    if (purchase.bondingCurveBuySubmitted === true) {
        const existingBuyId = purchase.bondingCurveBuyId;
        const ctx2 = await buildFulfillmentContext(purchaseId);
        if (!ctx2) {
            const errMsg = 'Failed to build fulfillment context on bondingCurveBuySubmitted resume';
            await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: errMsg });
            return false;
        }
        const { songIdStr: songIdStr2, buyerAddress: buyerAddress2, packIdVal: packIdVal2 } = ctx2;
        const solPriceAtPurchaseUsd2 = purchase.solPriceAtPurchaseUsd;
        // If tokenAmount was stored at buy time (new records), skip the vault balance
        // poll entirely — use the stored value directly. This prevents the wrong-mint
        // balance-read loop that drained the vault during the $NOTHIN incident.
        const storedTokenAmount = purchase.tokenAmount ?? 0;
        let actualFanTokens2;
        if (storedTokenAmount > 0) {
            actualFanTokens2 = storedTokenAmount;
        }
        else {
            // Fallback for older records created before the tokenAmount capture fix.
            const RETRIES2 = 12;
            const DELAY2_MS = 2000;
            let vaultBalance2 = 0;
            for (let attempt = 1; attempt <= RETRIES2; attempt++) {
                await new Promise(r => setTimeout(r, DELAY2_MS));
                try {
                    // Use getVaultTokenBalance: reads via stored mintAddress (direct RPC) when
                    // available, falls back to policy query. Prevents wrong-ATA reads if metadata drifted.
                    vaultBalance2 = await getVaultTokenBalance(songIdStr2);
                }
                catch (e) {
                    vaultBalance2 = 0;
                }
                if (vaultBalance2 > 0)
                    break;
            }
            if (vaultBalance2 <= 0) {
                // Swap was submitted but tokens still 0 — do NOT re-swap, mark needs_review
                const errMsg2 = `bondingCurveBuySubmitted=true but vault balance still 0 after polling for ${purchaseId}. Manual investigation required — do NOT re-run.`;
                await updatePackPurchases(purchaseId, { status: 'needs_review', needsReviewReason: errMsg2 });
                await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: errMsg2, songId: songIdStr2 });
                return false;
            }
            // Cap to the per-purchase token amount — vaultBalance is the TOTAL vault
            // balance and may include leftovers from a prior failed airdrop or concurrent
            // purchases sharing the same vault (OPERATIONS_WALLET === PROJECT_VAULT_ADDRESS).
            const expectedFanTokens2 = purchase.tokenAmount ?? 0;
            actualFanTokens2 = expectedFanTokens2 > 0 ? Math.min(vaultBalance2, expectedFanTokens2) : vaultBalance2;
        }
        // Best-effort concurrency guard: re-read before airdrop to catch another
        // worker that may have already completed the airdrop. This narrows the race
        // window from seconds to milliseconds — not a true distributed lock, but
        // sufficient to prevent most double-airdrops from concurrent heartbeat +
        // admin retry invocations.
        const purchaseBeforeAirdrop2 = await getPackPurchases(purchaseId);
        if (purchaseBeforeAirdrop2?.airdropCompleted === true) {
            return true;
        }
        let splTxHash2 = '';
        let airdropOk2 = false;
        try {
            const airdropId2 = crypto.randomUUID().replace(/-/g, '');
            airdropOk2 = await setSongsAirdrops(songIdStr2, airdropId2, {
                recipient: Address.publicKey(buyerAddress2),
                amount: actualFanTokens2,
            });
            splTxHash2 = airdropId2;
            if (!airdropOk2) {
                await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: 'setSongsAirdrops returned false (resume path)', songId: songIdStr2 });
            }
        }
        catch (err) {
            await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: `Token airdrop threw (resume path): ${err instanceof Error ? err.message : String(err)}`, songId: songIdStr2 });
        }
        if (!airdropOk2) {
            await updatePackPurchases(purchaseId, { status: 'partial_failure', splTxHash: splTxHash2 });
            await writeFailedFulfillment({
                purchaseId,
                failureStage: 'airdrop',
                errorMessage: 'setSongsAirdrops returned false on bondingCurveBuySubmitted resume path',
                songIdVal: songIdStr2,
                buyerAddr: buyerAddress2,
                purchaseSource: ctx2.purchaseSource,
                packIdVal: packIdVal2,
                usdAmt: ctx2.purchaseAmountUsd,
                solPriceAtPurchaseUsd: solPriceAtPurchaseUsd2,
            });
            return false;
        }
        await updatePackPurchases(purchaseId, {
            airdropCompleted: true,
            splTxHash: splTxHash2,
            bondingCurveBuyId: existingBuyId ?? '',
            tokenAmount: actualFanTokens2,
        });
        return true;
    }
    const ctx = await buildFulfillmentContext(purchaseId);
    if (!ctx) {
        const errMsg = 'Failed to build fulfillment context — missing songId, buyerAddress, or solPrice';
        await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: errMsg });
        await writeFailedFulfillment({ purchaseId, failureStage: 'airdrop', errorMessage: errMsg });
        return false;
    }
    const { songIdStr, buyerAddress, packIdVal } = ctx;
    const solPriceAtPurchaseUsd = purchase.solPriceAtPurchaseUsd;
    // 1a: Seed vault with song tokens via bonding curve using the airdrop budget
    let seedOk = false;
    let bondingCurveBuyId = '';
    let capturedTokenAmount = 0;
    try {
        const seedResult = await ensureVaultHasSongTokens({
            songId: songIdStr,
            purchaseId,
            packPriceUsdCents: 0,
            tokenAmount: 0,
            pricePerTokenUsd: undefined,
            solUsd: ctx.solPriceUsd,
            solAmtOverrideLamports: ctx.airdropLamports,
            onError: async (_reason) => {
                // Failure is logged via logFailure below.
            },
        });
        seedOk = seedResult.ok;
        if (seedResult.ok && seedResult.buyId) {
            bondingCurveBuyId = seedResult.buyId;
            capturedTokenAmount = seedResult.tokensReceived ?? 0;
        }
        if (!seedResult.ok) {
            await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: `Bonding curve seed failed: ${seedResult.reason}`, songId: songIdStr });
        }
    }
    catch (err) {
        await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: `Bonding curve seed threw: ${err instanceof Error ? err.message : String(err)}`, songId: songIdStr });
    }
    // IMMEDIATELY after the swap returns ok — before the balance poll starts —
    // persist the idempotency flag AND the captured token amount so any retry
    // skips both the swap and the vault balance poll. This prevents duplicate
    // swaps (vault drain) if the worker dies between the swap landing on-chain
    // and airdropCompleted being written.
    if (seedOk && bondingCurveBuyId) {
        const tokenAmountToWrite = capturedTokenAmount > 0 ? capturedTokenAmount : (purchase.tokenAmount ?? 0);
        try {
            await updatePackPurchases(purchaseId, {
                bondingCurveBuySubmitted: true,
                bondingCurveBuyId,
                ...(tokenAmountToWrite > 0 ? { tokenAmount: tokenAmountToWrite } : {}),
            });
        }
        catch (flagErr) {
            // Non-fatal write — swap already happened. If the worker dies here the next retry
            // will re-enter the seedOk branch without the flag and re-swap.
            // Acceptable: the flag is a best-effort guard, not a hard guarantee.
        }
    }
    if (!seedOk) {
        await updatePackPurchases(purchaseId, { status: 'partial_failure', swapFailedAt: Time.Now });
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'airdrop',
            errorMessage: 'Bonding curve seed failed — vault not funded with song tokens. Check webhookFailures for details.',
            songIdVal: songIdStr,
            buyerAddr: buyerAddress,
            purchaseSource: ctx.purchaseSource,
            packIdVal,
            usdAmt: ctx.purchaseAmountUsd,
            solPriceAtPurchaseUsd,
        });
        return false;
    }
    // 1b: Determine fan token amount — use captured value if available, else poll.
    // For new buys where ensureVaultHasSongTokens captured tokensReceived, skip the
    // vault balance poll entirely. This prevents the wrong-mint balance-read loop
    // that drained the vault during the $NOTHIN incident.
    let actualFanTokens;
    if (capturedTokenAmount > 0) {
        actualFanTokens = capturedTokenAmount;
    }
    else {
        // Fallback vault balance poll for older records or failed captures.
        const VAULT_BALANCE_CHECK_RETRIES = 12;
        const VAULT_BALANCE_CHECK_DELAY_MS = 2000;
        let vaultBalance = 0;
        for (let attempt = 1; attempt <= VAULT_BALANCE_CHECK_RETRIES; attempt++) {
            await new Promise(r => setTimeout(r, VAULT_BALANCE_CHECK_DELAY_MS));
            try {
                vaultBalance = await getVaultTokenBalance(songIdStr);
            }
            catch (balanceErr) {
                vaultBalance = 0;
            }
            if (vaultBalance > 0) {
                break;
            }
        }
        if (vaultBalance <= 0) {
            const errMsg = `Vault token balance is 0 after ${VAULT_BALANCE_CHECK_RETRIES} polls (${VAULT_BALANCE_CHECK_RETRIES * VAULT_BALANCE_CHECK_DELAY_MS / 1000}s) for purchaseId=${purchaseId}. Check swap tx on Solscan.`;
            await updatePackPurchases(purchaseId, { status: 'partial_failure' });
            await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: errMsg, songId: songIdStr });
            await writeFailedFulfillment({
                purchaseId,
                failureStage: 'airdrop',
                errorMessage: errMsg,
                songIdVal: songIdStr,
                buyerAddr: buyerAddress,
                purchaseSource: ctx.purchaseSource,
                packIdVal,
                usdAmt: ctx.purchaseAmountUsd,
                solPriceAtPurchaseUsd,
            });
            return false;
        }
        // Cap to the per-purchase token amount — vaultBalance is the TOTAL vault
        // balance and may include leftovers from a prior failed airdrop or concurrent
        // purchases sharing the same vault (OPERATIONS_WALLET === PROJECT_VAULT_ADDRESS).
        const expectedFanTokens = purchase.tokenAmount ?? 0;
        actualFanTokens = expectedFanTokens > 0 ? Math.min(vaultBalance, expectedFanTokens) : vaultBalance;
    }
    // Best-effort concurrency guard: re-read before airdrop to catch another
    // worker that may have already completed the airdrop. This narrows the race
    // window from seconds to milliseconds — not a true distributed lock, but
    // sufficient to prevent most double-airdrops from concurrent heartbeat +
    // admin retry invocations.
    const purchaseBeforeAirdrop = await getPackPurchases(purchaseId);
    if (purchaseBeforeAirdrop?.airdropCompleted === true) {
        return true;
    }
    // 1c: Airdrop fan tokens to buyer
    let splTxHash = '';
    let airdropOk = false;
    try {
        const airdropId = crypto.randomUUID().replace(/-/g, '');
        airdropOk = await setSongsAirdrops(songIdStr, airdropId, {
            recipient: Address.publicKey(buyerAddress),
            amount: actualFanTokens,
        });
        splTxHash = airdropId;
        if (!airdropOk) {
            await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: 'setSongsAirdrops returned false', songId: songIdStr });
        }
    }
    catch (err) {
        await logFailure({ purchaseId, step: 'stepAirdrop', errorMessage: `Token airdrop threw: ${err instanceof Error ? err.message : String(err)}`, songId: songIdStr });
    }
    if (!airdropOk) {
        await updatePackPurchases(purchaseId, { status: 'partial_failure', splTxHash });
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'airdrop',
            errorMessage: 'setSongsAirdrops returned false — token delivery to buyer failed. Check webhookFailures for details.',
            songIdVal: songIdStr,
            buyerAddr: buyerAddress,
            purchaseSource: ctx.purchaseSource,
            packIdVal,
            usdAmt: ctx.purchaseAmountUsd,
            solPriceAtPurchaseUsd,
        });
        return false;
    }
    // Airdrop confirmed — mark idempotency flag
    await updatePackPurchases(purchaseId, {
        airdropCompleted: true,
        splTxHash,
        bondingCurveBuyId,
        tokenAmount: actualFanTokens,
    });
    return true;
}
// ─── STEP TREASURY TRANSFER ───────────────────────────────────────────────────
/**
 * Step 1b — Send treasury share (2% Shopify / 1.5% Direct SOL) as an outbound
 * SOL transfer from PROJECT_VAULT to TREASURY_WALLET.
 *
 * This step is INDEPENDENT of other fee steps: if it fails, it writes a
 * failedFulfillments record with failureStage='treasury-transfer' and returns false.
 * The airdrop is NOT rolled back (it already succeeded before this step runs).
 *
 * Idempotency: checked via `treasuryTransferCompleted` flag on the purchase record.
 */
export async function runStepTreasuryTransfer(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    // Idempotency
    if (purchase.treasuryTransferCompleted === true) {
        return true;
    }
    const ctx = await buildFulfillmentContext(purchaseId);
    if (!ctx) {
        const errMsg = 'Failed to build fulfillment context — missing solPrice or purchaseAmount';
        await logFailure({ purchaseId, step: 'stepTreasuryTransfer', errorMessage: errMsg });
        await writeFailedFulfillment({ purchaseId, failureStage: 'treasury-transfer', errorMessage: errMsg });
        return false;
    }
    let treasuryTxHash = '';
    let treasuryOk = false;
    try {
        const treasuryId = crypto.randomUUID().replace(/-/g, '');
        treasuryOk = await setPackPurchasesTreasuryFees(purchaseId, treasuryId, {
            recipient: Address.publicKey(TREASURY_WALLET),
            solAmt: ctx.treasuryLamports,
        });
        treasuryTxHash = treasuryId;
        if (!treasuryOk) {
            await logFailure({
                purchaseId,
                step: 'stepTreasuryTransfer',
                errorMessage: `Treasury transfer (${ctx.treasuryLamports} lamports → ${TREASURY_WALLET}) returned false`,
            });
        }
    }
    catch (err) {
        await logFailure({
            purchaseId,
            step: 'stepTreasuryTransfer',
            errorMessage: `Treasury transfer threw: ${err instanceof Error ? err.message : String(err)}`,
        });
    }
    if (!treasuryOk) {
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'treasury-transfer',
            errorMessage: `Treasury transfer failed: ${ctx.treasuryLamports} lamports to ${TREASURY_WALLET} returned false or threw. Airdrop already delivered — do NOT retry airdrop. Check webhookFailures.`,
            songIdVal: ctx.songIdStr,
            buyerAddr: ctx.buyerAddress,
            purchaseSource: ctx.purchaseSource,
            packIdVal: ctx.packIdVal,
            usdAmt: ctx.purchaseAmountUsd,
            solPriceAtPurchaseUsd: purchase.solPriceAtPurchaseUsd,
        });
        return false;
    }
    // Mark idempotency flag + store tx hash
    await updatePackPurchases(purchaseId, {
        treasuryTransferCompleted: true,
        treasuryTxHash,
    });
    return true;
}
// ─── STEP INFRA FEE ───────────────────────────────────────────────────────────
/**
 * Step 1c — Account for the infra fee (3% Shopify / 1.5% Direct SOL).
 * The infra share stays in the vault; this step records it as accounted-for
 * via the `infraFeeAccounted` idempotency flag. No outbound on-chain transaction.
 *
 * We still write a packPurchases/infraFees sub-document for audit trail consistency
 * with the old flow, using the INFRA_WALLET as the notional recipient (no actual
 * on-chain transfer is triggered since the hook policy requires the backend signer
 * to supply a valid solAmt — if infra is vault-retained, pass solAmt=0 to record
 * the entry without triggering a SOL send, or skip the sub-document write and
 * rely on the flag alone).
 *
 * Idempotency: checked via `infraFeeAccounted` flag on the purchase record.
 */
export async function runStepInfraFee(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    // Idempotency
    if (purchase.infraFeeAccounted === true) {
        return true;
    }
    const ctx = await buildFulfillmentContext(purchaseId);
    if (!ctx) {
        const errMsg = 'Failed to build fulfillment context — missing solPrice or purchaseAmount';
        await logFailure({ purchaseId, step: 'stepInfraFee', errorMessage: errMsg });
        await writeFailedFulfillment({ purchaseId, failureStage: 'infra-fee', errorMessage: errMsg });
        return false;
    }
    // Record infra fee accounting — vault-retained, no on-chain transfer
    try {
        const infraId = crypto.randomUUID().replace(/-/g, '');
        // Write the infra fee sub-document as an audit record.
        // infraLamports is the notional amount held in vault for infrastructure.
        const recorded = await setPackPurchasesInfraFees(purchaseId, infraId, {
            recipient: Address.publicKey(INFRA_WALLET),
            solAmt: 0,
        });
        if (!recorded) {
            // Sub-document write failed — log but don't treat as fatal if accounting flag can still be set
            await logFailure({
                purchaseId,
                step: 'stepInfraFee',
                errorMessage: `Infra fee audit record write returned false (${ctx.infraLamports} lamports, vault-retained)`,
            });
            await writeFailedFulfillment({
                purchaseId,
                failureStage: 'infra-fee',
                errorMessage: `Infra fee accounting failed: audit record write returned false. Airdrop + treasury already completed. infraLamports=${ctx.infraLamports}`,
                songIdVal: ctx.songIdStr,
                buyerAddr: ctx.buyerAddress,
                purchaseSource: ctx.purchaseSource,
                packIdVal: ctx.packIdVal,
                usdAmt: ctx.purchaseAmountUsd,
                solPriceAtPurchaseUsd: purchase.solPriceAtPurchaseUsd,
            });
            return false;
        }
        await updatePackPurchases(purchaseId, {
            infraFeeAccounted: true,
            infraTxHash: infraId,
        });
        return true;
    }
    catch (err) {
        const errMsg = `Infra fee accounting threw: ${err instanceof Error ? err.message : String(err)}`;
        await logFailure({ purchaseId, step: 'stepInfraFee', errorMessage: errMsg });
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'infra-fee',
            errorMessage: errMsg,
            songIdVal: ctx.songIdStr,
            buyerAddr: ctx.buyerAddress,
            purchaseSource: ctx.purchaseSource,
            packIdVal: ctx.packIdVal,
            usdAmt: ctx.purchaseAmountUsd,
            solPriceAtPurchaseUsd: purchase.solPriceAtPurchaseUsd,
        });
        return false;
    }
}
// ─── STEP FUNDING FEE ─────────────────────────────────────────────────────────
/**
 * Step 1d — Account for the funding fee (0% Shopify / 0% Direct SOL in current splits,
 * reserved for future use). Vault-retained, accounted-for via `fundingFeeAccounted` flag.
 * No outbound on-chain transaction.
 *
 * Even when the funding amount is 0, we still mark the flag to maintain pipeline
 * consistency and allow future fee additions without changing the step structure.
 *
 * Idempotency: checked via `fundingFeeAccounted` flag on the purchase record.
 */
export async function runStepFundingFee(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    // Idempotency
    if (purchase.fundingFeeAccounted === true) {
        return true;
    }
    const ctx = await buildFulfillmentContext(purchaseId);
    if (!ctx) {
        const errMsg = 'Failed to build fulfillment context — missing solPrice or purchaseAmount';
        await logFailure({ purchaseId, step: 'stepFundingFee', errorMessage: errMsg });
        await writeFailedFulfillment({ purchaseId, failureStage: 'funding-fee', errorMessage: errMsg });
        return false;
    }
    try {
        // Funding is vault-retained — just mark the accounting flag
        await updatePackPurchases(purchaseId, {
            fundingFeeAccounted: true,
        });
        return true;
    }
    catch (err) {
        const errMsg = `Funding fee accounting threw: ${err instanceof Error ? err.message : String(err)}`;
        await logFailure({ purchaseId, step: 'stepFundingFee', errorMessage: errMsg });
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'funding-fee',
            errorMessage: errMsg,
            songIdVal: ctx.songIdStr,
            buyerAddr: ctx.buyerAddress,
            purchaseSource: ctx.purchaseSource,
            packIdVal: ctx.packIdVal,
            usdAmt: ctx.purchaseAmountUsd,
            solPriceAtPurchaseUsd: purchase.solPriceAtPurchaseUsd,
        });
        return false;
    }
}
// ─── STEP TOKENS (orchestrator — backward-compatible) ─────────────────────────
/**
 * Orchestrates steps 1a–1d: airdrop → treasury transfer → infra fee → funding fee.
 *
 * The airdrop (step 1a) is the GATE: if it fails, all subsequent steps are aborted
 * and stepTokens is NOT marked true.
 *
 * After airdrop succeeds, fee steps 1b–1d run independently. Each failure writes
 * its own failedFulfillments record with the specific failureStage, so admin can
 * retry individual steps.
 *
 * Sets stepTokens=true (legacy flag) as soon as the airdrop succeeds, regardless
 * of fee step outcomes. Fee accounting is a back-office concern and must not block
 * payout/NFT/notify from reaching the buyer.
 */
export async function runStepTokens(purchaseId, _env) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    if (purchase.stepTokens === true) {
        return true;
    }
    // Step 1a: Airdrop — GATE
    const airdropOk = await runStepAirdrop(purchaseId);
    if (!airdropOk) {
        return false;
    }
    // Airdrop succeeded — mark stepTokens=true immediately so downstream steps
    // (payout, NFT, notify) are unblocked. Fee steps are independent back-office
    // concerns; their failures are tracked in failedFulfillments for admin retry.
    await updatePackPurchases(purchaseId, { stepTokens: true });
    // Steps 1b–1d run independently after airdrop succeeds.
    // Each step writes its own failedFulfillments record on failure.
    await runStepTreasuryTransfer(purchaseId);
    await runStepInfraFee(purchaseId);
    await runStepFundingFee(purchaseId);
    return true;
}
// ─── STEP PAYOUT ─────────────────────────────────────────────────────────────
/**
 * Buy 5% artist tokens on bonding curve → artist wallet.
 * If tipBps > 0, also send the tip amount in SOL directly to artist.
 * Marks stepPayout = true on success.
 */
export async function runStepPayout(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    if (purchase.stepPayout === true) {
        return true;
    }
    // Post-swap idempotency guard: if the artist bonding curve buy was already submitted,
    // skip the swap and go straight to the airdrop + tip steps. Prevents double-buying
    // artist tokens if the worker dies between the swap and the stepPayout=true write.
    if (purchase.artistPayoutSubmitted === true) {
        await updatePackPurchases(purchaseId, {
            stepPayout: true,
            artistPayoutStatus: 'tokens_only',
        });
        return true;
    }
    const { songId } = purchase;
    const songIdStr = songId;
    if (!songIdStr) {
        await logFailure({ purchaseId, step: 'stepPayout', errorMessage: 'Missing songId on purchase record' });
        return false;
    }
    const song = await getSongs(songIdStr);
    if (!song) {
        await logFailure({ purchaseId, step: 'stepPayout', errorMessage: `Song ${songIdStr} not found for payout`, songId: songIdStr });
        return false;
    }
    const artistAddress = song.creator;
    if (!artistAddress || artistAddress === PROJECT_VAULT_ADDRESS) {
        await updatePackPurchases(purchaseId, { stepPayout: true, artistPayoutStatus: 'skipped' });
        return true;
    }
    const solPriceAtPurchaseUsd = purchase.solPriceAtPurchaseUsd;
    if (!solPriceAtPurchaseUsd || solPriceAtPurchaseUsd <= 0) {
        await logFailure({ purchaseId, step: 'stepPayout', errorMessage: 'solPriceAtPurchaseUsd missing — step 0 (capturePrice) must run first', songId: songIdStr });
        return false;
    }
    const solPriceUsd = unscaleFromMicroUsd(solPriceAtPurchaseUsd);
    const rawPayoutAmountUsd = purchase.purchaseAmountUsd;
    if (rawPayoutAmountUsd == null || rawPayoutAmountUsd <= 0) {
        const errMsg = `purchaseAmountUsd missing or zero on purchase ${purchaseId} — cannot compute artist payout lamports. Field must be set at purchase creation time.`;
        await writeFailedFulfillment({
            purchaseId,
            failureStage: 'payout',
            errorMessage: errMsg,
            songIdVal: songIdStr,
        });
        return false;
    }
    const purchaseAmountUsd = rawPayoutAmountUsd;
    const isDirectSolPayout = purchase.walletSource === 'direct_sol';
    const shares = isDirectSolPayout ? DIRECT_SOL_SHARES : SHOPIFY_SHARES;
    const artistTokenBudgetLamports = Math.floor((purchaseAmountUsd * ARTIST_TOKEN_SHARE) / solPriceUsd * 1000000000);
    // Compute artist token amount as 5% of purchase USD value using the current
    // token price. Do NOT derive it as a ratio of the fan's token count — that
    // drifts when fan tokens are capped or rounded.
    let artistTokenAmount = purchase.artistTokenAmount ?? 0;
    if (!artistTokenAmount) {
        let pricePerTokenUsd = 0;
        try {
            const priceStr = await runTokenPriceUsdQueryForSongDetails(songIdStr);
            pricePerTokenUsd = parseFloat(priceStr);
        }
        catch {
            // Price query failed — leave pricePerTokenUsd at 0
        }
        if (pricePerTokenUsd > 0) {
            artistTokenAmount = Math.floor((purchaseAmountUsd * ARTIST_TOKEN_SHARE) / pricePerTokenUsd);
        }
        else {
            // Ultimate fallback: derive from fan airdrop (only when price query fails)
            const fanValueUsd = purchaseAmountUsd * shares.airdrop;
            if ((purchase.tokenAmount ?? 0) > 0 && fanValueUsd > 0) {
                pricePerTokenUsd = fanValueUsd / purchase.tokenAmount;
                artistTokenAmount = Math.floor((purchaseAmountUsd * ARTIST_TOKEN_SHARE) / pricePerTokenUsd);
            }
        }
    }
    let artistTokenTxHash = '';
    let artistTokenOk = false;
    if (artistTokenBudgetLamports > 0) {
        try {
            const seedResult = await ensureVaultHasSongTokens({
                songId: songIdStr,
                purchaseId: `${purchaseId}-artist`,
                packPriceUsdCents: 0,
                tokenAmount: 0,
                pricePerTokenUsd: undefined,
                solUsd: solPriceUsd,
                solAmtOverrideLamports: artistTokenBudgetLamports,
                onError: async (reason) => {
                    await logFailure({ purchaseId, step: 'stepPayout', errorMessage: `Artist bonding curve seed failed: ${reason}`, songId: songIdStr });
                },
            });
            if (seedResult.ok) {
                // IMMEDIATELY after swap succeeds — write idempotency flag before the airdrop call.
                // If the worker dies between here and stepPayout=true, the next retry will skip
                // the swap via the artistPayoutSubmitted guard at the top of this function.
                try {
                    await updatePackPurchases(purchaseId, { artistPayoutSubmitted: true });
                }
                catch (flagErr) {
                }
                const airdropId = crypto.randomUUID().replace(/-/g, '');
                artistTokenOk = await setSongsAirdrops(songIdStr, airdropId, {
                    recipient: Address.publicKey(artistAddress),
                    amount: artistTokenAmount,
                });
                artistTokenTxHash = airdropId;
                if (!artistTokenOk) {
                    await logFailure({ purchaseId, step: 'stepPayout', errorMessage: 'Artist token airdrop returned false', songId: songIdStr });
                }
            }
        }
        catch (err) {
            await logFailure({ purchaseId, step: 'stepPayout', errorMessage: `Artist token flow threw: ${err instanceof Error ? err.message : String(err)}`, songId: songIdStr });
        }
    }
    else {
        artistTokenOk = true;
    }
    const tipPercent = Number(purchase.tipPercent ?? 0);
    const hasTip = tipPercent > 0;
    let artistPayoutTxHash = '';
    let artistPayoutSOL = 0;
    let artistPayoutUSD = 0;
    let artistPayoutOk = !hasTip;
    if (hasTip) {
        artistPayoutUSD = purchaseAmountUsd * (tipPercent / 100);
        artistPayoutSOL = Math.floor((artistPayoutUSD / solPriceUsd) * 1000000000);
        try {
            const payoutId = crypto.randomUUID().replace(/-/g, '');
            artistPayoutOk = await setPackPurchasesPayouts(purchaseId, payoutId, {
                recipient: Address.publicKey(artistAddress),
                solAmt: artistPayoutSOL,
            });
            artistPayoutTxHash = payoutId;
            if (!artistPayoutOk) {
                await logFailure({ purchaseId, step: 'stepPayout', errorMessage: `Artist tip payout (${artistPayoutSOL} lamports, ${tipPercent}%) returned false` });
            }
        }
        catch (err) {
            await logFailure({ purchaseId, step: 'stepPayout', errorMessage: `Artist tip payout threw: ${err instanceof Error ? err.message : String(err)}` });
        }
    }
    else {
        // No tip — artist earns tokens only.
    }
    if (artistTokenOk && artistPayoutOk) {
        await updatePackPurchases(purchaseId, {
            stepPayout: true,
            artistPayoutTxHash,
            artistTokenTxHash,
            artistPayoutSOL,
            artistPayoutUSD: Math.floor(artistPayoutUSD * 100),
            artistPayoutStatus: hasTip ? 'paid' : 'tokens_only',
            artistTokenAmount,
        });
        return true;
    }
    return false;
}
// ─── STEP NFT ─────────────────────────────────────────────────────────────────
/**
 * NFT minting is intentionally disabled pending the NFT feature being fully
 * built out. DO NOT re-enable this step by removing the short-circuit below
 * without first:
 *   1. Confirming the songs/$songId/nft policy allows PROJECT_VAULT_ADDRESS writes.
 *   2. Verifying the Metaplex mint flow works on mainnet with the current token.
 *   3. Coordinating with the team — NFTs affect edition counts and royalty flows.
 *
 * For now, this step marks itself complete immediately so the rest of the
 * pipeline (tokens, payout, notify) proceeds without the 403 UnauthorizedCreate
 * error that was being thrown against songs/$songId/nft.
 *
 * Mint or transfer NFTs for the pack.
 * Marks stepNft = true even if some NFTs failed (records nftFailedCount).
 * Only leaves it false if NONE succeeded.
 */
export async function runStepNft(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    if (purchase.stepNft === true) {
        return true;
    }
    // ── NFT MINTING DISABLED ──────────────────────────────────────────────────
    await updatePackPurchases(purchaseId, { stepNft: true, nftFailedCount: 0 });
    return true;
    // NFT minting has been removed from the SPL token launch flow.
    // This function now marks the step as complete without minting.
    await updatePackPurchases(purchaseId, { stepNft: true, nftFailedCount: 0 });
    return true;
}
// ─── STEP NOTIFY ─────────────────────────────────────────────────────────────
/**
 * Send buyer notification email.
 * Marks stepNotify = true on success.
 */
export async function runStepNotify(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return false;
    }
    if (purchase.stepNotify === true) {
        return true;
    }
    const { songId, buyerEmail, buyerAddress, packName, nftCount, tokenAmount } = purchase;
    const songIdStr = songId;
    if (!buyerEmail) {
        await updatePackPurchases(purchaseId, { stepNotify: true });
        return true;
    }
    let songName = 'Unknown Song';
    try {
        const song = await getSongs(songIdStr ?? '');
        if (song)
            songName = song.name ?? 'Unknown Song';
    }
    catch (songErr) {
    }
    try {
        await sendClaimEmail({
            toEmail: buyerEmail,
            songName,
            packName: packName ?? 'Pack',
            nftCount: nftCount ?? 0,
            tokenAmount: tokenAmount ?? 0,
            walletAddress: buyerAddress ?? '',
            purchaseId,
        });
        await updatePackPurchases(purchaseId, { stepNotify: true });
        return true;
    }
    catch (err) {
        await logFailure({ purchaseId, step: 'stepNotify', errorMessage: `Email send failed: ${err instanceof Error ? err.message : String(err)}` });
        return false;
    }
}
/**
 * Run all steps, reading current flags to skip already-completed steps.
 *
 * Step 0 MUST succeed before steps 1-7 run — it captures the SOL/USD price.
 *
 * Step 1a (airdrop) is the GATE: if it fails, a failedFulfillments record is
 * written and all downstream steps are aborted.
 *
 * After airdrop succeeds, steps 1b (treasury), 1c (infra), 1d (funding) run
 * independently — each failure writes its own failedFulfillments record with
 * the correct failureStage. Steps 2-4 (payout, NFT, notify) run once the
 * airdrop succeeds; stepTokens is set immediately and fee step failures do
 * not block the buyer from receiving their NFT or email.
 */
export async function runAllSteps(purchaseId) {
    const purchase = await getPackPurchases(purchaseId);
    if (!purchase) {
        return {
            stepCapturePrice: false, stepTokens: false,
            stepAirdrop: false, stepTreasuryTransfer: false, stepInfraFee: false, stepFundingFee: false,
            stepPayout: false, stepNft: false, stepNotify: false, finalStatus: 'partial',
        };
    }
    // ── Step 0: Capture SOL/USD price ──────────────────────────────────────────
    const capturedMicroUsd = await runStepCapturePrice(purchaseId);
    if (capturedMicroUsd === null) {
        return {
            stepCapturePrice: false, stepTokens: false,
            stepAirdrop: false, stepTreasuryTransfer: false, stepInfraFee: false, stepFundingFee: false,
            stepPayout: false, stepNft: false, stepNotify: false, finalStatus: 'pending_price_fetch',
        };
    }
    // Read current idempotency state
    const freshPurchase = await getPackPurchases(purchaseId);
    const airdropAlreadyDone = freshPurchase?.airdropCompleted === true;
    const treasuryAlreadyDone = freshPurchase?.treasuryTransferCompleted === true;
    const infraAlreadyDone = freshPurchase?.infraFeeAccounted === true;
    const fundingAlreadyDone = freshPurchase?.fundingFeeAccounted === true;
    const stepTokensAlreadyDone = freshPurchase?.stepTokens === true;
    const stepPayoutAlreadyDone = freshPurchase?.stepPayout === true;
    const stepNftAlreadyDone = freshPurchase?.stepNft === true;
    const stepNotifyAlreadyDone = freshPurchase?.stepNotify === true;
    // ── Step 1a: Airdrop — GATE ────────────────────────────────────────────────
    const airdropResult = airdropAlreadyDone ? true : await runStepAirdrop(purchaseId);
    if (!airdropResult) {
        // Airdrop failed — failedFulfillments already written by runStepAirdrop.
        // Abort everything downstream.
        await updatePackPurchases(purchaseId, { status: 'partial_failure' });
        return {
            stepCapturePrice: true, stepTokens: false,
            stepAirdrop: false, stepTreasuryTransfer: false, stepInfraFee: false, stepFundingFee: false,
            stepPayout: false, stepNft: false, stepNotify: false, finalStatus: 'partial',
        };
    }
    // ── Steps 1b–1d: Independent fee steps ────────────────────────────────────
    // Each runs independently; failures write their own failedFulfillments records.
    const treasuryResult = treasuryAlreadyDone ? true : await runStepTreasuryTransfer(purchaseId);
    const infraResult = infraAlreadyDone ? true : await runStepInfraFee(purchaseId);
    const fundingResult = fundingAlreadyDone ? true : await runStepFundingFee(purchaseId);
    // stepTokens is the legacy gate for payout/NFT/notify. It is set as soon as
    // the airdrop succeeds — fee step failures are independent back-office concerns
    // and must not block the buyer from receiving their NFT or email.
    if (!stepTokensAlreadyDone && airdropResult) {
        await updatePackPurchases(purchaseId, { stepTokens: true });
    }
    const stepTokensResult = stepTokensAlreadyDone || airdropResult;
    // Steps 2-4 run after airdrop succeeds, regardless of fee step outcomes.
    // This branch should rarely fire because airdrop failure is handled above.
    if (!stepTokensResult) {
        await updatePackPurchases(purchaseId, { status: 'partial_failure' });
        return {
            stepCapturePrice: true, stepTokens: false,
            stepAirdrop: airdropResult,
            stepTreasuryTransfer: treasuryResult,
            stepInfraFee: infraResult,
            stepFundingFee: fundingResult,
            stepPayout: false, stepNft: false, stepNotify: false,
            finalStatus: 'partial',
        };
    }
    // ── Steps 2-4: Payout, NFT, notify ────────────────────────────────────────
    const payoutResult = stepPayoutAlreadyDone ? true : await runStepPayout(purchaseId);
    const nftResult = stepNftAlreadyDone ? true : await runStepNft(purchaseId);
    const notifyResult = stepNotifyAlreadyDone ? true : await runStepNotify(purchaseId);
    const allDone = stepTokensResult && payoutResult && nftResult && notifyResult;
    const finalStatus = allDone ? 'completed' : 'partial';
    await updatePackPurchases(purchaseId, { status: finalStatus });
    return {
        stepCapturePrice: true,
        stepTokens: stepTokensResult,
        stepAirdrop: airdropResult,
        stepTreasuryTransfer: treasuryResult,
        stepInfraFee: infraResult,
        stepFundingFee: fundingResult,
        stepPayout: payoutResult,
        stepNft: nftResult,
        stepNotify: notifyResult,
        finalStatus,
    };
}
