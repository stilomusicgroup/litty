import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
/**
 * User-submitted support and DMCA takedown requests. Differentiated by type field.
 */
export interface SupportTicketsRequest {
    type: string;
    subject: string;
    message: string;
    status: string;
    userAddress?: AddressType;
    userEmail: string;
    claimantName?: string;
    contentUrl?: string;
    originalWorkUrl?: string;
    goodFaithStatement?: boolean;
    priority: string;
    adminNotes?: string;
    resolution?: string;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
    resolvedAt?: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface SupportTicketsResponse {
    type: string;
    subject: string;
    message: string;
    status: string;
    userAddress?: string;
    userEmail: string;
    claimantName?: string;
    contentUrl?: string;
    originalWorkUrl?: string;
    goodFaithStatement?: boolean;
    priority: string;
    adminNotes?: string;
    resolution?: string;
    createdAt: number;
    resolvedAt?: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a SupportTickets operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildSupportTickets(ticketId: string, data: SupportTicketsRequest): DocumentOperation;
/**
 * Any authenticated user (wallet-connected) or backend vault/operations wallet can create tickets. Frontend should enforce DMCA field completeness. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setSupportTickets(ticketId: string, data: SupportTicketsRequest): Promise<boolean>;
export type SupportTicketsRequestUpdate = Partial<SupportTicketsRequest>;
/**
 * Build a SupportTickets update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateSupportTickets(ticketId: string, data: SupportTicketsRequestUpdate): DocumentOperation;
/**
 * Admin or backend vault/operations only. Used for status changes, priority updates, admin notes, and resolutions. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateSupportTickets(ticketId: string, data: SupportTicketsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
   (Get Single Item)
 */
export declare function getSupportTickets(ticketId: string): Promise<SupportTicketsResponse | null>;
/**
 * Subscribes to changes in a single SupportTickets document. (
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  )
 */
export declare function subscribeSupportTickets(callback: (data: SupportTicketsResponse | null) => void, ticketId: string): Promise<() => Promise<void>>;
/**
 * Get many SupportTickets items from collection supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function getManySupportTickets(filter?: string): Promise<SupportTicketsResponse[]>;
/**
 * Subscribe to changes in SupportTickets collection at supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function subscribeManySupportTickets(callback: (data: SupportTicketsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all SupportTickets items from collection supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function getAllSupportTickets(filter?: string): Promise<SupportTicketsResponse[]>;
/**
 * Subscribe to changes in SupportTickets collection at supportTickets
 
  Read Operation Details: Ticket owner (matching userAddress), admin, project vault, and operations wallet. Anonymous DMCA tickets with null userAddress are readable by admin/backend only.
  
 */
export declare function subscribeAllSupportTickets(callback: (data: SupportTicketsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
