/**
 * Tarobase Server Configuration
 *
 * Provides per-request app ID override support via HTTP header.
 * When x-tarobase-app-id header is provided, uses offchain RPC.
 */
/**
 * Get RPC URL - offchain if headerAppId provided, otherwise default
 */
export declare function getRpcUrl(headerAppId?: string | null): string | undefined;
/**
 * Build Tarobase server config for init()
 * Call this per-request to support dynamic app ID
 */
export declare function getTarobaseServerConfig(headerAppId?: string | null): {
    rpcUrl?: string;
    chain?: string;
    appId: string;
    apiUrl: string;
    wsApiUrl: string;
    authApiUrl: string;
};
/**
 * Tarobase server configuration for init()
 * Static config for cases where dynamic isn't needed
 */
export declare const TAROBASE_SERVER_CONFIG: {
    readonly rpcUrl?: string;
    readonly appId: string;
    readonly apiUrl: string;
    readonly wsApiUrl: string;
    readonly authApiUrl: string;
};
/**
 * Tarobase Session API URL
 */
export declare const TAROBASE_SESSION_API_URL = "https://auth.tarobase.com";
/**
 * Cognito User Pool ID AND CLIENT ID
 */
export declare const COGNITO_USER_POOL_ID = "us-east-1_Y2DTcFzKs";
export declare const COGNITO_CLIENT_ID = "3q3pcg96g5euesjgoe282jp6k3";
/**
 * OAuth Storage Path Prefix
 *
 * Path prefix for storing OAuth social links in Tarobase.
 * Default: "socialLinks"
 *
 * If your policy already uses "socialLinks" for other purposes, Claude Code will
 * automatically detect this and update this constant to an alternative path
 * (e.g., "oauthConnections", "oauthLinks") when generating the OAuth policy.
 *
 * The path format in storage will be: {OAUTH_STORAGE_PATH}/social:{wallet}:{provider}
 */
export declare const OAUTH_STORAGE_PATH = "socialLinks";
