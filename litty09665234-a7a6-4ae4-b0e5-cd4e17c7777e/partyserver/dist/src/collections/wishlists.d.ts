import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
/**
 * User wishlists for songs they want to buy. Keyed by user's wallet address for natural uniqueness, one wishlist per user. songIds stores a JSON-serialized array of song IDs.
 */
export interface WishlistsRequest {
    songIds: string;
    updatedAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface WishlistsResponse {
    songIds: string;
    updatedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Wishlists operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildWishlists(walletAddress: string, data: WishlistsRequest): DocumentOperation;
/**
 * Users can only create their own wishlist. The $walletAddress path param must equal the caller's wallet address. songIds is a JSON-serialized string array of song IDs. updatedAt is a Unix timestamp in seconds. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setWishlists(walletAddress: string, data: WishlistsRequest): Promise<boolean>;
export type WishlistsRequestUpdate = Partial<WishlistsRequest>;
/**
 * Build a Wishlists update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateWishlists(walletAddress: string, data: WishlistsRequestUpdate): DocumentOperation;
/**
 * Only the wishlist owner can update their wishlist to add or remove song IDs. songIds and updatedAt are mutable and should be updated together. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateWishlists(walletAddress: string, data: WishlistsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
   (Get Single Item)
 */
export declare function getWishlists(walletAddress: string): Promise<WishlistsResponse | null>;
/**
 * Subscribes to changes in a single Wishlists document. (
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  )
 */
export declare function subscribeWishlists(callback: (data: WishlistsResponse | null) => void, walletAddress: string): Promise<() => Promise<void>>;
/**
 * Get many Wishlists items from collection wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function getManyWishlists(filter?: string): Promise<WishlistsResponse[]>;
/**
 * Subscribe to changes in Wishlists collection at wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function subscribeManyWishlists(callback: (data: WishlistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Wishlists items from collection wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function getAllWishlists(filter?: string): Promise<WishlistsResponse[]>;
/**
 * Subscribe to changes in Wishlists collection at wishlists
 
  Read Operation Details: Private. Only the wishlist owner can read their own wishlist, enforced by matching $walletAddress path param to the caller's wallet.
  
 */
export declare function subscribeAllWishlists(callback: (data: WishlistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
