import { TimeOperation, IncrementOperation, TokenAmount, DocumentOperation } from '../db-client';
/**
 * Audit trail for pack fulfillment costs - records estimated and actual SOL costs per order for operations wallet monitoring. Created and managed exclusively by the backend vault.
 */
export interface OperationsFulfillmentCostsRequest {
    orderId: string;
    nftCount: number | TimeOperation | IncrementOperation | TokenAmount;
    estimatedCostSOL: number | TimeOperation | IncrementOperation | TokenAmount;
    actualCostSOL?: number | TimeOperation | IncrementOperation | TokenAmount;
    timestamp: number | TimeOperation | IncrementOperation | TokenAmount;
    status: string;
}
export interface OperationsFulfillmentCostsResponse {
    orderId: string;
    nftCount: number;
    estimatedCostSOL: number;
    actualCostSOL?: number;
    timestamp: number;
    status: string;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a OperationsFulfillmentCosts operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildOperationsFulfillmentCosts(costId: string, data?: OperationsFulfillmentCostsRequest): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) or OPERATIONS_WALLET can create fulfillment cost records. orderId, nftCount, estimatedCostSOL, and timestamp are immutable. status must be 'success' or 'insufficient_funds'. actualCostSOL is optional and set post-fulfillment. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setOperationsFulfillmentCosts(costId: string, data?: OperationsFulfillmentCostsRequest): Promise<boolean>;
export type OperationsFulfillmentCostsRequestUpdate = Partial<OperationsFulfillmentCostsRequest>;
/**
 * Build a OperationsFulfillmentCosts update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateOperationsFulfillmentCosts(costId: string, data: OperationsFulfillmentCostsRequestUpdate): DocumentOperation;
/**
 * Only the backend vault (PROJECT_VAULT_ADDRESS) or OPERATIONS_WALLET can update records, typically to set actualCostSOL after fulfillment completes. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateOperationsFulfillmentCosts(costId: string, data: OperationsFulfillmentCostsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
   (Get Single Item)
 */
export declare function getOperationsFulfillmentCosts(costId: string): Promise<OperationsFulfillmentCostsResponse | null>;
/**
 * Subscribes to changes in a single OperationsFulfillmentCosts document. (
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  )
 */
export declare function subscribeOperationsFulfillmentCosts(callback: (data: OperationsFulfillmentCostsResponse | null) => void, costId: string): Promise<() => Promise<void>>;
/**
 * Get many OperationsFulfillmentCosts items from collection operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function getManyOperationsFulfillmentCosts(filter?: string): Promise<OperationsFulfillmentCostsResponse[]>;
/**
 * Subscribe to changes in OperationsFulfillmentCosts collection at operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeManyOperationsFulfillmentCosts(callback: (data: OperationsFulfillmentCostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all OperationsFulfillmentCosts items from collection operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function getAllOperationsFulfillmentCosts(filter?: string): Promise<OperationsFulfillmentCostsResponse[]>;
/**
 * Subscribe to changes in OperationsFulfillmentCosts collection at operationsFulfillmentCosts
 
  Read Operation Details: ADMIN_ADDRESS, PROJECT_VAULT_ADDRESS, and OPERATIONS_WALLET can read fulfillment cost records for operations wallet monitoring and auditing. OPERATIONS_WALLET added for forward compatibility in case it later diverges from PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeAllOperationsFulfillmentCosts(callback: (data: OperationsFulfillmentCostsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
