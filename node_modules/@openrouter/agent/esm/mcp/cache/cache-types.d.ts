import type { MCPTransportKind } from '../transport-types.js';
/** A discovered tool definition as stored in a cache snapshot. */
export interface SerializedMCPToolDef {
    name: string;
    description?: string;
    inputSchema: Readonly<Record<string, unknown>>;
    outputSchema?: Readonly<Record<string, unknown>>;
    /** Server-advertised doom-loop identity (field list or `false`), if any. */
    loopKey?: readonly string[] | false;
}
/** OAuth/bearer token material, persisted only when `cacheCredentials` is on. */
export interface SerializedTokenSet {
    accessToken: string;
    tokenType?: string;
    refreshToken?: string;
    /** Epoch ms; absence means unknown/no declared expiry. */
    expiresAt?: number;
    scope?: string;
}
/**
 * Serializable snapshot of a connected MCP server: enough to rebuild the tool
 * set (and, opt-in, reconnect with cached credentials) without re-listing or
 * re-authenticating.
 */
export interface SerializedMCPServer {
    version: 1;
    url: string;
    transport: MCPTransportKind;
    serverInfo?: {
        name?: string;
        version?: string;
    };
    capabilities?: Readonly<Record<string, unknown>>;
    /**
     * Streamable HTTP session id, replayed on reconnect.
     *
     * @deprecated No longer written, and never read back. Protocol-level sessions
     * and the `Mcp-Session-Id` header are removed in revision 2026-07-28
     * (SEP-2567), where cross-call state moves to server-minted handles passed as
     * ordinary tool arguments.
     *
     * The field remains only so snapshots written by older versions keep
     * deserializing — a validator that rejected it would turn every existing cache
     * entry into a hard failure. Nothing populates it now: it is bearer-equivalent
     * to an authenticated server session, so persisting it to an external store was
     * attack surface for no functionality once the replay path stopped forwarding
     * it. Treat any value found here as untrusted legacy data. See the README.
     */
    sessionId?: string;
    tools: SerializedMCPToolDef[];
    auth?: {
        headers?: Readonly<Record<string, string>>;
        tokens?: SerializedTokenSet;
    };
    cachedAt: number;
}
/**
 * The shared "valid `cachedAt`" rule: a finite, non-negative epoch (ms).
 * Consumed by both the read-side snapshot validator and the write-side
 * serializer so the two can't drift. Rejecting negatives keeps the invariant
 * honest at the boundary rather than relying on downstream maxAge arithmetic to
 * fail-safe on a clock-skewed or garbage value.
 */
export declare function isFiniteEpoch(value: unknown): value is number;
/**
 * Validate an untrusted value as a {@link SerializedMCPServer}. Cache stores may
 * be backed by a DB or another org member's data, so snapshots are checked
 * structurally before use — never trusted by shape alone.
 */
export declare function isSerializedMCPServer(value: unknown): value is SerializedMCPServer;
//# sourceMappingURL=cache-types.d.ts.map