import type { OpenRouterCore } from '@openrouter/sdk/core';
import type { RequestOptions } from '@openrouter/sdk/lib/sdks';
import type { $ZodObject, $ZodShape, $ZodType, infer as zodInfer } from 'zod/v4/core';
import { agentToolBuilder } from './agent-tool.js';
import type { CallModelInput } from './async-params.js';
import type { ModelResult } from './model-result.js';
import type { TaskLogLimits } from './tool-task.js';
import type { AsyncToolAck, ContextFromSchema, DeferredHandle, HITLTool, ManualTool, McpBranded, NextTurnParamsFunctions, ServerTool, ServerToolConfig, ServerToolType, StateAccessor, ToModelOutputFunction, Tool, ToolApprovalCheck, ToolCheckConfig, ToolExecuteContext, ToolLifecycle, ToolLoopKey, ToolRunContext, ToolWithExecute, ToolWithGenerator, UnifiedTool } from './tool-types.js';
/**
 * Configuration for a regular tool with outputSchema.
 * `TCtx` preserves a concrete `contextSchema` through the overload boundary so
 * execute's `ctx.local` and the returned tool's `function.contextSchema` stay typed.
 */
type RegularToolConfigWithOutput<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    eventSchema?: undefined;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    /** Zod schema declaring the context data this tool needs */
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    execute: (params: zodInfer<TInput>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>>) => Promise<zodInfer<TOutput>> | zodInfer<TOutput>;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<zodInfer<TInput>, zodInfer<TOutput>>;
};
/**
 * Configuration for a regular tool without outputSchema (infers return type from execute)
 */
type RegularToolConfigWithoutOutput<TInput extends $ZodObject<$ZodShape>, TReturn, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    outputSchema?: undefined;
    eventSchema?: undefined;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    /** Zod schema declaring the context data this tool needs */
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    execute: (params: zodInfer<TInput>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>>) => Promise<TReturn> | TReturn;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<zodInfer<TInput>, TReturn>;
};
/**
 * Configuration for a generator tool (with eventSchema)
 */
type GeneratorToolConfig<TInput extends $ZodObject<$ZodShape>, TEvent extends $ZodType, TOutput extends $ZodType, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    eventSchema: TEvent;
    outputSchema: TOutput;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    /** Zod schema declaring the context data this tool needs */
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    execute: (params: zodInfer<TInput>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>>) => AsyncGenerator<zodInfer<TEvent> | zodInfer<TOutput>>;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<zodInfer<TInput>, zodInfer<TOutput>>;
};
/**
 * Configuration for a manual tool (execute: false, no eventSchema or outputSchema)
 */
type ManualToolConfig<TInput extends $ZodObject<$ZodShape>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    /** Zod schema declaring the context data this tool needs */
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    execute: false;
};
/**
 * Configuration for a human-in-the-loop tool.
 * Discriminated by the presence of `onToolCalled`. No `execute` or `eventSchema`.
 *
 * `onToolCalled` returning `null` pauses the loop (manual-tool semantics).
 * Any non-null return is treated as the tool's result for the model.
 *
 * `onResponseReceived` is invoked on a later turn when an incoming
 * `FunctionCallOutputItem` corresponds to a prior call of this tool; the
 * returned value replaces what the model ultimately sees.
 */
type HITLToolConfig<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    /**
     * Required for HITL tools. Used to validate both the `onToolCalled` return
     * value (when non-null) and the caller-supplied response that comes back via
     * a matching `function_call_output` — whether transformed by
     * `onResponseReceived` or passed through directly when no hook is defined.
     */
    outputSchema: TOutput;
    eventSchema?: undefined;
    execute?: undefined;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    /** Zod schema declaring the context data this tool needs */
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    onToolCalled: (params: zodInfer<TInput>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>>) => Promise<zodInfer<TOutput> | null> | zodInfer<TOutput> | null;
    onResponseReceived?: (rawResult: unknown, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>>) => Promise<zodInfer<TOutput>> | zodInfer<TOutput>;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<zodInfer<TInput>, zodInfer<TOutput>>;
};
/**
 * Loose config type for the `tool<TShared>()` overload.
 * Accepts any valid tool config while typing `ctx.shared` from TShared.
 */
type ToolConfigWithSharedContext<TShared extends Record<string, unknown>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: $ZodObject<$ZodShape>;
    outputSchema?: $ZodType;
    eventSchema?: $ZodType;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<Record<string, unknown>>;
    requireApproval?: boolean | ToolApprovalCheck<Record<string, unknown>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<Record<string, unknown>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    execute: ((params: Record<string, unknown>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>, TShared>) => unknown) | ((params: Record<string, unknown>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>, TShared>) => AsyncGenerator<unknown>) | false;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<Record<string, unknown>, unknown>;
};
/**
 * Shared fields for unified `run` tool configs.
 */
type RunToolConfigBase<TInput extends $ZodObject<$ZodShape>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    /** Never present on run configs — keeps them disjoint from legacy overloads. */
    execute?: undefined;
    onToolCalled?: undefined;
    /** Strict schema adherence for tool-call generation — see {@link BaseToolFunction.strict} */
    strict?: boolean | null;
    /** Zod schema declaring the context data this tool needs */
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    /** Doom-loop identity: computed function, or false to exempt — see {@link ToolLoopKey} */
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
    /** Deadline for one execution of this tool, in ms (see BaseToolFunction.timeoutMs) */
    timeoutMs?: number;
    /** Max simultaneous in-flight executions of this tool across the run */
    maxConcurrency?: number;
    /** Check-in config: model calls this tool with a taskId to check a task */
    check?: ToolCheckConfig;
    /** Per-task log ring-buffer overrides */
    logLimits?: Partial<TaskLogLimits>;
};
/**
 * Configuration for a unified tool with a `run` handler and an explicit
 * outputSchema. `lifecycle` selects sync (default) / background / deferred.
 */
type RunToolConfigWithOutput<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TEvent extends $ZodType = $ZodType<never>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = RunToolConfigBase<TInput, TCtx, TName> & {
    outputSchema: TOutput;
    /** Validates run yields / ctx.log entries when declared. */
    eventSchema?: TEvent;
    lifecycle?: ToolLifecycle;
    /** Model-facing acknowledgement merged into the pending placeholder. */
    ack?: AsyncToolAck<zodInfer<TInput>>;
    /** Background: settles-fast window (ms). Default 250; 0 always placeholders. */
    graceMs?: number;
    /** Deferred: default poll-interval hint. */
    pollAfterMs?: number;
    run: (params: zodInfer<TInput>, context?: ToolRunContext<TName, ContextFromSchema<TCtx>, zodInfer<TOutput>>) => Promise<zodInfer<TOutput> | DeferredHandle<zodInfer<TOutput>>> | zodInfer<TOutput> | DeferredHandle<zodInfer<TOutput>> | AsyncGenerator<zodInfer<TEvent>, zodInfer<TOutput> | DeferredHandle<zodInfer<TOutput>>>;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<zodInfer<TInput>, zodInfer<TOutput>>;
};
/**
 * Configuration for a SYNC unified tool without outputSchema — the output
 * type is inferred from run's return. Long-running lifecycles require an
 * explicit outputSchema (results settle after the round, possibly in
 * another process), so this config pins lifecycle to 'sync'/absent.
 */
type SyncRunToolConfigWithoutOutput<TInput extends $ZodObject<$ZodShape>, TReturn, TEvent extends $ZodType = $ZodType<never>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = RunToolConfigBase<TInput, TCtx, TName> & {
    outputSchema?: undefined;
    eventSchema?: TEvent;
    lifecycle?: 'sync';
    run: (params: zodInfer<TInput>, context?: ToolRunContext<TName, ContextFromSchema<TCtx>, TReturn>) => Promise<TReturn> | TReturn | AsyncGenerator<zodInfer<TEvent>, TReturn>;
    /** Convert tool execution output to model-facing output */
    toModelOutput?: ToModelOutputFunction<zodInfer<TInput>, TReturn>;
};
/**
 * Creates a tool with full type inference from Zod schemas.
 *
 * The tool type is automatically determined based on the configuration:
 * - **Generator tool**: When `eventSchema` is provided
 * - **Regular tool**: When `execute` is a function (no `eventSchema`)
 * - **Manual tool**: When `execute: false` is set
 *
 * Shared context typing: Use `tool<TShared>()({...})` to type `ctx.shared`
 * and preserve the tool's literal name. The backward-compatible direct form
 * `tool<TShared>({...})` is also supported, but its returned name is `string`
 * because TypeScript cannot infer trailing type parameters after an explicit
 * `TShared`. Runtime validation happens at callModel via `sharedContextSchema`.
 *
 * @example Regular tool with typed shared context:
 * ```typescript
 * type SharedCtx = z.infer<typeof SharedContextSchema>;
 *
 * const execTool = tool<SharedCtx>()({
 *   name: "sandbox_exec",
 *   inputSchema: z.object({ command: z.string() }),
 *   execute: async (params, ctx) => {
 *     ctx?.shared._sessionId;       // string | undefined
 *     return { output: '...' };
 *   },
 * });
 * ```
 */
export declare function tool<TShared extends Record<string, unknown>>(): <const TName extends string, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>>(config: ToolConfigWithSharedContext<TShared, TCtx, TName>) => Tool & {
    function: {
        name: TName;
    };
};
export declare function tool<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TEvent extends $ZodType = $ZodType<never>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: RunToolConfigWithOutput<TInput, TOutput, TEvent, TCtx, TName> & {
    lifecycle: 'deferred';
}): BuiltDeferredTool<TInput, TOutput, TEvent, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TEvent extends $ZodType = $ZodType<never>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: RunToolConfigWithOutput<TInput, TOutput, TEvent, TCtx, TName>): UnifiedTool<TInput, TOutput, TEvent, Record<string, unknown>, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TReturn, TEvent extends $ZodType = $ZodType<never>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: SyncRunToolConfigWithoutOutput<TInput, TReturn, TEvent, TCtx, TName>): UnifiedTool<TInput, $ZodType<TReturn>, TEvent, Record<string, unknown>, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TEvent extends $ZodType, TOutput extends $ZodType, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: GeneratorToolConfig<TInput, TEvent, TOutput, TCtx, TName>): ToolWithGenerator<TInput, TEvent, TOutput, Record<string, unknown>, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: HITLToolConfig<TInput, TOutput, TCtx, TName>): HITLTool<TInput, TOutput, Record<string, unknown>, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: ManualToolConfig<TInput, TCtx, TName>): ManualTool<TInput, $ZodType<unknown>, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: RegularToolConfigWithOutput<TInput, TOutput, TCtx, TName>): ToolWithExecute<TInput, TOutput, Record<string, unknown>, TCtx, TName>;
export declare function tool<TInput extends $ZodObject<$ZodShape>, TReturn, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: RegularToolConfigWithoutOutput<TInput, TReturn, TCtx, TName>): ToolWithExecute<TInput, $ZodType<TReturn>, Record<string, unknown>, TCtx, TName>;
export declare function tool<TShared extends Record<string, unknown>>(config: ToolConfigWithSharedContext<TShared>): Tool & {
    function: {
        name: string;
    };
};
export declare namespace tool {
    var agent: typeof agentToolBuilder;
}
/**
 * Request shape shared by the deferred completion methods (`.resolve()` /
 * `.fail()` / `.cancel()`). `run` continues the conversation immediately;
 * omit it to record the result on state for the next `callModel({ state })`.
 */
type DeferredCompletionBase = {
    state: StateAccessor<readonly Tool[]>;
    taskId: string;
    /**
     * Continue the conversation immediately with this run configuration
     * (model, extra tools, stopWhen, ...). The deferred tool includes itself
     * in the run's tools automatically.
     */
    run?: DeferredRunConfig;
    /** Behavior when the task is already settled. Default 'throw'. */
    ifSettled?: 'throw' | 'ignore';
};
/** Run config accepted by the deferred completion methods. */
type DeferredRunConfig = Omit<CallModelInput<readonly Tool[]>, 'state' | 'input' | 'approveToolCalls' | 'rejectToolCalls'>;
/**
 * Typed completion methods attached to every `lifecycle: 'deferred'` tool.
 * Thin wrappers over `resumeToolResults()` with the tool reference bound, so
 * `output` is checked against the tool's `outputSchema` at compile time and
 * runtime.
 *
 * SECURITY: these methods inject values the model treats as tool results.
 * Authenticate the webhook/caller before invoking them — the SDK cannot.
 */
export interface DeferredToolMethods<TOutput> {
    /**
     * Supply the task's successful result (typed by the tool's outputSchema).
     * With `run` config the conversation continues immediately and the
     * `ModelResult` is returned; without, the result is recorded on state and
     * `null` is returned — the next `callModel({ state })` delivers it.
     */
    resolve(client: OpenRouterCore, request: DeferredCompletionBase & {
        output: TOutput;
    }, options?: RequestOptions): Promise<ModelResult<readonly Tool[]> | null>;
    /** Report the task as failed. Same continue-or-record semantics as resolve. */
    fail(client: OpenRouterCore, request: DeferredCompletionBase & {
        error: string | Error;
    }, options?: RequestOptions): Promise<ModelResult<readonly Tool[]> | null>;
    /** Cancel the task. Same continue-or-record semantics as resolve. */
    cancel(client: OpenRouterCore, request: DeferredCompletionBase & {
        reason?: string;
    }, options?: RequestOptions): Promise<ModelResult<readonly Tool[]> | null>;
}
/**
 * A built deferred tool: the unified tool wrapper plus its typed completion
 * methods. Structurally still a `UnifiedTool`, so it flows into
 * `tools: [...]` arrays unchanged.
 */
export type BuiltDeferredTool<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TEvent extends $ZodType = $ZodType<never>, TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = UnifiedTool<TInput, TOutput, TEvent, Record<string, unknown>, TCtx, TName> & DeferredToolMethods<zodInfer<TOutput>>;
/**
 * Options for {@link serverTool}.
 * @template TId Stable tool-set identity used by `@openrouter/agent-tool-set`.
 */
export type ServerToolOptions<TId extends string = string> = {
    /**
     * Override the default tool-set ID (`server:${config.type}`).
     * Useful when two server tools of the same type need distinct activation IDs.
     */
    id?: TId;
};
/**
 * Creates an OpenRouter server-executed tool. OpenRouter runs the tool (web
 * search, datetime, image generation, etc.) and returns the output item in
 * the response — no client-side execute function is needed.
 *
 * The config shape is derived directly from the SDK's request-tool union
 * (`models.ResponsesRequestToolUnion`) via `Exclude` + `Extract`, so new
 * server-tool variants added upstream become valid here with zero changes
 * in this SDK. Provide the `type` literal and the remaining fields narrow
 * to match the chosen tool.
 *
 * Each server tool carries a stable tool-set `id` (default `server:${type}`)
 * so activation APIs can address it. Override via the optional second argument.
 *
 * @example
 * ```typescript
 * const tools = [
 *   serverTool({ type: 'web_search_2025_08_26', engine: 'exa', maxResults: 10 }),
 *   serverTool({ type: 'openrouter:datetime', parameters: { timezone: 'UTC' } }),
 *   serverTool({ type: 'image_generation', size: '1024x1024', quality: 'high' }),
 *   serverTool({ type: 'web_search_2025_08_26' }, { id: 'server:public_search' }),
 * ];
 * ```
 */
export declare function serverTool<T extends ServerToolType, TId extends string = `server:${T}`>(config: Extract<ServerToolConfig, {
    type: T;
}>, options?: ServerToolOptions<TId>): ServerTool<T, TId>;
/**
 * Add the additive MCP brand to an already-built client tool (see
 * {@link McpBranded}). Non-mutating: returns a shallow copy carrying `_mcp`, so
 * the tool's runtime behavior and wire shape are unchanged — only its type (and
 * the runtime {@link isMcpTool} check) now identify it as MCP-originated. Used
 * by `@openrouter/mcp` to mark wrapped remote tools.
 *
 * `options.loopKey` attaches a doom-loop identity to the wrapped tool —
 * the only injection point for MCP tools, whose remote definitions cannot
 * carry client-side functions. Like every other tool hook it is a computed
 * function over the call's arguments (or `false` to exempt).
 */
export declare function markMcp<T extends Tool>(toolToMark: T, options?: {
    loopKey?: ToolLoopKey<Record<string, unknown>>;
}): McpBranded<T>;
export {};
//# sourceMappingURL=tool.d.ts.map