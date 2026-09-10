import type { $ZodType } from 'zod/v4/core';
import type { EmitResult, HookEntry, LifecycleHookContext } from './hooks-types.js';
export interface ExecuteChainOptions {
    readonly hookName: string;
    readonly throwOnHandlerError: boolean;
    readonly toolName?: string | undefined;
    /**
     * Optional Zod schema to validate each handler's result BEFORE the chain
     * applies mutation piping or short-circuit logic. Validation errors are
     * handled the same way as handler throws: either re-thrown (strict mode) or
     * logged as a warning (default).
     *
     * Void-typed hooks typically pass `undefined` here; results in that case are
     * not validated.
     */
    readonly resultSchema?: $ZodType | undefined;
    /**
     * Invoked when a handler's fire-and-forget `work` exceeds its
     * `asyncTimeout`. The manager uses this to abort the emit's signal so
     * handlers that observe `context.signal` can cancel the stale work.
     */
    readonly onAsyncTimeout?: ((hookName: string) => void) | undefined;
}
/**
 * Execute a chain of hook handlers sequentially.
 *
 * Supports:
 * - ToolMatcher and filter-based skipping (matcher fails closed: a handler with
 *   a matcher and no `options.toolName` is skipped)
 * - Sync results validated against `options.resultSchema` and collected into `results`
 * - Async fire-and-forget via a returned {@link AsyncOutput} -- the handler's
 *   `work` promise is pushed to `pending` without being awaited; the manager is
 *   responsible for draining/timing out that work
 * - Per-hook mutation piping (driven by {@link HOOK_BEHAVIOR})
 * - Short-circuit on block/reject fields (non-empty string or `true`)
 * - Cooperative abort via `context.signal`: the chain checks
 *   `signal.aborted` between handlers and bails out when set so
 *   `abortInflight()` has a deterministic effect on the chain itself (not just
 *   on handlers that happen to consult the signal).
 *
 * Payload isolation: the initial payload is shallow-cloned before entering the
 * chain so mutation piping (via {@link HOOK_BEHAVIOR}) doesn't mutate the
 * caller's payload at the top level. This is a top-level-only guarantee:
 * handlers that directly mutate a nested object (e.g.
 * `payload.toolInput.foo = 'bar'`) still reach the caller's original nested
 * reference. Handlers MUST return mutations via the documented result fields
 * (e.g. `mutatedInput`) rather than mutating nested payload fields in place.
 */
export declare function executeHandlerChain<P, R>(entries: ReadonlyArray<HookEntry<P, R>>, initialPayload: P, context: LifecycleHookContext, options: ExecuteChainOptions): Promise<EmitResult<R, P>>;
//# sourceMappingURL=hooks-emit.d.ts.map