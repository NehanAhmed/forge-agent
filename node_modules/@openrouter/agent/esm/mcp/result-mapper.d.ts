/**
 * The subset of an MCP `CallToolResult` we read. The SDK types it more richly,
 * but we narrow defensively from `unknown`-ish content rather than trusting the
 * wire shape.
 */
export interface RawCallToolResult {
    content?: unknown;
    structuredContent?: unknown;
    isError?: boolean;
    [key: string]: unknown;
}
/**
 * Map an MCP tool result into a value `callModel` can hand back to the model.
 * Prefers `structuredContent` (already JSON), otherwise the collapsed text
 * content. Throws {@link MCPToolCallError} when the server flags `isError`, so
 * the agent loop reports the failure instead of treating error text as success.
 */
export declare function mapCallToolResult(toolName: string, result: RawCallToolResult): unknown;
//# sourceMappingURL=result-mapper.d.ts.map