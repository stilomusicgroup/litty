/**
 * API Response utilities for consistent response handling
 */
/**
 * Common error codes
 */
export const ApiErrorCodes = {
    UNAUTHORIZED: 'UNAUTHORIZED',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
};
/**
 * Safely format an error for logging
 */
export function formatError(error) {
    if (error === null)
        return 'null';
    if (error === undefined)
        return 'undefined';
    if (typeof error === 'string')
        return error || 'Empty error string';
    const prefix = error instanceof Error ? `${error.message?.trim() || 'No message'} | Full error: ` : '';
    try {
        const str = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        return prefix + (str || 'Empty object');
    }
    catch {
        return prefix + 'Unserializable error';
    }
}
/**
 * Safely stringify an object for logging
 */
export function safeStringify(obj) {
    try {
        return JSON.stringify(obj) || '{}';
    }
    catch {
        return '[Circular or unserializable object]';
    }
}
function generateRequestId() {
    return crypto.randomUUID();
}
/**
 * Send a successful JSON response
 */
export function sendSuccess(c, data, status = 200) {
    const requestId = c.get('requestId') || generateRequestId();
    return c.json({
        success: true,
        data,
        timestamp: Date.now(),
        requestId,
    }, status);
}
/**
 * Send an error JSON response
 */
export function sendError(c, code, message, status, details) {
    const requestId = c.get('requestId') || generateRequestId();
    console.error(`[${requestId}] API Error:`, safeStringify({
        code,
        message,
        status,
        details,
        path: c.req.path,
        method: c.req.method,
    }));
    return c.json({
        success: false,
        error: { code, message, details },
        timestamp: Date.now(),
        requestId,
    }, status);
}
/**
 * Only 5 HTTP status codes: 200, 400, 401, 404, 500
 */
export const STANDARD_STATUS_CODES = {
    SUCCESS: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    INTERNAL_ERROR: 500,
};
/**
 * Standardized error response helpers
 */
export const ApiErrors = {
    badRequest: (c, message = 'Bad request', details) => sendError(c, ApiErrorCodes.VALIDATION_ERROR, message, STANDARD_STATUS_CODES.BAD_REQUEST, details),
    unauthorized: (c, message = 'Authentication required') => sendError(c, ApiErrorCodes.UNAUTHORIZED, message, STANDARD_STATUS_CODES.UNAUTHORIZED),
    notFound: (c, message = 'Resource not found') => sendError(c, ApiErrorCodes.RESOURCE_NOT_FOUND, message, STANDARD_STATUS_CODES.NOT_FOUND),
    internal: (c, message = 'Internal server error', details) => {
        console.error(`[INTERNAL ERROR] ${message}`, safeStringify({ details, path: c.req.path, method: c.req.method }));
        return sendError(c, ApiErrorCodes.INTERNAL_ERROR, message, STANDARD_STATUS_CODES.INTERNAL_ERROR, details);
    },
};
/**
 * Middleware to add request ID to context
 */
export function requestIdMiddleware() {
    return async (c, next) => {
        const requestId = c.req.header('x-request-id') || generateRequestId();
        c.set('requestId', requestId);
        c.header('x-request-id', requestId);
        await next();
    };
}
