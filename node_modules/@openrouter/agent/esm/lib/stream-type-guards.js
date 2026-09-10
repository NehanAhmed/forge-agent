/**
 * Type guards for OpenResponses stream events
 * These enable proper TypeScript narrowing without type casts
 */
// Stream event type guards
export function isOutputTextDeltaEvent(event) {
    return 'type' in event && event.type === 'response.output_text.delta';
}
export function isReasoningDeltaEvent(event) {
    return 'type' in event && event.type === 'response.reasoning_text.delta';
}
export function isFunctionCallArgumentsDeltaEvent(event) {
    return 'type' in event && event.type === 'response.function_call_arguments.delta';
}
export function isOutputItemAddedEvent(event) {
    return 'type' in event && event.type === 'response.output_item.added';
}
export function isOutputItemDoneEvent(event) {
    return 'type' in event && event.type === 'response.output_item.done';
}
export function isResponseCompletedEvent(event) {
    return 'type' in event && event.type === 'response.completed';
}
export function isResponseFailedEvent(event) {
    return 'type' in event && event.type === 'response.failed';
}
export function isResponseIncompleteEvent(event) {
    return 'type' in event && event.type === 'response.incomplete';
}
export function isFunctionCallArgumentsDoneEvent(event) {
    return 'type' in event && event.type === 'response.function_call_arguments.done';
}
// Output item type guards
export function isOutputMessage(item) {
    return typeof item === 'object' && item !== null && 'type' in item && item.type === 'message';
}
export function isFunctionCallItem(item) {
    return (typeof item === 'object' && item !== null && 'type' in item && item.type === 'function_call');
}
export function isReasoningOutputItem(item) {
    return typeof item === 'object' && item !== null && 'type' in item && item.type === 'reasoning';
}
export function isWebSearchCallOutputItem(item) {
    return (typeof item === 'object' && item !== null && 'type' in item && item.type === 'web_search_call');
}
export function isFileSearchCallOutputItem(item) {
    return (typeof item === 'object' && item !== null && 'type' in item && item.type === 'file_search_call');
}
export function isImageGenerationCallOutputItem(item) {
    return (typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        item.type === 'image_generation_call');
}
/**
 * Type guard for client function-call output items — the input-side items
 * we construct and send back to the API after executing a client tool.
 */
export function isFunctionCallOutputItem(item) {
    if (typeof item !== 'object' || item === null || !('type' in item)) {
        return false;
    }
    return item.type === 'function_call_output';
}
const _assertClientTypesInSDK = true;
void _assertClientTypesInSDK;
/**
 * Type guard: narrows a response output item to server-tool result
 * variants — everything in `OutputItems` that is not `message`,
 * `reasoning`, or `function_call`. Covers the SDK's per-tool output
 * shapes (`OutputDatetimeItem`, `OutputWebSearchServerToolItem`,
 * `OutputMcpServerToolItem`, etc.) and its forward-compat
 * `Unknown<"type">` catch-all for unrecognized discriminators.
 *
 * The module-level `_AssertClientTypesInSDK` check fails if the SDK
 * renames or drops one of the three client discriminators — blocking
 * silent misclassification.
 */
export function isServerToolResultItem(item) {
    switch (item.type) {
        case 'message':
        case 'reasoning':
        case 'function_call':
            return false;
        default:
            // Every remaining variant — per-tool server output (web_search_call,
            // openrouter:datetime, openrouter:mcp, etc.) and the SDK's Unknown
            // catch-all — is treated as a server-tool result.
            return true;
    }
}
// Content part type guards
export function isOutputTextPart(part) {
    return typeof part === 'object' && part !== null && 'type' in part && part.type === 'output_text';
}
export function isRefusalPart(part) {
    return typeof part === 'object' && part !== null && 'type' in part && part.type === 'refusal';
}
// Annotation type guards for Claude conversion
export function isFileCitationAnnotation(annotation) {
    return (typeof annotation === 'object' &&
        annotation !== null &&
        'type' in annotation &&
        annotation.type === 'file_citation');
}
export function isURLCitationAnnotation(annotation) {
    return (typeof annotation === 'object' &&
        annotation !== null &&
        'type' in annotation &&
        annotation.type === 'url_citation');
}
export function isFilePathAnnotation(annotation) {
    return (typeof annotation === 'object' &&
        annotation !== null &&
        'type' in annotation &&
        annotation.type === 'file_path');
}
// Helper to check if output has a type property
export function hasTypeProperty(item) {
    return (typeof item === 'object' && item !== null && 'type' in item && typeof item.type === 'string');
}
//# sourceMappingURL=stream-type-guards.js.map