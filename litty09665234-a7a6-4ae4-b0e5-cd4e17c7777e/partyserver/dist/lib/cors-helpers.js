// ═══════════════════════════════════════════════════════════════
// CORS Configuration and Middleware Utilities
//
// Poof has three deployment tiers, each with its own frontend domain:
//   - Draft (ENV=PREVIEW):          <slug>-preview.poof.new         → uses CORS_DEV_DOMAINS
//   - Mainnet Preview (ENV=LIVE):   <slug>-mainnet-preview.poof.new → uses CORS_PROD_DOMAINS
//   - Live (ENV=LIVE):              <slug>.poof.new + custom domains → uses CORS_PROD_DOMAINS
//
// CORS domains are computed during deployment by corsManager.ts and injected
// into wrangler.toml as CORS_DEV_DOMAINS and CORS_PROD_DOMAINS.
//
// CORS_PROD_DOMAINS includes both <slug>.poof.new AND <slug>-mainnet-preview.poof.new
// so both live and mainnet-preview frontends can call the production-like API.
// ═══════════════════════════════════════════════════════════════
/**
 * Default CORS configuration
 */
export const DEFAULT_CORS_CONFIG = {
    allowedOrigins: [], // Will be populated by environment
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Accept',
        'Origin',
        'X-Requested-With',
        'X-Request-ID',
        'X-Wallet-Address',
        'x-api-key',
        'x-schedule-id',
        'x-tarobase-app-id',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
    allowCredentials: true,
    maxAge: 86400, // 24 hours
};
/**
 * Generate CORS configuration based on environment and custom domains
 */
export function generateCORSConfig(environment, customDomains = [], overrides = {}) {
    const commonOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'https://localhost:3000',
        'https://localhost:3001',
    ];
    // Convert custom domains to full URLs (both https and http for dev flexibility)
    const customOrigins = customDomains.flatMap((domain) => [
        `https://${domain}`,
        `http://${domain}`,
    ]);
    // Combine all origins
    const allOrigins = [...commonOrigins, ...customOrigins];
    return {
        ...DEFAULT_CORS_CONFIG,
        allowedOrigins: allOrigins,
        ...overrides,
    };
}
/**
 * Check if an origin is allowed based on the CORS config
 */
export function isOriginAllowed(origin, config) {
    if (!origin)
        return false;
    // Check exact matches
    if (config.allowedOrigins.includes(origin)) {
        return true;
    }
    return false;
}
// Cached CORS config - initialized lazily on first request
let cachedCORSConfig = null;
/**
 * Get or initialize CORS config (lazy initialization to ensure process.env is populated)
 *
 * IMPORTANT: This must be lazy because Cloudflare Workers don't populate process.env
 * until the first request comes in, even with nodejs_compat_populate_process_env flag.
 */
function getOrInitCORSConfig(providedConfig) {
    if (providedConfig && providedConfig !== DEFAULT_CORS_CONFIG) {
        return providedConfig;
    }
    if (!cachedCORSConfig) {
        cachedCORSConfig = initializeCORS();
    }
    return cachedCORSConfig;
}
/**
 * CORS middleware for Hono
 */
export function corsMiddleware(config) {
    return async (c, next) => {
        // Lazy initialization - ensures process.env is populated in Cloudflare Workers
        const effectiveConfig = getOrInitCORSConfig(config);
        const origin = c.req.header('Origin');
        // Handle preflight OPTIONS requests
        if (c.req.method === 'OPTIONS') {
            const isAllowed = origin ? isOriginAllowed(origin, effectiveConfig) : false;
            if (origin && isAllowed) {
                c.res.headers.set('Access-Control-Allow-Origin', origin);
                if (effectiveConfig.allowCredentials) {
                    c.res.headers.set('Access-Control-Allow-Credentials', 'true');
                }
                c.res.headers.set('Access-Control-Allow-Methods', effectiveConfig.allowedMethods.join(', '));
                c.res.headers.set('Access-Control-Allow-Headers', effectiveConfig.allowedHeaders.join(', '));
                c.res.headers.set('Access-Control-Max-Age', effectiveConfig.maxAge.toString());
                return new Response('', { status: 204 });
            }
            else {
                console.warn('[CORS] Preflight rejected:', { origin, allowedCount: effectiveConfig.allowedOrigins.length });
                return new Response('CORS preflight failed', { status: 403 });
            }
        }
        await next();
        // Set CORS headers for actual requests
        const isAllowed = origin ? isOriginAllowed(origin, effectiveConfig) : false;
        if (origin && isAllowed) {
            c.res.headers.set('Access-Control-Allow-Origin', origin);
            if (effectiveConfig.allowCredentials) {
                c.res.headers.set('Access-Control-Allow-Credentials', 'true');
            }
            if (effectiveConfig.exposedHeaders.length > 0) {
                c.res.headers.set('Access-Control-Expose-Headers', effectiveConfig.exposedHeaders.join(', '));
            }
        }
    };
}
/**
 * Utility to get CORS domains from environment variables
 */
export function getCORSDomainsFromEnv() {
    // These are set during deployment via wrangler.toml [vars]
    const devDomains = process.env.CORS_DEV_DOMAINS?.split(',').filter(Boolean) || [];
    const prodDomains = process.env.CORS_PROD_DOMAINS?.split(',').filter(Boolean) || [];
    const taskId = process.env.CORS_TASK_ID;
    const appId = process.env.CORS_APP_ID;
    return {
        development: devDomains,
        production: prodDomains,
        taskId,
        appId,
    };
}
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
export function initializeCORS(environment) {
    // Use ENV (PREVIEW/LIVE) instead of NODE_ENV since Cloudflare Workers overrides NODE_ENV
    const env = environment || (process.env.ENV === 'LIVE' ? 'production' : 'development');
    const corsInfo = getCORSDomainsFromEnv();
    // For development (draft + mainnet-preview), include task and app specific domains
    const developmentDomains = [
        ...corsInfo.development,
        ...(corsInfo.taskId ? [`${corsInfo.taskId}.poof.new`] : []),
        ...(corsInfo.appId ? [`${corsInfo.appId}.poof.new`] : []),
    ];
    // Select domains based on environment
    const domains = env === 'production' ? corsInfo.production : developmentDomains;
    const config = generateCORSConfig(env, domains);
    return config;
}
/**
 * Route-specific CORS configuration override
 * Use this to customize CORS for specific routes
 */
export function routeCORS(routeOverrides, baseConfig) {
    const base = baseConfig || initializeCORS();
    return corsMiddleware({
        ...base,
        ...routeOverrides,
    });
}
