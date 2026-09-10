import * as z4 from 'zod/v4';
import { HookName } from './hooks-schemas.js';
// HookName / HookDefinition / HookRegistry are declared in hooks-schemas.ts
// next to the schemas they describe; re-exported here so the public import
// surface is unchanged and the module dependency stays one-directional
// (hooks-types -> hooks-schemas, no cycle).
export { HookName } from './hooks-schemas.js';
const DEFAULT_ASYNC_TIMEOUT = 30000;
export { DEFAULT_ASYNC_TIMEOUT };
//#endregion
//#region Helper Types
/**
 * Strict schema for an {@link AsyncOutput} signal: `async` must be literally
 * `true`, `work`/`asyncTimeout` must match their declared types, and any
 * foreign key fails the parse. A handler that accidentally returns
 * `{ async: true, mutatedInput: {...} }` is therefore treated as a result
 * (so the mutation is not silently discarded), not as fire-and-forget.
 */
const AsyncOutputSchema = z4.strictObject({
    async: z4.literal(true),
    work: z4.instanceof(Promise).optional(),
    asyncTimeout: z4.number().optional(),
});
/**
 * Checks if a value is an AsyncOutput signal (see {@link AsyncOutputSchema}).
 */
export function isAsyncOutput(value) {
    return AsyncOutputSchema.safeParse(value).success;
}
export const HOOK_BEHAVIOR = Object.freeze({
    [HookName.PreToolUse]: Object.freeze({
        mutations: Object.freeze({
            mutatedInput: 'toolInput',
        }),
        blockField: 'block',
    }),
    [HookName.UserPromptSubmit]: Object.freeze({
        mutations: Object.freeze({
            mutatedPrompt: 'prompt',
        }),
        blockField: 'reject',
    }),
});
//#endregion
//# sourceMappingURL=hooks-types.js.map