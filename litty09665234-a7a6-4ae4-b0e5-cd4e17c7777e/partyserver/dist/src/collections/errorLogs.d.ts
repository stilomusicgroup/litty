import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
/**
 * Centralized error log collection for frontend and backend errors, warnings, and informational events.
 */
export interface ErrorLogsRequest {
    level: string;
    message: string;
    stack?: string;
    context?: string;
    source: string;
    userAddress?: AddressType;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    environment: string;
    appVersion: string;
    resolved: boolean;
}
export interface ErrorLogsResponse {
    level: string;
    message: string;
    stack?: string;
    context?: string;
    source: string;
    userAddress?: string;
    createdAt: number;
    environment: string;
    appVersion: string;
    resolved: boolean;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ErrorLogs operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildErrorLogs(logId: string, data: ErrorLogsRequest): DocumentOperation;
/**
 * Any authenticated user or backend vault/operations wallet can report errors. Frontend should capture component and action context. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setErrorLogs(logId: string, data: ErrorLogsRequest): Promise<boolean>;
export type ErrorLogsRequestUpdate = Partial<ErrorLogsRequest>;
/**
 * Build a ErrorLogs update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateErrorLogs(logId: string, data: ErrorLogsRequestUpdate): DocumentOperation;
/**
 * Admin or backend vault/operations only. Used to mark errors as resolved or add resolution notes. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateErrorLogs(logId: string, data: ErrorLogsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
   (Get Single Item)
 */
export declare function getErrorLogs(logId: string): Promise<ErrorLogsResponse | null>;
/**
 * Subscribes to changes in a single ErrorLogs document. (
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  )
 */
export declare function subscribeErrorLogs(callback: (data: ErrorLogsResponse | null) => void, logId: string): Promise<() => Promise<void>>;
/**
 * Get many ErrorLogs items from collection errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function getManyErrorLogs(filter?: string): Promise<ErrorLogsResponse[]>;
/**
 * Subscribe to changes in ErrorLogs collection at errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function subscribeManyErrorLogs(callback: (data: ErrorLogsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ErrorLogs items from collection errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function getAllErrorLogs(filter?: string): Promise<ErrorLogsResponse[]>;
/**
 * Subscribe to changes in ErrorLogs collection at errorLogs
 
  Read Operation Details: Admin, project vault, and operations wallet only. Sensitive error details are not publicly accessible.
  
 */
export declare function subscribeAllErrorLogs(callback: (data: ErrorLogsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
