/** Identifies objects produced by `@openrouter/agent/tool-set`. */
export const TOOL_SET_SNAPSHOT = Symbol.for('@openrouter/agent/tool-set/snapshot');
const TOOL_SET_SNAPSHOT_METADATA_KEYS = new Set([
    'enabled',
    'disabled',
    'statusByTool',
    'callModel',
]);
/** Remove tool-set metadata only from marked snapshots or their spreads. */
export function stripToolSetSnapshotMetadata(input) {
    if (input[TOOL_SET_SNAPSHOT] !== true) {
        return;
    }
    for (const key of TOOL_SET_SNAPSHOT_METADATA_KEYS) {
        delete input[key];
    }
    delete input[TOOL_SET_SNAPSHOT];
}
/**
 * Type guard to check if a value is a parameter function
 * Parameter functions take TurnContext and return a value or promise
 */
function isParameterFunction(value) {
    return typeof value === 'function';
}
/**
 * Build a resolved request object from entries
 * This validates the structure matches the expected ResolvedCallModelInput shape
 */
function buildResolvedRequest(entries) {
    const obj = Object.fromEntries(entries);
    return obj;
}
/**
 * Resolve all async functions in CallModelInput to their values
 *
 * @param input - Input with possible functions
 * @param context - Turn context for function execution
 * @returns Resolved input with all values (no functions)
 *
 * @example
 * ```typescript
 * const resolved = await resolveAsyncFunctions(
 *   {
 *     model: 'gpt-4',
 *     temperature: (ctx) => ctx.numberOfTurns * 0.1,
 *     input: 'Hello',
 *   },
 *   { numberOfTurns: 2 }
 * );
 * // resolved.temperature === 0.2
 * ```
 */
export async function resolveAsyncFunctions(input, context) {
    // Build array of resolved entries
    const resolvedEntries = [];
    // Fields that should not be sent to the API (client-side only)
    const clientOnlyFields = new Set([
        'stopWhen', // Handled separately in ModelResult
        'state', // Client-side state management
        'requireApproval', // Client-side approval check function
        'approveToolCalls', // Client-side approval decisions
        'rejectToolCalls', // Client-side rejection decisions
        'context', // Passed through via GetResponseOptions, not sent to API
        'sharedContextSchema', // Client-side schema for shared context validation
        'onTurnStart', // Client-side turn start callback
        'onTurnEnd', // Client-side turn end callback
        'streamReplay', // Client-side stream replay policy
        'allowFinalResponse', // Client-side: tunes the default toolChoice:'none' final turn when stopWhen breaks the loop
        'strictFinalResponse', // Client-side: restore throw on empty final after tool rounds
        'hooks', // Client-side hook system
        'doomLoop', // Client-side doom-loop detection config
        'signal', // Client-side run cancellation
        'toolTimeoutMs', // Client-side per-tool deadline default
        'toolConcurrency', // Client-side tool concurrency limits
        'asyncTools', // Client-side async tool (background/deferred) behavior
        'activeTools', // Applied client-side to filter tools before conversion
    ]);
    const request = {
        ...input,
    };
    stripToolSetSnapshotMetadata(request);
    // Iterate over all keys in the input
    for (const [key, value] of Object.entries(request)) {
        // Skip client-only fields - they're handled separately and shouldn't be sent to the API
        // Note: tools are already in API format at this point (converted in callModel()), so we include them
        //
        if (clientOnlyFields.has(key)) {
            continue;
        }
        if (isParameterFunction(value)) {
            try {
                // Execute the function with context and store the result
                const result = await Promise.resolve(value(context));
                resolvedEntries.push([
                    key,
                    result,
                ]);
            }
            catch (error) {
                // Wrap errors with context about which field failed
                throw new Error(`Failed to resolve async function for field "${key}": ${error instanceof Error ? error.message : String(error)}`);
            }
        }
        else {
            // Not a function, use as-is
            resolvedEntries.push([
                key,
                value,
            ]);
        }
    }
    return buildResolvedRequest(resolvedEntries);
}
/**
 * Check if input has any async functions that need resolution
 *
 * @param input - Input to check
 * @returns True if any field is a function
 */
export function hasAsyncFunctions(input) {
    if (!input || typeof input !== 'object') {
        return false;
    }
    return Object.values(input).some((value) => typeof value === 'function');
}
//# sourceMappingURL=async-params.js.map