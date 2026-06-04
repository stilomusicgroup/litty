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
export declare const INFRA_WALLET = "9LLTjsWhYJBxFgca43MQtrLLsPcxWMR86NoxAHGsBUCk";
export declare const TREASURY_WALLET = "GWWQr5yVPnCH9Y8zToy69SK4LvLPhogLTPSx8AJK3UF9";
export declare const SHOPIFY_SHARES: {
    readonly airdrop: 0.9;
    readonly treasury: 0.02;
    readonly infra: 0.03;
    readonly funding: 0;
};
export declare const DIRECT_SOL_SHARES: {
    readonly airdrop: 0.92;
    readonly treasury: 0.015;
    readonly infra: 0.015;
    readonly funding: 0;
};
export declare const ARTIST_TOKEN_SHARE = 0.05;
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
export declare function runStepCapturePrice(purchaseId: string): Promise<number | null>;
/**
 * Step 1a — Buy fan tokens on the bonding curve (using airdrop budget) then
 * airdrop them to the buyer's wallet. This is the GATE: if it fails, all
 * downstream steps are aborted and a failedFulfillments record is written.
 *
 * Idempotency: checked via `airdropCompleted` flag on the purchase record.
 * On success, sets airdropCompleted=true + splTxHash + bondingCurveBuyId + tokenAmount.
 */
export declare function runStepAirdrop(purchaseId: string): Promise<boolean>;
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
export declare function runStepTreasuryTransfer(purchaseId: string): Promise<boolean>;
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
export declare function runStepInfraFee(purchaseId: string): Promise<boolean>;
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
export declare function runStepFundingFee(purchaseId: string): Promise<boolean>;
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
export declare function runStepTokens(purchaseId: string, _env?: Record<string, string>): Promise<boolean>;
/**
 * Buy 5% artist tokens on bonding curve → artist wallet.
 * If tipBps > 0, also send the tip amount in SOL directly to artist.
 * Marks stepPayout = true on success.
 */
export declare function runStepPayout(purchaseId: string): Promise<boolean>;
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
export declare function runStepNft(purchaseId: string): Promise<boolean>;
/**
 * Send buyer notification email.
 * Marks stepNotify = true on success.
 */
export declare function runStepNotify(purchaseId: string): Promise<boolean>;
export interface StepsResult {
    stepCapturePrice: boolean;
    stepTokens: boolean;
    stepAirdrop: boolean;
    stepTreasuryTransfer: boolean;
    stepInfraFee: boolean;
    stepFundingFee: boolean;
    stepPayout: boolean;
    stepNft: boolean;
    stepNotify: boolean;
    finalStatus: 'completed' | 'partial' | 'pending_price_fetch';
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
export declare function runAllSteps(purchaseId: string): Promise<StepsResult>;
