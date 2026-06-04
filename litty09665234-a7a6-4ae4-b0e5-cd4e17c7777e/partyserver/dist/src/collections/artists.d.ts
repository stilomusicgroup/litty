import { AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Artist profiles with display name, bio, and verification status.
 */
export interface ArtistsRequest {
    name: string;
    bio?: string;
    profileImage?: string;
    walletAddress: AddressType;
    isVerified: boolean;
    creatorWallet?: AddressType;
    bannerImage?: string;
}
export interface ArtistsResponse {
    name: string;
    bio?: string;
    profileImage?: string;
    walletAddress: string;
    isVerified: boolean;
    creatorWallet?: string;
    bannerImage?: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Artists operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildArtists(artistAddress: string, data: ArtistsRequest): DocumentOperation;
/**
 * Users can only create their own artist profile. The $artistAddress path param must equal the caller's wallet, and walletAddress field must match. isVerified must be set (defaults to false on frontend). creatorWallet is NOT set at creation - it is populated later by the backend. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setArtists(artistAddress: string, data: ArtistsRequest): Promise<boolean>;
export type ArtistsRequestUpdate = Partial<ArtistsRequest>;
/**
 * Build a Artists update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateArtists(artistAddress: string, data: ArtistsRequestUpdate): DocumentOperation;
/**
 * The artist (matching $artistAddress) can update their own profile fields. ADMIN_ADDRESS and PROJECT_VAULT_ADDRESS can also update artist profiles, primarily for toggling isVerified status and for the backend to populate creatorWallet (the Privy-created embedded Solana wallet pubkey). (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateArtists(artistAddress: string, data: ArtistsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can view artist profiles.
   (Get Single Item)
 */
export declare function getArtists(artistAddress: string): Promise<ArtistsResponse | null>;
/**
 * Subscribes to changes in a single Artists document. (
  Read Operation Details: Public read. Anyone can view artist profiles.
  )
 */
export declare function subscribeArtists(callback: (data: ArtistsResponse | null) => void, artistAddress: string): Promise<() => Promise<void>>;
/**
 * Get many Artists items from collection artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function getManyArtists(filter?: string): Promise<ArtistsResponse[]>;
/**
 * Subscribe to changes in Artists collection at artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function subscribeManyArtists(callback: (data: ArtistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Artists items from collection artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function getAllArtists(filter?: string): Promise<ArtistsResponse[]>;
/**
 * Subscribe to changes in Artists collection at artists
 
  Read Operation Details: Public read. Anyone can view artist profiles.
  
 */
export declare function subscribeAllArtists(callback: (data: ArtistsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Artists items in collection artists.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countArtists(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Artists items in collection artists.
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
export declare function aggregateArtists(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
