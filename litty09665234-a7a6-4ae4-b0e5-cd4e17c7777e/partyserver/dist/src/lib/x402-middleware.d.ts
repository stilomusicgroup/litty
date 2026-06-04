/**
 * x402 Payment Middleware
 *
 * Global Hono middleware that enforces payment on specific routes using @x402/hono.
 * Applied globally in index.ts but only activates for configured paid routes.
 *
 * Example usage in index.ts:
 * ```typescript
 * import { x402Middleware } from './lib/x402-middleware.js';
 * app.use('*', x402Middleware);
 * ```
 *
 * To protect a route, add it to the paidRoutes object below:
 * ```typescript
 * 'POST /api/generate': {
 *   accepts: {
 *     scheme: 'exact',
 *     network,
 *     payTo: PROJECT_VAULT_ADDRESS,
 *     price: { asset: 'USDC', amount: '100000' }, // $0.10
 *   },
 * },
 * ```
 */
import type { Context, Next } from 'hono';
export declare const x402Middleware: (c: Context, next: Next) => Promise<void | Response>;
