/**
 * Poof AI helper — the one way to call AI models (Workers AI, OpenAI,
 * Anthropic, Google, xAI, Groq, etc.) from a Poof user worker.
 *
 * Why go through this:
 *   Every AI call is metered to the project's credit budget and rejected
 *   when the project is over its limit, using the same billing pipeline
 *   that handles CPU/request usage. The platform pays Cloudflare for all
 *   inference (Workers AI billed directly, third-party providers via
 *   Cloudflare AI Gateway Unified Billing) and charges your project
 *   credits at exact provider cost × markup. Bypassing this helper means
 *   the call goes nowhere — direct provider SDKs aren't wired into user
 *   workers.
 *
 * How identity works:
 *   The worker simply does `fetch('https://poof-ai.internal/run', ...)`.
 *   Cloudflare's dispatch runtime routes every outbound fetch from this
 *   worker through the platform's outbound worker, which attaches the
 *   dispatcher-supplied script name and forwards to the AI proxy. Nothing
 *   the user worker sets in headers or env affects the attribution — the
 *   script name is sealed by Cloudflare at dispatch time.
 *
 * Model names use Cloudflare AI Gateway's compat format `provider/model`:
 *   - `openai/gpt-4o-mini`
 *   - `anthropic/claude-haiku-4-5`
 *   - `google-ai-studio/gemini-2.5-flash`
 *   - `workers-ai/@cf/meta/llama-3.1-8b-instruct` (or shorthand: `@cf/meta/llama-3.1-8b-instruct`)
 *
 * Return shape: OpenAI Chat Completions, regardless of underlying provider.
 *   {
 *     id, object, created, model,
 *     choices: [{ index, message: { role, content }, finish_reason }],
 *     usage: { prompt_tokens, completion_tokens, total_tokens },
 *   }
 *
 * Usage:
 *   import { aiRun } from './lib/poof-ai.js';
 *   const result = await aiRun(c.env, 'openai/gpt-4o-mini', {
 *     messages: [{ role: 'user', content: 'Hi' }],
 *   });
 *   const text = result.choices[0].message.content;
 *
 * Streaming (OpenAI SSE format):
 *   const stream = await aiRun(c.env, model, { messages }, { stream: true });
 *   return new Response(stream, { headers: { 'content-type': 'text/event-stream' } });
 *
 * With Poof usage/billing metadata:
 *   const { result, usage } = await aiRun(c.env, model, { messages },
 *     { includeUsage: true });
 *   // result.choices[0].message.content is the model output
 *   // usage.costCredits is what got billed against the project
 *
 * Cloudflare Workers AI non-chat models (embeddings, image, audio):
 *   `@cf/baai/bge-*`, `@cf/black-forest-labs/*`, `@cf/openai/whisper-*`,
 *   `@cf/deepgram/*`, `@cf/myshell-ai/*` etc. work through aiRun too —
 *   the proxy auto-routes them to the legacy /workers-ai/{model} endpoint
 *   and returns the model's native shape (e.g. `{data, shape}` for
 *   embeddings, `ArrayBuffer` for image/audio bytes). Type the generic
 *   accordingly. Third-party (OpenAI/Anthropic/etc.) embeddings/image/
 *   audio are NOT wired up — only Cloudflare-hosted non-chat models.
 */
import type { Context } from 'hono';
export interface AiUsage {
    promptTokens: number;
    completionTokens: number;
    cloudflareCostUsd: number;
    billableUsd: number;
    costCredits: number;
    estimated: boolean;
    logId: string | null;
}
export interface AiRunWithUsage<T> {
    result: T;
    usage: AiUsage;
}
export type AiRunOptions = {
    stream?: boolean;
    includeUsage?: boolean;
} & Record<string, unknown>;
type AiRunStreamOptions = AiRunOptions & {
    stream: true;
};
type AiRunWithUsageOptions = AiRunOptions & {
    includeUsage: true;
    stream?: false | undefined;
};
type AiRunPlainOptions = AiRunOptions & {
    stream?: false | undefined;
    includeUsage?: false | undefined;
};
export declare class AiBlockedError extends Error {
    constructor(message: string);
}
export declare class AiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare function aiRun(_env: unknown, model: string, inputs: Record<string, unknown>, options: AiRunStreamOptions): Promise<ReadableStream<Uint8Array>>;
export declare function aiRun<T = unknown>(_env: unknown, model: string, inputs: Record<string, unknown>, options: AiRunWithUsageOptions): Promise<AiRunWithUsage<T>>;
export declare function aiRun<T = unknown>(_env: unknown, model: string, inputs: Record<string, unknown>, options?: AiRunPlainOptions): Promise<T>;
export declare function aiRunForContext(c: Context, model: string, inputs: Record<string, unknown>, options: AiRunStreamOptions): Promise<ReadableStream<Uint8Array>>;
export declare function aiRunForContext<T = unknown>(c: Context, model: string, inputs: Record<string, unknown>, options: AiRunWithUsageOptions): Promise<AiRunWithUsage<T>>;
export declare function aiRunForContext<T = unknown>(c: Context, model: string, inputs: Record<string, unknown>, options?: AiRunPlainOptions): Promise<T>;
export {};
