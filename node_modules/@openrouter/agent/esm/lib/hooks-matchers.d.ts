import type { ToolMatcher } from './hooks-types.js';
/**
 * Evaluate a ToolMatcher against a tool name.
 *
 * - `undefined` -> wildcard, matches all tools
 * - `string` -> exact match
 * - `RegExp` -> `.test(toolName)`
 * - `function` -> arbitrary predicate (truthy/falsy returns are coerced to
 *   boolean so the declared `boolean` return type holds at runtime)
 */
export declare function matchesTool(matcher: ToolMatcher | undefined, toolName: string): boolean;
//# sourceMappingURL=hooks-matchers.d.ts.map