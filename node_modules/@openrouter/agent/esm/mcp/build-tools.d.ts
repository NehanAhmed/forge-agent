import type { Client } from '@modelcontextprotocol/client';
import type { Tool, ToolLoopKey } from '../lib/tool-types.js';
import type { UnconvertibleSchemaMode } from './schema/json-schema-to-zod.js';
import type { McpToolDef } from './tool-wrapper.js';
import type { ResourcesOption } from './types.js';
export interface BuildToolsOptions {
    client: Client;
    toolDefs: readonly McpToolDef[];
    namePrefix?: string;
    includeTools?: readonly string[];
    excludeTools?: readonly string[];
    schemaMode?: UnconvertibleSchemaMode;
    emitProgress?: boolean;
    /** Per-tool doom-loop identities, keyed by unprefixed MCP tool name. */
    loopKeys?: Readonly<Record<string, ToolLoopKey<Record<string, unknown>>>>;
    signal?: AbortSignal;
    resources?: ResourcesOption;
    /** Whether the server advertised the resources capability. */
    serverHasResources: boolean;
}
/** Apply allow/deny filters to discovered MCP tool definitions. */
export declare function filterToolDefs(defs: readonly McpToolDef[], includeTools?: readonly string[], excludeTools?: readonly string[]): McpToolDef[];
/**
 * Build the full ordered tool list for a handle: filtered + wrapped MCP tools,
 * plus synthetic resource tools when enabled. Throws on a name collision so two
 * tools never silently shadow each other in `callModel`.
 */
export declare function buildTools(options: BuildToolsOptions): Tool[];
//# sourceMappingURL=build-tools.d.ts.map