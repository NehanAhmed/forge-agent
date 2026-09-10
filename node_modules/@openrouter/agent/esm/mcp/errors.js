/**
 * Base error for all @openrouter/agent/mcp failures.
 */
export class MCPError extends Error {
    constructor(message, options) {
        super(message, options);
        this.name = 'MCPError';
    }
}
/**
 * Raised when an MCP tool call returns `isError: true` or when the result
 * cannot be mapped to a usable model output.
 */
export class MCPToolCallError extends MCPError {
    constructor(toolName, message, options) {
        super(message, options);
        this.name = 'MCPToolCallError';
        this.toolName = toolName;
    }
}
/**
 * Raised when a cached snapshot cannot be validated or rehydrated.
 */
export class MCPCacheError extends MCPError {
    constructor(message, options) {
        super(message, options);
        this.name = 'MCPCacheError';
    }
}
/**
 * Raised when the tool list was read successfully but writing the snapshot back
 * to the caller's `MCPCacheStore` failed.
 *
 * Distinct from the read failing, because the consequences differ completely: the
 * connection is live and its tools are current, so the only thing lost is a cache
 * entry. Callers who treat a store outage as fatal can catch this; callers who
 * would rather keep working with a warm handle can ignore it.
 *
 * Subclasses {@link MCPCacheError}, so existing catch sites keep working.
 */
export class MCPCacheWriteError extends MCPCacheError {
    constructor(message, options) {
        super(message, options);
        this.name = 'MCPCacheWriteError';
    }
}
/**
 * Raised when a snapshot is older than `staleness.maxAgeMs` and the re-list that
 * would have refreshed it failed — so the only tools available are ones the
 * caller declared too old to use.
 *
 * Subclasses {@link MCPCacheError}, so existing `catch (e instanceof
 * MCPCacheError)` sites keep working. Catch this specifically to fall back to
 * stale-but-usable tools instead of failing.
 */
export class MCPStaleSnapshotError extends MCPCacheError {
    constructor(message, options) {
        super(message, options);
        this.name = 'MCPStaleSnapshotError';
    }
}
/**
 * Raised when connecting to the MCP server fails across all attempted transports.
 */
export class MCPConnectionError extends MCPError {
    constructor(message, options) {
        super(message, options);
        this.name = 'MCPConnectionError';
        // Default a single-attempt failure to its own cause, so `errors` is a
        // uniform "every attempt" list rather than empty-unless-multi.
        this.errors =
            options?.errors ??
                (options?.cause !== undefined
                    ? [
                        options.cause,
                    ]
                    : []);
    }
}
/**
 * Raised when MCP support is used without its optional SDK peer installed.
 */
export class MCPMissingPeerDependencyError extends MCPConnectionError {
    constructor(options) {
        super('MCP support requires the optional peer "@modelcontextprotocol/client". ' +
            'Install it alongside @openrouter/agent (for example: pnpm add @modelcontextprotocol/client).', options);
        this.packageName = '@modelcontextprotocol/client';
        this.name = 'MCPMissingPeerDependencyError';
    }
}
//# sourceMappingURL=errors.js.map