import type * as models from '@openrouter/sdk/models';
import * as z4 from 'zod/v4';
import type { $ZodObject, $ZodShape, $ZodType } from 'zod/v4/core';
import type { ToolContextStore, ToolExecutionExtras } from './tool-context.js';
import type { ClientTool, ParsedToolCall, Tool, ToolExecutionResult, TurnContext } from './tool-types.js';
export declare const ZodError: z4.z.core.$constructor<z4.ZodError<unknown>, z4.z.core.$ZodIssue[]>;
/**
 * Recursively remove keys prefixed with ~ from an object.
 * These are metadata properties (like ~standard from Standard Schema)
 * that should not be sent to downstream providers.
 * @see https://github.com/OpenRouterTeam/typescript-sdk/issues/131
 *
 * When given a Record<string, unknown>, returns Record<string, unknown>.
 * When given unknown, returns unknown (preserves primitives, null, etc).
 */
export declare function sanitizeJsonSchema(obj: Record<string, unknown>): Record<string, unknown>;
export declare function sanitizeJsonSchema(obj: unknown): unknown;
/**
 * Convert a Zod schema to JSON Schema using Zod v4's toJSONSchema function.
 * Accepts ZodType from the main zod package for user compatibility.
 * The resulting schema is sanitized to remove metadata properties (like ~standard)
 * that would cause 400 errors with downstream providers.
 */
export declare function convertZodToJsonSchema(zodSchema: $ZodType): Record<string, unknown>;
/**
 * Convert tools to OpenRouter API format. Server tools pass their SDK-shaped
 * config through untouched; client tools are packaged into the function-call
 * shape — their wire definitions are NEVER augmented per tool (interacting
 * with long-running tasks goes through the single universal `task` tool,
 * appended by callModel when warranted, so the per-tool context cost stays
 * constant no matter how many async tools are registered). Return type
 * widens to the SDK's full request-tool union so any new server-tool
 * variant added upstream flows through automatically.
 */
export declare function convertToolsToAPIFormat(tools: readonly Tool[]): Array<models.ResponsesRequestToolUnion>;
/**
 * Validate tool input against Zod schema
 * @throws ZodError if validation fails
 */
export declare function validateToolInput<T>(schema: $ZodType<T>, args: unknown): T;
/**
 * Validate tool output against Zod schema
 * @throws ZodError if validation fails
 */
export declare function validateToolOutput<T>(schema: $ZodType<T>, result: unknown): T;
/**
 * Parse tool call arguments from JSON string.
 * Treats empty/whitespace-only strings as an empty object — some providers
 * return `arguments: ""` for tools that take no parameters.
 */
export declare function parseToolCallArguments(argumentsString: string): unknown;
/**
 * Execute a regular (non-generator) tool
 */
export declare function executeRegularTool(tool: Tool, toolCall: ParsedToolCall<Tool>, context: TurnContext, contextStore?: ToolContextStore, sharedSchema?: $ZodObject<$ZodShape>, extras?: ToolExecutionExtras): Promise<ToolExecutionResult<Tool>>;
/**
 * Execute a generator tool and collect preliminary and final results
 * - Intermediate yields are validated against eventSchema (preliminary events)
 * - Last yield is validated against outputSchema (final result sent to model)
 * - Generator must emit at least one value
 */
export declare function executeGeneratorTool(tool: Tool, toolCall: ParsedToolCall<Tool>, context: TurnContext, onPreliminaryResult?: (toolCallId: string, result: unknown) => void, contextStore?: ToolContextStore, sharedSchema?: $ZodObject<$ZodShape>, extras?: ToolExecutionExtras): Promise<ToolExecutionResult<Tool>>;
/**
 * Execute a HITL tool's `onToolCalled` hook.
 *
 * Returns:
 * - `ToolExecutionResult` if the hook produced a value (short-circuit, send to model)
 * - `null` if the hook returned `null` (pause — treat as manual tool)
 * - `ToolExecutionResult` with `error` set if the hook threw
 */
export declare function executeHITLTool(tool: Tool, toolCall: ParsedToolCall<Tool>, context: TurnContext, contextStore?: ToolContextStore, sharedSchema?: $ZodObject<$ZodShape>, extras?: ToolExecutionExtras): Promise<ToolExecutionResult<Tool> | null>;
/**
 * Tagged result for tools whose work escapes the synchronous round.
 *
 * - `'background'`: `run()` starts the tool's `execute` (input already
 *   validated, context built) and resolves with the OUTPUT-VALIDATED final
 *   value. The engine decides when to invoke it (under the background pool)
 *   and whether its settlement lands in-round (grace window) or later.
 * - `'defer'`: the tool's `start` returned a durable task handle; the run
 *   should pause until the task is resolved externally.
 */
export type AsyncToolInvocation = {
    asyncMode: 'background';
    run: () => Promise<unknown>;
    ack?: string | Record<string, unknown> | undefined;
    graceMs: number;
} | {
    asyncMode: 'defer';
    taskId: string;
    ack?: string | Record<string, unknown> | undefined;
    pollAfterMs?: number | undefined;
    expiresAt?: number | undefined;
};
/** Type guard for {@link AsyncToolInvocation} in executeTool results. */
export declare function isAsyncToolInvocation(value: unknown): value is AsyncToolInvocation;
/**
 * Prepare a unified tool invocation. Validates input eagerly; builds the
 * ToolRunContext (defer/log/onMessage/client wired by the engine through
 * `extras.runExtras`); then per lifecycle:
 *
 * - `'sync'`: runs to completion inline — a plain `ToolExecutionResult`,
 *   zero async overhead, behaviorally identical to `execute`.
 * - `'background'` (and agent tools): returns a `'background'`
 *   {@link AsyncToolInvocation} thunk for the engine's grace-window race.
 * - `'deferred'`: awaits the run — a plain value is the typed fast path; a
 *   `DeferredHandle` becomes a `'defer'` invocation.
 */
export declare function prepareUnifiedInvocation(tool: Tool, toolCall: ParsedToolCall<Tool>, context: TurnContext, onPreliminaryResult?: (toolCallId: string, result: unknown) => void, contextStore?: ToolContextStore, sharedSchema?: $ZodObject<$ZodShape>, extras?: ToolExecutionExtras): Promise<ToolExecutionResult<Tool> | AsyncToolInvocation>;
/**
 * Execute a tool call.
 * Automatically detects if it's a regular, generator, HITL, or unified
 * `run` tool.
 *
 * Returns `null` only for HITL tools whose `onToolCalled` returned `null`
 * (signaling a manual-style pause). Unified background/deferred tools may
 * return an {@link AsyncToolInvocation}. All other tools always return a
 * `ToolExecutionResult` (with `error` set on failure).
 */
export declare function executeTool(tool: Tool, toolCall: ParsedToolCall<Tool>, context: TurnContext, onPreliminaryResult?: (toolCallId: string, result: unknown) => void, contextStore?: ToolContextStore, sharedSchema?: $ZodObject<$ZodShape>, extras?: ToolExecutionExtras): Promise<ToolExecutionResult<Tool> | AsyncToolInvocation | null>;
/**
 * Find a client tool by name in the tools array. Server tools have no
 * client-side name to match against and are skipped.
 */
export declare function findToolByName(tools: Tool[], name: string): ClientTool | undefined;
/**
 * Format tool execution result as a string for sending to the model
 */
export declare function formatToolResultForModel(result: ToolExecutionResult<Tool>): string;
/**
 * Create a user-friendly error message for tool execution errors
 */
export declare function formatToolExecutionError(error: Error, toolCall: ParsedToolCall<Tool>): string;
/**
 * Walk the input items and apply HITL per-tool validation plus any
 * `onResponseReceived` hooks.
 *
 * For each `function_call_output` item in `input`, locate the matching
 * `function_call` (by `callId`) to identify the tool name. If that tool is a
 * HITL tool, validate the value the model will see against the tool's
 * `outputSchema`:
 *
 * - With `onResponseReceived`: invoke it with the parsed raw output, validate
 *   the hook's return against `outputSchema`, then serialize (preserving
 *   content-array shapes). Hook throws or validation failures are replaced
 *   with `{error, originalOutput}` so the model sees a tool error.
 * - Without `onResponseReceived`: validate the parsed raw output against
 *   `outputSchema`. If it matches, leave the item untouched. Otherwise
 *   replace with `{error, originalOutput}` using the same shape.
 *
 * Items that don't match a HITL tool are left untouched.
 *
 * @returns a new input array when any item was rewritten, otherwise the original input.
 */
export declare function applyOnResponseReceivedHooks(input: models.InputsUnion, tools: readonly Tool[] | undefined, context: TurnContext, contextStore?: ToolContextStore, sharedSchema?: $ZodObject<$ZodShape>): Promise<models.InputsUnion>;
//# sourceMappingURL=tool-executor.d.ts.map