/**
 * Typeguards over the raw JSON-Schema-shaped values that arrive from an MCP
 * server. MCP tool input/output schemas are untrusted `unknown` data, so we
 * narrow them with runtime checks rather than `as` casts.
 */
/** A non-null, non-array object — the shape every JSON Schema node takes. */
export declare function isJsonSchemaObject(value: unknown): value is Record<string, unknown>;
/** A JSON Schema whose top-level `type` is `"object"`. */
export declare function isObjectJsonSchema(value: unknown): value is Record<string, unknown> & {
    type: 'object';
};
/** The `properties` map of an object schema, when present and well-formed. */
export declare function getSchemaProperties(schema: Record<string, unknown>): Record<string, unknown> | undefined;
//# sourceMappingURL=json-schema-guards.d.ts.map