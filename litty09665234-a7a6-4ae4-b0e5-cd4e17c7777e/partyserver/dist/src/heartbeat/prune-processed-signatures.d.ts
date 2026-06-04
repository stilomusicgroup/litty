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
export declare function pruneProcessedSignatures(): Promise<void>;
