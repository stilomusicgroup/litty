import type { Hono } from 'hono';
/**
 * Register the agent fanout routes on the Hono app. Call this from
 * `partyserver/src/index.ts` BEFORE `registerRoutes(app)` if your app
 * uses Poof's AI agents. Registers:
 *   - /__poof/mcp[/*]    → re-issued to poof-mcp.internal/mcp[*]
 *   - /__poof/ai/*       → re-issued to poof-ai.internal/*
 *   - /__poof/wallet[/*] → re-issued to poof-wallet.internal/exec[*]
 *
 * The wallet route exists for all projects so the template stays uniform;
 * actual wallet exec is gated server-side by POOF_WALLET_ENABLED on the
 * sandbox service plus the per-script DENY_KV. The route itself only
 * fires when the agent's `onchainos` shim issues a request (which only
 * happens when POOF_WALLET_ENABLED is set on this worker).
 */
export declare function registerMcpFanoutRoutes(app: Hono<any>): void;
