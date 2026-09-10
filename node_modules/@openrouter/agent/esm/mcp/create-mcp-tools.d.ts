import type { SerializedMCPServer } from './cache/cache-types.js';
import type { CreateMCPToolsOptions, MCPToolsHandle } from './types.js';
/**
 * Connect to a remote MCP server, discover its tools, and return a handle whose
 * `.tools` can be passed straight into `callModel({ tools })`. Auth is supplied
 * once and reused for discovery and every subsequent tool call.
 *
 * When `cache` is provided, a valid non-stale snapshot is rehydrated instead of
 * re-listing; otherwise the fresh result is written back to the cache.
 */
export declare function createMCPTools(options: CreateMCPToolsOptions): Promise<MCPToolsHandle>;
export type { SerializedMCPServer };
//# sourceMappingURL=create-mcp-tools.d.ts.map