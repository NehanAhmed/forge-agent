import type { MCPAuth } from '../auth/auth-types.js';
import type { McpToolDef } from '../tool-wrapper.js';
import type { MCPTransportKind } from '../types.js';
import type { SerializedMCPServer } from './cache-types.js';
export interface SerializeInput {
    url: string;
    transport: MCPTransportKind;
    toolDefs: readonly McpToolDef[];
    serverInfo?: {
        name?: string;
        version?: string;
    };
    capabilities?: Readonly<Record<string, unknown>>;
    auth?: MCPAuth;
    cacheCredentials: boolean;
    cachedAt: number;
}
/**
 * Build a serializable snapshot. Credentials (tokens/headers) are included only
 * when `cacheCredentials` is true; otherwise the snapshot holds just the
 * structural data needed to rebuild the tool set after a fresh auth. Session ids
 * are never included — see the note in the `cacheCredentials` branch.
 */
export declare function serializeServer(input: SerializeInput): Promise<SerializedMCPServer>;
//# sourceMappingURL=serialize.d.ts.map