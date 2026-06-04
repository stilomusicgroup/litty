/**
 * Simple in-memory rate limiters for Cloudflare Workers.
 *
 * Note: These use per-worker memory. In production with multiple workers,
 * limits are approximate. For strict cross-worker limits, use a KV store.
 */

import type { Context } from 'hono';
import { sendError } from '../lib/api-response.js';

// ─── Per-wallet rate limiter (for bonded buys) ───────────────────────────────

interface WalletBucket {
  count: number;
  resetAt: number;
}

// NOTE: In-memory Map — limits are approximate under load (best-effort, resets on isolate restart).
const WALLET_RATE_LIMIT_MAP = new Map<string, WalletBucket>();
const WALLET_MAX_REQUESTS = 10;
const WALLET_WINDOW_MS = 60_000;

/**
 * Check if a wallet address has exceeded the buy rate limit.
 * Returns undefined if allowed, or a Response if blocked.
 */
export function checkWalletRateLimit(c: Context, walletAddress: string): Response | undefined {
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

// ─── Chat message rate limiter ───────────────────────────────────────────────

interface ChatBucket {
  count: number;
  resetAt: number;
}

const CHAT_RATE_LIMIT_MAP = new Map<string, ChatBucket>();
const CHAT_MAX_MESSAGES = 5;
const CHAT_WINDOW_MS = 10_000;

/**
 * Check if a wallet address has exceeded the chat message rate limit.
 * Returns undefined if allowed, or a Response if blocked.
 */
export function checkChatRateLimit(c: Context, walletAddress: string): Response | undefined {
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

// ─── Per-IP rate limiter (for public endpoints) ──────────────────────────────

interface IpBucket {
  count: number;
  resetAt: number;
}

// NOTE: In-memory Map — limits are approximate under load (best-effort, resets on isolate restart).
const IP_RATE_LIMIT_MAP = new Map<string, IpBucket>();
const IP_MAX_REQUESTS = 60;
const IP_WINDOW_MS = 60_000;

function getClientIp(c: Context): string {
  return c.req.header('cf-connecting-ip') ?? 'unknown';
}

/**
 * Hono middleware that enforces a configurable req/min per IP on public routes.
 * Defaults to 60 req/min; pass a lower limit for sensitive financial endpoints.
 */
export function ipRateLimitMiddleware(maxRequests: number = IP_MAX_REQUESTS) {
  return async (c: Context, next: () => Promise<void>) => {
    const ip = getClientIp(c);
    const key = `${ip}:${maxRequests}`;
    const now = Date.now();
    const bucket = IP_RATE_LIMIT_MAP.get(key);

    if (!bucket || now >= bucket.resetAt) {
      IP_RATE_LIMIT_MAP.set(key, { count: 1, resetAt: now + IP_WINDOW_MS });
    } else if (bucket.count >= maxRequests) {
      return sendError(c, 'VALIDATION_ERROR', `Too many requests — max ${maxRequests} per minute`, 400);
    } else {
      bucket.count += 1;
    }

    await next();
  };
}
