/**
 * Tarobase Server Configuration
 *
 * Always uses this worker's fixed TAROBASE_APP_ID from environment.
 * Never trust caller-supplied app IDs on user-facing routes.
 */
/**
 * Get RPC URL - uses this worker's fixed app ID for offchain RPC
 * @param _headerAppId — deprecated, ignored. Kept for backwards compatibility.
 */
export declare function getRpcUrl(_headerAppId?: string | null): string | undefined;
/**
 * Build Tarobase server config for init()
 * Always uses this worker's fixed TAROBASE_APP_ID — never caller-supplied values.
 * @param _headerAppId — deprecated, ignored. Kept for backwards compatibility.
 */
export declare function getTarobaseServerConfig(_headerAppId?: string | null): {
    rpcUrl?: string;
    chain?: string;
    appId: string;
    apiUrl: string;
    wsApiUrl: string;
    authApiUrl: string;
};
/**
 * Tarobase server configuration for init()
 * Static config using this worker's fixed environment values.
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
