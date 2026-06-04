import { IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
/**
 * Daily Apple Pay spending tracker to enforce a $300/day cap. One record per calendar day, keyed by ISO date string.
 */
export interface ApplePayDailyBudgetRequest {
    date: string;
    reservedUsd: number | IncrementOperation | TokenAmount;
    fulfilledUsd: number | IncrementOperation | TokenAmount;
    reservations: string;
    updatedAt: number | IncrementOperation | TokenAmount;
}
export interface ApplePayDailyBudgetResponse {
    date: string;
    reservedUsd: number;
    fulfilledUsd: number;
    reservations: string;
    updatedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a ApplePayDailyBudget operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequest): DocumentOperation;
/**
 * Backend only. PROJECT_VAULT_ADDRESS creates the day's record on first checkout of the day with initial reservedUsd=0, fulfilledUsd=0, reservations='[]'. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequest): Promise<boolean>;
export type ApplePayDailyBudgetRequestUpdate = Partial<ApplePayDailyBudgetRequest>;
/**
 * Build a ApplePayDailyBudget update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequestUpdate): DocumentOperation;
/**
 * Backend only. PROJECT_VAULT_ADDRESS updates reservedUsd (increment on checkout creation, decrement on fulfillment/expiration) and fulfilledUsd (increment on webhook fulfillment). Also updates reservations JSON and updatedAt. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateApplePayDailyBudget(date: string, data: ApplePayDailyBudgetRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
   (Get Single Item)
 */
export declare function getApplePayDailyBudget(date: string): Promise<ApplePayDailyBudgetResponse | null>;
/**
 * Subscribes to changes in a single ApplePayDailyBudget document. (
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  )
 */
export declare function subscribeApplePayDailyBudget(callback: (data: ApplePayDailyBudgetResponse | null) => void, date: string): Promise<() => Promise<void>>;
/**
 * Get many ApplePayDailyBudget items from collection applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function getManyApplePayDailyBudget(filter?: string): Promise<ApplePayDailyBudgetResponse[]>;
/**
 * Subscribe to changes in ApplePayDailyBudget collection at applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function subscribeManyApplePayDailyBudget(callback: (data: ApplePayDailyBudgetResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all ApplePayDailyBudget items from collection applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function getAllApplePayDailyBudget(filter?: string): Promise<ApplePayDailyBudgetResponse[]>;
/**
 * Subscribe to changes in ApplePayDailyBudget collection at applePayDailyBudget
 
  Read Operation Details: Backend only. PROJECT_VAULT_ADDRESS reads the day's record before creating Shopify checkouts to enforce the daily spending cap.
  
 */
export declare function subscribeAllApplePayDailyBudget(callback: (data: ApplePayDailyBudgetResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
