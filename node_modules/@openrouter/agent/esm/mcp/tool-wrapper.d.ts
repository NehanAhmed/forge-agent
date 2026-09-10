import type { Client } from '@modelcontextprotocol/client';
import type { McpBranded, ToolLoopKey } from '../lib/tool-types.js';
import type { UnconvertibleSchemaMode } from './schema/json-schema-to-zod.js';
/** A discovered MCP tool definition (the fields we consume). */
export interface McpToolDef {
    name: string;
    description?: string;
    inputSchema: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    /**
     * Doom-loop identity advertised by the server via
     * `_meta['openrouter/loopKey']` on the tool definition: a field-name
     * array (the declarative subset of arguments that identifies a call) or
     * `false` (the tool is exempt — repetition is its job, e.g. polling).
     * Data, not code — survives cache snapshots. A client-side `loopKeys`
     * entry in {@link WrapToolOptions} takes precedence.
     */
    loopKey?: readonly string[] | false;
}
export interface WrapToolOptions {
    client: Client;
    namePrefix?: string;
    schemaMode?: UnconvertibleSchemaMode;
    emitProgress?: boolean;
    signal?: AbortSignal;
    /**
     * Per-tool doom-loop identities, keyed by the tool's UNPREFIXED MCP name.
     * Any `ToolLoopKey` form (function | field list | `false`). Takes
     * precedence over a server-advertised `loopKey` on the definition.
     */
    loopKeys?: Readonly<Record<string, ToolLoopKey<Record<string, unknown>>>>;
}
/**
 * Wrap one discovered MCP tool as an `@openrouter/agent` tool. Emits a
 * generator tool (streaming progress events) when `emitProgress` is on,
 * otherwise a regular tool. The input schema (and output schema, when declared)
 * are converted to Zod so the model sees faithful parameters. The abort signal,
 * if supplied, is threaded into the underlying `callTool`.
 */
export declare function wrapMcpTool(def: McpToolDef, options: WrapToolOptions): McpBranded;
//# sourceMappingURL=tool-wrapper.d.ts.map