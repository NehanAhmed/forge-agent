import type { OpenRouterCore } from '@openrouter/sdk/core';
import type { RequestOptions } from '@openrouter/sdk/lib/sdks';
import type * as models from '@openrouter/sdk/models';
import type { CallModelInput } from '../lib/async-params.js';
import type { ModelResult } from '../lib/model-result.js';
import type { StateAccessor, Tool } from '../lib/tool-types.js';
/**
 * Thrown by {@link resumeToolResults} (and the deferred tool `.resolve()` /
 * `.fail()` / `.cancel()` methods) when the target task was already settled —
 * the at-most-once guard against double resolution and replayed webhooks.
 * Opt out per call with `ifSettled: 'ignore'`.
 */
export declare class ToolTaskAlreadySettledError extends Error {
    readonly taskId: string;
    readonly callId: string;
    constructor(taskId: string, callId: string);
}
/**
 * One task resolution: identified by `taskId` (typical — it's what the
 * external system knows) or `callId`, carrying either a successful `output`
 * or an `error`. `status` refines error deliveries (default `'failed'`).
 */
export type ResumeToolResultEntry = ({
    taskId: string;
    callId?: never;
} | {
    callId: string;
    taskId?: never;
}) & ({
    output: unknown;
    error?: never;
} | {
    error: string;
    output?: never;
    status?: 'failed' | 'cancelled' | 'expired';
});
/**
 * Run configuration for continuing the conversation immediately after
 * recording the results. Any `CallModelInput` field except `state` / `input`
 * (the SDK supplies both — the resumed history already carries everything).
 */
export type ResumeRunConfig<TTools extends readonly Tool[]> = Omit<CallModelInput<TTools>, 'state' | 'input' | 'approveToolCalls' | 'rejectToolCalls'>;
/**
 * The `tool_task_result` envelope injected as a user-role message when an
 * async tool's result arrives. Never a second `function_call_output` — the
 * pending placeholder already paired the original `function_call` in
 * history, and providers reject duplicate outputs for one callId.
 */
export interface ToolTaskResultEnvelope {
    type: 'tool_task_result';
    tool: string;
    taskId: string;
    callId: string;
    status: 'completed' | 'failed' | 'cancelled' | 'timed_out' | 'expired';
    result?: unknown;
    error?: string;
}
/** Build the user-role message carrying a task-result envelope. */
export declare function buildTaskResultMessage(envelope: ToolTaskResultEnvelope): models.BaseInputsUnion;
/**
 * Deliver results for pending async tool tasks (started by `tool.deferred`,
 * or background tasks orphaned across a run boundary) into a persisted
 * conversation — typically from a different process than the one that
 * started them (a webhook handler, a queue worker).
 *
 * This is the low-level, untyped entry point; prefer the typed `.resolve()`
 * / `.fail()` / `.cancel()` methods on the deferred tool itself, which
 * check `output` against the tool's `outputSchema` at compile time.
 *
 * Behavior:
 * 1. Loads the conversation via `state`, resolves each entry to a pending
 *    task (by `taskId` or `callId`).
 * 2. Enforces at-most-once settlement: an already-settled task throws
 *    {@link ToolTaskAlreadySettledError} (or is skipped with
 *    `ifSettled: 'ignore'`).
 * 3. Validates each `output` against the named tool's `outputSchema` when
 *    the tool is present in `tools` — an invalid payload throws before
 *    anything is persisted or dispatched.
 * 4. Appends a `tool_task_result` envelope (user-role message) per entry,
 *    marks the tasks settled, and persists the state. The conversation
 *    status becomes `'in_progress'` (or stays `'awaiting_async_tools'` when
 *    other tasks are still pending).
 * 5. With `run` config: continues the conversation immediately and returns
 *    the `ModelResult`. Without: returns `null` — the recorded results ride
 *    along on the next `callModel({ state })`. When every entry was skipped
 *    under `ifSettled: 'ignore'` there is nothing new to deliver, so the
 *    function returns `null` WITHOUT running — a replayed webhook never
 *    triggers a duplicate continuation.
 *
 * SECURITY: this call injects a value the model will treat as a tool
 * result. Authenticate the webhook/caller BEFORE invoking it — the SDK
 * cannot do that for you. And PASS `tools`: without it the output is
 * appended UNVALIDATED (no outputSchema to check against) — prefer the
 * typed `.resolve()` methods, which always carry the tool's schema.
 *
 * CONCURRENCY: this is a read-modify-write over the StateAccessor. Two
 * concurrent calls for the SAME conversation (e.g. two webhooks resolving
 * two different tasks) can interleave load/save and the later save wins,
 * silently dropping the earlier envelope. Serialize calls per conversation
 * — a per-conversation lock or queue in your StateAccessor, or batch
 * concurrent completions into one call via `results: [...]` (which settles
 * any number of tasks atomically).
 *
 * HOOKS: PostToolUse / PostToolUseFailure do NOT fire here — hooks are
 * run-scoped (a HooksManager passed to `callModel`), and this entry point
 * runs outside any run, typically in another process. Deployments that
 * audit tool outputs via hooks should scan webhook payloads in the webhook
 * handler itself. In-process settlements (background tasks) DO fire these
 * hooks at delivery.
 */
export declare function resumeToolResults<TTools extends readonly Tool[]>(client: OpenRouterCore, request: {
    state: StateAccessor<TTools>;
    /** Tools list — used to validate outputs against each tool's outputSchema. */
    tools?: TTools;
    results: ReadonlyArray<ResumeToolResultEntry>;
    /** Behavior when a task is already settled. Default 'throw'. */
    ifSettled?: 'throw' | 'ignore';
    /** Continue the conversation immediately with this run configuration. */
    run?: ResumeRunConfig<TTools>;
    /**
     * Ownership guard: every resolved task must belong to this tool (by
     * name) or the call throws BEFORE anything is persisted. Set by the
     * typed `.resolve()`/`.fail()`/`.cancel()` methods — a taskId from a
     * webhook cannot settle a different tool's task through them.
     */
    expectToolName?: string;
}, options?: RequestOptions): Promise<ModelResult<TTools> | null>;
//# sourceMappingURL=resume-tool-results.d.ts.map