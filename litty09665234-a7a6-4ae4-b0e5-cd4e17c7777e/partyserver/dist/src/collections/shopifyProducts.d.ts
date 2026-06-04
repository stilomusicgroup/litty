import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Maps Shopify product IDs (or variant IDs) to Lit Studios song IDs. Used by the webhook to determine which song an order purchased, and by the frontend to show Buy with Card links.
 */
export interface ShopifyProductsRequest {
    shopifyProductId: string;
    songId: string;
    shopifyVariantId?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ShopifyProductsResponse {
    shopifyProductId: string;
    songId: string;
    shopifyVariantId?: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ShopifyProducts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildShopifyProducts(productId: string, data: ShopifyProductsRequest): DocumentOperation;
/**
 * Any authenticated wallet can create a mapping document. The document ID is the full Shopify product identifier or another app-chosen mapping key, and createdAt must be provided as a Unix timestamp in seconds. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setShopifyProducts(productId: string, data: ShopifyProductsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
   (Get Single Item)
 */
export declare function getShopifyProducts(productId: string): Promise<ShopifyProductsResponse | null>;
/**
 * Subscribes to changes in a single ShopifyProducts document. (
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  )
 */
export declare function subscribeShopifyProducts(callback: (data: ShopifyProductsResponse | null) => void, productId: string): Promise<() => Promise<void>>;
/**
 * Get many ShopifyProducts items from collection shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function getManyShopifyProducts(filter?: string): Promise<ShopifyProductsResponse[]>;
/**
 * Subscribe to changes in ShopifyProducts collection at shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function subscribeManyShopifyProducts(callback: (data: ShopifyProductsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ShopifyProducts items from collection shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function getAllShopifyProducts(filter?: string): Promise<ShopifyProductsResponse[]>;
/**
 * Subscribe to changes in ShopifyProducts collection at shopifyProducts
 
  Read Operation Details: Anyone can read product-to-song mappings so the frontend and backend can resolve Shopify products to Lit Studios songs.
  
 */
export declare function subscribeAllShopifyProducts(callback: (data: ShopifyProductsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count ShopifyProducts items in collection shopifyProducts.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countShopifyProducts(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on ShopifyProducts items in collection shopifyProducts.
 * Returns a single numeric value instead of fetching full documents.
 *
 * Supported operations: 'count', 'uniqueCount', 'sum', 'avg', 'min', 'max'.
 * For 'sum', 'avg', 'min', 'max', and 'uniqueCount', you must provide the field name.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param operation - The aggregate operation to perform
 * @param opts - Options including optional filter prompt and field name
 * @returns AggregateResult with the computed numeric value
 */
export declare function aggregateShopifyProducts(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
