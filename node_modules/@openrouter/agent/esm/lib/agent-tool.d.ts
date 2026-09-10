import type { $ZodObject, $ZodShape, $ZodType, infer as zodInfer } from 'zod/v4/core';
import type { CallModelInput } from './async-params.js';
import type { ModelResult } from './model-result.js';
import type { TaskTranscriptSource } from './tool-task.js';
import type { AsyncToolAck, ContextFromSchema, ConversationState, NextTurnParamsFunctions, Tool, ToolApprovalCheck, ToolCheckConfig, ToolExecuteContext, ToolLoopKey, UnifiedTool } from './tool-types.js';
/**
 * The child run spec an agent tool produces per call.
 *
 * Exclusions and why:
 * - `state`: the engine supplies an internal in-memory accessor (it is what
 *   makes the live transcript possible). A child persisting to the parent's
 *   accessor would clobber the parent conversation; durable child sessions
 *   are a separate feature.
 * - `signal`: the engine supplies it (parent abort / timeout / cancelTask
 *   propagate into the child).
 * - `approveToolCalls`/`rejectToolCalls`: approval decisions belong to a
 *   durable session.
 *
 * `hooks` IS allowed — a child may declare its own hooks explicitly. The
 * parent's hooks are never inherited (they are written against the parent's
 * tool vocabulary and their session accounting would double-fire per child).
 */
export type AgentRunSpec<TChildTools extends readonly Tool[] = readonly Tool[]> = Omit<CallModelInput<TChildTools>, 'state' | 'approveToolCalls' | 'rejectToolCalls' | 'signal'>;
/**
 * Live transcript over an agent child's conversation, rendered from the
 * child's (internal, in-memory) conversation state — the actual message
 * history, robust regardless of streaming vs non-streaming transport.
 */
export declare class AgentTranscriptSource implements TaskTranscriptSource {
    private readonly readState;
    private turnsStarted;
    private turnsEnded;
    private currentActivity;
    constructor(readState: () => ConversationState | null);
    noteTurnStart(): void;
    noteTurnEnd(lastText: string): void;
    setActivity(activity: string): void;
    statusExtras(): Record<string, unknown>;
    render(maxChars: number): string;
}
/** Configuration for `tool.agent()`. */
export type AgentToolConfig<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TChildTools extends readonly Tool[] = readonly Tool[], TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string> = {
    name: TName;
    description?: string;
    inputSchema: TInput;
    /**
     * Whether providers should enforce strict schema adherence for this agent
     * tool's generated arguments. OpenAI-style strict mode requires every
     * property to be required; those providers may reject `.optional()` fields,
     * so use `.nullable()` when the key may conceptually have no value.
     */
    strict?: boolean | null;
    /**
     * Required. The mapped child result is validated against it — the same
     * rule every long-running tool obeys (results settle after the round).
     */
    outputSchema: TOutput;
    /** Build the child run spec from this call's arguments. */
    agent: (params: zodInfer<TInput>, context?: ToolExecuteContext<TName, ContextFromSchema<TCtx>>) => AgentRunSpec<TChildTools> | Promise<AgentRunSpec<TChildTools>>;
    /**
     * Map the finished child run to this tool's output. Default:
     * `{ text: await child.getText() }` — so the natural outputSchema is
     * `z.object({ text: z.string() })`.
     */
    result?: (child: ModelResult<TChildTools>) => Promise<zodInfer<TOutput>> | zodInfer<TOutput>;
    /** Hold the round this long before placeholdering. Default 250ms. */
    graceMs?: number;
    /** Deadline for the whole child run, in ms. */
    timeoutMs?: number;
    /** Max simultaneous child runs of this tool. */
    maxConcurrency?: number;
    /** Model-facing acknowledgement merged into the pending placeholder. */
    ack?: AsyncToolAck<zodInfer<TInput>>;
    /** Check-in config (the SDK default reports turns + activity). */
    check?: ToolCheckConfig;
    contextSchema?: TCtx;
    nextTurnParams?: NextTurnParamsFunctions<zodInfer<TInput>>;
    requireApproval?: boolean | ToolApprovalCheck<zodInfer<TInput>>;
    loopKey?: ToolLoopKey<zodInfer<TInput>>;
};
/**
 * Create an agent tool: a long-running tool whose work IS a child
 * `callModel` conversation. The child runs as a background task — the
 * parent loop keeps going, its per-turn activity feeds the task log (one
 * entry per child turn), its conversation is the check-in transcript, and
 * its final answer (via the `result` mapper) is delivered like any
 * background result. Steering messages (`sendToTask`, or a check call's
 * `task.send`) are injected into the child as user messages at its next
 * turn boundary. `cancelTask` / parent abort cancel the child run.
 */
export declare function agentToolBuilder<TInput extends $ZodObject<$ZodShape>, TOutput extends $ZodType, TChildTools extends readonly Tool[] = readonly Tool[], TCtx extends $ZodObject<$ZodShape> = $ZodObject<$ZodShape>, TName extends string = string>(config: AgentToolConfig<TInput, TOutput, TChildTools, TCtx, TName>): UnifiedTool<TInput, TOutput, $ZodType<unknown>, Record<string, unknown>, TCtx, TName>;
//# sourceMappingURL=agent-tool.d.ts.map