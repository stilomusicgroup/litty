/**
 * Shopify Admin API helper (REST 2024-10)
 *
 * Wraps Shopify Admin REST API calls using X-Shopify-Access-Token auth.
 * All functions accept an `env` object so they work in Cloudflare Workers
 * (no process.env at module scope).
 */
const SHOPIFY_API_VERSION = '2025-04';
function getAdminBaseUrl(env) {
    const domain = env.SHOPIFY_STORE_DOMAIN_V2;
    if (!domain) {
        throw new Error('SHOPIFY_STORE_DOMAIN_V2 not configured');
    }
    return `https://${domain}/admin/api/${SHOPIFY_API_VERSION}`;
}
function getHeaders(env) {
    const token = env.SHOPIFY_ADMIN_API_TOKEN;
    if (!token) {
        throw new Error('Shopify Admin API token not configured');
    }
    // App Automation Tokens start with something other than "shpat_" and require
    // Authorization: Bearer auth. Legacy Custom App tokens start with "shpat_"
    // and use the proprietary X-Shopify-Access-Token header.
    const authHeader = token.startsWith('shpat_')
        ? { 'X-Shopify-Access-Token': token }
        : { 'Authorization': `Bearer ${token}` };
    return {
        ...authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };
}
/**
 * Fetch and verify a Shopify order via the Admin API.
 *
 * NEVER throws. Returns a typed sentinel so callers can decide whether to fall
 * through to HMAC-only verification or hard-reject the webhook. Specifically:
 *
 *  - no_token         → SHOPIFY_ADMIN_API_TOKEN is missing; log once and let
 *                       caller fall through to HMAC-only.
 *  - auth_failed      → Admin API returned 401 or 403; token may be wrong
 *                       format or lack read_orders scope; fall through to
 *                       HMAC-only so purchases are not blocked.
 *  - not_found        → 404; order genuinely absent; caller should return
 *                       HTTP 200 (not 4xx/5xx) to stop Shopify retrying.
 *  - admin_unavailable → Any other network/5xx error from Shopify Admin;
 *                        fall through to HMAC-only.
 *  - verified: true   → Order data is authoritative; use it.
 */
export async function verifyOrderViaAdminApi(env, orderId) {
    if (!env.SHOPIFY_ADMIN_API_TOKEN) {
        console.warn('[ShopifyAdmin] SHOPIFY_ADMIN_API_TOKEN not set — skipping Admin API verification');
        return { verified: false, order: null, reason: 'no_token' };
    }
    let res;
    try {
        const url = `${getAdminBaseUrl(env)}/orders/${orderId}.json`;
        res = await fetch(url, { headers: getHeaders(env) });
    }
    catch (networkErr) {
        console.warn(`[ShopifyAdmin] Network error fetching order ${orderId}: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`);
        return { verified: false, order: null, reason: 'admin_unavailable' };
    }
    if (res.status === 401 || res.status === 403) {
        let errorBody = '';
        try {
            errorBody = await res.text();
        }
        catch { /* ignore */ }
        const token = env.SHOPIFY_ADMIN_API_TOKEN ?? '';
        const tokenPrefix = token.length > 8 ? token.slice(0, 8) + '...' : '(short)';
        const tokenFormat = token.startsWith('shpat_')
            ? 'shpat_ (Custom App token) → using X-Shopify-Access-Token header'
            : token.startsWith('shpca_')
                ? 'shpca_ (Confidential App token) → using Authorization: Bearer header'
                : 'unknown prefix → using Authorization: Bearer header (may be wrong)';
        console.warn(`[ShopifyAdmin] Admin API returned ${res.status} for order ${orderId}. ` +
            `Token prefix: ${tokenPrefix} | Format detected: ${tokenFormat} | ` +
            `Shopify error: ${errorBody.slice(0, 300)} | ` +
            `If 401: token is invalid or expired. If 403: token lacks read_orders scope. ` +
            `Falling through to HMAC-only.`);
        return { verified: false, order: null, reason: 'auth_failed' };
    }
    if (res.status === 404) {
        return { verified: false, order: null, reason: 'not_found' };
    }
    if (!res.ok) {
        console.warn(`[ShopifyAdmin] Admin API returned unexpected status ${res.status} for order ${orderId} — falling through to HMAC-only`);
        return { verified: false, order: null, reason: 'admin_unavailable' };
    }
    try {
        const json = await res.json();
        if (!json.order) {
            console.warn(`[ShopifyAdmin] Admin API returned 200 but no order body for ${orderId}`);
            return { verified: false, order: null, reason: 'admin_unavailable' };
        }
        return { verified: true, order: json.order, reason: null };
    }
    catch (parseErr) {
        console.warn(`[ShopifyAdmin] Failed to parse Admin API response for order ${orderId}: ${parseErr}`);
        return { verified: false, order: null, reason: 'admin_unavailable' };
    }
}
/**
 * Parse Shopify Admin API errors into clear messages.
 */
async function parseShopifyError(res) {
    if (res.status === 401)
        return 'invalid admin token (401 Unauthorized)';
    if (res.status === 403)
        return 'insufficient permissions (403 Forbidden)';
    if (res.status === 404)
        return 'not found (404)';
    if (res.status === 429)
        return 'rate limited (429 Too Many Requests)';
    try {
        const body = await res.text();
        return `Shopify API error ${res.status}: ${body.slice(0, 200)}`;
    }
    catch {
        return `Shopify API error ${res.status}`;
    }
}
/**
 * Fetch a single Shopify order by order number (e.g. "1521" or 1521).
 * Uses the name parameter since Shopify order numbers display as "#1521".
 * Returns the first matching order or null if not found.
 */
export async function getOrderByNumber(env, orderNumber) {
    if (!env.SHOPIFY_ADMIN_API_TOKEN) {
        throw new Error('Shopify Admin API token not configured');
    }
    const name = String(orderNumber).startsWith('#')
        ? String(orderNumber)
        : `#${orderNumber}`;
    const url = `${getAdminBaseUrl(env)}/orders.json?name=${encodeURIComponent(name)}&status=any&limit=1`;
    const res = await fetch(url, { headers: getHeaders(env) });
    if (!res.ok) {
        if (res.status === 404)
            return null;
        const errMsg = await parseShopifyError(res);
        throw new Error(errMsg);
    }
    const json = await res.json();
    const orders = json.orders ?? [];
    return orders.length > 0 ? orders[0] : null;
}
/**
 * Fetch a single Shopify order by its internal numeric/string ID.
 * Returns the order or null if not found.
 */
export async function getOrderById(env, orderId) {
    if (!env.SHOPIFY_ADMIN_API_TOKEN) {
        throw new Error('Shopify Admin API token not configured');
    }
    const url = `${getAdminBaseUrl(env)}/orders/${orderId}.json`;
    const res = await fetch(url, { headers: getHeaders(env) });
    if (!res.ok) {
        if (res.status === 404)
            return null;
        const errMsg = await parseShopifyError(res);
        throw new Error(errMsg);
    }
    const json = await res.json();
    return json.order ?? null;
}
/**
 * Get fulfillment orders for a Shopify order (needed before creating a fulfillment).
 * Returns the list of fulfillment orders associated with the order.
 */
export async function getFulfillmentOrders(env, orderId) {
    const url = `${getAdminBaseUrl(env)}/orders/${orderId}/fulfillment_orders.json`;
    const res = await fetch(url, { headers: getHeaders(env) });
    if (!res.ok) {
        const errMsg = await parseShopifyError(res);
        throw new Error(`getFulfillmentOrders failed: ${errMsg}`);
    }
    const json = await res.json();
    return json.fulfillment_orders ?? [];
}
/**
 * Mark a Shopify order as fulfilled by creating a fulfillment via the Fulfillments API.
 * Requires the fulfillment_order_id obtained from getFulfillmentOrders.
 *
 * Only fulfills OPEN fulfillment orders — skips any that are already fulfilled/closed.
 * Returns the created fulfillment record on success, or throws on API error.
 */
export async function createFulfillment(env, fulfillmentOrderId) {
    const url = `${getAdminBaseUrl(env)}/fulfillments.json`;
    const body = JSON.stringify({
        fulfillment: {
            message: 'Pack fulfilled: tokens delivered on-chain.',
            notify_customer: false,
            line_items_by_fulfillment_order: [
                { fulfillment_order_id: fulfillmentOrderId },
            ],
        },
    });
    const res = await fetch(url, {
        method: 'POST',
        headers: getHeaders(env),
        body,
    });
    if (!res.ok) {
        const errMsg = await parseShopifyError(res);
        throw new Error(`createFulfillment failed: ${errMsg}`);
    }
    const json = await res.json();
    if (!json.fulfillment) {
        throw new Error('createFulfillment: Shopify returned empty fulfillment object');
    }
    return json.fulfillment;
}
/**
 * Convenience wrapper: fetches the order's open fulfillment orders and creates
 * a fulfillment for each open one. This is the correct flow for most digital
 * product stores that use "manual" fulfillment.
 *
 * Returns { fulfilled: true, fulfillmentId } on success, or
 *         { fulfilled: false, reason } if nothing to fulfill or on error.
 *
 * NEVER throws — callers should check the return value and log/store the reason.
 */
export async function fulfillShopifyOrder(env, orderId) {
    let fulfillmentOrders;
    try {
        fulfillmentOrders = await getFulfillmentOrders(env, orderId);
    }
    catch (err) {
        return { fulfilled: false, reason: `getFulfillmentOrders threw: ${err instanceof Error ? err.message : String(err)}` };
    }
    const openOrders = fulfillmentOrders.filter(fo => fo.status === 'open');
    if (openOrders.length === 0) {
        return { fulfilled: false, reason: `No open fulfillment orders for Shopify order ${orderId} (all may already be fulfilled)` };
    }
    // Fulfill each open fulfillment order — typically there is only one.
    let lastFulfillmentId;
    for (const fo of openOrders) {
        try {
            const result = await createFulfillment(env, fo.id);
            lastFulfillmentId = result.id;
            console.log(`[ShopifyFulfill] Created fulfillment ${result.id} for order ${orderId} (fo=${fo.id})`);
        }
        catch (err) {
            return { fulfilled: false, reason: `createFulfillment threw for fo=${fo.id}: ${err instanceof Error ? err.message : String(err)}` };
        }
    }
    return { fulfilled: true, fulfillmentId: lastFulfillmentId };
}
/**
 * List recent Shopify orders (all statuses), newest first.
 * Default limit: 25.
 */
export async function listRecentOrders(env, limit = 25) {
    if (!env.SHOPIFY_ADMIN_API_TOKEN) {
        throw new Error('Shopify Admin API token not configured');
    }
    const url = `${getAdminBaseUrl(env)}/orders.json?status=any&limit=${limit}&order=created_at+desc`;
    const res = await fetch(url, { headers: getHeaders(env) });
    if (!res.ok) {
        const errMsg = await parseShopifyError(res);
        throw new Error(errMsg);
    }
    const json = await res.json();
    return json.orders ?? [];
}
