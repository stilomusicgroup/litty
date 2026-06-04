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
import type { Hono } from 'hono';
export declare function registerSimulateBuyRoute(app: Hono): void;
