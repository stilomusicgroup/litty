import type { Context } from 'hono';
export declare function getViewerCountry(c: Context): string | null;
export declare function isProgramBlocked(c: Context, program: string): boolean;
export declare function assertProgramAllowed(c: Context, program: string): void;
