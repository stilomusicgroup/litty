import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
/**
 * Historical portfolio value snapshots per user
 */
export interface PortfolioHistorySnapshotsRequest {
    valueUsd: number | TimeOperation | IncrementOperation | TokenAmount;
    solValue: number | TimeOperation | IncrementOperation | TokenAmount;
    tokenValue: number | TimeOperation | IncrementOperation | TokenAmount;
    timestamp: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface PortfolioHistorySnapshotsResponse {
    valueUsd: number;
    solValue: number;
    tokenValue: number;
    timestamp: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a PortfolioHistorySnapshots operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildPortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequest): DocumentOperation;
/**
 * Users can only create snapshots for their own address. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setPortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequest): Promise<boolean>;
export type PortfolioHistorySnapshotsRequestUpdate = Partial<PortfolioHistorySnapshotsRequest>;
/**
 * Build a PortfolioHistorySnapshots update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdatePortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequestUpdate): DocumentOperation;
/**
 * Users can only update their own snapshots. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updatePortfolioHistorySnapshots(userAddress: string, snapshotId: string, data: PortfolioHistorySnapshotsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Users can only read their own portfolio history snapshots.
   (Get Single Item)
 */
export declare function getPortfolioHistorySnapshots(userAddress: string, snapshotId: string): Promise<PortfolioHistorySnapshotsResponse | null>;
/**
 * Subscribes to changes in a single PortfolioHistorySnapshots document. (
  Read Operation Details: Users can only read their own portfolio history snapshots.
  )
 */
export declare function subscribePortfolioHistorySnapshots(callback: (data: PortfolioHistorySnapshotsResponse | null) => void, userAddress: string, snapshotId: string): Promise<() => Promise<void>>;
/**
 * Get many PortfolioHistorySnapshots items from collection portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function getManyPortfolioHistorySnapshots(userAddress: string, filter?: string): Promise<PortfolioHistorySnapshotsResponse[]>;
/**
 * Subscribe to changes in PortfolioHistorySnapshots collection at portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function subscribeManyPortfolioHistorySnapshots(callback: (data: PortfolioHistorySnapshotsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all PortfolioHistorySnapshots items from collection portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function getAllPortfolioHistorySnapshots(userAddress: string, filter?: string): Promise<PortfolioHistorySnapshotsResponse[]>;
/**
 * Subscribe to changes in PortfolioHistorySnapshots collection at portfolioHistory/${userAddress}/snapshots
 
  Read Operation Details: Users can only read their own portfolio history snapshots.
  
 */
export declare function subscribeAllPortfolioHistorySnapshots(callback: (data: PortfolioHistorySnapshotsResponse[]) => void, userAddress: string, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Users can only delete their own snapshots.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deletePortfolioHistorySnapshots(userAddress: string, snapshotId: string): Promise<boolean>;
/**
 * Build a delete operation for PortfolioHistorySnapshots for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeletePortfolioHistorySnapshots(userAddress: string, snapshotId: string): DocumentOperation;
