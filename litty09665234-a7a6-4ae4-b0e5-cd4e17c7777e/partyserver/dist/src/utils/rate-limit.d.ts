/**
 * Simple in-memory rate limiters for Cloudflare Workers.
 *
 * Note: These use per-worker memory. In production with multiple workers,
 * limits are approximate. For strict cross-worker limits, use a KV store.
 */
import type { Context } from 'hono';
/**
 * Check if a wallet address has exceeded the buy rate limit.
 * Returns undefined if allowed, or a Response if blocked.
 */
export declare function checkWalletRateLimit(c: Context, walletAddress: string): Response | undefined;
/**
 * Check if a wallet address has exceeded the chat message rate limit.
 * Returns undefined if allowed, or a Response if blocked.
 */
export declare function checkChatRateLimit(c: Context, walletAddress: string): Response | undefined;
/**
 * Hono middleware that enforces a configurable req/min per IP on public routes.
 * Defaults to 60 req/min; pass a lower limit for sensitive financial endpoints.
 */
export declare function ipRateLimitMiddleware(maxRequests?: number): (c: Context, next: () => Promise<void>) => Promise<Response>;
