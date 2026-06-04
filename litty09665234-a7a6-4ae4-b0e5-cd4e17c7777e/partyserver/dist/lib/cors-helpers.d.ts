import { Context, Next } from 'hono';
/**
 * CORS configuration options for different environments
 */
export interface CORSConfig {
    /** List of allowed origins for CORS */
    allowedOrigins: string[];
    /** HTTP methods to allow */
    allowedMethods: string[];
    /** Headers to allow in requests */
    allowedHeaders: string[];
    /** Headers to expose to the client */
    exposedHeaders: string[];
    /** Whether to allow credentials */
    allowCredentials: boolean;
    /** Max age for preflight cache */
    maxAge: number;
}
/**
 * Default CORS configuration
 */
export declare const DEFAULT_CORS_CONFIG: CORSConfig;
/**
 * Generate CORS configuration based on environment and custom domains
 */
export declare function generateCORSConfig(environment: 'development' | 'production', customDomains?: string[], overrides?: Partial<CORSConfig>): CORSConfig;
/**
 * Check if an origin is allowed based on the CORS config
 */
export declare function isOriginAllowed(origin: string | null, config: CORSConfig): boolean;
/**
 * CORS middleware for Hono
 */
export declare function corsMiddleware(config?: CORSConfig): (c: Context, next: Next) => Promise<Response>;
/**
 * Utility to get CORS domains from environment variables
 */
export declare function getCORSDomainsFromEnv(): {
    development: string[];
    production: string[];
    taskId?: string;
    appId?: string;
};
/**
 * Initialize CORS configuration based on environment
 *
 * Uses ENV variable (PREVIEW/LIVE) to determine which domain list to use:
 *   - ENV=PREVIEW (draft, mainnet-preview) → CORS_DEV_DOMAINS
 *   - ENV=LIVE (production) → CORS_PROD_DOMAINS
 *
 * NOTE: We use ENV instead of NODE_ENV because Cloudflare Workers override
 * NODE_ENV to "production" regardless of wrangler.toml settings.
 */
export declare function initializeCORS(environment?: 'development' | 'production'): CORSConfig;
/**
 * Route-specific CORS configuration override
 * Use this to customize CORS for specific routes
 */
export declare function routeCORS(routeOverrides: Partial<CORSConfig>, baseConfig?: CORSConfig): (c: Context, next: Next) => Promise<Response>;
