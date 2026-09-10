import type { Client } from '@modelcontextprotocol/client';
import type { McpBranded } from '../lib/tool-types.js';
export interface ResourceToolsOptions {
    client: Client;
    namePrefix?: string;
    signal?: AbortSignal;
}
/**
 * Build synthetic tools that let the model browse and read MCP resources
 * through the normal tool loop:
 * - `list_resources`: concrete resources plus resource templates.
 * - `read_resource`: fetch a resource's contents by URI.
 *
 * Only call this when the server advertises the `resources` capability.
 */
export declare function buildResourceTools(options: ResourceToolsOptions): McpBranded[];
//# sourceMappingURL=resource-tools.d.ts.map