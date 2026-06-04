import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Artist Arena room metadata. Each arena is identified by the artist's wallet address and stores display info and song count for the arena chat room.
 */
export interface ArenasRequest {
    artistAddress: AddressType;
    artistName: string;
    coverImage?: string;
    songCount: number | TimeOperation | IncrementOperation | TokenAmount;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface ArenasResponse {
    artistAddress: string;
    artistName: string;
    coverImage?: string;
    songCount: number;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Arenas operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildArenas(arenaId: string, data?: ArenasRequest): DocumentOperation;
/**
 * Authenticated users can create an arena when an artist uploads their first song. artistAddress must match arenaId. songCount starts at 1. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setArenas(arenaId: string, data?: ArenasRequest): Promise<boolean>;
export type ArenasRequestUpdate = Partial<ArenasRequest>;
/**
 * Build a Arenas update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateArenas(arenaId: string, data: ArenasRequestUpdate): DocumentOperation;
/**
 * Only the artist (matching $arenaId), ADMIN_ADDRESS, or PROJECT_VAULT_ADDRESS can update arena metadata like songCount or coverImage. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateArenas(arenaId: string, data: ArenasRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public read. Anyone can browse available artist arenas.
   (Get Single Item)
 */
export declare function getArenas(arenaId: string): Promise<ArenasResponse | null>;
/**
 * Subscribes to changes in a single Arenas document. (
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  )
 */
export declare function subscribeArenas(callback: (data: ArenasResponse | null) => void, arenaId: string): Promise<() => Promise<void>>;
/**
 * Get many Arenas items from collection arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function getManyArenas(filter?: string): Promise<ArenasResponse[]>;
/**
 * Subscribe to changes in Arenas collection at arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function subscribeManyArenas(callback: (data: ArenasResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Arenas items from collection arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function getAllArenas(filter?: string): Promise<ArenasResponse[]>;
/**
 * Subscribe to changes in Arenas collection at arenas
 
  Read Operation Details: Public read. Anyone can browse available artist arenas.
  
 */
export declare function subscribeAllArenas(callback: (data: ArenasResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count Arenas items in collection arenas.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countArenas(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on Arenas items in collection arenas.
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
export declare function aggregateArenas(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
