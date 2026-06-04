import type { Context } from 'hono';
import type { QueueJobRecord, QueueJobStatus, QueueJobStatusUpdate } from './poof-queue-job-tracker.js';
export type { QueueJobRecord, QueueJobStatus } from './poof-queue-job-tracker.js';
export interface EnqueuedQueueJob {
    jobId: string;
    status: QueueJobStatus;
    queueName: string;
}
/**
 * Context shape accepted by the public queue helpers. Anything carrying a
 * Cloudflare Workers `env` bag works:
 * - Hono `Context` from a route handler (`c`)
 * - `QueueHandlerContext` from inside a queue consumer (`context`)
 *
 * This lets handlers call `enqueueQueue(context, ...)` to chain or fan out
 * follow-up jobs without faking a Hono Context.
 */
export type QueueOpsContext = Context | {
    env: Record<string, unknown>;
};
export declare function resolvePoofAppId(env: Record<string, unknown>): string;
export declare function recordQueueJobStatus(env: Record<string, unknown>, appId: string, jobId: string | undefined, update: QueueJobStatusUpdate): Promise<void>;
export declare function getQueueJobStatus(c: QueueOpsContext, jobId: string): Promise<QueueJobRecord | null>;
export declare function listQueueJobs(c: QueueOpsContext, options?: {
    queueName?: string;
    status?: QueueJobStatus;
    limit?: number;
}): Promise<QueueJobRecord[]>;
export declare function streamQueueJobStatus(c: QueueOpsContext, jobId: string): Promise<Response>;
export declare function enqueueQueue(c: QueueOpsContext, queueName: string, payload: unknown, options?: {
    delaySeconds?: number;
    jobId?: string;
}): Promise<EnqueuedQueueJob>;
export declare function enqueueQueueBatch(c: QueueOpsContext, queueName: string, payloads: unknown[], options?: {
    delaySeconds?: number;
    jobIds?: string[];
}): Promise<{
    jobs: EnqueuedQueueJob[];
}>;
