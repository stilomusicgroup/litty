import { Agent } from 'agents';
import { type AgentHandler } from '@flue/sdk/internal';
export declare function definePoofAgent(name: string, handler: AgentHandler): typeof Agent;
export declare function configurePoofAgentsRuntime(webhookAgents: readonly string[]): void;
export declare function configurePoofAIProviders(): void;
/**
 * Run an agent synchronously. Blocks until the handler returns, then
 * returns the parsed result. Use when the run is short and the caller
 * wants the final value inline. For long-running work use
 * `enqueueAgentRun` or `streamAgent`.
 *
 * Continuing a session: pass the same `sessionId` across calls. The DO
 * preserves state.
 */
export declare function runAgent<T = unknown>(env: unknown, name: string, opts: {
    sessionId: string;
    payload: unknown;
}): Promise<T>;
/**
 * Start an agent run in the background. Returns the `runId` immediately
 * (HTTP 202 from the framework). The handler keeps running after this
 * function resolves. Use for fire-and-forget triggers (queue consumers,
 * heartbeat tasks, alarms) or for runs that exceed the calling worker's
 * CPU budget. Poll the result with `getAgentRun` or stream events with
 * `streamAgentRunEvents`.
 */
export declare function enqueueAgentRun(env: unknown, name: string, opts: {
    sessionId: string;
    payload: unknown;
}): Promise<{
    runId: string;
}>;
/**
 * Start an agent run and stream events as Server-Sent Events. Returns
 * the raw SSE Response — typically returned directly from your route
 * handler so the browser receives the live event stream. The stream
 * emits step-by-step events (tool calls, model responses, ...) and
 * closes when the run completes.
 */
export declare function streamAgent(env: unknown, name: string, opts: {
    sessionId: string;
    payload: unknown;
}): Promise<Response>;
/**
 * Fetch the status and final result of a run started earlier (typically
 * via `enqueueAgentRun`). Works regardless of which mode kicked off the
 * run — the framework persists every run record.
 */
export declare function getAgentRun<T = unknown>(env: unknown, name: string, sessionId: string, runId: string): Promise<{
    status: string;
    result?: T;
    error?: string;
}>;
/**
 * Stream events for a specific run as Server-Sent Events. Works for
 * live runs (started via `enqueueAgentRun`) or completed ones (replays
 * persisted events). Returns the raw SSE Response — forward directly
 * from your route handler to the client.
 */
export declare function streamAgentRunEvents(env: unknown, name: string, sessionId: string, runId: string): Promise<Response>;
