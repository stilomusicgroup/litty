import queuesConfig from '../../queues.json';
function envOf(c) {
    return c.env;
}
const MAX_QUEUE_MESSAGE_BYTES = 128000;
const MAX_QUEUE_BATCH_BYTES = 256000;
const MAX_QUEUE_BATCH_SIZE = 100;
const MAX_QUEUE_DELAY_SECONDS = 86400;
const VALID_QUEUE_NAME = /^[a-z0-9][a-z0-9_-]{0,63}$/;
function queueBindingName(queueName) {
    const normalized = queueName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_');
    return `POOF_QUEUE_${normalized}`;
}
function getQueueConfig(queueName) {
    if (!VALID_QUEUE_NAME.test(queueName)) {
        throw new Error(`Invalid queue name: ${queueName}`);
    }
    const queue = queuesConfig.queues.find((entry) => entry.name === queueName);
    if (!queue) {
        throw new Error(`Queue "${queueName}" is not defined in queues.json`);
    }
    if (!queue.enabled) {
        throw new Error(`Queue "${queueName}" is disabled`);
    }
    return queue;
}
function payloadBytes(payload) {
    let serialized;
    try {
        serialized = JSON.stringify(payload);
    }
    catch (error) {
        throw new Error(`Queue payload must be JSON serializable: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (serialized === undefined) {
        throw new Error('Queue payload must be JSON serializable');
    }
    return new TextEncoder().encode(serialized).length;
}
function assertPayloadSize(payload) {
    const bytes = payloadBytes(payload);
    if (bytes > MAX_QUEUE_MESSAGE_BYTES) {
        throw new Error(`Queue payload is ${bytes} bytes; max is ${MAX_QUEUE_MESSAGE_BYTES} bytes`);
    }
    return bytes;
}
function resolveQueue(c, queueName) {
    const queue = getQueueConfig(queueName);
    const binding = queueBindingName(queue.name);
    const env = envOf(c);
    const queueBinding = env[binding];
    if (!queueBinding) {
        throw new Error(`Queue binding "${binding}" is not available. Deploy this worker after editing queues.json.`);
    }
    return queueBinding;
}
export function resolvePoofAppId(env) {
    const appId = env.TAROBASE_APP_ID || process.env.TAROBASE_APP_ID;
    if (typeof appId !== 'string' || !appId) {
        throw new Error('TAROBASE_APP_ID is not available for queue enqueue');
    }
    return appId;
}
function resolveAppId(c) {
    return resolvePoofAppId(envOf(c));
}
function createQueueEnvelope(queueName, appId, payload, jobId) {
    return jobId
        ? { __poofQueue: queueName, __poofAppId: appId, __poofJobId: jobId, payload }
        : { __poofQueue: queueName, __poofAppId: appId, payload };
}
function sendOptions(options) {
    if (options.delaySeconds === undefined)
        return undefined;
    if (!Number.isFinite(options.delaySeconds)) {
        throw new Error('Queue delaySeconds must be a finite number');
    }
    const delaySeconds = Math.floor(options.delaySeconds);
    if (delaySeconds < 0 || delaySeconds > MAX_QUEUE_DELAY_SECONDS) {
        throw new Error(`Queue delaySeconds must be between 0 and ${MAX_QUEUE_DELAY_SECONDS}`);
    }
    return { delaySeconds };
}
function createQueueJobId() {
    const randomPart = globalThis.crypto?.randomUUID?.().replace(/-/g, '').slice(0, 16)
        || Math.random().toString(36).slice(2, 12);
    return `qjob_${Date.now().toString(36)}_${randomPart}`;
}
function resolveTracker(env, appId) {
    const namespace = env.POOF_QUEUE_JOB_TRACKER;
    if (!namespace) {
        throw new Error('POOF_QUEUE_JOB_TRACKER Durable Object binding is not available');
    }
    return namespace.get(namespace.idFromName(appId));
}
async function trackerFetch(env, appId, path, init) {
    return resolveTracker(env, appId).fetch(`https://poof-queue-jobs${path}`, {
        ...init,
        headers: {
            'content-type': 'application/json',
            ...init?.headers,
        },
    });
}
export async function recordQueueJobStatus(env, appId, jobId, update) {
    if (!jobId)
        return;
    const response = await trackerFetch(env, appId, `/jobs/${encodeURIComponent(jobId)}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...update, appId }),
    });
    if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Failed to update queue job ${jobId}: ${response.status}${detail ? ` ${detail}` : ''}`);
    }
}
export async function getQueueJobStatus(c, jobId) {
    const appId = resolveAppId(c);
    const response = await trackerFetch(envOf(c), appId, `/jobs/${encodeURIComponent(jobId)}`);
    if (response.status === 404)
        return null;
    if (!response.ok) {
        throw new Error(`Failed to load queue job ${jobId}: ${response.status}`);
    }
    const body = await response.json();
    return body.job || null;
}
export async function listQueueJobs(c, options = {}) {
    const appId = resolveAppId(c);
    const query = new URLSearchParams();
    if (options.queueName)
        query.set('queueName', options.queueName);
    if (options.status)
        query.set('status', options.status);
    if (options.limit)
        query.set('limit', String(options.limit));
    const suffix = query.toString() ? `?${query}` : '';
    const response = await trackerFetch(envOf(c), appId, `/jobs${suffix}`);
    if (!response.ok) {
        throw new Error(`Failed to list queue jobs: ${response.status}`);
    }
    const body = await response.json();
    return body.jobs || [];
}
export async function streamQueueJobStatus(c, jobId) {
    const appId = resolveAppId(c);
    return resolveTracker(envOf(c), appId)
        .fetch(`https://poof-queue-jobs/jobs/${encodeURIComponent(jobId)}/events`);
}
export async function enqueueQueue(c, queueName, payload, options = {}) {
    const queue = resolveQueue(c, queueName);
    const env = envOf(c);
    const appId = resolveAppId(c);
    const jobId = options.jobId || createQueueJobId();
    const envelope = createQueueEnvelope(queueName, appId, payload, jobId);
    assertPayloadSize(envelope);
    await recordQueueJobStatus(env, appId, jobId, {
        appId,
        queueName,
        status: 'enqueueing',
        delaySeconds: options.delaySeconds,
    });
    // Record queued before sending so a successful queue.send cannot be followed
    // by a tracker write failure that leaves the job stuck at enqueueing.
    await recordQueueJobStatus(env, appId, jobId, {
        appId,
        queueName,
        status: 'queued',
        delaySeconds: options.delaySeconds,
    });
    try {
        await queue.send(envelope, sendOptions(options));
        return { jobId, status: 'queued', queueName };
    }
    catch (error) {
        await recordQueueJobStatus(env, appId, jobId, {
            appId,
            queueName,
            status: 'send_failed',
            error: error instanceof Error ? error.message : String(error),
        }).catch(() => undefined);
        throw error;
    }
}
export async function enqueueQueueBatch(c, queueName, payloads, options = {}) {
    if (payloads.length === 0) {
        throw new Error('Queue batch must include at least one message');
    }
    if (payloads.length > MAX_QUEUE_BATCH_SIZE) {
        throw new Error(`Queue batch has ${payloads.length} messages; max is ${MAX_QUEUE_BATCH_SIZE}`);
    }
    if (options.jobIds && options.jobIds.length !== payloads.length) {
        throw new Error('jobIds length must match payloads length');
    }
    const queue = resolveQueue(c, queueName);
    const env = envOf(c);
    const appId = resolveAppId(c);
    const jobIds = options.jobIds || payloads.map(() => createQueueJobId());
    const messages = payloads.map((payload, index) => {
        const envelope = createQueueEnvelope(queueName, appId, payload, jobIds[index]);
        assertPayloadSize(envelope);
        return { body: envelope };
    });
    const batchBytes = payloadBytes({ messages });
    if (batchBytes > MAX_QUEUE_BATCH_BYTES) {
        throw new Error(`Queue batch is ${batchBytes} bytes; max is ${MAX_QUEUE_BATCH_BYTES}`);
    }
    await Promise.all(jobIds.map((jobId, index) => recordQueueJobStatus(env, appId, jobId, {
        appId,
        queueName,
        status: 'enqueueing',
        delaySeconds: options.delaySeconds,
        metadata: { batchIndex: index, batchSize: payloads.length },
    })));
    // Same ordering as enqueueQueue(): if Cloudflare accepts the batch,
    // status tracking has already moved all jobs past enqueueing.
    await Promise.all(jobIds.map((jobId, index) => recordQueueJobStatus(env, appId, jobId, {
        appId,
        queueName,
        status: 'queued',
        delaySeconds: options.delaySeconds,
        metadata: { batchIndex: index, batchSize: payloads.length },
    })));
    try {
        await queue.sendBatch(messages, sendOptions(options));
        return {
            jobs: jobIds.map((jobId) => ({ jobId, status: 'queued', queueName })),
        };
    }
    catch (error) {
        await Promise.all(jobIds.map((jobId) => recordQueueJobStatus(env, appId, jobId, {
            appId,
            queueName,
            status: 'send_failed',
            error: error instanceof Error ? error.message : String(error),
        }).catch(() => undefined)));
        throw error;
    }
}
