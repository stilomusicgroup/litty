/**
 * API Routes - Register all routes here.
 *
 * Two things to do when adding a route:
 * 1. Register the handler with app.get/post/put/delete/patch
 * 2. Add an entry to routeSpec[] so the API spec is generated for the platform
 *
 * For protected routes, use validatePoofAuth:
 *   import { validatePoofAuth } from '../lib/poof-auth.js';
 *   const { walletAddress } = await validatePoofAuth(c);
 */
import { sendSuccess } from '../lib/api-response.js';
export const routeSpec = [
    { method: 'GET', path: '/health', description: 'Health check', auth: false },
    // OAuth routes (uncomment when enabled):
    // { method: 'GET', path: '/api/oauth/callback', description: 'OAuth callback', auth: false },
    // { method: 'GET', path: '/api/social-links/:provider', description: 'Get social link', auth: true },
    // { method: 'DELETE', path: '/api/social-links/:provider', description: 'Unlink social account', auth: true },
    // Add your route specs here:
    // { method: 'GET', path: '/api/items', description: 'List items', auth: false },
    // { method: 'POST', path: '/api/items', description: 'Create item', auth: true },
];
export function registerRoutes(app) {
    // Health check
    app.get('/health', (c) => sendSuccess(c, { status: 'ok', timestamp: Date.now() }));
    // OAuth routes (uncomment to enable):
    // app.get('/api/oauth/callback', oauthCallbackHandler);
    // app.get('/api/social-links/:provider', getSocialLinkHandler);
    // app.delete('/api/social-links/:provider', deleteSocialLinkHandler);
    // Add your routes here:
    // app.get('/api/items', (c) => sendSuccess(c, { items: [] }));
    // app.post('/api/items', async (c) => {
    //   const { walletAddress } = await validatePoofAuth(c);
    //   const body = await c.req.json();
    //   return sendSuccess(c, { created: true });
    // });
}
