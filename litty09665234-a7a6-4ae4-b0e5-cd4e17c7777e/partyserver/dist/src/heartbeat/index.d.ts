/**
 * Heartbeat — Scheduled task registry.
 *
 * This module connects heartbeat.json (config) to handler functions.
 * The config defines which tasks exist, their cron expressions, and whether
 * they're enabled. This file maps task names to their implementations.
 *
 * To add a scheduled task:
 * 1. Create a handler file in this directory (e.g., cleanup.ts)
 * 2. Import and register it in the `handlers` map below
 * 3. Add the task entry to heartbeat.json with a cron expression
 * 4. Deploy — schedules are registered with the platform heartbeat dispatcher
 *
 * Per-environment scheduling:
 * - `cron` is the default schedule (used for preview deployments)
 * - `schedule.live` overrides cron, startTime, and/or endTime for production deployments
 *
 * Trigger paths:
 * - Cron: platform dispatcher → /__internal/heartbeat/:taskName (via dispatch namespace)
 * - Manual: UI Run button → platform API → dispatcher → /__internal/heartbeat/:taskName
 * - Admin: POST /__heartbeat/:taskName (requires admin auth)
 *
 * See: .claude/skills/scheduled-tasks/SKILL.md for full guide.
 */
import type { Hono } from 'hono';
export interface HeartbeatTask {
    name: string;
    cron: string;
    handler: string;
    enabled: boolean;
    description?: string;
    /** Per-environment schedule overrides. */
    schedule?: {
        /** Production (live) overrides. Each field falls back to the top-level default. */
        live?: {
            cron?: string;
            startTime?: string;
            endTime?: string;
            enabled?: boolean;
        };
    };
}
/**
 * Run a single task by name. Used for manual triggers via /__heartbeat/:taskName.
 * Throws if the task doesn't exist or has no registered handler.
 */
export declare function runHeartbeatTask(taskName: string): Promise<void>;
/**
 * Register heartbeat routes on the Hono app.
 * Called from src/index.ts to keep routes/index.ts clean and user-editable.
 *
 * Two routes:
 * - POST /__heartbeat/:taskName — Manual trigger (requires admin auth)
 * - POST /__internal/heartbeat/:taskName — Internal trigger from cron dispatcher
 *
 * The internal route requires no auth because access is enforced by two layers:
 * 1. poofproxy blocks all `/__internal/*` requests from the public internet (returns 404)
 * 2. Only the platform-owned heartbeat dispatcher can reach user workers through the
 *    Cloudflare dispatch namespace binding (`poof_apps`), which requires Cloudflare
 *    account access to configure — no user worker can be spoofed into this namespace
 */
export declare function registerHeartbeatRoutes(app: Hono): void;
