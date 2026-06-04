/**
 * Webhook failure logging and Discord alerting.
 *
 * Writes failure records to the webhookFailures collection and
 * fires a Discord alert when >= 3 failures occur within 10 minutes.
 */
import { setWebhookFailures, updateWebhookFailures, getManyWebhookFailures, } from '../collections/webhookFailures.js';
const ALERT_WINDOW_SECONDS = 10 * 60; // 10 minutes
const ALERT_THRESHOLD = 3;
/** Strip auth/cookie/signing headers before persisting. */
function sanitizeHeaders(headers) {
    const BLOCKED = new Set([
        'authorization',
        'cookie',
        'set-cookie',
        'x-shopify-hmac-sha256',
    ]);
    const result = {};
    for (const [k, v] of Object.entries(headers)) {
        if (!BLOCKED.has(k.toLowerCase())) {
            result[k] = v;
        }
    }
    return result;
}
/**
 * Log a webhook verification failure to the webhookFailures collection
 * and optionally fire a Discord alert when >= 3 failures occur in 10 min.
 *
 * Never throws — errors are logged internally so callers can continue
 * returning 401/400 as normal.
 */
export async function logWebhookFailure(params) {
    const { webhookSource, path, failureReason, errorMessage, rawHeaders, rawBody, discordWebhookUrl } = params;
    const failureId = `wf-${webhookSource}-${Date.now()}-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
    const safeHeaders = sanitizeHeaders(rawHeaders);
    const bodyPreview = rawBody.slice(0, 200);
    const truncatedError = errorMessage.slice(0, 500);
    try {
        const written = await setWebhookFailures(failureId, {
            webhookSource,
            path,
            failureReason,
            errorMessage: truncatedError,
            headers: JSON.stringify(safeHeaders),
            bodyPreview,
            timestamp: Math.floor(Date.now() / 1000),
            alertSent: false,
        });
        if (!written) {
            console.warn(`[WebhookAlert] Policy denied write for failure record ${failureId}`);
        }
    }
    catch (err) {
        console.error('[WebhookAlert] Failed to write failure record:', err);
        // Non-fatal — continue to alert check even if DB write failed
    }
    // Discord alerting — silently skip when URL is not configured
    if (!discordWebhookUrl) {
        console.warn(`[WebhookAlert] DISCORD_WEBHOOK_URL not set — skipping Discord alert`);
        return;
    }
    try {
        const tenMinAgo = Math.floor(Date.now() / 1000) - ALERT_WINDOW_SECONDS;
        const recentFailures = await getManyWebhookFailures(`where alertSent = false and timestamp > ${tenMinAgo} order by timestamp desc limit 50`);
        if (recentFailures.length >= ALERT_THRESHOLD) {
            const sourceLabel = webhookSource.charAt(0).toUpperCase() + webhookSource.slice(1);
            const content = `🚨 Webhook failures detected: ${recentFailures.length} failures in last 10 min for ${sourceLabel}. Latest reason: ${failureReason}. Check admin dashboard at /admin (Webhook Failures tab).`;
            const discordRes = await fetch(discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (discordRes.ok) {
                console.log(`[WebhookAlert] Discord alert sent for ${recentFailures.length} failures`);
                // Mark all recent unalerted failures as alerted to prevent spam
                const updatePromises = recentFailures.map(f => updateWebhookFailures(f.id, { alertSent: true }).catch(updateErr => console.warn(`[WebhookAlert] Failed to mark failure ${f.id} as alerted:`, updateErr)));
                await Promise.allSettled(updatePromises);
            }
            else {
                const errText = await discordRes.text().catch(() => '(unreadable)');
                console.error(`[WebhookAlert] Discord POST failed: ${discordRes.status} — ${errText}`);
            }
        }
    }
    catch (err) {
        // Non-fatal — DB write already attempted, alerting is best-effort
        console.error('[WebhookAlert] Error during Discord alert check:', err);
    }
}
