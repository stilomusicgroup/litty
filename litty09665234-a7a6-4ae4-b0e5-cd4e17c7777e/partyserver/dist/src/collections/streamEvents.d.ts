import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
/**
 * Individual song play/stream events for time-series analytics and listener behavior tracking.
 */
export interface StreamEventsRequest {
    songId: string;
    userAddress: AddressType;
    duration: number | TimeOperation | IncrementOperation | TokenAmount;
    timestamp: number | TimeOperation | IncrementOperation | TokenAmount;
    source: string;
}
export interface StreamEventsResponse {
    songId: string;
    userAddress: string;
    duration: number;
    timestamp: number;
    source: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a StreamEvents operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildStreamEvents(eventId: string, data: StreamEventsRequest): DocumentOperation;
/**
 * Authenticated users can log their own streams (userAddress must match caller wallet). Backend vault and operations wallet can also log on behalf of users. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setStreamEvents(eventId: string, data: StreamEventsRequest): Promise<boolean>;
/**
 *
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
   (Get Single Item)
 */
export declare function getStreamEvents(eventId: string): Promise<StreamEventsResponse | null>;
/**
 * Subscribes to changes in a single StreamEvents document. (
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  )
 */
export declare function subscribeStreamEvents(callback: (data: StreamEventsResponse | null) => void, eventId: string): Promise<() => Promise<void>>;
/**
 * Get many StreamEvents items from collection streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function getManyStreamEvents(filter?: string): Promise<StreamEventsResponse[]>;
/**
 * Subscribe to changes in StreamEvents collection at streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function subscribeManyStreamEvents(callback: (data: StreamEventsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all StreamEvents items from collection streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function getAllStreamEvents(filter?: string): Promise<StreamEventsResponse[]>;
/**
 * Subscribe to changes in StreamEvents collection at streamEvents
 
  Read Operation Details: Admin, project vault, and operations wallet only. Raw stream events used for time-series analytics dashboards.
  
 */
export declare function subscribeAllStreamEvents(callback: (data: StreamEventsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
