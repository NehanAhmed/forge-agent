import type { $ZodType, infer as zodInfer, input as zodInput } from 'zod/v4/core';
import type { BuiltInHookDefinitions, EmitResult, HookEntry, HookHandler, HookRegistry, HooksManagerOptions } from './hooks-types.js';
/**
 * Type-level registry of every hook this manager knows: built-ins plus the
 * instance's custom hooks. Each entry carries:
 *
 * - `payload`: the schema OUTPUT -- what handlers receive and `finalPayload`
 *   holds (post-validation, transforms/defaults applied)
 * - `payloadIn`: the schema INPUT -- what `emit()` accepts (differs from
 *   `payload` for schemas with .transform()/.default()/.coerce). Built-in
 *   schemas have no transforms, so input == output there.
 * - `result`: the validated handler result
 */
type AllHooks<Custom extends HookRegistry> = {
    [K in keyof BuiltInHookDefinitions]: {
        payload: BuiltInHookDefinitions[K]['payload'];
        payloadIn: BuiltInHookDefinitions[K]['payload'];
        result: BuiltInHookDefinitions[K]['result'];
    };
} & {
    [K in keyof Custom]: {
        payload: zodInfer<Custom[K]['payload']>;
        payloadIn: zodInput<Custom[K]['payload']>;
        result: zodInfer<Custom[K]['result']>;
    };
};
/**
 * Module-private key used by `resolveHooks` to call the internal
 * untyped-registration path without exposing it as a public method on the
 * class. See {@link getInternalRegistrar} below.
 */
declare const INTERNAL_REGISTRAR_KEY: unique symbol;
type InternalRegistrar = (hookName: string, entry: HookEntry<unknown, unknown>) => () => void;
/**
 * Typed, extensible hook system for agent lifecycle events.
 *
 * Supports both built-in hooks (PreToolUse, PostToolUse, etc.) and
 * user-defined custom hooks with full type safety.
 */
export declare class HooksManager<Custom extends HookRegistry = Record<string, never>> {
    private readonly entries;
    private readonly pendingAsync;
    private readonly customHooks;
    private readonly inflightControllers;
    private readonly throwOnHandlerError;
    private sessionId;
    constructor(customHooks?: Custom, options?: HooksManagerOptions);
    /**
     * Set the manager-level default session ID exposed as `context.sessionId`
     * to handler invocations. Payloads deliberately do not carry session
     * identity.
     *
     * This is a single mutable default on the manager instance: when one
     * manager is shared by concurrent runs, callers MUST pass `sessionId` in
     * the per-emit context instead (as the engine does), otherwise the last
     * `setSessionId()` wins and concurrent emits observe the wrong id.
     */
    setSessionId(sessionId: string): void;
    /**
     * Register a handler for a hook. Returns an unsubscribe function.
     */
    on<K extends keyof AllHooks<Custom> & string>(hookName: K, entry: HookEntry<AllHooks<Custom>[K]['payload'], AllHooks<Custom>[K]['result']>): () => void;
    /**
     * Remove a specific handler function from a hook.
     * Returns true if found and removed, false otherwise.
     */
    off<K extends keyof AllHooks<Custom> & string>(hookName: K, handler: HookHandler<AllHooks<Custom>[K]['payload'], AllHooks<Custom>[K]['result']>): boolean;
    /**
     * Remove all handlers for a specific hook, or all handlers if no name given.
     */
    removeAll<K extends keyof AllHooks<Custom> & string>(hookName?: K): void;
    /**
     * Validate the payload (and each handler's result) against the registered
     * Zod schemas, invoke matching handlers, and return results.
     *
     * Payload validation failure is treated according to `throwOnHandlerError`:
     * strict mode re-throws, default mode logs a warning and returns an empty
     * result without invoking any handlers.
     */
    emit<K extends keyof AllHooks<Custom> & string>(hookName: K, payload: AllHooks<Custom>[K]['payloadIn'], emitContext?: {
        toolName?: string;
        /**
         * Session identity for THIS emit's `context.sessionId`, overriding the
         * manager-level default from `setSessionId()`. Pass it whenever the
         * manager instance may be shared across concurrent runs.
         */
        sessionId?: string;
    }): Promise<EmitResult<AllHooks<Custom>[K]['result'], AllHooks<Custom>[K]['payload']>>;
    /**
     * Await all in-flight async handler work. Used for graceful shutdown.
     */
    drain(): Promise<void>;
    /**
     * Abort every in-flight `emit()` by firing their context `signal`s. Handlers
     * that kick off async work should observe `context.signal` to honor this.
     *
     * Does not remove pending async work from `pendingAsync` — callers that want
     * to wait for handlers to wind down should still call `drain()` afterward.
     */
    abortInflight(reason?: unknown): void;
    /**
     * Check if any handlers are registered for a given hook.
     */
    hasHandlers(hookName: string): boolean;
    /**
     * Internal registration path used by `resolveHooks` to translate an
     * InlineHookConfig object into this manager. User code should use `on()`.
     */
    [INTERNAL_REGISTRAR_KEY](hookName: string, entry: HookEntry<unknown, unknown>): () => void;
    private _register;
    private _definitionFor;
}
/**
 * Internal: return the private registrar of a HooksManager instance. This
 * lets `resolveHooks` register arbitrary hook names (including unknown ones
 * from an inline config) without exposing a public bypass of the typed `on()`.
 *
 * NOT PART OF THE PUBLIC API.
 */
export declare function getInternalRegistrar(manager: HooksManager): InternalRegistrar;
/**
 * Detect a `z.void()` schema (zod v4 core). Result validation is skipped for
 * void-result hooks so side-effect-only handlers can return arbitrary values
 * without tripping validation -- for built-ins and custom hooks alike.
 *
 * Implementation note: `schema._zod.def.type` is zod v4's designated
 * introspection surface for library authors (every `$ZodType` carries a
 * `_zod: $ZodTypeInternals` with a stable `def.type` discriminator). A string
 * check is deliberately preferred over `instanceof $ZodVoid`, which breaks
 * across duplicated zod module instances (dual-package hazard) and mixed
 * zod/v4 vs zod/v4-mini usage. Behavior is pinned by tests in
 * hooks-contract-fixes.test.ts ("void schema detection") so a zod upgrade
 * that restructures the internals fails loudly instead of silently
 * re-enabling result validation on void hooks.
 *
 * Exported for the pinning tests only; NOT re-exported from the package
 * index and NOT part of the public API.
 */
export declare function isVoidSchema(schema: $ZodType): boolean;
export {};
//# sourceMappingURL=hooks-manager.d.ts.map