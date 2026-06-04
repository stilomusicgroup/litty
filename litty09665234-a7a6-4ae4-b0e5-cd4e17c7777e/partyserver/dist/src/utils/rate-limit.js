/**
 * Simple in-memory rate limiters for Cloudflare Workers.
 *
 * Note: These use per-worker memory. In production with multiple workers,
 * limits are approximate. For strict cross-worker limits, use a KV store.
 */
import { sendError } from '../lib/api-response.js';
// NOTE: In-memory Map — limits are approximate under load (best-effort, resets on isolate restart).
const WALLET_RATE_LIMIT_MAP = new Map();
const WALLET_MAX_REQUESTS = 10;
const WALLET_WINDOW_MS = 60000;
/**
 * Check if a wallet address has exceeded the buy rate limit.
 * Returns undefined if allowed, or a Response if blocked.
 */
export function checkWalletRateLimit(c, walletAddress) {
    const now = Date.now();
    const bucket = WALLET_RATE_LIMIT_MAP.get(walletAddress);
    if (!bucket || now >= bucket.resetAt) {
        // First request or window expired — start new window
        WALLET_RATE_LIMIT_MAP.set(walletAddress, { count: 1, resetAt: now + WALLET_WINDOW_MS });
        return undefined;
    }
    if (bucket.count >= WALLET_MAX_REQUESTS) {
        return sendError(c, 'VALIDATION_ERROR', 'Too many buy requests — max 10 per minute', 400);
    }
    bucket.count += 1;
    return undefined;
}
const CHAT_RATE_LIMIT_MAP = new Map();
const CHAT_MAX_MESSAGES = 5;
const CHAT_WINDOW_MS = 10000;
/**
 * Check if a wallet address has exceeded the chat message rate limit.
 * Returns undefined if allowed, or a Response if blocked.
 */
export function checkChatRateLimit(c, walletAddress) {
    const now = Date.now();
    const bucket = CHAT_RATE_LIMIT_MAP.get(walletAddress);
    if (!bucket || now >= bucket.resetAt) {
        CHAT_RATE_LIMIT_MAP.set(walletAddress, { count: 1, resetAt: now + CHAT_WINDOW_MS });
        return undefined;
    }
    if (bucket.count >= CHAT_MAX_MESSAGES) {
        return sendError(c, 'VALIDATION_ERROR', 'Too many messages — max 5 per 10 seconds', 400);
    }
    bucket.count += 1;
    return undefined;
}
// NOTE: In-memory Map — limits are approximate under load (best-effort, resets on isolate restart).
const IP_RATE_LIMIT_MAP = new Map();
const IP_MAX_REQUESTS = 60;
const IP_WINDOW_MS = 60000;
function getClientIp(c) {
    return c.req.header('cf-connecting-ip') ?? 'unknown';
}
/**
 * Hono middleware that enforces a configurable req/min per IP on public routes.
 * Defaults to 60 req/min; pass a lower limit for sensitive financial endpoints.
 */
export function ipRateLimitMiddleware(maxRequests = IP_MAX_REQUESTS) {
    return async (c, next) => {
        const ip = getClientIp(c);
        const key = `${ip}:${maxRequests}`;
        const now = Date.now();
        const bucket = IP_RATE_LIMIT_MAP.get(key);
        if (!bucket || now >= bucket.resetAt) {
            IP_RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + IP_WINDOW_MS });
        }
        else if (bucket.count >= maxRequests) {
            return sendError(c, 'VALIDATION_ERROR', `Too many requests — max ${maxRequests} per minute`, 400);
        }
        else {
            bucket.count += 1;
        }
        await next();
    };
}
