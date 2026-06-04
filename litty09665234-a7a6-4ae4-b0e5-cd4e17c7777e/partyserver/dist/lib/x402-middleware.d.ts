/**
 * x402 Payment Middleware
 *
 * Global Hono middleware that enforces payment on specific routes using faremeter.
 * Applied globally in index.ts but only activates for configured paid routes.
 *
 * Example usage in index.ts:
 * ```typescript
 * import { x402Middleware } from './lib/x402-middleware.js';
 * app.use('*', x402Middleware);
 * ```
 *
 * To protect a route, add it to X402_PROTECTED_PATHS:
 * ```typescript
 * export const X402_PROTECTED_PATHS = [
 *   {
 *     path: '/api/scouts/create',
 *     method: 'POST',
 *     price: '150000', // $0.15 in USDC base units (6 decimals)
 *   },
 * ];
 * ```
 */
import type { Context, Next } from 'hono';
interface ProtectedPath {
    path: string;
    method: string;
    price: string;
}
export declare const X402_PROTECTED_PATHS: ProtectedPath[];
/**
 * Global x402 middleware that enforces payment on configured routes
 */
export declare function x402Middleware(c: Context, next: Next): Promise<void | Response>;
export {};
