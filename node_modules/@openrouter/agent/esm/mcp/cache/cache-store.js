/** Default in-process cache backed by a `Map`. Not shared across processes. */
export class InMemoryMCPCacheStore {
    constructor() {
        this.entries = new Map();
    }
    get(key) {
        return this.entries.get(key) ?? null;
    }
    set(key, value) {
        this.entries.set(key, value);
    }
    delete(key) {
        this.entries.delete(key);
    }
}
/** Default cache key for a server URL. Override via `cache.key` for multi-tenant. */
export function defaultCacheKey(url) {
    return `openrouter-mcp:${url}`;
}
//# sourceMappingURL=cache-store.js.map