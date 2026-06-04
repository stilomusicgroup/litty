/**
 * Poof OAuth Integration
 *
 * This module provides utilities for verifying OAuth tokens from Poof's OAuth service.
 * Poof handles the OAuth flow complexity (provider registration, token exchange, etc.)
 * and your app just needs to verify the signed JWT and store the social connection.
 *
 * Security:
 * - All tokens are verified using Poof's public key
 * - Access/refresh tokens are encrypted by Poof before signing
 * - JWTs expire after 5 minutes to prevent replay attacks
 */
/**
 * Supported OAuth providers
 */
export type OAuthProvider = 'twitter' | 'google' | 'discord' | 'github';
/**
 * User profile data from OAuth provider
 */
export interface OAuthProfile {
    /** Provider's unique user ID */
    id: string;
    /** Username or handle (e.g., @username for Twitter) */
    username: string;
    /** Email address (if available and requested) */
    email?: string;
    /** Profile picture URL */
    avatar?: string;
    /** Display name or full name */
    displayName?: string;
    /** Additional provider-specific data */
    metadata?: Record<string, any>;
}
/**
 * OAuth tokens (encrypted by Poof)
 */
export interface OAuthTokens {
    /** Encrypted access token */
    access_token: string;
    /** Encrypted refresh token (if available) */
    refresh_token?: string;
    /** Token expiration timestamp (ms since epoch) */
    expires_at: number;
}
/**
 * Verified Poof OAuth payload
 *
 * WARNING: This payload contains `tokens` and JWT metadata (iat, exp, iss)
 * that MUST NOT be stored in Tarobase. The Tarobase policy only allows 4 fields:
 * wallet, provider, profile (as String), linkedAt.
 * DO NOT spread this payload (...payload) into database writes.
 * Use buildSocialLinkRecord() in oauth-callback.ts instead.
 */
export interface PoofOAuthPayload {
    /** User's wallet address */
    wallet: string;
    /** OAuth provider */
    provider: OAuthProvider;
    /** User profile from provider */
    profile: OAuthProfile;
    /**
     * Encrypted OAuth tokens. DO NOT store in Tarobase - not in the policy schema.
     * Storing causes 'Document contains invalid value for key: tokens' error.
     */
    tokens: OAuthTokens;
    /** JWT issued at (seconds since epoch) */
    iat: number;
    /** JWT expires at (seconds since epoch) */
    exp: number;
    /** JWT issuer (should be 'oauth.poof.new') */
    iss: string;
}
/**
 * Verify a Poof OAuth JWT token
 *
 * @param token - JWT token from Poof OAuth service
 * @returns Decoded and verified payload
 * @throws Error if token is invalid, expired, or has wrong issuer
 *
 * @example
 * ```typescript
 * try {
 *   const payload = verifyPoofOAuthToken(token);
 *   console.log(`User ${payload.wallet} linked ${payload.provider}`);
 *   // Store the connection in your database
 * } catch (error) {
 *   console.error('Invalid OAuth token:', error);
 * }
 * ```
 */
export declare function verifyPoofOAuthToken(token: string): PoofOAuthPayload;
