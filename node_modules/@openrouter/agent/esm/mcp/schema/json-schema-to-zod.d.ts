import type { $ZodObject } from 'zod/v4/core';
/**
 * How to handle a JSON Schema (sub)schema that Zod cannot represent.
 * - `looseLeaf` (default): substitute `z.unknown()` for only the offending
 *   property so the rest of the tool's parameters stay faithful.
 * - `throw`: surface the conversion failure to the caller.
 */
export type UnconvertibleSchemaMode = 'looseLeaf' | 'throw';
/**
 * Convert an MCP tool's JSON Schema (input or output) into a Zod v4 object
 * schema. `callModel` derives the model-facing parameters from this Zod schema,
 * so the conversion must be faithful — a permissive passthrough would make the
 * model call the tool blind.
 *
 * Strategy: attempt a holistic `z.fromJSONSchema` conversion first (handles
 * `$ref`/`$defs`, `anyOf`, formats, nesting); on failure, fall back per the
 * chosen `mode`.
 */
export declare function convertMcpInputSchema(jsonSchema: Record<string, unknown>, mode?: UnconvertibleSchemaMode): $ZodObject;
//# sourceMappingURL=json-schema-to-zod.d.ts.map