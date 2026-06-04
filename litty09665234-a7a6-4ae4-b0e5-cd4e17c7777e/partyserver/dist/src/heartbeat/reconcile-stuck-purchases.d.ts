/**
 * Reconciliation heartbeat — scans for stuck pack purchases and retries fulfillment.
 *
 * Runs every 5 minutes. For each stuck purchase (status: pending/failed from last 14 days):
 * 1. Checks if the referenced song now exists
 * 2. If song exists and fulfillment was never completed, retries the full pipeline
 * 3. If song still doesn't exist, logs to webhookFailures and marks as failed
 * 4. Logs a summary of actions taken
 */
export declare function reconcileStuckPurchases(): Promise<void>;
