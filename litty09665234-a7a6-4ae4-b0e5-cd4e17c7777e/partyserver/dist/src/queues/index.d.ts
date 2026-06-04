/**
 * Queues — asynchronous background job registry.
 *
 * To add a queue consumer:
 * 1. Create a handler file in this directory (e.g. send-email.ts)
 * 2. Import and register it in the `handlers` map below
 * 3. Add the queue entry to queues.json
 * 4. Deploy — Cloudflare Queue resources and bindings are provisioned by Poof
 *
 * In Poof Cloud, user API workers are deployed into a Cloudflare Workers for
 * Platforms dispatch namespace. Cloudflare Queue worker consumers target a
 * platform-owned dispatcher worker, which forwards jobs here through the
 * /__internal/queues/:queueName route. The exported queue() handler remains for
 * local/account-worker compatibility.
 */
import type { Hono } from 'hono';
import type { QueueJobStatus } from '../lib/poof-queue-job-tracker.js';
interface RawQueueMessage {
    id?: string;
    attempts?: number;
    body: unknown;
    ack?: () => void;
    retry?: (options?: {
        delaySeconds?: number;
    }) => void;
}
interface RawQueueBatch {
    queue?: string;
    messages: RawQueueMessage[];
}
export interface QueueJob<TPayload = unknown> {
    queueName: string;
    payload: TPayload;
    /** Poof-tracked queue job id. Present when enqueued with enqueueQueue(). */
    jobId?: string;
    /** Back-compatible alias: tracked job id when present, otherwise Cloudflare message id. */
    id?: string;
    cloudflareMessageId?: string;
    attempts: number;
}
export interface QueueHandlerContext {
    env: Record<string, unknown>;
    ctx?: unknown;
    rawMessage: RawQueueMessage;
    updateStatus: (update: {
        status?: QueueJobStatus;
        message?: string;
        metadata?: Record<string, unknown>;
    }) => Promise<void>;
}
export type QueueHandler<TPayload = unknown> = (job: QueueJob<TPayload>, context: QueueHandlerContext) => Promise<void> | void;
export declare function markQueuePayloadDeadLetter(queueName: string, payload: unknown, env: Record<string, unknown>, options?: {
    id?: string;
    attempts?: number;
    jobId?: string;
}): Promise<void>;
export declare function processQueuePayload(queueName: string, payload: unknown, env: Record<string, unknown>, options?: {
    id?: string;
    attempts?: number;
    jobId?: string;
    ctx?: unknown;
}): Promise<void>;
export declare function processQueueBatch(batch: RawQueueBatch, env: Record<string, unknown>, ctx?: unknown): Promise<void>;
/** Register internal queue dispatch routes used by the platform queue dispatcher. */
export declare function registerQueueRoutes(app: Hono): void;
export {};
