export type QueueJobStatus = 'enqueueing' | 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed' | 'dead_lettered' | 'send_failed';
export interface QueueJobEvent {
    status: QueueJobStatus;
    at: number;
    attempts?: number;
    cloudflareMessageId?: string;
    message?: string;
}
export interface QueueJobRecord {
    id: string;
    appId: string;
    queueName: string;
    status: QueueJobStatus;
    createdAt: number;
    updatedAt: number;
    startedAt?: number;
    completedAt?: number;
    failedAt?: number;
    attempts?: number;
    cloudflareMessageId?: string;
    delaySeconds?: number;
    lastError?: string;
    metadata?: Record<string, unknown>;
    events: QueueJobEvent[];
}
export interface QueueJobStatusUpdate {
    appId?: string;
    queueName?: string;
    status: QueueJobStatus;
    attempts?: number;
    cloudflareMessageId?: string;
    delaySeconds?: number;
    error?: string;
    message?: string;
    metadata?: Record<string, unknown>;
}
interface DurableObjectStorageLike {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    list<T>(options?: {
        prefix?: string;
        limit?: number;
        reverse?: boolean;
    }): Promise<Map<string, T>>;
}
interface DurableObjectStateLike {
    storage: DurableObjectStorageLike;
}
/**
 * Durable Object reached through the POOF_QUEUE_JOB_TRACKER binding.
 * Do not proxy PUT/PATCH requests to public clients; mutations are intended
 * for the generated queue runtime and handlers via recordQueueJobStatus().
 */
export declare class QueueJobTracker {
    private state;
    private subscribers;
    constructor(state: DurableObjectStateLike);
    fetch(request: Request): Promise<Response>;
    private getJob;
    private upsertJob;
    private listJobs;
    private streamJobEvents;
    private broadcast;
}
export {};
