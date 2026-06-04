import { init } from '@pooflabs/server';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { Hono } from 'hono';
import { ApiErrors, requestIdMiddleware } from './lib/api-response.js';
import { getTarobaseServerConfig } from './lib/config.js';
import { corsMiddleware } from './lib/cors-helpers.js';
import { createRequestLogger, globalErrorHandler } from './lib/request-logger.js';
import { x402Middleware } from './lib/x402-middleware.js';
import { registerHeartbeatRoutes } from './heartbeat/index.js';
import { processQueueBatch, registerQueueRoutes } from './queues/index.js';
import { registerRoutes } from './routes/index.js';
import { registerMcpFanoutRoutes } from './lib/poof-mcp-fanout.js';
export { QueueJobTracker } from './lib/poof-queue-job-tracker.js';
// ─── STARTUP ASSERTION: vault key must derive to the known address ────────────
const EXPECTED_VAULT_ADDRESS = '9LLTjsWhYJBxFgca43MQtrLLsPcxWMR86NoxAHGsBUCk';
function assertVaultKey() {
    const key = process.env.PROJECT_VAULT_PRIVATE_KEY;
    if (!key) {
        console.error('FATAL: PROJECT_VAULT_PRIVATE_KEY missing or wrong address');
        throw new Error('FATAL: PROJECT_VAULT_PRIVATE_KEY is not set. Every policy write will be rejected. Fix the secret before starting.');
    }
    try {
        const keypair = Keypair.fromSecretKey(bs58.decode(key));
        const derived = keypair.publicKey.toBase58();
        if (derived !== EXPECTED_VAULT_ADDRESS) {
            console.error(`FATAL: PROJECT_VAULT_PRIVATE_KEY missing or wrong address — derived ${derived} but expected ${EXPECTED_VAULT_ADDRESS}`);
            throw new Error(`FATAL: PROJECT_VAULT_PRIVATE_KEY derives to ${derived} but expected ${EXPECTED_VAULT_ADDRESS}`);
        }
        console.log(`[startup] PROJECT_VAULT_PRIVATE_KEY OK — vault address ${derived}`);
    }
    catch (err) {
        if (err instanceof Error && err.message.startsWith('FATAL:'))
            throw err;
        console.error('FATAL: PROJECT_VAULT_PRIVATE_KEY missing or wrong address — could not decode key:', err);
        throw new Error(`FATAL: PROJECT_VAULT_PRIVATE_KEY could not be decoded: ${err instanceof Error ? err.message : String(err)}`);
    }
}
// Run assertion at module load time (Cloudflare Workers executes top-level code on each cold start).
// In tests / Poofnet the env var may not be set — only assert on preview/live.
if (process.env.ENV === 'PREVIEW' || process.env.ENV === 'LIVE') {
    assertVaultKey();
}
// ─────────────────────────────────────────────────────────────────────────────
const app = new Hono();
// Tarobase initialization - uses this worker's fixed TAROBASE_APP_ID
app.use('*', async (c, next) => {
    if (!process.env.TAROBASE_SOLANA_KEYPAIR && process.env.ADMIN_SOLANA_PRIVATE_KEY) {
        process.env.TAROBASE_SOLANA_KEYPAIR = process.env.ADMIN_SOLANA_PRIVATE_KEY;
    }
    if (process.env.PROJECT_VAULT_PRIVATE_KEY) {
        process.env.TAROBASE_SOLANA_KEYPAIR = process.env.PROJECT_VAULT_PRIVATE_KEY;
    }
    const config = getTarobaseServerConfig();
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
// Register heartbeat routes FIRST so user routes cannot shadow them.
// /__heartbeat/:taskName (manual, admin auth) and /__internal/heartbeat/:taskName (dispatcher, no auth)
registerHeartbeatRoutes(app);
// Register queue routes before user routes so user code cannot shadow them.
// /__internal/queues/:queueName is called by the platform queue dispatcher.
registerQueueRoutes(app);
// Required if this app uses Poof AI agents — /__poof/mcp/* re-issues to
// the platform MCP proxy so DO-originated MCP calls get sealed attribution.
registerMcpFanoutRoutes(app);
// Register all user API routes
registerRoutes(app);
export default {
    fetch: app.fetch,
    queue: processQueueBatch,
};
