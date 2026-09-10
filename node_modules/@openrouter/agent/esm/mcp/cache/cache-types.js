import { isJsonSchemaObject } from '../schema/json-schema-guards.js';
function isTransportKind(value) {
    return value === 'streamableHttp' || value === 'sse';
}
/**
 * The shared "valid `cachedAt`" rule: a finite, non-negative epoch (ms).
 * Consumed by both the read-side snapshot validator and the write-side
 * serializer so the two can't drift. Rejecting negatives keeps the invariant
 * honest at the boundary rather than relying on downstream maxAge arithmetic to
 * fail-safe on a clock-skewed or garbage value.
 */
export function isFiniteEpoch(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
function isSerializedToolDef(value) {
    if (!isJsonSchemaObject(value)) {
        return false;
    }
    const loopKey = value['loopKey'];
    // Absent is valid (the field is optional); present must be `false` or a
    // string array. Anything else — a truthy scalar, a mixed array, a nested
    // object — is a poisoned or stale snapshot and rejects the whole entry.
    const hasValidLoopKey = loopKey === undefined ||
        loopKey === false ||
        (Array.isArray(loopKey) && loopKey.every((field) => typeof field === 'string'));
    return (typeof value['name'] === 'string' && isJsonSchemaObject(value['inputSchema']) && hasValidLoopKey);
}
/**
 * Validate an untrusted value as a {@link SerializedMCPServer}. Cache stores may
 * be backed by a DB or another org member's data, so snapshots are checked
 * structurally before use — never trusted by shape alone.
 */
export function isSerializedMCPServer(value) {
    if (!isJsonSchemaObject(value)) {
        return false;
    }
    if (value['version'] !== 1) {
        return false;
    }
    if (typeof value['url'] !== 'string' || !isTransportKind(value['transport'])) {
        return false;
    }
    if (!isFiniteEpoch(value['cachedAt'])) {
        return false;
    }
    const { tools } = value;
    return Array.isArray(tools) && tools.every(isSerializedToolDef);
}
//# sourceMappingURL=cache-types.js.map