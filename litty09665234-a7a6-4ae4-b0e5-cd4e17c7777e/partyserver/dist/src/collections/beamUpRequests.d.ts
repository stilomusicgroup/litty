import { IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
import type { AggregateResult, AggregateOperation } from '../db-client';
/**
 * Fan-initiated requests to 'beam up' a streaming-only song to a mintable SPL/NFT asset. Tracks who requested the upgrade, optional gas contribution, and approval status from the song artist.
 */
export interface BeamUpRequestsRequest {
    songId: string;
    requesterWallet: AddressType;
    requesterEmail?: string;
    gasTxHash?: string;
    status: string;
    createdAt: number | IncrementOperation | TokenAmount;
}
export interface BeamUpRequestsResponse {
    songId: string;
    requesterWallet: string;
    requesterEmail?: string;
    gasTxHash?: string;
    status: string;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a BeamUpRequests operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildBeamUpRequests(requestId: string, data: BeamUpRequestsRequest): DocumentOperation;
/**
 * Authenticated users can create a beam-up request for any song. Caller must equal @newData.requesterWallet so users can only file requests on their own behalf. Optional email and gas transaction hash can be attached. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setBeamUpRequests(requestId: string, data: BeamUpRequestsRequest): Promise<boolean>;
export type BeamUpRequestsRequestUpdate = Partial<BeamUpRequestsRequest>;
/**
 * Build a BeamUpRequests update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateBeamUpRequests(requestId: string, data: BeamUpRequestsRequestUpdate): DocumentOperation;
/**
 * Two parties can update: (1) the song's artist (matched via get(/songs/<songId>).creator) can approve/reject/complete the request by changing status; (2) the original requester can edit their own request only while status is still 'pending'. The songId field is expected to remain stable; status flows pending -> approved/rejected -> completed. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateBeamUpRequests(requestId: string, data: BeamUpRequestsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
   (Get Single Item)
 */
export declare function getBeamUpRequests(requestId: string): Promise<BeamUpRequestsResponse | null>;
/**
 * Subscribes to changes in a single BeamUpRequests document. (
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  )
 */
export declare function subscribeBeamUpRequests(callback: (data: BeamUpRequestsResponse | null) => void, requestId: string): Promise<() => Promise<void>>;
/**
 * Get many BeamUpRequests items from collection beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function getManyBeamUpRequests(filter?: string): Promise<BeamUpRequestsResponse[]>;
/**
 * Subscribe to changes in BeamUpRequests collection at beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function subscribeManyBeamUpRequests(callback: (data: BeamUpRequestsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all BeamUpRequests items from collection beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function getAllBeamUpRequests(filter?: string): Promise<BeamUpRequestsResponse[]>;
/**
 * Subscribe to changes in BeamUpRequests collection at beamUpRequests
 
  Read Operation Details: Public. Anyone can view beam-up requests to see demand for upgrading streaming songs to mintable assets.
  
 */
export declare function subscribeAllBeamUpRequests(callback: (data: BeamUpRequestsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Count BeamUpRequests items in collection beamUpRequests.
 * Returns a numeric count instead of fetching full documents — much more efficient.
 *
 * NOTE: This only works because the read policy for this collection is "true".
 * @param filter - Optional natural language filter (e.g., "created in the last 7 days")
 * @returns AggregateResult with the count value
 */
export declare function countBeamUpRequests(filter?: string): Promise<AggregateResult>;
/**
 * Run an aggregate operation on BeamUpRequests items in collection beamUpRequests.
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
export declare function aggregateBeamUpRequests(operation: AggregateOperation, opts?: {
    filter?: string;
    field?: string;
}): Promise<AggregateResult>;
