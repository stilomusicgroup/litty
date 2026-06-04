/**
 * Transfer Routes — DEPRECATED
 *
 * Raw Solana transaction construction has been removed for security.
 * All transfers now happen through onchain Poof collections:
 *   - userSolTransfers/$transferId  (SOL transfers)
 *   - userTokenTransfers/$transferId (SPL token transfers)
 *
 * The frontend writes directly to these collections, which trigger
 * policy-enforced onchain hooks. Audit logs are written to the
 * offchain walletTransfers collection after successful transfer.
 */
