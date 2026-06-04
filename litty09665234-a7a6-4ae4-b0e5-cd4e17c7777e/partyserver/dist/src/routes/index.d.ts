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
import type { Hono } from 'hono';
/**
 * Route spec for API documentation/display.
 * Keep this in sync with the actual route registrations below.
 */
export interface RouteSpec {
    method: string;
    path: string;
    description: string;
    auth: boolean;
}
export declare const routeSpec: RouteSpec[];
export declare function registerRoutes(app: Hono): void;
