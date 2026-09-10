import * as z4 from 'zod/v4';
import type { $ZodObject, $ZodShape, $ZodType } from 'zod/v4/core';
import type { APITool, PendingAsyncTool, Tool, ToolCheckConfig, TurnContext } from './tool-types.js';
/**
 * Reserved name of the single, universal task-interaction tool.
 *
 * Per team decision (2026-07-31): per-tool check schemas bloat every tool's
 * wire definition for a shared set of functionality and scale quadratically
 * with the tool count. Instead, ONE static tool handles every running task —
 * addressed by `taskId` — while the *implementations* stay tool-resident
 * (each tool's `check` config). Best of both: no per-tool context growth,
 * tool-specific behavior preserved.
 */
export declare const TASK_TOOL_NAME: "task";
/** Actions the universal task tool supports. */
export declare const TaskToolInputSchema: z4.ZodObject<{
    taskId: z4.ZodString;
    action: z4.ZodOptional<z4.ZodEnum<{
        steer: "steer";
        result: "result";
        cancel: "cancel";
        check: "check";
    }>>;
    view: z4.ZodOptional<z4.ZodEnum<{
        status: "status";
        logs: "logs";
        transcript: "transcript";
    }>>;
    tail: z4.ZodOptional<z4.ZodNumber>;
    message: z4.ZodOptional<z4.ZodString>;
    reason: z4.ZodOptional<z4.ZodString>;
    params: z4.ZodOptional<z4.ZodRecord<z4.ZodString, z4.ZodUnknown>>;
}, z4.z.core.$strip>;
export type TaskToolInput = z4.infer<typeof TaskToolInputSchema>;
/**
 * The wire definition for the universal task tool. Static — identical
 * regardless of how many long-running tools are registered, so the schema
 * conversion runs once per process (memoized on first call).
 */
export declare function buildTaskToolApiDefinition(convertZod: (schema: $ZodType) => Record<string, unknown>): APITool;
/**
 * True when a user tool already claims the reserved task-tool name
 * (defense for dynamically-built tool lists that bypass `tool()`).
 *
 * Shared by registration (`needsTaskTool`) and the engine's interception
 * guard (`taskToolActive`) so a collision disables BOTH: the built-in
 * definition is not registered and calls named "task" route to the user's
 * tool instead of being intercepted.
 */
export declare function hasTaskToolNameCollision(tools: readonly Tool[]): boolean;
/**
 * True when the tool list warrants registering the task tool: at least one
 * long-running-capable tool, and no user tool already claiming the name.
 */
export declare function needsTaskTool(tools: readonly Tool[]): boolean;
/**
 * Minimal Tool stub for the engine's internal bookkeeping around task-tool
 * answers (result events, output shaping). Never executed as a user tool.
 */
export declare function buildTaskToolStub(): Tool;
/** Resolve a tool's check config to `{ schema, execute }` with defaults. */
export declare function resolveCheckConfig(check: ToolCheckConfig | undefined): {
    schema: $ZodObject<$ZodShape> | undefined;
    execute: ((params: Record<string, unknown>, turnContext: TurnContext) => unknown | Promise<unknown>) | undefined;
};
/** The SDK default check handler: status / logs / transcript views. */
export declare function defaultCheckResult(input: Pick<TaskToolInput, 'view' | 'tail'>, turnContext: TurnContext, options: {
    maxTranscriptChars: number;
}): unknown;
/**
 * Answer a task-tool call against a PERSISTED task (deferred /
 * cross-process, after a restart — no live registry entry). Only
 * `status`-grade data survives: identity, timing, `lastLog`.
 */
export declare function persistedTaskCheckResult(input: Pick<TaskToolInput, 'view'>, pending: PendingAsyncTool): unknown;
//# sourceMappingURL=tool-check.d.ts.map