import { FileItem } from '../db-client';
/**
 * App user uploaded files
 */
/**
 * Handles AppFiles files (Get Single File based on its ID, null if not found)
 */
export declare function getAppFiles(fileId: string): Promise<FileItem | null>;
/**
 * Handles AppFiles files (Upload/Replace a File and persist it keyed by its ID) To get the file URL use the getAppFiles function right after this one.
 * @returns A boolean indicating whether the upload succeeded (true) or failed (false). Always check this value to confirm the upload worked.
 */
export declare function uploadAppFiles(fileId: string, file: File): Promise<boolean>;
/**
 * Handles AppFiles files (Delete File based on its ID)
 * @returns A boolean indicating whether the delete succeeded (true) or failed (false). Always check this value to confirm the delete worked.
 */
export declare function deleteAppFiles(fileId: string): Promise<boolean>;
