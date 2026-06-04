import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Offchain audit trail for individual pack purchases. Created and managed exclusively by the backend vault during Shopify webhook fulfillment.
 */
export interface PackPurchasesRequest {
    artistPayout: number | TimeOperation | IncrementOperation | TokenAmount;
    buyerAddress?: AddressType;
    buyerEmail: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    nftCount: number | TimeOperation | IncrementOperation | TokenAmount;
    packId: string;
    packName: string;
    platformSlice: number | TimeOperation | IncrementOperation | TokenAmount;
    shopifyOrderId: string;
    status: string;
    tokenAmount: number | TimeOperation | IncrementOperation | TokenAmount;
    songId?: string;
    nftTxHashes?: string;
    splTxHash?: string;
    artistPayoutUSD?: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutSOL?: number | TimeOperation | IncrementOperation | TokenAmount;
    artistPayoutStatus?: string;
    artistPayoutTxHash?: string;
    solPriceAtPurchase?: number | TimeOperation | IncrementOperation | TokenAmount;
    creatorFeeBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    platformFeeBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    nftRoyaltyBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    infraTxHash?: string;
    nftFailedCount?: number | TimeOperation | IncrementOperation | TokenAmount;
    nftType?: string;
    mintType?: string;
    pendingOversold?: string;
    treasuryTxHash?: string;
    walletSource?: string;
    solToArtist?: number | TimeOperation | IncrementOperation | TokenAmount;
    paymentReconciliation?: string;
    stepTokens?: boolean;
    stepPayout?: boolean;
    stepNft?: boolean;
    stepNotify?: boolean;
    solPriceAtPurchaseUsd?: number | TimeOperation | IncrementOperation | TokenAmount;
    solPriceTimestamp?: number | TimeOperation | IncrementOperation | TokenAmount;
    tipPercent?: number | TimeOperation | IncrementOperation | TokenAmount;
    tipAmountUsd?: number | TimeOperation | IncrementOperation | TokenAmount;
    buyerTokenAmount?: number | TimeOperation | IncrementOperation | TokenAmount;
    artistTokenAmount?: number | TimeOperation | IncrementOperation | TokenAmount;
    treasurySlice?: number | TimeOperation | IncrementOperation | TokenAmount;
    treasuryFeeBps?: number | TimeOperation | IncrementOperation | TokenAmount;
    purchaseAmountUsd?: any;
    reconcileAttempts: number | TimeOperation | IncrementOperation | TokenAmount;
    shopifyFulfilled: boolean;
    swapTxSig: string;
    bondingCurveBuyId: string;
    artistTokenTxHash: string;
    cancelledAt?: number | TimeOperation | IncrementOperation | TokenAmount;
    cancelledBy?: AddressType;
    airdropCompleted?: boolean;
    treasuryTransferCompleted?: boolean;
    infraFeeAccounted?: boolean;
    fundingFeeAccounted?: boolean;
    bondingCurveBuySubmitted?: boolean;
    needsReviewReason?: string;
    failureReason?: string;
}
export interface PackPurchasesResponse {
    artistPayout: number;
    buyerAddress?: string;
    buyerEmail: string;
    createdAt: number;
    nftCount: number;
    packId: string;
    packName: string;
    platformSlice: number;
    shopifyOrderId: string;
    status: string;
    tokenAmount: number;
    songId?: string;
    nftTxHashes?: string;
    splTxHash?: string;
    artistPayoutUSD?: number;
    artistPayoutSOL?: number;
    artistPayoutStatus?: string;
    artistPayoutTxHash?: string;
    solPriceAtPurchase?: number;
    creatorFeeBps?: number;
    platformFeeBps?: number;
    nftRoyaltyBps?: number;
    infraTxHash?: string;
    nftFailedCount?: number;
    nftType?: string;
    mintType?: string;
    pendingOversold?: string;
    treasuryTxHash?: string;
    walletSource?: string;
    solToArtist?: number;
    paymentReconciliation?: string;
    stepTokens?: boolean;
    stepPayout?: boolean;
    stepNft?: boolean;
    stepNotify?: boolean;
    solPriceAtPurchaseUsd?: number;
    solPriceTimestamp?: number;
    tipPercent?: number;
    tipAmountUsd?: number;
    buyerTokenAmount?: number;
    artistTokenAmount?: number;
    treasurySlice?: number;
    treasuryFeeBps?: number;
    purchaseAmountUsd?: any;
    reconcileAttempts: number;
    shopifyFulfilled: boolean;
    swapTxSig: string;
    bondingCurveBuyId: string;
    artistTokenTxHash: string;
    cancelledAt?: number;
    cancelledBy?: string;
    airdropCompleted?: boolean;
    treasuryTransferCompleted?: boolean;
    infraFeeAccounted?: boolean;
    fundingFeeAccounted?: boolean;
    bondingCurveBuySubmitted?: boolean;
    needsReviewReason?: string;
    failureReason?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PackPurchases operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchases(purchaseId: string, data: PackPurchasesRequest): DocumentOperation;
/**
 * The backend signer (either PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET) can create purchase records when Shopify webhooks are received, but ONLY if no document already exists at this path (get(/packPurchases/$purchaseId) == null). Because purchase document IDs are deterministic ('pack-{shopifyOrderId}-{packId}'), this enforces a hard uniqueness constraint on the (shopifyOrderId, packId) tuple at the policy layer — a second creator racing the webhook handler's pre-create existence check will hard-fail rather than silently succeed/overwrite. Accepting both backend constants ensures fulfillment continues to work if OPERATIONS_WALLET is later repointed to a separate signer. Optional fields walletSource, nftType, mintType, infraTxHash, treasuryTxHash, pendingOversold, nftFailedCount, creatorFeeBps, platformFeeBps, treasuryFeeBps, nftRoyaltyBps, solPriceAtPurchaseUsd, solPriceTimestamp, tipPercent, tipAmountUsd, buyerTokenAmount, artistTokenAmount, treasurySlice, purchaseAmountUsd (exact USD amount fan chose to spend, read from Shopify cart attribute amountUsd), and idempotency step flags (stepTokens, stepPayout, stepNft, stepNotify) are written by the backend during fulfillment. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchases(purchaseId: string, data: PackPurchasesRequest): Promise<boolean>;
export type PackPurchasesRequestUpdate = Partial<PackPurchasesRequest>;
/**
 * Build a PackPurchases update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePackPurchases(purchaseId: string, data: PackPurchasesRequestUpdate): DocumentOperation;
/**
 * The backend signer (either PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET) can update purchase records, typically to transition status through the fulfillment lifecycle. Accepting both constants ensures fulfillment continues to work if OPERATIONS_WALLET is later repointed to a separate signer. treasuryFeeBps stores the treasury fee in basis points captured at purchase time alongside creatorFeeBps, platformFeeBps, and nftRoyaltyBps. All fee-bps fields are optional UInt and written by the backend during payout validation. purchaseAmountUsd stores the exact USD amount the fan chose to spend at checkout (source-of-truth for downstream token math). Step flags (stepTokens, stepPayout, stepNft, stepNotify) are toggled to true as each fulfillment step completes; resume endpoint uses these to retry only steps still false. Idempotency flags airdropCompleted, treasuryTransferCompleted, infraFeeAccounted, and fundingFeeAccounted are set to true by fulfillment-steps.ts as each corresponding step (token airdrop, treasury outbound transfer, infra fee accounting, funding fee accounting) succeeds; fulfillment skips already-completed steps on retry. cancelledAt and cancelledBy are set together when an admin cancels a stuck order via the cancel endpoint; status is also set to 'cancelled' in the same write. Webhook re-delivery detection treats records with status='cancelled' as terminal and skips re-fulfillment. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePackPurchases(purchaseId: string, data: PackPurchasesRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
   (Get Single Item)
 */
export declare function getPackPurchases(purchaseId: string): Promise<PackPurchasesResponse | null>;
/**
 * Subscribes to changes in a single PackPurchases document. (
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  )
 */
export declare function subscribePackPurchases(callback: (data: PackPurchasesResponse | null) => void, purchaseId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchases items from collection packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function getManyPackPurchases(filter?: string): Promise<PackPurchasesResponse[]>;
/**
 * Subscribe to changes in PackPurchases collection at packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function subscribeManyPackPurchases(callback: (data: PackPurchasesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchases items from collection packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function getAllPackPurchases(filter?: string): Promise<PackPurchasesResponse[]>;
/**
 * Subscribe to changes in PackPurchases collection at packPurchases
 
  Read Operation Details: PROJECT_VAULT_ADDRESS, OPERATIONS_WALLET, and ADMIN_ADDRESS can read all purchase records for backend fulfillment, retries, and auditing. Backend signs Tarobase requests with PROJECT_VAULT_ADDRESS/OPERATIONS_WALLET (same wallet 9LLTjsWh...) to read purchase state during webhook processing and resume flows.
  
 */
export declare function subscribeAllPackPurchases(callback: (data: PackPurchasesResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Admin-only deletion. PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can delete pack purchase records. Used by the Admin UI's Stuck Orders tab to remove stuck or permanently failed order records that cannot be recovered.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePackPurchases(purchaseId: string): Promise<boolean>;
/**
 * Build a delete operation for PackPurchases for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePackPurchases(purchaseId: string): DocumentOperation;
/**
 * Artist SOL payout triggered by webhook for pack purchases. Transfers 69% of pack price from OPERATIONS_WALLET to song creator.
 */
export interface PackPurchasesPayoutsRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PackPurchasesPayoutsResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a PackPurchasesPayouts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchasesPayouts(purchaseId: string, payoutId: string, data?: PackPurchasesPayoutsRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchasesPayouts(purchaseId: string, payoutId: string, data?: PackPurchasesPayoutsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect artist payout records.
   (Get Single Item)
 */
export declare function getPackPurchasesPayouts(purchaseId: string, payoutId: string): Promise<PackPurchasesPayoutsResponse | null>;
/**
 * Subscribes to changes in a single PackPurchasesPayouts document. (
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  )
 */
export declare function subscribePackPurchasesPayouts(callback: (data: PackPurchasesPayoutsResponse | null) => void, purchaseId: string, payoutId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchasesPayouts items from collection packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function getManyPackPurchasesPayouts(purchaseId: string, filter?: string): Promise<PackPurchasesPayoutsResponse[]>;
/**
 * Subscribe to changes in PackPurchasesPayouts collection at packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function subscribeManyPackPurchasesPayouts(callback: (data: PackPurchasesPayoutsResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchasesPayouts items from collection packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function getAllPackPurchasesPayouts(purchaseId: string, filter?: string): Promise<PackPurchasesPayoutsResponse[]>;
/**
 * Subscribe to changes in PackPurchasesPayouts collection at packPurchases/${purchaseId}/payouts
 
  Read Operation Details: Public read. Anyone can inspect artist payout records.
  
 */
export declare function subscribeAllPackPurchasesPayouts(callback: (data: PackPurchasesPayoutsResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count PackPurchasesPayouts items in collection packPurchases/${purchaseId}/payouts.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countPackPurchasesPayouts(purchaseId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on PackPurchasesPayouts items in collection packPurchases/${purchaseId}/payouts.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregatePackPurchasesPayouts(purchaseId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Infrastructure fee 10% of pack price from OPERATIONS_WALLET to infrastructure wallet for pack purchases.
 */
export interface PackPurchasesInfraFeesRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PackPurchasesInfraFeesResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a PackPurchasesInfraFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchasesInfraFees(purchaseId: string, feeId: string, data?: PackPurchasesInfraFeesRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchasesInfraFees(purchaseId: string, feeId: string, data?: PackPurchasesInfraFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
   (Get Single Item)
 */
export declare function getPackPurchasesInfraFees(purchaseId: string, feeId: string): Promise<PackPurchasesInfraFeesResponse | null>;
/**
 * Subscribes to changes in a single PackPurchasesInfraFees document. (
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  )
 */
export declare function subscribePackPurchasesInfraFees(callback: (data: PackPurchasesInfraFeesResponse | null) => void, purchaseId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchasesInfraFees items from collection packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function getManyPackPurchasesInfraFees(purchaseId: string, filter?: string): Promise<PackPurchasesInfraFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesInfraFees collection at packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function subscribeManyPackPurchasesInfraFees(callback: (data: PackPurchasesInfraFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchasesInfraFees items from collection packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function getAllPackPurchasesInfraFees(purchaseId: string, filter?: string): Promise<PackPurchasesInfraFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesInfraFees collection at packPurchases/${purchaseId}/infraFees
 
  Read Operation Details: Public read. Anyone can inspect infrastructure fee records.
  
 */
export declare function subscribeAllPackPurchasesInfraFees(callback: (data: PackPurchasesInfraFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count PackPurchasesInfraFees items in collection packPurchases/${purchaseId}/infraFees.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countPackPurchasesInfraFees(purchaseId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on PackPurchasesInfraFees items in collection packPurchases/${purchaseId}/infraFees.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregatePackPurchasesInfraFees(purchaseId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
/**
 * Treasury fee 1% of pack price from OPERATIONS_WALLET to treasury wallet for pack purchases.
 */
export interface PackPurchasesTreasuryFeesRequest {
    recipient: AddressType;
    solAmt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PackPurchasesTreasuryFeesResponse {
    recipient: string;
    solAmt: number;
    id: string;
    tarobase_created_at: number;
    tarobase_transaction_hash?: string | undefined;
}
/**
 * Build a PackPurchasesTreasuryFees operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPackPurchasesTreasuryFees(purchaseId: string, feeId: string, data?: PackPurchasesTreasuryFeesRequest): DocumentOperation;
/**
 * Only PROJECT_VAULT_ADDRESS or OPERATIONS_WALLET can trigger payout. Called from backend webhook. The hook transfers SOL from OPERATIONS_WALLET to @newData.recipient. solAmt is in lamports. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPackPurchasesTreasuryFees(purchaseId: string, feeId: string, data?: PackPurchasesTreasuryFeesRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
   (Get Single Item)
 */
export declare function getPackPurchasesTreasuryFees(purchaseId: string, feeId: string): Promise<PackPurchasesTreasuryFeesResponse | null>;
/**
 * Subscribes to changes in a single PackPurchasesTreasuryFees document. (
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  )
 */
export declare function subscribePackPurchasesTreasuryFees(callback: (data: PackPurchasesTreasuryFeesResponse | null) => void, purchaseId: string, feeId: string): Promise<() => Promise<void>>;
/**
 * Get many PackPurchasesTreasuryFees items from collection packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function getManyPackPurchasesTreasuryFees(purchaseId: string, filter?: string): Promise<PackPurchasesTreasuryFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesTreasuryFees collection at packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function subscribeManyPackPurchasesTreasuryFees(callback: (data: PackPurchasesTreasuryFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PackPurchasesTreasuryFees items from collection packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function getAllPackPurchasesTreasuryFees(purchaseId: string, filter?: string): Promise<PackPurchasesTreasuryFeesResponse[]>;
/**
 * Subscribe to changes in PackPurchasesTreasuryFees collection at packPurchases/${purchaseId}/treasuryFees
 
  Read Operation Details: Public read. Anyone can inspect treasury fee records.
  
 */
export declare function subscribeAllPackPurchasesTreasuryFees(callback: (data: PackPurchasesTreasuryFeesResponse[]) => void, purchaseId: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Count PackPurchasesTreasuryFees items in collection packPurchases/${purchaseId}/treasuryFees.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countPackPurchasesTreasuryFees(purchaseId: string, filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on PackPurchasesTreasuryFees items in collection packPurchases/${purchaseId}/treasuryFees.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregatePackPurchasesTreasuryFees(purchaseId: string, operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
