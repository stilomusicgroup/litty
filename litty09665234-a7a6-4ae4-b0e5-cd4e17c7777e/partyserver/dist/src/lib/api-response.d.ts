/**
 * API Response utilities for consistent response handling
 */
import type { Context } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
/**
 * Standard API response type
 */
export type ApiResponse<T = unknown> = {
    success: true;
    data: T;
    timestamp: number;
    requestId?: string;
} | {
    success: false;
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    timestamp: number;
    requestId?: string;
};
/**
 * Common error codes
 */
export declare const ApiErrorCodes: {
    readonly UNAUTHORIZED: "UNAUTHORIZED";
    readonly VALIDATION_ERROR: "VALIDATION_ERROR";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND";
};
export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes];
/**
 * Safely format an error for logging
 */
export declare function formatError(error: unknown): string;
/**
 * Safely stringify an object for logging
 */
export declare function safeStringify(obj: unknown): string;
/**
 * Send a successful JSON response
 */
export declare function sendSuccess<T>(c: Context, data: T, status?: ContentfulStatusCode): Response;
/**
 * Send an error JSON response
 */
export declare function sendError(c: Context, code: ApiErrorCode, message: string, status: ContentfulStatusCode, details?: unknown): Response;
/**
 * Only 5 HTTP status codes: 200, 400, 401, 404, 500
 */
export declare const STANDARD_STATUS_CODES: {
    readonly SUCCESS: 200;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly NOT_FOUND: 404;
    readonly INTERNAL_ERROR: 500;
};
/**
 * Standardized error response helpers
 */
export declare const ApiErrors: {
    badRequest: (c: Context, message?: string, details?: unknown) => Response;
    unauthorized: (c: Context, message?: string) => Response;
    notFound: (c: Context, message?: string) => Response;
    internal: (c: Context, message?: string, details?: unknown) => Response;
};
/**
 * Middleware to add request ID to context
 */
export declare function requestIdMiddleware(): (c: Context, next: () => Promise<void>) => Promise<void>;
