/**
 * Bonding curve buy simulation endpoint.
 *
 * Performs comprehensive pre-flight checks before a user submits a bonding-curve buy:
 *  1. Token graduation status (buy only works on bonding curve)
 *  2. Buyer SOL balance vs estimated total cost
 *  3. Pump.fun bonding-curve viability (reserves, expected output)
 *  4. Solana RPC transaction simulation for network/payer health
 *
 * Returns ok=true only when all checks pass. Frontend must call this
 * BEFORE setSongsBuys and abort the buy if ok=false.
 */
import { PublicKey, ComputeBudgetProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { sendSuccess, ApiErrors } from '../lib/api-response.js';
import { validatePoofAuth } from '../lib/poof-auth.js';
import { createConnection } from '../utils/rpc-client.js';
import { runGetTokenMintAddressQueryForSongs, runGetBondingCurveProgressQueryForSongs } from '../collections/songs.js';
import { PLATFORM_FEE_BPS } from '../constants.js';
const MIN_BALANCE_BUFFER_LAMPORTS = 500000; // 0.0005 SOL buffer
const ATA_RENT_LAMPORTS = 2039280; // rent-exempt balance for associated token account
const TX_FEE_LAMPORTS = 15000; // generous tx fee estimate
async function fetchPumpFunCoin(mintAddress) {
    try {
        const url = `https://frontend-api.pump.fun/coins/${mintAddress}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok)
            return null;
        return (await res.json());
    }
    catch {
        return null;
    }
}
export function registerSimulateBuyRoute(app) {
    app.post('/api/songs/:songId/simulate-buy', async (c) => {
        const { walletAddress } = await validatePoofAuth(c);
        const songId = c.req.param('songId');
        if (!songId) {
            return ApiErrors.badRequest(c, 'songId is required');
        }
        let body;
        try {
            body = await c.req.json();
        }
        catch {
            return ApiErrors.badRequest(c, 'Invalid JSON body');
        }
        const { solAmt, slipBps, walletAddress: bodyWallet } = body;
        if (!solAmt || solAmt <= 0) {
            return ApiErrors.badRequest(c, 'solAmt must be > 0');
        }
        if (slipBps == null || slipBps < 0) {
            return ApiErrors.badRequest(c, 'slipBps is required');
        }
        if (bodyWallet !== walletAddress) {
            return ApiErrors.badRequest(c, 'walletAddress mismatch');
        }
        const errors = [];
        const warnings = [];
        // ─── 1. Resolve mint address ─────────────────────────────────────────────
        let mintAddress = null;
        try {
            mintAddress = await runGetTokenMintAddressQueryForSongs(songId);
        }
        catch (err) {
            console.error('[simulate-buy] mint query failed:', err);
        }
        if (!mintAddress) {
            errors.push('Token mint address not found — song may not be launched yet.');
            return sendSuccess(c, { ok: false, errors, warnings });
        }
        // ─── 2. Check graduation status ──────────────────────────────────────────
        let bondingCurveProgress = 0;
        try {
            bondingCurveProgress = await runGetBondingCurveProgressQueryForSongs(songId);
        }
        catch (err) {
            console.error('[simulate-buy] bonding curve progress query failed:', err);
        }
        if (bondingCurveProgress >= 100) {
            errors.push('Token has graduated to PumpSwap — bonding curve buys are no longer available. Use Jupiter swap instead.');
        }
        // ─── 3. Check buyer SOL balance ──────────────────────────────────────────
        const connection = await createConnection(c.env);
        const buyerPubkey = new PublicKey(walletAddress);
        let buyerBalanceLamports = 0;
        try {
            buyerBalanceLamports = await connection.getBalance(buyerPubkey, 'confirmed');
        }
        catch (err) {
            console.error('[simulate-buy] getBalance failed:', err);
            errors.push('Unable to verify SOL balance — RPC error. Try again shortly.');
        }
        const platformFeeLamports = Math.floor((solAmt * Number(PLATFORM_FEE_BPS)) / 10000);
        // Assume ATA may need creation (worst case)
        const estimatedTotalLamports = solAmt + platformFeeLamports + TX_FEE_LAMPORTS + ATA_RENT_LAMPORTS + MIN_BALANCE_BUFFER_LAMPORTS;
        if (buyerBalanceLamports < estimatedTotalLamports) {
            const deficit = ((estimatedTotalLamports - buyerBalanceLamports) / 1000000000).toFixed(6);
            errors.push(`Insufficient SOL balance. Need ~${(estimatedTotalLamports / 1000000000).toFixed(6)} SOL ` +
                `(includes ${(solAmt / 1000000000).toFixed(4)} buy + platform fee + tx fee + possible ATA rent). ` +
                `You are short ~${deficit} SOL.`);
        }
        // ─── 4. Pump.fun bonding-curve viability ─────────────────────────────────
        let estimatedTokensOut = 0;
        let currentPriceSol = null;
        const coin = await fetchPumpFunCoin(mintAddress);
        if (coin) {
            const vsr = Number(coin.virtual_sol_reserves);
            const vtr = Number(coin.virtual_token_reserves);
            const totalSupply = Number(coin.total_supply);
            if (vsr > 0 && vtr > 0 && totalSupply > 0) {
                currentPriceSol = (vsr / 1e9) / (vtr / 1e6);
                // Pump.fun bonding curve formula: tokens_out = vToken * solIn / (vSol + solIn)
                const solIn = solAmt;
                const vSolLamports = vsr;
                const vTokenBase = vtr;
                estimatedTokensOut = (vTokenBase * solIn) / (vSolLamports + solIn);
                // Check if buy would exceed bonding curve limits
                if (solIn >= vSolLamports) {
                    warnings.push('Buy amount is very large relative to bonding curve reserves — price impact may be extreme.');
                }
            }
            else {
                warnings.push('Pump.fun returned incomplete bonding curve data — simulation may be less accurate.');
            }
        }
        else {
            warnings.push('Unable to fetch live Pump.fun data — proceeding without bonding-curve viability check.');
        }
        // ─── 5. Solana transaction simulation ────────────────────────────────────
        // Build a test VersionedTransaction to verify payer health and RPC simulation.
        // We include a compute-budget instruction to make the TX structurally similar
        // to a real transaction (has instructions, accounts, etc).
        try {
            const testInstructions = [
                ComputeBudgetProgram.setComputeUnitLimit({ units: 1400000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
            ];
            const { blockhash } = await connection.getLatestBlockhash('confirmed');
            const testMessage = new TransactionMessage({
                payerKey: buyerPubkey,
                recentBlockhash: blockhash,
                instructions: testInstructions,
            }).compileToV0Message();
            const testTransaction = new VersionedTransaction(testMessage);
            const simResult = await connection.simulateTransaction(testTransaction, {
                replaceRecentBlockhash: true,
                sigVerify: false,
                commitment: 'confirmed',
            });
            if (simResult.value.err) {
                const logs = simResult.value.logs?.join(' | ') || 'No logs';
                errors.push(`Solana transaction simulation failed: ${JSON.stringify(simResult.value.err)}. Logs: ${logs}`);
            }
            else if (simResult.value.unitsConsumed && simResult.value.unitsConsumed > 1300000) {
                warnings.push('High compute unit consumption detected — transaction may fail due to compute limits.');
            }
        }
        catch (simErr) {
            console.error('[simulate-buy] simulateTransaction failed:', simErr);
            errors.push('RPC simulation error — network may be congested. Try again shortly.');
        }
        // ─── 6. Slippage sanity check ────────────────────────────────────────────
        if (slipBps < 100) {
            warnings.push('Slippage is very tight (<1%) — transaction may fail due to price movement.');
        }
        const ok = errors.length === 0;
        return sendSuccess(c, {
            ok,
            errors,
            warnings,
            estimatedTokensOut: Math.floor(estimatedTokensOut),
            currentPriceSol,
            buyerBalanceLamports,
            estimatedTotalLamports,
            mintAddress,
            bondingCurveProgress,
        });
    });
}
