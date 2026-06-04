/**
 * Heartbeat task: prune-processed-signatures
 *
 * Deletes processedSolSignatures entries whose processedAt timestamp is older
 * than 90 days. Runs weekly.
 *
 * processedAt is Unix seconds (Poof convention — NOT milliseconds).
 * The worker signs as PROJECT_VAULT_ADDRESS, which is authorized to delete
 * by the collection policy.
 */
import { getManyProcessedSolSignatures, deleteProcessedSolSignatures } from '../collections/processedSolSignatures.js';
const RETENTION_SECONDS = 90 * 24 * 60 * 60; // 90 days in seconds
export async function pruneProcessedSignatures() {
    console.log('[prune-processed-signatures] Starting...');
    const entries = await getManyProcessedSolSignatures();
    if (!entries || entries.length === 0) {
        console.log('[prune-processed-signatures] Collection is empty — 0 pruned.');
        return;
    }
    // Unix seconds — consistent with how processedAt is written by the backend route
    const nowSeconds = Math.floor(Date.now() / 1000);
    const cutoffSeconds = nowSeconds - RETENTION_SECONDS;
    console.log(`[prune-processed-signatures] ${entries.length} total entries. Cutoff: ${cutoffSeconds} (${new Date(cutoffSeconds * 1000).toISOString()})`);
    const stale = entries.filter((entry) => entry.processedAt < cutoffSeconds);
    if (stale.length === 0) {
        console.log('[prune-processed-signatures] No stale entries found — 0 pruned.');
        return;
    }
    console.log(`[prune-processed-signatures] Found ${stale.length} entries to prune.`);
    // Delete each entry individually; continue on failure so one bad entry
    // doesn't abort the entire run.
    const results = await Promise.allSettled(stale.map(async (entry) => {
        const deleted = await deleteProcessedSolSignatures(entry.signature);
        if (!deleted) {
            throw new Error(`deleteProcessedSolSignatures returned false for signature ${entry.signature}`);
        }
        return entry.signature;
    }));
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected');
    for (const failure of failed) {
        if (failure.status === 'rejected') {
            console.error(`[prune-processed-signatures] Delete failed:`, failure.reason);
        }
    }
    console.log(`[prune-processed-signatures] Done. Pruned ${succeeded}/${stale.length} stale entries` +
        (failed.length > 0 ? ` (${failed.length} failed — see errors above)` : '') +
        '.');
    // Surface overall failure only if every single delete failed
    if (failed.length > 0 && succeeded === 0) {
        throw new Error(`[prune-processed-signatures] All ${failed.length} deletes failed. Check logs above.`);
    }
}
