import type { Client } from '@modelcontextprotocol/client';
import type { MCPAuth } from './auth/auth-types.js';
import type { MCPSdk } from './mcp-sdk.js';
import type { MCPProtocolNegotiation, MCPTransportKind } from './transport-types.js';
import type { ElicitationHandler } from './types.js';
export interface ConnectOptions {
    url: URL;
    transport?: MCPTransportKind;
    auth?: MCPAuth;
    fetch?: typeof fetch;
    clientInfo?: {
        name: string;
        version: string;
    };
    /**
     * Streamable HTTP session id to resume.
     *
     * @deprecated Ignored by 2026-07-28 servers — protocol-level sessions are
     * removed (SEP-2567). Still honoured on 2025-era connections.
     */
    sessionId?: string;
    onElicitation?: ElicitationHandler;
    protocolNegotiation?: MCPProtocolNegotiation;
    /**
     * Aborts the connect — every transport attempt, the negotiation probe, and
     * the implicit legacy retry. Without this a caller with its own deadline has
     * no way to bound the ladder, whose worst case is minutes (see
     * {@link DEFAULT_PROBE_TIMEOUT_MS}).
     */
    signal?: AbortSignal;
    /**
     * Ceiling on the `server/discover` probe, in ms. Defaults to
     * `DEFAULT_PROBE_TIMEOUT_MS` (30000).
     *
     * Raise it for a server that is slow to answer its first request; the SDK's own
     * default is the full request timeout, which makes a hanging gateway far slower
     * to fail than it needs to be.
     */
    probeTimeoutMs?: number;
}
export interface MCPConnection {
    client: Client;
    transport: MCPTransportKind;
    /**
     * Session id reported by the transport, when there is one.
     *
     * @deprecated `undefined` on 2026-07-28 connections (SEP-2567) and on SSE,
     * which never had a protocol-level session.
     */
    sessionId?: string;
    /**
     * Register a callback for `tools/list_changed`. Settable after connect so the
     * handle can wire it to its own `refresh()`. Replaces any prior handler.
     */
    setToolListChangedHandler(handler: () => void): void;
    close(): Promise<void>;
}
/**
 * Build the configured `Client` — negotiation mode, elicitation handler, and the
 * `tools/list_changed` subscription — without connecting it.
 *
 * Exported for tests only, and deliberately not re-exported from the package
 * entrypoint. It is the seam that lets a test drive the real handler wiring over
 * `InMemoryTransport`: the notification method name is compile-checked (it is a
 * `NotificationMethod` literal union, so a typo fails `tsc`), but the *dispatch*
 * — that an inbound notification actually reaches `setToolListChangedHandler`'s
 * callback — is only observable end to end. Without this seam, default-on
 * `autoRefreshOnListChanged` could be silently dead with every test green.
 *
 * @internal
 */
export declare function makeClientForTest(options: ConnectOptions, onListChanged: () => void): Promise<Client>;
/**
 * Did any attempt behind this failure end in the server rejecting our
 * credentials?
 *
 * Searches the whole tree rather than the `cause` spine, because a single
 * `connect()` can fail more than once: `connectWithNegotiation` wraps transport
 * errors in `MCPConnectionError`, and on the two-transport path it records both
 * attempts in `errors`. Checking only `cause` would miss an `UnauthorizedError`
 * from the Streamable HTTP attempt whenever the SSE fallback then failed for an
 * unrelated reason — a URL that isn't an SSE endpoint answering 404 never
 * reaches the auth path — and the retry would re-drive the OAuth flow anyway.
 *
 * Depth-capped: a cyclic `cause` would otherwise hang, and real chains here are
 * two or three links.
 *
 * Exported for `rehydrateMCPTools`, whose fallback-to-`freshConnect` is a third
 * reconnect layer with the same duplicated-OAuth hazard; deliberately not
 * re-exported from the package entrypoint.
 */
interface AuthFailureArgs {
    err: unknown;
    auth: MCPAuth | undefined;
    UnauthorizedErrorType: MCPSdk['UnauthorizedError'] | undefined;
    depth?: number;
}
export declare function isAuthFailure({ err, auth, UnauthorizedErrorType, depth, }: AuthFailureArgs): boolean;
/**
 * Connect a `Client` to the MCP server, degrading to the 2025-era handshake if
 * protocol negotiation gets in the way.
 *
 * We default `protocolNegotiation` to `'auto'` where the SDK defaults to
 * `'legacy'`, so every connection's first request is a `server/discover` probe.
 * On its own that would be a connectivity regression: a proxy, WAF, or strict
 * gateway that hangs or 5xx's on an unknown method takes a server from working
 * to failing, and the SSE fallback re-probes and fails identically — so the
 * two-transport fallback, which looks like defense in depth, collapses to a
 * single point of failure against exactly the infrastructure it should rescue.
 *
 * So when the caller left `protocolNegotiation` unset, a failed connect is
 * retried once with `'legacy'`. That makes `'auto'` strictly additive: modern
 * servers get the new revision, everything else lands exactly where it did
 * before this package started probing. The cost is one extra attempt on a path
 * that is already failing, which is where latency matters least.
 *
 * The retry fires on **any** failure rather than only on ones that look like
 * probe timeouts. Inspecting the cause would avoid a wasted attempt against a
 * genuinely dead server, but it would couple this to SDK error codes — and a
 * reshaped error would silently disable the degradation, which is the failure
 * mode this package keeps getting bitten by.
 *
 * Two bounds keep the retry from making a bad situation worse:
 *
 * 1. **It is skipped on an auth failure.** `UnauthorizedError` means the
 *    transport reached the server and the credentials were rejected — nothing a
 *    different protocol revision changes. Retrying would re-drive the OAuth
 *    provider's authorization flow: a second `redirectToAuthorization`, a second
 *    saved PKCE verifier overwriting the first. Replaying a failure that had
 *    side effects is worse than not retrying.
 * 2. **It re-walks the same transport ladder the first pass did.** An earlier
 *    revision pinned Streamable HTTP to cap the attempt count, which broke the
 *    case this whole mechanism exists for: a legacy server reachable *only* over
 *    SSE, behind infrastructure that chokes on the probe, would fail under
 *    `'auto'` and then never be offered SSE again. Correctness wins over the
 *    attempt count here — a server that used to connect must still connect.
 *
 * So the worst case for a genuinely unreachable server is four `connect()`
 * calls, two per negotiation mode. That is the honest cost of guaranteeing no
 * working setup regresses, and it is paid only on a path that was already going
 * to fail. The bound that matters is that it is a fixed multiple rather than a
 * retry loop.
 *
 * An **explicit** `protocolNegotiation` is honoured exactly, including
 * `'auto'`: asking for a mode means asking for its failures too, and silently
 * ignoring a caller's `{ pin }` would defeat the point of pinning.
 */
export declare function connect(options: ConnectOptions): Promise<MCPConnection>;
export {};
//# sourceMappingURL=mcp-connection.d.ts.map