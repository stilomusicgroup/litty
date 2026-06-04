/**
 * POST /api/artists/ensure-wallet
 *
 * Creates a Privy embedded Solana wallet for the authenticated artist and
 * writes the resulting address to the `creatorWallet` field on their artist record.
 *
 * Idempotent: if creatorWallet is already set, returns the existing value immediately
 * without calling Privy again.
 */
import type { Hono } from 'hono';
export declare function registerArtistWalletRoutes(app: Hono): void;
