import type { OAuthClientProvider } from '@modelcontextprotocol/client';
import type { MCPAuth } from './auth-types.js';
/**
 * The transport-level pieces derived from an {@link MCPAuth}: static headers to
 * merge into `requestInit`, and/or an OAuth provider to hand to the transport.
 * Both flow into the same connected client, so discovery and tool calls share
 * one authenticated session.
 */
export interface ResolvedAuth {
    headers: Record<string, string>;
    authProvider?: OAuthClientProvider;
}
export declare function resolveAuth(auth: MCPAuth | undefined): ResolvedAuth;
//# sourceMappingURL=auth-resolver.d.ts.map