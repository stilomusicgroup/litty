import { TimeOperation, IncrementOperation, TokenAmount, AddressType, DocumentOperation } from '../db-client';
/**
 * Offchain notification documents for the Lit Studio music platform. Each document represents a single notification sent to a user (recipient) about an event triggered by another user or the system (actor). Types include likes, follows, reposts, and stream milestones.
 */
export interface NotificationsRequest {
    recipientAddress: AddressType;
    type: string;
    actorAddress: string;
    actorName: string;
    referenceId: string;
    referenceTitle: string;
    message: string;
    isRead: boolean;
    createdAt: number | TimeOperation | IncrementOperation | TokenAmount;
}
export interface NotificationsResponse {
    recipientAddress: string;
    type: string;
    actorAddress: string;
    actorName: string;
    referenceId: string;
    referenceTitle: string;
    message: string;
    isRead: boolean;
    createdAt: number;
    id: string;
    tarobase_created_at: number;
}
/**
 * Build a Notifications operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildNotifications(notificationId: string, data: NotificationsRequest): DocumentOperation;
/**
 * Only the backend server (PROJECT_VAULT_ADDRESS) can create notifications. Frontend clients cannot create notifications directly; they are generated server-side in response to platform events. (Create/Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the write worked.
 */
export declare function setNotifications(notificationId: string, data: NotificationsRequest): Promise<boolean>;
export type NotificationsRequestUpdate = Partial<NotificationsRequest>;
/**
 * Build a Notifications update operation for use with setMany.
 * @returns A DocumentOperation that can be passed to setMany.
 */
export declare function buildUpdateNotifications(notificationId: string, data: NotificationsRequestUpdate): DocumentOperation;
/**
 * Only the recipient can update their own notifications. The typical use case is marking isRead from false to true. No other fields should be modified by recipients. (Update Single Item)
 * @returns A boolean indicating whether the operation succeeded (true) or failed (false). Always check this value to confirm the update worked.
 */
export declare function updateNotifications(notificationId: string, data: NotificationsRequestUpdate): Promise<boolean>;
/**
 *
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
   (Get Single Item)
 */
export declare function getNotifications(notificationId: string): Promise<NotificationsResponse | null>;
/**
 * Subscribes to changes in a single Notifications document. (
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  )
 */
export declare function subscribeNotifications(callback: (data: NotificationsResponse | null) => void, notificationId: string): Promise<() => Promise<void>>;
/**
 * Get many Notifications items from collection notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function getManyNotifications(filter?: string): Promise<NotificationsResponse[]>;
/**
 * Subscribe to changes in Notifications collection at notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function subscribeManyNotifications(callback: (data: NotificationsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
/**
 * Get all Notifications items from collection notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function getAllNotifications(filter?: string): Promise<NotificationsResponse[]>;
/**
 * Subscribe to changes in Notifications collection at notifications
 
  Read Operation Details: Only the recipient of the notification can read it. Authenticated users querying this collection will only see notifications where their wallet address matches recipientAddress.
  
 */
export declare function subscribeAllNotifications(callback: (data: NotificationsResponse[]) => void, filter?: string): Promise<() => Promise<void>>;
