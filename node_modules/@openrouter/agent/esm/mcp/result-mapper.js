import { MCPToolCallError } from './errors.js';
import { isJsonSchemaObject } from './schema/json-schema-guards.js';
function isTextBlock(block) {
    return isJsonSchemaObject(block) && block['type'] === 'text' && typeof block['text'] === 'string';
}
/** Collapse the content array into a single string for the model. */
function contentToText(content) {
    if (!Array.isArray(content)) {
        return '';
    }
    const parts = [];
    for (const block of content) {
        if (isTextBlock(block)) {
            parts.push(block.text);
        }
        else if (isJsonSchemaObject(block) && typeof block['type'] === 'string') {
            // Non-text blocks (image/audio/resource) aren't passed through as media
            // in v1 — surface a typed placeholder so the model knows it exists.
            parts.push(`[${block['type']} content]`);
        }
    }
    return parts.join('\n');
}
/**
 * Map an MCP tool result into a value `callModel` can hand back to the model.
 * Prefers `structuredContent` (already JSON), otherwise the collapsed text
 * content. Throws {@link MCPToolCallError} when the server flags `isError`, so
 * the agent loop reports the failure instead of treating error text as success.
 */
export function mapCallToolResult(toolName, result) {
    if (result.isError === true) {
        const message = contentToText(result.content) || 'MCP tool returned an error';
        throw new MCPToolCallError(toolName, message);
    }
    if (result.structuredContent !== undefined) {
        return result.structuredContent;
    }
    return contentToText(result.content);
}
//# sourceMappingURL=result-mapper.js.map