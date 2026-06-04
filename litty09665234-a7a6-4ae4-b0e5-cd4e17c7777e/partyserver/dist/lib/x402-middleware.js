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
import { solana } from '@faremeter/info';
import { hono as middleware } from '@faremeter/middleware';
import * as constants from '../constants';
const PROJECT_VAULT_ADDRESS = constants.PROJECT_VAULT_ADDRESS;
// Configure protected paths here
// Add routes that require payment in the following format:
// {
//   path: '/api/create',
//   method: 'POST',
//   price: '100000', // in USDC base units (6 decimals) - $0.10
// }
export const X402_PROTECTED_PATHS = [
// Example:
// {
//   path: '/api/scouts/create',
//   method: 'POST',
//   price: '150000', // $0.15
// },
];
/**
 * Global x402 middleware that enforces payment on configured routes
 */
export async function x402Middleware(c, next) {
    const path = c.req.path;
    const method = c.req.method;
    // Find matching protected path
    const currentPath = X402_PROTECTED_PATHS.find((p) => p.path === path && p.method === method);
    // If path is not protected, continue without payment
    if (!currentPath) {
        return await next();
    }
    console.log(`[x402] Payment-protected route accessed: ${method} ${path}`);
    // Detect environment (devnet for preview, mainnet-beta for production)
    const env = process.env.ENV || 'PREVIEW';
    const network = env === 'LIVE' ? 'mainnet-beta' : 'devnet';
    console.log('[x402] Creating payment middleware:', JSON.stringify({ network, payTo: PROJECT_VAULT_ADDRESS, price: currentPath.price }));
    // Create the faremeter middleware following the corbits documentation pattern
    const paymentMiddleware = await middleware.createMiddleware({
        facilitatorURL: 'https://facilitator.corbits.io',
        accepts: [
            solana.x402Exact({
                network: network,
                asset: 'USDC',
                amount: currentPath.price,
                payTo: PROJECT_VAULT_ADDRESS,
            }),
        ],
    });
    // Apply the faremeter middleware
    // It will either return a 402 response or call next() if payment is verified
    return await paymentMiddleware(c, next);
}
