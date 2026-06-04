/**
 * Social Links Routes
 *
 * These routes allow querying and managing linked social accounts.
 * Users can view their connected providers and unlink accounts.
 *
 * To enable these routes:
 * 1. Uncomment the imports and registrations in routes/index.ts
 * 2. Deploy your app
 */
import type { Context } from 'hono';
export declare function getSocialLinkHandler(c: Context): Promise<Response>;
export declare function deleteSocialLinkHandler(c: Context): Promise<Response>;
