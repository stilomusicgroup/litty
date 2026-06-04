// Sentinel hostname the outbound worker intercepts. Never resolves in DNS;
// Cloudflare's dispatch runtime hands the request to poof-ai-outbound
// before any resolution happens.
const AI_SENTINEL_URL = 'https://poof-ai.internal/run';
export class AiBlockedError extends Error {
    constructor(message) {
        super(message);
        this.name = 'AiBlockedError';
    }
}
export class AiError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'AiError';
    }
}
function usageFromHeaders(headers) {
    const costCredits = headers.get('x-poof-ai-cost-credits');
    const cloudflareCostUsd = headers.get('x-poof-ai-cloudflare-cost-usd');
    const billableUsd = headers.get('x-poof-ai-billable-usd');
    if (!costCredits || !cloudflareCostUsd || !billableUsd)
        return null;
    return {
        promptTokens: Number(headers.get('x-poof-ai-prompt-tokens') ?? 0),
        completionTokens: Number(headers.get('x-poof-ai-completion-tokens') ?? 0),
        cloudflareCostUsd: Number(cloudflareCostUsd),
        billableUsd: Number(billableUsd),
        costCredits: Number(costCredits),
        estimated: headers.get('x-poof-ai-estimated') === 'true',
        logId: headers.get('x-poof-ai-log-id'),
    };
}
export async function aiRun(_env, model, inputs, options) {
    const res = await fetch(AI_SENTINEL_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ model, inputs, options }),
    });
    if (res.status === 403) {
        const text = await res.text().catch(() => 'blocked');
        throw new AiBlockedError(text);
    }
    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        throw new AiError(text, res.status);
    }
    if (options?.stream) {
        if (!res.body)
            throw new AiError('streaming response missing body', 502);
        return res.body;
    }
    const contentType = res.headers.get('content-type') ?? '';
    if (options?.includeUsage) {
        if (contentType.includes('application/json')) {
            const body = await res.json();
            // Proxy wraps non-streaming includeUsage as `{result, usage}` where
            // `result` is the raw OpenAI Chat Completions response. Pass through.
            if (body &&
                typeof body === 'object' &&
                'result' in body &&
                'usage' in body) {
                return body;
            }
            const usage = usageFromHeaders(res.headers);
            if (!usage)
                throw new AiError('usage metadata missing from AI response', 502);
            return { result: body, usage };
        }
        const usage = usageFromHeaders(res.headers);
        if (!usage)
            throw new AiError('usage metadata missing from AI response', 502);
        return { result: (await res.arrayBuffer()), usage };
    }
    if (!contentType.includes('application/json')) {
        return (await res.arrayBuffer());
    }
    return (await res.json());
}
export async function aiRunForContext(c, model, inputs, options) {
    if (options?.stream) {
        return aiRun(c.env, model, inputs, options);
    }
    if (options?.includeUsage) {
        return aiRun(c.env, model, inputs, options);
    }
    return aiRun(c.env, model, inputs, options);
}
