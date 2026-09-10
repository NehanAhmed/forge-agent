import type { Client, SSEClientTransport, StreamableHTTPClientTransport, UnauthorizedError } from '@modelcontextprotocol/client';
export interface MCPSdk {
    Client: typeof Client;
    SSEClientTransport: typeof SSEClientTransport;
    StreamableHTTPClientTransport: typeof StreamableHTTPClientTransport;
    UnauthorizedError: typeof UnauthorizedError;
}
/** Load the optional MCP client only when a connection is actually requested. */
export declare function loadMcpSdk(): Promise<MCPSdk>;
//# sourceMappingURL=mcp-sdk.d.ts.map