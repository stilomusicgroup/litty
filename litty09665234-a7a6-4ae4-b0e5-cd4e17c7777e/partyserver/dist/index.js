import { init } from '@pooflabs/server';
import { Hono } from 'hono';
import { ApiErrors, requestIdMiddleware } from './lib/api-response.js';
import { getTarobaseServerConfig } from './lib/config.js';
import { corsMiddleware } from './lib/cors-helpers.js';
import { createRequestLogger, globalErrorHandler } from './lib/request-logger.js';
import { x402Middleware } from './lib/x402-middleware.js';
import { registerRoutes } from './routes/index.js';
const app = new Hono();
// Tarobase initialization - with dynamic app ID support
app.use('*', async (c, next) => {
    if (!process.env.TAROBASE_SOLANA_KEYPAIR && process.env.ADMIN_SOLANA_PRIVATE_KEY) {
        process.env.TAROBASE_SOLANA_KEYPAIR = process.env.ADMIN_SOLANA_PRIVATE_KEY;
    }
    if (process.env.PROJECT_VAULT_PRIVATE_KEY) {
        process.env.TAROBASE_SOLANA_KEYPAIR = process.env.PROJECT_VAULT_PRIVATE_KEY;
    }
    const headerAppId = c.req.header('x-tarobase-app-id');
    const config = getTarobaseServerConfig(headerAppId);
    await init(config);
    await next();
});
// Global middleware
// CORS is initialized lazily on first request to ensure process.env is populated
app.use('*', corsMiddleware());
app.use('*', x402Middleware);
app.use('*', requestIdMiddleware());
app.use('*', createRequestLogger());
// Global error handler
app.onError(globalErrorHandler());
// 404 handler for unregistered routes
app.notFound((c) => ApiErrors.notFound(c, 'Route not found'));
// Register all API routes
registerRoutes(app);
export default app;
