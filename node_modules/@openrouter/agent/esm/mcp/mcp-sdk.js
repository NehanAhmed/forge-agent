import { MCPMissingPeerDependencyError } from './errors.js';
let sdkPromise;
function isMissingSdk(error) {
    let current = error;
    while (current instanceof Error) {
        const code = 'code' in current ? current.code : undefined;
        const specifier = /Cannot find (?:package|module) '([^']+)'/.exec(current.message)?.[1];
        if ((code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') &&
            (specifier === '@modelcontextprotocol/client' ||
                specifier?.startsWith('@modelcontextprotocol/client/') === true)) {
            return true;
        }
        current = current.cause;
    }
    return false;
}
/** Load the optional MCP client only when a connection is actually requested. */
export function loadMcpSdk() {
    sdkPromise ?? (sdkPromise = import('@modelcontextprotocol/client')
        .then((client) => ({
        Client: client.Client,
        SSEClientTransport: client.SSEClientTransport,
        StreamableHTTPClientTransport: client.StreamableHTTPClientTransport,
        UnauthorizedError: client.UnauthorizedError,
    }))
        .catch((cause) => {
        sdkPromise = undefined;
        if (isMissingSdk(cause)) {
            throw new MCPMissingPeerDependencyError({
                cause,
            });
        }
        throw cause;
    }));
    return sdkPromise;
}
//# sourceMappingURL=mcp-sdk.js.map