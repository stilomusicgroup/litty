import { IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
/**
 * Social account linking records created by backend OAuth flow
 */
export interface SocialLinksRequest {
    wallet: AddressType;
    provider: string;
    profile: string;
    linkedAt: number | IncrementOperation | TokenAmount;
}
export interface SocialLinksResponse {
    wallet: string;
    provider: string;
    profile: string;
    linkedAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SocialLinks operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSocialLinks(storageKey: string, data: SocialLinksRequest): DocumentOperation;
/**
 * Backend-only creation via PROJECT_VAULT_ADDRESS. Stores wallet, provider, profile JSON, and linkedAt timestamp. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSocialLinks(storageKey: string, data: SocialLinksRequest): Promise<boolean>;
export type SocialLinksRequestUpdate = Partial<SocialLinksRequest>;
/**
 * Build a SocialLinks update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSocialLinks(storageKey: string, data: SocialLinksRequestUpdate): DocumentOperation;
/**
 * Backend-only updates via PROJECT_VAULT_ADDRESS. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSocialLinks(storageKey: string, data: SocialLinksRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
   (Get Single Item)
 */
export declare function getSocialLinks(storageKey: string): Promise<SocialLinksResponse | null>;
/**
 * Subscribes to changes in a single SocialLinks document. (
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  )
 */
export declare function subscribeSocialLinks(callback: (data: SocialLinksResponse | null) => void, storageKey: string): Promise<() => Promise<void>>;
/**
 * Get many SocialLinks items from collection socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function getManySocialLinks(filter?: string): Promise<SocialLinksResponse[]>;
/**
 * Subscribe to changes in SocialLinks collection at socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeManySocialLinks(callback: (data: SocialLinksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SocialLinks items from collection socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function getAllSocialLinks(filter?: string): Promise<SocialLinksResponse[]>;
/**
 * Subscribe to changes in SocialLinks collection at socialLinks
 
  Read Operation Details: Users can read their own social links by wallet address match, or backend can read via PROJECT_VAULT_ADDRESS.
  
 */
export declare function subscribeAllSocialLinks(callback: (data: SocialLinksResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 *
  Delete Operation Details: Backend-only deletion via PROJECT_VAULT_ADDRESS.
   (Delete Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteSocialLinks(storageKey: string): Promise<boolean>;
/**
 * Build a delete operation for SocialLinks for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildDeleteSocialLinks(storageKey: string): DocumentOperation;
