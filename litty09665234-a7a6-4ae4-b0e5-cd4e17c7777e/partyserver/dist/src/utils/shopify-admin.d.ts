/**
 * Shopify Admin API helper (REST 2024-10)
 *
 * Wraps Shopify Admin REST API calls using X-Shopify-Access-Token auth.
 * All functions accept an `env` object so they work in Cloudflare Workers
 * (no process.env at module scope).
 */
export interface ShopifyLineItem {
    id: string;
    title: string;
    sku: string;
    quantity: number;
    price: string;
    variant_id: string;
    product_id: string;
    fulfillment_status: string | null;
    name: string;
    properties: Array<{
        name: string;
        value: string;
    }>;
}
export interface ShopifyCustomer {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
}
export interface ShopifyOrder {
    id: string;
    order_number: number;
    name: string;
    email: string;
    financial_status: string;
    fulfillment_status: string | null;
    created_at: string;
    updated_at: string;
    total_price: string;
    subtotal_price: string;
    currency: string;
    note: string | null;
    note_attributes: Array<{
        name: string;
        value: string;
    }>;
    line_items: ShopifyLineItem[];
    customer: ShopifyCustomer | null;
    tags: string;
    cancel_reason: string | null;
    cancelled_at: string | null;
}
export interface ShopifyAdminEnv {
    SHOPIFY_ADMIN_API_TOKEN?: string;
    SHOPIFY_STORE_DOMAIN_V2?: string;
}
export interface AdminVerifyResult {
    verified: boolean;
    order: ShopifyOrder | null;
    reason: 'no_token' | 'auth_failed' | 'not_found' | 'admin_unavailable' | null;
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
export declare function verifyOrderViaAdminApi(env: ShopifyAdminEnv, orderId: string): Promise<AdminVerifyResult>;
/**
 * Fetch a single Shopify order by order number (e.g. "1521" or 1521).
 * Uses the name parameter since Shopify order numbers display as "#1521".
 * Returns the first matching order or null if not found.
 */
export declare function getOrderByNumber(env: ShopifyAdminEnv, orderNumber: string | number): Promise<ShopifyOrder | null>;
/**
 * Fetch a single Shopify order by its internal numeric/string ID.
 * Returns the order or null if not found.
 */
export declare function getOrderById(env: ShopifyAdminEnv, orderId: string): Promise<ShopifyOrder | null>;
export interface ShopifyFulfillmentOrder {
    id: string;
    order_id: string;
    status: string;
    line_items: Array<{
        id: string;
        quantity: number;
    }>;
}
export interface ShopifyFulfillmentResult {
    id: string;
    status: string;
    order_id: string;
    created_at: string;
}
/**
 * Get fulfillment orders for a Shopify order (needed before creating a fulfillment).
 * Returns the list of fulfillment orders associated with the order.
 */
export declare function getFulfillmentOrders(env: ShopifyAdminEnv, orderId: string): Promise<ShopifyFulfillmentOrder[]>;
/**
 * Mark a Shopify order as fulfilled by creating a fulfillment via the Fulfillments API.
 * Requires the fulfillment_order_id obtained from getFulfillmentOrders.
 *
 * Only fulfills OPEN fulfillment orders — skips any that are already fulfilled/closed.
 * Returns the created fulfillment record on success, or throws on API error.
 */
export declare function createFulfillment(env: ShopifyAdminEnv, fulfillmentOrderId: string): Promise<ShopifyFulfillmentResult>;
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
export declare function fulfillShopifyOrder(env: ShopifyAdminEnv, orderId: string): Promise<{
    fulfilled: boolean;
    fulfillmentId?: string;
    reason?: string;
}>;
/**
 * List recent Shopify orders (all statuses), newest first.
 * Default limit: 25.
 */
export declare function listRecentOrders(env: ShopifyAdminEnv, limit?: number): Promise<ShopifyOrder[]>;
