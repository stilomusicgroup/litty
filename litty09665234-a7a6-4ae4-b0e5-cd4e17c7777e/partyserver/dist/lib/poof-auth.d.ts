/**
 * Poof Authentication Utilities
 *
 * Provides secure authentication validation for Poof ID tokens
 * and wallet address verification for protected API endpoints.
 *
 * Note: Internal references to "Tarobase" refer to Poof's authentication service.
 */
import type { Context } from 'hono';
/**
 * Error types for authentication failures
 */
export declare class AuthenticationError extends Error {
    statusCode: number;
    constructor(message: string, statusCode?: number);
}
/**
 * Validates Poof authentication from request headers.
 *
 * For admin routes: Validates via Session API verify-admin endpoint
 * For normal routes: Validates via Cognito ID token verification using public User Pool ID
 * Use at the start of protected routes that require authentication.
 *
 * @param c - Hono context with request headers
 * @param isAdminRoute - If true, requires admin access to the Poof app
 * @returns Validated wallet address and token
 * @throws AuthenticationError on validation failure
 *
 * @example
 * ```typescript
 * const { walletAddress } = await validatePoofAuth(c);
 * const { walletAddress } = await validatePoofAuth(c, true); // For admin routes
 * ```
 *
 * Required headers:
 * - `Authorization: Bearer <poofIdToken>`
 * - `X-Wallet-Address: <walletAddress>`
 */
export declare function validatePoofAuth(c: Context, isAdminRoute?: boolean): Promise<{
    walletAddress: string;
    poofIdToken: string;
}>;
/**
 * Calls Poof Session API for admin verification
 */
export declare function sessionApi(params: {
    body?: Record<string, unknown>;
    method: string;
    token: string;
    url?: string;
    headers?: Record<string, string>;
}): Promise<any>;
/**
 * Helper function to extract authenticated user data from request
 *
 * @param c - Hono context object
 * @returns { walletAddress: string; poofIdToken: string }
 */
export declare function getAuthenticatedUser(c: Context): {
    walletAddress: string;
    poofIdToken: string;
};
