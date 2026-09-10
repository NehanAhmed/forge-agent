import { isJsonSchemaObject } from './schema/json-schema-guards.js';
/** A form-mode elicitation request carries a `requestedSchema`. */
function hasRequestedSchema(params) {
    return 'requestedSchema' in params;
}
/** Narrow handler-returned content to the primitive record the spec allows. */
function toElicitContent(content) {
    const out = {};
    for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            (Array.isArray(value) && value.every((v) => typeof v === 'string'))) {
            out[key] = value;
        }
    }
    return out;
}
/**
 * Build the `elicitation/create` request handler registered on the MCP client.
 * Delegates to the caller's {@link ElicitationHandler}; when none is supplied,
 * auto-declines so a tool call awaiting input fails gracefully instead of
 * hanging. The MCP spec forbids eliciting sensitive/PII data — that contract is
 * the server's responsibility; callers should treat requested fields as such.
 */
export function makeElicitationRequestHandler(handler) {
    return async (request) => {
        if (handler === undefined) {
            return {
                action: 'decline',
            };
        }
        const { params } = request;
        const requestedSchema = hasRequestedSchema(params) ? params.requestedSchema : undefined;
        const schema = isJsonSchemaObject(requestedSchema) ? requestedSchema : {};
        const response = await handler({
            message: params.message,
            requestedSchema: schema,
        });
        if (response.action === 'accept') {
            return {
                action: 'accept',
                content: toElicitContent(response.content),
            };
        }
        return {
            action: response.action,
        };
    };
}
//# sourceMappingURL=elicitation.js.map