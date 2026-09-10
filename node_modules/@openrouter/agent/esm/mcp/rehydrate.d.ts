import type { MCPAuth } from './auth/auth-types.js';
import type { MCPCacheStore } from './cache/cache-store.js';
import type { SerializedMCPServer } from './cache/cache-types.js';
import type { UnconvertibleSchemaMode } from './schema/json-schema-to-zod.js';
import type { CreateMCPToolsOptions, ElicitationHandler, MCPProtocolNegotiation, MCPToolsHandle, ResourcesOption } from './types.js';
export interface RehydrateMCPToolsOptions {
    snapshot: SerializedMCPServer;
    /** Required when the snapshot carries no cached credentials. */
    auth?: MCPAuth;
    fetch?: typeof fetch;
    onUnconvertibleSchema?: UnconvertibleSchemaMode;
    onElicitation?: ElicitationHandler;
    signal?: AbortSignal;
    /** Protocol-revision negotiation policy; defaults to `'auto'`. */
    protocolNegotiation?: MCPProtocolNegotiation;
    /** Ceiling on the `server/discover` probe, in ms; defaults to 30000. */
    probeTimeoutMs?: number;
    /** Re-list tools instead of replaying a snapshot older than this. */
    staleness?: {
        maxAgeMs?: number;
    };
    /**
     * Cache to refresh on reconnect/fallback.
     *
     * A successful replay does **not** write here — the snapshot it would write is
     * the one you passed in, so the write is skipped as a no-op. The store is
     * written when something genuinely new exists: a `refresh()`, a
     * `tools/list_changed` auto-refresh, or the fresh-connect fallback. To seed a
     * store from a snapshot obtained elsewhere, write it yourself
     * (`store.set(key, snapshot)`) or call `handle.refresh()` after rehydrating.
     */
    cache?: {
        store: MCPCacheStore;
        key?: string;
    };
    /**
     * On expired cached tokens, missing credentials, an over-age snapshot
     * (`staleness.maxAgeMs`), or a replay connection failure, transparently fall
     * back to a full fresh connect. Default true.
     *
     * The fallback is skipped when the replay's connect ended in a credential
     * rejection (the SDK's `UnauthorizedError`, or a 401 status when an OAuth
     * provider is configured): the fallback reuses the same auth, so retrying
     * cannot succeed and would re-drive an OAuth authorization flow. Those
     * failures reject with `MCPCacheError` instead. A 403 does not skip it — the
     * SDK's OAuth side effects only occur on 401, and gateways commonly answer
     * unknown methods with 403.
     */
    reconnectOnExpiry?: boolean;
    toolNamePrefix?: string;
    includeTools?: readonly string[];
    excludeTools?: readonly string[];
    resources?: ResourcesOption;
    emitProgress?: boolean;
    /** Doom-loop identities for wrapped tools, keyed by unprefixed MCP name. */
    loopKeys?: CreateMCPToolsOptions['loopKeys'];
    autoRefreshOnListChanged?: boolean;
    cacheCredentials?: boolean;
    clientInfo?: {
        name: string;
        version: string;
    };
}
/**
 * Rebuild an {@link MCPToolsHandle} from a cached snapshot. On the happy path we
 * reconnect the transport and rebuild tools directly from the snapshot —
 * skipping `listTools()`. If cached tokens are expired, credentials are missing,
 * the snapshot is older than `staleness.maxAgeMs`, or the replay connection
 * fails, we transparently fall back to a fresh connect (unless
 * `reconnectOnExpiry` is false) — with one exception: a credential rejection is
 * not retried, because the fallback reuses the same auth and re-attempting
 * would re-drive an OAuth authorization flow. See {@link
 * RehydrateMCPToolsOptions.reconnectOnExpiry}.
 */
export declare function rehydrateMCPTools(options: RehydrateMCPToolsOptions): Promise<MCPToolsHandle>;
//# sourceMappingURL=rehydrate.d.ts.map