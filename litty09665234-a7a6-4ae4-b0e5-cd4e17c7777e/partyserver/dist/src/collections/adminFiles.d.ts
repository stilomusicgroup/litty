import { FileItem } from '../db-client';
/**
 * Admin-only file storage
 */
/**
 * Handles AdminFiles files (Get Single File based on its ID, null if not found)
 */
export declare function getAdminFiles(fileId: string): Promise<FileItem | null>;
/**
 * Handles AdminFiles files (Upload/Replace a File and persist it keyed by its ID) To get the file URL use the getAdminFiles function right after this one.
 * @returns A boolean indicating whether the upload succeeded (true) or failed (false). Always check this value to confirm the upload worked.
 */
export declare function uploadAdminFiles(fileId: string, file: File): Promise<boolean>;
/**
 * Handles AdminFiles files (Delete File based on its ID)
 * @returns A boolean indicating whether the delete succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteAdminFiles(fileId: string): Promise<boolean>;
