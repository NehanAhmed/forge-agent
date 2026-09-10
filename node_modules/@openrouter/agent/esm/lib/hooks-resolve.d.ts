import { HooksManager } from './hooks-manager.js';
import type { InlineHookConfig } from './hooks-types.js';
/**
 * Normalize a hooks option into a HooksManager instance.
 *
 * - `undefined` -> `undefined` (no hooks)
 * - `HooksManager` -> passthrough
 * - Plain object (InlineHookConfig) -> construct HooksManager, register all entries
 *
 * The inline config surface is typed to only accept built-in hook names, but
 * a generic config coerced through `as` can smuggle typos past the compiler
 * (e.g. `PretoolUse` vs `PreToolUse`) which would silently never fire. We log
 * a warning for any non-built-in key and skip registration for it. Custom
 * hooks must be registered through a `HooksManager` instance via `on()`.
 */
export declare function resolveHooks(hooks: InlineHookConfig | HooksManager | undefined): HooksManager | undefined;
//# sourceMappingURL=hooks-resolve.d.ts.map