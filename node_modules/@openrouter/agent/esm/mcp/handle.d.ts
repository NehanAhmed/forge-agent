import type { MCPConnection } from './mcp-connection.js';
import type { McpToolDef } from './tool-wrapper.js';
import type { MCPTransportKind } from './transport-types.js';
import type { CreateMCPToolsOptions, MCPToolsHandle } from './types.js';
export declare function normalizeUrl(url: string | URL): URL;
/**
 * Read the discovered tools off the live connection into our internal shape.
 *
 * `tools/list` is paginated: each response may carry a `nextCursor` that must be
 * passed back as `{ cursor }` to fetch the next page. We accumulate every page so
 * servers that paginate their tool list aren't silently truncated.
 *
 * Always `cacheMode: 'refresh'`. SDK v2 keeps a per-client response cache
 * honouring the server's `ttlMs` on `tools/list` (up to 24h), so the default
 * `'use'` would serve a still-fresh cached list without a round trip. That is
 * fine for an opportunistic read but wrong for every caller here: `refresh()`
 * documents a forced re-read, `freshConnect` is establishing the tool set for the
 * first time, and the stale-replay path exists precisely because the age of the
 * cached list is no longer acceptable. `'refresh'` fetches and re-stores, so the
 * cache stays warm for the SDK's own readers.
 *
 * `'refresh'` rather than `'bypass'` deliberately — bypass would skip the write
 * too, leaving a stale entry behind for anything that later reads with `'use'`.
 */
export declare function listToolDefs(connection: MCPConnection, signal: AbortSignal | undefined): Promise<McpToolDef[]>;
interface HandleContext {
    url: URL;
    transport: MCPTransportKind;
    cacheKey: string;
}
export interface MakeHandleArgs {
    connection: MCPConnection;
    options: CreateMCPToolsOptions;
    context: HandleContext;
    initialToolDefs: McpToolDef[];
    /**
     * `cachedAt` to carry forward when `initialToolDefs` came from a snapshot
     * rather than a live `listTools()`. Omit on a cold connect so the write
     * stamps now.
     *
     * Without this a replay would restamp `cachedAt` on the write-back below,
     * resetting the staleness clock on a tool set that was never re-listed —
     * so `staleness.maxAgeMs` could never fire on a repeatedly-rehydrated
     * snapshot. Age tracks when the tools were last actually discovered, not
     * when they were last replayed. `refresh()` clears it, because that path
     * does re-list.
     */
    replayedCachedAt?: number;
}
/**
 * Connect, discover tools via `listTools()`, and build a handle WITHOUT
 * consulting the cache for a hit. The cache (when present on `options`) is still
 * written through `makeHandle`, so refreshes persist. This is the cold cache-miss
 * path, and is also called directly by `rehydrateMCPTools`'s fallback: routing
 * the fallback here instead of back through `createMCPTools` is what prevents the
 * cache-fallback loop — re-reading the same snapshot would re-enter rehydrate and
 * recurse without bound.
 */
export declare function freshConnect(options: CreateMCPToolsOptions, url: URL, cacheKey: string): Promise<MCPToolsHandle>;
/**
 * Construct an {@link MCPToolsHandle} around a live connection, wiring refresh,
 * serialize, list_changed listeners, and cache writes.
 */
export declare function makeHandle(args: MakeHandleArgs): Promise<MCPToolsHandle>;
export {};
//# sourceMappingURL=handle.d.ts.map