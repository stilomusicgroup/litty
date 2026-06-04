/**
 * Webhook failure logging and Discord alerting.
 *
 * Writes failure records to the webhookFailures collection and
 * fires a Discord alert when >= 3 failures occur within 10 minutes.
 */
/**
 * Log a webhook verification failure to the webhookFailures collection
 * and optionally fire a Discord alert when >= 3 failures occur in 10 min.
 *
 * Never throws — errors are logged internally so callers can continue
 * returning 401/400 as normal.
 */
export declare function logWebhookFailure(params: {
    webhookSource: 'shopify';
    path: string;
    failureReason: string;
    errorMessage: string;
    rawHeaders: Record<string, string>;
    rawBody: string;
    discordWebhookUrl?: string;
}): Promise<void>;
