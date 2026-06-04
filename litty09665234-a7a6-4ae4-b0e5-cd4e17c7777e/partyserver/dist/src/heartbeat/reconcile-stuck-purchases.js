/**
 * Reconciliation heartbeat — scans for stuck pack purchases and retries fulfillment.
 *
 * Runs every 5 minutes. For each stuck purchase (status: pending/failed from last 14 days):
 * 1. Checks if the referenced song now exists
 * 2. If song exists and fulfillment was never completed, retries the full pipeline
 * 3. If song still doesn't exist, logs to webhookFailures and marks as failed
 * 4. Logs a summary of actions taken
 */
import { get, set } from '@pooflabs/server';
import { updatePackPurchases, getManyPackPurchases } from '../collections/packPurchases.js';
import { Time, Address } from '../db-client.js';
import { runStepCapturePrice, runAllSteps } from '../utils/fulfillment-steps.js';
import { fulfillShopifyOrder } from '../utils/shopify-admin.js';
// ─── Hardcoded fallback song metadata for known missing songs ──────────────
const KNOWN_MISSING_SONGS = {
    'nothing-to-lose-mdk7sa': {
        name: 'NOTHING TO LOSE',
        symbol: '$NTHING',
        uri: 'https://arweave.net/nothing-to-lose-metadata',
        creator: '48mBBpd7Y3GMrVhSHmBC3FuvQHGetuP9GDakMZ7QSDyc',
        audiusStreamUrl: 'https://api.audius.co/v1/tracks/nothing-to-lose/stream',
        audiusTrackId: 'nothing-to-lose-track',
    },
};
// ─── Core reconciliation logic ─────────────────────────────────────────────
// UNFROZEN 2026-05-20 — vault drain fixes applied.
// Set env var RECONCILER_FROZEN=true to re-freeze if needed.
function isFrozen() {
    return process.env.RECONCILER_FROZEN === 'true';
}
export async function reconcileStuckPurchases() {
    if (isFrozen()) {
        console.log('[heartbeat] reconcile-stuck-purchases: FROZEN — skipping all reconciliation (vault drain freeze 2026-05-19). Set RECONCILER_FROZEN=false to unfreeze.');
        return;
    }
    console.log('[heartbeat] reconcile-stuck-purchases: starting scan');
    const now = Math.floor(Date.now() / 1000);
    const fourteenDaysAgo = now - (14 * 24 * 60 * 60);
    let totalScanned = 0;
    let recovered = 0;
    let stillFailed = 0;
    let songsCreated = 0;
    try {
        // Fetch recent packPurchases (limit 100 per run to prevent runaway memory/CPU)
        const allPurchases = await getManyPackPurchases('order by createdAt desc limit 100') || [];
        // Staleness threshold: only reconcile purchases older than 30 minutes.
        // This prevents racing with the live fulfillment pipeline which may still be running.
        const thirtyMinutesAgo = now - (30 * 60);
        // Broad status filter: include all statuses that indicate a stuck/incomplete purchase.
        // NOTE: 'partial_failure' intentionally excluded — these records indicate a swap may
        // have already fired on-chain. Re-running without the bondingCurveBuySubmitted guard
        // would cause duplicate swaps and vault drain. Removed 2026-05-19.
        const STUCK_STATUSES = new Set([
            'pending_price_fetch',
            'pending_wallet',
            'pending_insufficient_funds',
            'retrying',
        ]);
        const stuckPurchases = allPurchases.filter((p) => {
            if (!STUCK_STATUSES.has(p.status))
                return false;
            // pending_insufficient_funds is exempt from the 30-minute age filter:
            // these records are created when the vault has no SOL. Once the vault is
            // funded, the very next reconciler run should retry immediately.
            if (p.status === 'pending_insufficient_funds')
                return true;
            const createdAt = p.createdAt ?? 0;
            // Only reconcile purchases older than 30 min to avoid
            // racing with the live fulfillment pipeline which may still be running.
            return createdAt <= thirtyMinutesAgo;
        });
        console.log(`[heartbeat] Found ${stuckPurchases.length} stuck purchases (statuses: ${[...STUCK_STATUSES].join(', ')}), older than 30 min`);
        // Filter to last 14 days
        const recentPurchases = stuckPurchases.filter((p) => {
            const createdAt = p.createdAt ?? 0;
            return createdAt >= fourteenDaysAgo;
        });
        totalScanned = recentPurchases.length;
        console.log(`[heartbeat] ${recentPurchases.length} stuck purchases within 14-day window`);
        for (const purchase of recentPurchases) {
            const purchaseId = purchase.id;
            const songId = purchase.songId;
            const status = purchase.status;
            const packId = purchase.packId;
            const shopifyOrderId = purchase.shopifyOrderId;
            // Never retry a purchase whose swap permanently failed. runStepAirdrop also
            // checks this, but skipping here avoids unnecessary work and logs clearly.
            if (purchase.swapFailedAt) {
                const reason = `Swap previously failed at ${purchase.swapFailedAt} — non-retriable, marking needs_review`;
                console.warn(`[heartbeat] ${purchaseId}: ${reason}`);
                await updatePackPurchases(purchaseId, { status: 'needs_review', needsReviewReason: reason });
                stillFailed++;
                continue;
            }
            // ── pending_price_fetch fast path ────────────────────────────────────────
            // These purchases never got a SOL price at creation time (both CMC and
            // Jupiter were down). Retry step 0 first; if it succeeds, run the full
            // pipeline via runAllSteps which is idempotent on all flags.
            if (status === 'pending_price_fetch') {
                console.log(`[heartbeat] Retrying price capture for ${purchaseId}`);
                try {
                    const capturedMicroUsd = await runStepCapturePrice(purchaseId);
                    if (capturedMicroUsd !== null) {
                        console.log(`[heartbeat] Price captured for ${purchaseId}: ${capturedMicroUsd} micro-USD — running full pipeline`);
                        const result = await runAllSteps(purchaseId);
                        if (result.finalStatus === 'completed' || result.finalStatus === 'partial') {
                            recovered++;
                            console.log(`[heartbeat] pending_price_fetch purchase ${purchaseId} recovered → ${result.finalStatus}`);
                        }
                        else {
                            stillFailed++;
                        }
                    }
                    else {
                        // Still can't get a price — leave as pending_price_fetch for next run
                        console.warn(`[heartbeat] Price capture still failing for ${purchaseId} — will retry next cycle`);
                        stillFailed++;
                    }
                }
                catch (err) {
                    console.error(`[heartbeat] Error retrying pending_price_fetch for ${purchaseId}:`, err);
                    stillFailed++;
                }
                totalScanned++;
                continue;
            }
            if (!songId || !packId) {
                console.log(`[heartbeat] Skipping ${purchaseId}: missing songId or packId`);
                stillFailed++;
                continue;
            }
            // Step 1: Check if song exists
            let song = await get(`songs/${songId}`);
            // Step 1b: If song doesn't exist and we have known metadata, try to create it
            if (!song && KNOWN_MISSING_SONGS[songId]) {
                const meta = KNOWN_MISSING_SONGS[songId];
                console.log(`[heartbeat] Song ${songId} missing but known — attempting to create via vault`);
                try {
                    const created = await set(`songs/${songId}`, {
                        name: meta.name,
                        symbol: meta.symbol,
                        uri: meta.uri,
                        creator: Address.publicKey(meta.creator),
                        audiusStreamUrl: meta.audiusStreamUrl,
                        audiusTrackId: meta.audiusTrackId,
                    });
                    if (created) {
                        song = await get(`songs/${songId}`);
                        songsCreated++;
                        console.log(`[heartbeat] Created song ${songId}: ${meta.name}`);
                    }
                }
                catch (err) {
                    console.error(`[heartbeat] Failed to create song ${songId}:`, err);
                }
            }
            // Step 2: If song still doesn't exist, log and mark as failed
            if (!song) {
                console.error(`[heartbeat] Song ${songId} still not found — marking ${purchaseId} as permanently failed`);
                try {
                    await set(`webhookFailures/fail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, {
                        webhookSource: 'heartbeat-reconcile',
                        path: '/__heartbeat/reconcile-stuck-purchases',
                        failureReason: 'song-not-found-permanent',
                        errorMessage: `Song "${songId}" does not exist and is not in known fallback metadata. Purchase ${purchaseId} permanently failed.`,
                        headers: JSON.stringify({ songId, purchaseId, shopifyOrderId }),
                        bodyPreview: `permanently failed: song ${songId} not found`,
                        timestamp: Time.Now,
                        alertSent: false,
                    });
                }
                catch (err) {
                    console.error('[heartbeat] Failed to log failure:', err);
                }
                try {
                    await updatePackPurchases(purchaseId, { status: 'failed' });
                }
                catch (err) {
                    console.error(`[heartbeat] Failed to update ${purchaseId} to failed:`, err);
                }
                stillFailed++;
                continue;
            }
            // Step 3: Song exists — delegate to runAllSteps which handles all retry logic.
            try {
                // Max 3 auto-retries per purchase — check reconcileAttempts on the record.
                const reconcileAttempts = purchase.reconcileAttempts ?? 0;
                if (reconcileAttempts >= 3) {
                    // Terminal: exceeded auto-retry cap. Flip to needs_review so admins can triage manually.
                    const lastError = purchase.lastErrorMessage;
                    const lastStep = purchase.lastStepName;
                    const rawReason = lastError || lastStep || `stuck in status '${status}' after ${reconcileAttempts} reconcile attempts`;
                    const needsReviewReason = rawReason.slice(0, 500);
                    console.warn(`[heartbeat] ${purchaseId} has hit max reconcile retries (${reconcileAttempts}) — marking needs_review: ${needsReviewReason}`);
                    await updatePackPurchases(purchaseId, { status: 'needs_review', needsReviewReason });
                    stillFailed++;
                    continue;
                }
                // Increment attempt counter
                await updatePackPurchases(purchaseId, { reconcileAttempts: reconcileAttempts + 1 });
                // ── Delegate to the canonical fulfillment pipeline ────────────────────────
                // runAllSteps is fully idempotent — it checks airdropCompleted, stepTokens,
                // stepPayout, etc. before re-running any step. This eliminates the prior
                // duplicate airdrop code path (which gated re-runs on splTxHash presence
                // rather than airdropCompleted, causing double-airdrops when the worker died
                // after setSongsAirdrops landed on-chain but before the DB write of splTxHash).
                console.log(`[heartbeat] Delegating ${purchaseId} (status=${status}) to runAllSteps`);
                let stepResult = null;
                try {
                    stepResult = await runAllSteps(purchaseId);
                }
                catch (err) {
                    console.error(`[heartbeat] runAllSteps threw for ${purchaseId}:`, err);
                    stillFailed++;
                    try {
                        await updatePackPurchases(purchaseId, { status: 'failed' });
                    }
                    catch (updateErr) {
                        console.error(`[heartbeat] Failed to mark ${purchaseId} failed after runAllSteps throw:`, updateErr);
                    }
                    continue;
                }
                const isRecovered = stepResult.finalStatus === 'completed' || stepResult.finalStatus === 'partial';
                if (isRecovered) {
                    recovered++;
                    console.log(`[heartbeat] Purchase ${purchaseId} reconciled → finalStatus=${stepResult.finalStatus}`);
                    // Attempt Shopify fulfillment for newly-recovered purchases.
                    // Freshness check: re-read the record to avoid double-fulfillment from concurrent
                    // queue consumers or admin actions.
                    const freshPurchase = await get(`packPurchases/${purchaseId}`);
                    const alreadyFulfilled = freshPurchase?.shopifyFulfilled === true;
                    if (alreadyFulfilled) {
                        console.log(`[heartbeat] Purchase ${purchaseId} shopifyFulfilled=true on fresh read — skipping Shopify fulfillment`);
                    }
                    if (!alreadyFulfilled && shopifyOrderId) {
                        const shopifyEnv = {
                            SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
                            SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
                        };
                        if (shopifyEnv.SHOPIFY_ADMIN_API_TOKEN && shopifyEnv.SHOPIFY_STORE_DOMAIN_V2) {
                            try {
                                const fulfillResult = await fulfillShopifyOrder(shopifyEnv, shopifyOrderId);
                                if (fulfillResult.fulfilled) {
                                    console.log(`[heartbeat] Shopify order ${shopifyOrderId} marked fulfilled for purchase ${purchaseId}`);
                                    await updatePackPurchases(purchaseId, { shopifyFulfilled: true });
                                }
                                else {
                                    console.warn(`[heartbeat] Shopify fulfillment skipped for order ${shopifyOrderId}: ${fulfillResult.reason}`);
                                    await updatePackPurchases(purchaseId, { shopifyFulfilled: false });
                                }
                            }
                            catch (err) {
                                console.error(`[heartbeat] Shopify fulfillment threw for order ${shopifyOrderId}:`, err);
                                await updatePackPurchases(purchaseId, { shopifyFulfilled: false });
                            }
                        }
                    }
                }
                else {
                    stillFailed++;
                    console.warn(`[heartbeat] Purchase ${purchaseId} still not recovered after runAllSteps — finalStatus=${stepResult.finalStatus}`);
                }
            }
            catch (err) {
                console.error(`[heartbeat] Reconciliation failed for ${purchaseId}:`, err);
                stillFailed++;
                try {
                    await updatePackPurchases(purchaseId, { status: 'failed' });
                }
                catch (updateErr) {
                    console.error(`[heartbeat] Failed to update ${purchaseId} status after error:`, updateErr);
                }
            }
        }
        console.log(`[heartbeat] reconcile-stuck-purchases: scan complete — ` +
            `scanned=${totalScanned}, recovered=${recovered}, stillFailed=${stillFailed}, songsCreated=${songsCreated}`);
    }
    catch (err) {
        console.error('[heartbeat] reconcile-stuck-purchases: top-level error:', err);
    }
}
