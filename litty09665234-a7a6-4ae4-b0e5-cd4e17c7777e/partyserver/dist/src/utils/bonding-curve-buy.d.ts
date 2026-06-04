/**
 * Bonding curve buy → vault helper.
 *
 * Songs are launched via @PumpFunPlugin.createToken, so the entire token
 * supply lives in the bonding-curve PDA — the project vault never holds
 * song tokens. The airdrop hook on songs/$songId/airdrops transfers FROM
 * PROJECT_VAULT_ADDRESS, so it silently fails for fresh songs unless we
 * first buy tokens into the vault.
 *
 * This helper makes that happen before each setSongsAirdrops call:
 *   1. Project vault signs setSongsPayouts on songs/$songId/payouts/$id
 *      with recipient=PROJECT_VAULT_ADDRESS so OPERATIONS_WALLET (which
 *      actually holds SOL) sends SOL to the vault for the buy.
 *   2. Project vault signs setSongsBuys on songs/$songId/buys/$id; the
 *      onchain hook calls @PumpFunPlugin.buyExactSolIn(@user.address, ...),
 *      so vault pays SOL and tokens land in the vault. The hook also
 *      charges a 2% SOL platform fee, so we fund a bit extra.
 *
 * Idempotency is enforced via deterministic IDs derived from the
 * purchaseId, so retries / reconciliation runs do not double-buy.
 */
export declare const PUMPFUN_BUY_PLATFORM_FEE_BPS = 200;
export declare const PUMPFUN_BUY_SLIPPAGE_BPS = 500;
export declare const VAULT_SOL_BUFFER_LAMPORTS = 5000000;
export interface EstimateBuyArgs {
    packPriceUsdCents: number;
    tokenAmount: number;
    pricePerTokenUsd?: number;
    solUsd: number;
}
export type EstimateBuyResult = {
    buyLamports: number;
    feeLamports: number;
    totalLamports: number;
} | {
    buyLamports: 0;
    feeLamports: 0;
    totalLamports: 0;
    error: string;
};
/**
 * Estimate the SOL (in lamports) required to buy `tokenAmount` song tokens
 * on the bonding curve, including the 2% PumpFun platform fee and a
 * slippage buffer.
 *
 * Returns an error when price data is unavailable — never guesses a fallback
 * price, because an arbitrary estimate can cause users to submit transactions
 * expecting prices that are wildly off.
 */
export declare function estimateBondingCurveBuyLamports(args: EstimateBuyArgs): EstimateBuyResult;
export interface EnsureVaultArgs {
    songId: string;
    /** Used to derive a deterministic buyId — retries reuse the same buy. */
    purchaseId: string;
    packPriceUsdCents: number;
    tokenAmount: number;
    pricePerTokenUsd?: number;
    solUsd: number;
    /**
     * If provided, bypasses estimateBondingCurveBuyLamports entirely and uses
     * this lamport amount as the buy size (before adding the PumpFun fee and
     * vault buffer). Use this when the caller has already computed the exact
     * SOL budget from purchaseAmountUsd × share / solPriceUsd.
     */
    solAmtOverrideLamports?: number;
    /** Optional callback to persist reconciliation errors to the database.
     *  Called with the error reason before returning ok=false. Use this to
     *  write the failure reason to a packPurchases or similar record so the
     *  admin dashboard can surface the real cause. */
    onError?: (reason: string) => Promise<void>;
}
export interface EnsureVaultResult {
    ok: boolean;
    reason?: string;
    buyId?: string;
    buyLamports?: number;
    /** Number of tokens now in the vault after this buy (base units). */
    tokensReceived?: number;
}
/**
 * Ensure the project vault holds song tokens before a setSongsAirdrops call.
 *
 * Steps (all signed by the default backend client = PROJECT_VAULT_ADDRESS):
 *   1. setSongsPayouts({ recipient: VAULT, solAmt }) → ops wallet sends SOL
 *      to the project vault.
 *   2. setSongsBuys({ solAmt, slip }) → vault swaps that SOL for song
 *      tokens via @PumpFunPlugin.buyExactSolIn. Tokens land in the vault.
 *
 * Returns ok=false with a reason on failure so callers can surface
 * an accurate error and skip the airdrop.
 */
export declare function ensureVaultHasSongTokens(args: EnsureVaultArgs): Promise<EnsureVaultResult>;
export interface BondingCurveSellArgs {
    songId: string;
    mintAddress: string;
    tokenAmount: number;
    walletAddress: string;
    slippageBps?: number;
    execute?: boolean;
}
export interface BondingCurveSellResult {
    ok: boolean;
    signature?: string;
    solReceived?: number;
    quoteOutLamports?: number;
    tokenAmountBaseUnits?: number;
    reason?: string;
}
/**
 * Fetch a Jupiter sell quote for song tokens and optionally execute the swap
 * via setSongsSwaps (vault-signed). When execute=false, returns the quote
 * so the frontend can execute with the user's wallet.
 */
export declare function bondingCurveSell(_env: Record<string, string>, args: BondingCurveSellArgs): Promise<BondingCurveSellResult>;
