import type { Context, ErrorHandler, Next } from 'hono';
/**
 * Captures ALL requests/responses and errors
 */
export declare function createRequestLogger(): (c: Context, next: Next) => Promise<void>;
/**
 * Global error handler for unhandled exceptions
 */
export declare function globalErrorHandler(): ErrorHandler;
