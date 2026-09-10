import type { $ZodObject, $ZodShape } from 'zod/v4/core';
import type { ToolExecuteContext, TurnContext } from './tool-types.js';
/**
 * Listener function called when context values change
 * Receives a shallow copy of the full context store
 */
type ContextChangeListener = (snapshot: Record<string, Record<string, unknown>>) => void;
/**
 * Context input can be a static value, a sync function, or an async function
 */
export type ContextInput<T extends Record<string, Record<string, unknown>>> = T | ((turn: TurnContext) => T) | ((turn: TurnContext) => Promise<T>);
/**
 * Mutable context store shared across all tool executions within a callModel invocation.
 * Stores context keyed by tool name: `{ get_weather: { apiKey: '...' }, db_query: { dbUrl: '...' } }`.
 * Notifies listeners on changes.
 */
export declare class ToolContextStore {
    private store;
    private listeners;
    constructor(initialValues?: Record<string, Record<string, unknown>>);
    /** Subscribe to context changes. Returns an unsubscribe function. */
    subscribe(listener: ContextChangeListener): () => void;
    /** Get a deep-shallow copy of the full context (all tools) */
    getSnapshot(): Record<string, Record<string, unknown>>;
    /** Get a shallow copy of context for a specific tool */
    getToolContext(toolName: string): Record<string, unknown>;
    /** Set context for a specific tool and notify listeners */
    setToolContext(toolName: string, values: Record<string, unknown>): void;
    /** Merge partial values into a specific tool's context and notify listeners */
    mergeToolContext(toolName: string, partial: Record<string, unknown>): void;
    private notifyListeners;
}
/**
 * Per-execution extras threaded into the ToolExecuteContext: the composed
 * abort signal for this call, the call id, the conversation id, and (for
 * unified `run` tools) the async-task affordances.
 */
export interface ToolExecutionExtras {
    signal?: AbortSignal;
    callId?: string;
    conversationId?: string;
    /** The parent run's client — agent tools use it to start child runs. */
    client?: unknown;
    /**
     * Unified-run affordances, wired by the engine per call:
     * - `defer` — create a DeferredHandle (deferred lifecycle only)
     * - `log` — append a task log entry (same pipeline as a yield)
     * - `onMessage` — register the steering-inbox handler
     * - `taskId` — the task id once assigned
     */
    runExtras?: {
        defer?: (taskId: string, options?: Record<string, unknown>) => unknown;
        log?: (entry: unknown) => void;
        onMessage?: (handler: (message: unknown) => void) => void;
        taskId?: string;
        /**
         * Transcript-source slot (agent tools attach their live transcript
         * here). Deliberately NOT named `task`: `TurnContext.task` is typed
         * `ToolTaskHandle` (check calls only) and must not be shadowed by a
         * transcript-only object in run bodies.
         */
        taskTranscript?: unknown;
    };
}
/**
 * Build a flat ToolExecuteContext for a specific tool.
 * Returns a merged object with TurnContext fields, a `local` getter
 * (reads from the store on each access), `shared` getter, and mutation methods.
 *
 * The `local` and `shared` getters are live — calling `setContext()` or
 * `setSharedContext()` and then reading the property reflects updated values immediately.
 *
 * @param turnContext - The current turn context
 * @param store - The shared context store (keyed by tool name)
 * @param toolName - The tool's name
 * @param schema - The tool's contextSchema (for validation)
 * @param sharedSchema - The shared contextSchema (for validation)
 * @param extras - Per-execution extras (abort signal, call id, conversation id)
 * @returns A flat ToolExecuteContext
 */
export declare function buildToolExecuteContext<TName extends string, TContext extends Record<string, unknown>, TShared extends Record<string, unknown> = Record<string, unknown>>(turnContext: TurnContext, store: ToolContextStore | undefined, toolName: TName, schema: $ZodObject<$ZodShape> | undefined, sharedSchema?: $ZodObject<$ZodShape> | undefined, extras?: ToolExecutionExtras): ToolExecuteContext<TName, TContext, TShared>;
/**
 * Build a ToolRunContext for a unified `run` tool: the base execute context
 * plus the async-task affordances (`defer`, `log`, `onMessage`, `taskId`,
 * `client`). Attached onto the built object (not via spread) because
 * `local`/`shared` are live getters a spread would flatten.
 */
export declare function buildToolRunContext<TName extends string, TContext extends Record<string, unknown>, TShared extends Record<string, unknown> = Record<string, unknown>>(turnContext: TurnContext, store: ToolContextStore | undefined, toolName: TName, schema: $ZodObject<$ZodShape> | undefined, sharedSchema?: $ZodObject<$ZodShape> | undefined, extras?: ToolExecutionExtras): ToolExecuteContext<TName, TContext, TShared> & {
    defer: (taskId: string, options?: Record<string, unknown>) => unknown;
    log: (entry: unknown) => void;
    onMessage: (handler: (message: unknown) => void) => void;
};
/**
 * Resolve a context input (static value, sync function, or async function) to a plain object.
 *
 * @param contextInput - The context value or function from callModel
 * @param turnContext - The current turn context for function resolution
 * @returns The resolved context object (keyed by tool name)
 */
export declare function resolveContext<T extends Record<string, Record<string, unknown>>>(contextInput: ContextInput<T> | undefined, turnContext: TurnContext): Promise<T>;
/**
 * Extract and validate context values for a specific tool from the context store.
 * Returns a shallow copy so the caller cannot mutate the store directly.
 *
 * @param store - The shared context store (keyed by tool name)
 * @param toolName - The tool's name
 * @param schema - The tool's contextSchema
 * @returns A shallow copy of the validated context values for this tool
 */
export declare function extractToolContext(store: ToolContextStore, toolName: string, schema: $ZodObject<$ZodShape> | undefined): Record<string, unknown>;
export {};
//# sourceMappingURL=tool-context.d.ts.map