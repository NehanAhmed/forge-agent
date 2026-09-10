import type { TaskLogEntry } from './tool-task.js';
import { ToolTask } from './tool-task.js';
import type { PendingAsyncTool } from './tool-types.js';
/**
 * Outcome of a settled async tool task, harvested by the engine at turn
 * boundaries (`flushAsyncToolDeliveries`) or during end-of-run drain.
 */
export interface SettledToolTask {
    callId: string;
    taskId: string;
    name: string;
    status: 'completed' | 'failed' | 'cancelled' | 'timed_out';
    /** Present when status is 'completed'. */
    result?: unknown;
    /** Present otherwise. */
    error?: string;
    /** The call's arguments, when tracked — feeds PostToolUse at settle. */
    input?: Record<string, unknown>;
    /** Wall-clock ms from task start to settlement — feeds PostToolUse. */
    durationMs: number;
}
/**
 * Per-run registry of async tool tasks (background, deferred, agent).
 *
 * Owns the in-process half of async tool support:
 * - background/agent tasks: tracks the in-flight work + ToolTask (logs,
 *   inbox, transcript source), queues settled outcomes for turn-boundary
 *   harvesting, supports drain / cancel / abort-all at run end;
 * - deferred tasks: tracks identity only (the work lives outside the
 *   process); the durable copy is mirrored to
 *   `ConversationState.pendingAsyncTools` by the engine.
 *
 * The registry knows nothing about the tool loop or concurrency pools — the
 * engine (`ModelResult`) owns semaphores and decides when to harvest and how
 * to deliver. Settlement is first-writer-wins: a task settles exactly once
 * (cancel racing completion is safe), and settled tasks drop their
 * controller references so they cannot retain the run graph.
 */
export declare class AsyncToolRegistry {
    private readonly tasks;
    /** Settled outcomes not yet harvested by the engine. */
    private settledQueue;
    private taskCounter;
    /** Resolvers waiting on "any task settled" (drain support). */
    private settleWaiters;
    /** Generate a task id for background/agent tasks (deferred bring their own). */
    generateTaskId(): string;
    /**
     * Register a task so it is visible to steering / cancel / snapshots.
     * Used for background tasks DURING their grace window — the work is in
     * flight but not yet committed to async delivery. `untrack` removes it
     * again when the work settles in-window (the call behaved
     * synchronously; no async machinery should remain visible).
     */
    register(task: ToolTask): void;
    /**
     * Remove a task registered via `register` whose work settled inside the
     * grace window, along with any settlement queued for it in the meantime
     * (e.g. a cancelTask racing the in-window completion) — the call is
     * yielding a synchronous output, so a later envelope for the same callId
     * would be a double delivery.
     */
    untrack(callId: string): void;
    /**
     * Track an already-started background/agent task. `work` is the tool's
     * in-flight run promise (output-validated). When `timeoutMs` is set the
     * task is raced against it, so a body that ignores its abort signal still
     * settles as `timed_out` instead of hanging the drain. The deadline is
     * anchored at `task.startedAt` (the work started before tracking — a
     * grace window may already have elapsed), so `timeoutMs` bounds the
     * task's TOTAL runtime, matching the documented contract.
     */
    trackBackground(task: ToolTask, work: Promise<unknown>, options?: {
        timeoutMs?: number;
    }): void;
    /** Track a deferred task (identity only; work lives outside the process). */
    trackDeferred(entry: {
        callId: string;
        taskId: string;
        name: string;
        expiresAt?: number;
        pollAfterMs?: number;
    }): ToolTask;
    private settle;
    /** Harvest (and clear) settled outcomes queued since the last call. */
    takeSettled(): SettledToolTask[];
    /** True when any background/agent task is still in flight. */
    hasInFlight(): boolean;
    /** True when any settled outcome awaits harvesting. */
    hasUnharvestedSettled(): boolean;
    /** True when any task (any mode) has been tracked this run. */
    hasTasks(): boolean;
    /** Find the live task for a task id. */
    getTask(taskId: string): ToolTask | undefined;
    /** Find the live task for a call id. */
    findByCallId(callId: string): ToolTask | undefined;
    /** All live tasks. */
    listTasks(): ToolTask[];
    /** Append a log entry to a task by call id (engine log sink). */
    appendLog(callId: string, data: unknown, kind?: TaskLogEntry['kind']): void;
    /** Mark every still-working background/agent task as orphaned (detach mode). */
    markWorkingAsOrphaned(): PendingAsyncTool[];
    /** Snapshot of every tracked task (for `getAsyncTasks()` / persistence). */
    snapshot(): PendingAsyncTool[];
    /**
     * Send a steering message to a working task's run body. Deferred tasks
     * are owned by an external system — steering them is the caller's job.
     * @returns true when a working in-process task received the message.
     */
    sendToTask(taskId: string, message: unknown): boolean;
    /**
     * Cancel one task by task id. Settles it as 'cancelled' immediately
     * (first-writer-wins makes the racing body's own settlement a no-op) and
     * aborts the controller so cooperative bodies stop working.
     *
     * Deferred tasks: cancellation is LOCAL-ONLY — the conversation records
     * the cancel, but the external system is not notified (mirror of the
     * sendToTask contract; tell the external system yourself, or use the
     * tool's `.cancel()` method which persists the terminal status for
     * cross-process callers).
     * @returns true when a working task was found and cancelled.
     */
    cancelTask(taskId: string, reason?: string): boolean;
    /** Abort every in-flight background/agent task (run abort / onRunEnd: 'cancel'). */
    abortAll(reason?: string): void;
    /**
     * Wait until every in-flight task settles or `timeoutMs` elapses,
     * whichever comes first. Returns true when everything settled.
     */
    drain(timeoutMs: number): Promise<boolean>;
    /** Resolve true on the next settle event, or false after `timeoutMs`. */
    private waitForSettle;
}
//# sourceMappingURL=async-tool-registry.d.ts.map