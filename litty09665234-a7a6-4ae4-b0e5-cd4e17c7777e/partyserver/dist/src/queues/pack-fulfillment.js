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
import { init } from '@pooflabs/server';
import { runAllSteps } from '../utils/fulfillment-steps.js';
import { getPackPurchases, updatePackPurchases } from '../collections/packPurchases.js';
import { getSongs } from '../collections/songs.js';
import { getSongDetails } from '../collections/songDetails.js';
import { setOperationsFulfillmentCosts } from '../collections/operationsFulfillmentCosts.js';
import { fulfillShopifyOrder } from '../utils/shopify-admin.js';
import { getTarobaseServerConfig } from '../lib/config.js';
// FROZEN toggle via env var — no redeploy needed to halt fulfillment
function isFrozen(env) {
    return env.FULFILLMENT_FROZEN === 'true' || process.env.FULFILLMENT_FROZEN === 'true';
}
export const packFulfillment = async (job, context) => {
    const { purchaseId, email, orderId } = job.payload;
    if (!purchaseId) {
        throw new Error('[pack-fulfillment] Missing purchaseId in job payload');
    }
    // FREEZE: do not process any fulfillment jobs until vault drain is investigated
    if (isFrozen(context.env)) {
        if (context.env.LOG_LEVEL !== 'silent')
            console.log(`[pack-fulfillment] FROZEN — skipping job ${job.jobId} for purchase ${purchaseId} (vault drain freeze 2026-05-19)`);
        await context.updateStatus({ message: `FROZEN: fulfillment halted (vault drain freeze 2026-05-19)`, metadata: { frozen: true } });
        return;
    }
    if (context.env.LOG_LEVEL !== 'silent')
        console.log(`[pack-fulfillment] Starting job ${job.jobId} for purchase ${purchaseId} (attempt ${job.attempts})`);
    // Re-initialize the Tarobase SDK. Queue consumers run outside the request lifecycle
    // so the Hono middleware init() is not in scope — we must re-init here.
    if (process.env.PROJECT_VAULT_PRIVATE_KEY) {
        process.env.TAROBASE_SOLANA_KEYPAIR = process.env.PROJECT_VAULT_PRIVATE_KEY;
    }
    await init(getTarobaseServerConfig());
    // Status pre-check: skip already-completed or terminal purchases to avoid wasted
    // RPC/DB calls on redelivery.
    const existing = await getPackPurchases(purchaseId);
    if (existing) {
        const status = existing.status;
        if (status === 'completed' || status === 'needs_review') {
            if (context.env.LOG_LEVEL !== 'silent')
                console.log(`[pack-fulfillment] Purchase ${purchaseId} already terminal (status=${status}) — skipping`);
            context.rawMessage.ack?.();
            return;
        }
    }
    // ── Step 1: Run the full fulfillment pipeline ─────────────────────────────
    await context.updateStatus({ message: `Running fulfillment steps for ${purchaseId}` });
    const stepsResult = await runAllSteps(purchaseId);
    const finalStatus = stepsResult.finalStatus;
    if (context.env.LOG_LEVEL !== 'silent')
        console.log(`[pack-fulfillment] runAllSteps complete for ${purchaseId}: ` +
            `price=${stepsResult.stepCapturePrice} tokens=${stepsResult.stepTokens} ` +
            `payout=${stepsResult.stepPayout} nft=${stepsResult.stepNft} ` +
            `notify=${stepsResult.stepNotify} → ${finalStatus}`);
    // If the token step failed, throw so the queue retries. runAllSteps already
    // updated the record to partial_failure — on retry it will skip completed steps.
    if (!stepsResult.stepTokens) {
        throw new Error(`[pack-fulfillment] stepTokens failed for ${purchaseId} (status=${finalStatus}) — will retry`);
    }
    // ── Step 2: Mark Shopify order fulfilled ──────────────────────────────────
    if (finalStatus === 'completed' && orderId) {
        await context.updateStatus({ message: `Marking Shopify order ${orderId} fulfilled` });
        const shopifyEnv = {
            SHOPIFY_ADMIN_API_TOKEN: process.env.SHOPIFY_ADMIN_API_TOKEN,
            SHOPIFY_STORE_DOMAIN_V2: process.env.SHOPIFY_STORE_DOMAIN_V2,
        };
        if (shopifyEnv.SHOPIFY_ADMIN_API_TOKEN && shopifyEnv.SHOPIFY_STORE_DOMAIN_V2) {
            try {
                const fulfillResult = await fulfillShopifyOrder(shopifyEnv, orderId);
                if (fulfillResult.fulfilled) {
                    if (context.env.LOG_LEVEL !== 'silent')
                        console.log(`[pack-fulfillment] Shopify order ${orderId} marked fulfilled (fulfillmentId=${fulfillResult.fulfillmentId})`);
                    await updatePackPurchases(purchaseId, { shopifyFulfilled: true });
                }
                else {
                    console.warn(`[pack-fulfillment] Shopify order ${orderId} not fulfilled: ${fulfillResult.reason}`);
                    await updatePackPurchases(purchaseId, { shopifyFulfilled: false });
                }
            }
            catch (err) {
                // Non-fatal — tokens are already delivered. Log and continue.
                console.error(`[pack-fulfillment] Shopify fulfill threw for order ${orderId}:`, err);
                await updatePackPurchases(purchaseId, { shopifyFulfilled: false });
            }
        }
        else {
            console.warn('[pack-fulfillment] Skipping Shopify mark — SHOPIFY_ADMIN_API_TOKEN or SHOPIFY_STORE_DOMAIN_V2 not configured');
        }
    }
    // ── Step 3: Record fulfillment cost ───────────────────────────────────────
    try {
        const costTimestamp = Math.floor(Date.now() / 1000);
        const costStatus = finalStatus === 'completed' ? 'success' : 'failed';
        await setOperationsFulfillmentCosts(`cost-queue-${purchaseId}-${costTimestamp}`, {
            orderId: orderId || purchaseId,
            nftCount: 0,
            estimatedCostSOL: 0, // Unknown at this point — preflight was done in fulfillPackPurchase
            actualCostSOL: 0,
            timestamp: costTimestamp,
            status: costStatus,
        });
    }
    catch (err) {
        // Non-fatal: cost recording failure must not block fulfillment or trigger retries.
        console.warn(`[pack-fulfillment] Failed to record fulfillment cost for ${purchaseId}:`, err);
    }
    // ── Step 4: Send receipt email ────────────────────────────────────────────
    if (finalStatus === 'completed' && email) {
        await context.updateStatus({ message: `Sending receipt email to ${email}` });
        try {
            await sendQueueReceiptEmail({ purchaseId, email });
        }
        catch (err) {
            // Non-fatal: email failure must not block fulfillment or trigger retries.
            console.warn(`[pack-fulfillment] Receipt email failed for ${purchaseId}:`, err);
        }
    }
    await context.updateStatus({ message: `Fulfillment complete: ${finalStatus}`, metadata: { finalStatus } });
    if (context.env.LOG_LEVEL !== 'silent')
        console.log(`[pack-fulfillment] Job ${job.jobId} complete for ${purchaseId}: ${finalStatus}`);
};
/**
 * Send a receipt email via Resend after successful fulfillment.
 * Reads the finalized purchase record + song/songDetails for email metadata.
 */
async function sendQueueReceiptEmail(params) {
    const { purchaseId, email } = params;
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
        console.log(`[pack-fulfillment] RESEND_API_KEY not configured — skipping receipt for ${purchaseId}`);
        return;
    }
    // Read finalized record for token amount + tx hashes
    const finalRecord = await getPackPurchases(purchaseId);
    if (!finalRecord) {
        console.warn(`[pack-fulfillment] Could not read final record ${purchaseId} for receipt email`);
        return;
    }
    const songId = finalRecord.songId ?? '';
    const [song, songDetails] = await Promise.all([
        songId ? getSongs(songId) : null,
        songId ? getSongDetails(songId) : null,
    ]);
    const songTitle = songDetails?.title ?? song?.name ?? 'Your Song';
    const artistName = songDetails?.artist ?? 'Unknown Artist';
    const tokenAmount = typeof finalRecord.tokenAmount === 'number' ? finalRecord.tokenAmount : undefined;
    const tokenSymbol = song?.symbol ?? undefined;
    const splTxHash = finalRecord.splTxHash ?? undefined;
    const subject = `You now own ${songTitle} on-chain 🎵`;
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #6d28d9;">Purchase Confirmed!</h1>
      <p>Thank you for supporting <strong>${artistName}</strong>.</p>
      <p>You now own <strong>${songTitle}</strong> on-chain.</p>
      ${tokenAmount ? `<p><strong>Tokens received:</strong> ${tokenAmount.toLocaleString()} ${tokenSymbol ?? ''}</p>` : ''}
      ${splTxHash ? `<p><strong>Transaction:</strong> <a href="https://solscan.io/tx/${splTxHash}">${splTxHash.slice(0, 16)}...</a></p>` : ''}
      <p style="color: #6b7280; font-size: 14px;">Purchase ID: ${purchaseId}</p>
    </div>
  `;
    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'noreply@litstudio.online',
            to: [email],
            subject,
            html,
        }),
    });
    if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        console.error(`[pack-fulfillment] Resend error ${res.status} for ${purchaseId}: ${errText}`);
        return;
    }
    console.log(`[pack-fulfillment] Receipt sent to ${email} for purchase ${purchaseId}`);
}
