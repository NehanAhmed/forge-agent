import { appendToMessages, updateState } from '../lib/conversation-state.js';
import { validateToolOutput } from '../lib/tool-executor.js';
import { TASK_RESULT_BOUNDARY } from '../lib/tool-task.js';
import { isClientTool, isUnifiedTool } from '../lib/tool-types.js';
import { callModel } from './call-model.js';
/**
 * Thrown by {@link resumeToolResults} (and the deferred tool `.resolve()` /
 * `.fail()` / `.cancel()` methods) when the target task was already settled —
 * the at-most-once guard against double resolution and replayed webhooks.
 * Opt out per call with `ifSettled: 'ignore'`.
 */
export class ToolTaskAlreadySettledError extends Error {
    constructor(taskId, callId) {
        super(`Tool task "${taskId}" (call ${callId}) has already been settled`);
        this.name = 'ToolTaskAlreadySettledError';
        this.taskId = taskId;
        this.callId = callId;
    }
}
/** Build the user-role message carrying a task-result envelope. */
export function buildTaskResultMessage(envelope) {
    return {
        role: 'user',
        content: `${TASK_RESULT_BOUNDARY}\n${JSON.stringify(envelope)}`,
    };
}
/**
 * Find the pending task an incoming result belongs to, or `null` when the entry
 * is already settled and the caller asked to ignore that.
 *
 * Settled tasks deliberately STAY in `pendingAsyncTools` with a terminal
 * status, so a replayed webhook resolves to `ToolTaskAlreadySettledError`
 * rather than "not found".
 *
 * @throws ToolTaskAlreadySettledError when the task already settled and
 * `ifSettled` is `'throw'` (the default).
 * @throws Error when no pending task matches the entry at all.
 */
function resolvePendingTask({ entry, pending, settledIds, ifSettled, }) {
    const task = pending.find((t) => 'taskId' in entry && entry.taskId !== undefined
        ? t.taskId === entry.taskId
        : t.callId === entry.callId);
    if (!task) {
        // The callId fallback covers states persisted by older SDK versions whose
        // in-process delivery REMOVED the entry, leaving only the callId on
        // settledAsyncCallIds.
        if (entry.callId !== undefined && settledIds.has(entry.callId)) {
            if (ifSettled === 'ignore') {
                return null;
            }
            throw new ToolTaskAlreadySettledError(entry.taskId ?? entry.callId, entry.callId);
        }
        throw new Error(`resumeToolResults: no pending async tool task found for "${entry.taskId ?? entry.callId}"`);
    }
    if (settledIds.has(task.callId) || task.status !== 'working') {
        if (ifSettled === 'ignore') {
            return null;
        }
        throw new ToolTaskAlreadySettledError(task.taskId, task.callId);
    }
    return task;
}
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
export async function resumeToolResults(client, request, options) {
    const state = await request.state.load();
    if (!state) {
        throw new Error('resumeToolResults: no conversation state found for the given StateAccessor');
    }
    const pending = state.pendingAsyncTools ?? [];
    const settledIds = new Set(state.settledAsyncCallIds ?? []);
    const envelopes = [];
    /** callId → the terminal lifecycle status persisted for that entry. */
    const settledNow = new Map();
    for (const entry of request.results) {
        const task = resolvePendingTask({
            entry,
            pending,
            settledIds,
            ifSettled: request.ifSettled,
        });
        if (!task) {
            continue; // already settled and the caller asked to ignore it
        }
        // Ownership guard: a taskId is an external identifier handed to
        // third-party systems — a lower-trust webhook must not be able to
        // settle a DIFFERENT tool's task through a tool-bound completion
        // method (confused deputy; it would also skip that tool's
        // outputSchema validation).
        if (request.expectToolName !== undefined && task.name !== request.expectToolName) {
            throw new Error(`resumeToolResults: task "${task.taskId}" belongs to tool "${task.name}", not "${request.expectToolName}" — use the owning tool's completion methods (or the untyped resumeToolResults entry point).`);
        }
        const envelope = buildResumeEnvelope(entry, task, request.tools);
        envelopes.push(buildTaskResultMessage(envelope));
        // Persist the entry's real terminal status. 'expired' / 'timed_out'
        // have no ToolTaskStatus member — they persist as 'failed'.
        settledNow.set(task.callId, envelope.status === 'completed' || envelope.status === 'cancelled'
            ? envelope.status
            : 'failed');
        settledIds.add(task.callId);
    }
    if (envelopes.length === 0) {
        // Every entry was already settled and ignored — nothing to record.
        return null;
    }
    // Keep settled entries with a terminal status (rather than dropping them)
    // so a replayed resolution surfaces as ToolTaskAlreadySettledError.
    const nextPending = pending.map((t) => {
        const terminalStatus = settledNow.get(t.callId);
        return terminalStatus !== undefined
            ? {
                ...t,
                status: terminalStatus,
            }
            : t;
    });
    // Status transition rules:
    // - Orphaned (detached) tasks never settle — counting them as working
    //   would leave the conversation reporting 'awaiting_async_tools' forever.
    // - Only advance a status this delivery OWNS. A conversation can hold a
    //   non-async pause (awaiting_approval / awaiting_hitl /
    //   awaiting_client_tools) while async tasks are outstanding; clobbering
    //   it to 'in_progress' would make the engine skip the decision-resume
    //   path and drop the caller's approvals.
    // - A 'complete' conversation is only reopened when the caller asked to
    //   continue (`run` config). Record-only delivery on a finished
    //   conversation keeps it finished — the envelope rides along if the
    //   caller ever resumes it.
    const stillWorking = nextPending.some((t) => t.status === 'working' && t.orphaned !== true);
    const statusOwnedByAsyncDelivery = state.status === 'awaiting_async_tools' ||
        state.status === 'in_progress' ||
        (state.status === 'complete' && request.run !== undefined) ||
        state.status === undefined;
    const updated = updateState(state, {
        messages: appendToMessages(state.messages, envelopes),
        settledAsyncCallIds: [
            ...(state.settledAsyncCallIds ?? []),
            ...settledNow.keys(),
        ],
        ...(statusOwnedByAsyncDelivery && {
            status: stillWorking ? 'awaiting_async_tools' : 'in_progress',
        }),
        pendingAsyncTools: nextPending,
    });
    await request.state.save(updated);
    if (!request.run) {
        return null;
    }
    // Continue the conversation: the envelopes are already in persisted
    // history, so no fresh input is supplied.
    return callModel(client, {
        ...request.run,
        input: [],
        tools: request.run.tools ?? request.tools,
        state: request.state,
    }, options);
}
/**
 * Build the `tool_task_result` envelope for one resume entry. Successful
 * outputs are validated against the owning tool's `outputSchema` when the
 * tool is available; error entries carry the caller's refined status
 * (default `'failed'`).
 */
function buildResumeEnvelope(entry, task, tools) {
    if ('output' in entry && entry.error === undefined) {
        const tool = tools?.find((t) => isClientTool(t) && t.function.name === task.name);
        // Fail closed: when a tools list was supplied but the owning tool is
        // not in it, the caller expected validation — appending the output
        // unvalidated would silently void that expectation.
        if (tools !== undefined && tool === undefined) {
            throw new Error(`resumeToolResults: task "${task.taskId}" belongs to tool "${task.name}", which is not in the supplied tools list — its output cannot be validated. Include the tool, or omit \`tools\` to skip validation explicitly.`);
        }
        let output = entry.output;
        if (tool && isUnifiedTool(tool) && tool.function.outputSchema !== undefined) {
            output = validateToolOutput(tool.function.outputSchema, output);
        }
        return {
            type: 'tool_task_result',
            tool: task.name,
            taskId: task.taskId,
            callId: task.callId,
            status: 'completed',
            result: output,
        };
    }
    return {
        type: 'tool_task_result',
        tool: task.name,
        taskId: task.taskId,
        callId: task.callId,
        status: entry.status ?? 'failed',
        error: entry.error ?? 'Task failed',
    };
}
//# sourceMappingURL=resume-tool-results.js.map