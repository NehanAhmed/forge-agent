import type * as models from '@openrouter/sdk/models';
import type { ClaudeMessage, UnsupportedContent } from '../api-shape-helpers/claude-message.js';
import type { ReusableReadableStream } from './reusable-stream.js';
import type { ClientTool, ParsedToolCall, ServerTool, Tool } from './tool-types.js';
/**
 * Extract text deltas from responses stream events
 */
export declare function extractTextDeltas(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<string>;
/**
 * Extract reasoning deltas from responses stream events
 */
export declare function extractReasoningDeltas(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<string>;
/**
 * Extract tool call argument deltas from responses stream events
 */
export declare function extractToolDeltas(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<string>;
/**
 * Build incremental message updates from responses stream events
 * Returns OutputMessage (assistant/responses format)
 */
export declare function buildResponsesMessageStream(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<models.OutputMessage>;
/**
 * Narrowed SDK output item for a given response-side `type` literal.
 * Picks the single `OutputItems` branch whose discriminant matches `T`.
 */
type OutputItemByType<T extends string> = Extract<models.OutputItems, {
    type: T;
}>;
/**
 * Every server-tool output shape that is NOT a `*_call` output item.
 * (These are emitted for OpenRouter-specific server tools like
 * `openrouter:datetime`, `openrouter:web_search`, `openrouter:mcp`,
 * etc.) Used as the fallback output shape for server tools without a
 * dedicated mapping entry below.
 */
type OpenRouterServerToolOutput = Exclude<models.OutputItems, {
    type: 'message';
} | {
    type: 'reasoning';
} | {
    type: 'function_call';
} | {
    type: 'web_search_call';
} | {
    type: 'file_search_call';
} | {
    type: 'image_generation_call';
}>;
/**
 * Maps server-tool request `type` literals to the SDK output item shape
 * emitted by that tool. Entries resolve to the specific narrowed item
 * from `OutputItems`. Unmapped server-tool types fall back to the union
 * of all non-call server-tool output shapes (`OpenRouterServerToolOutput`),
 * so new SDK server tools type-check with zero changes here.
 */
type KnownServerToolOutputs = {
    web_search_preview: OutputItemByType<'web_search_call'>;
    web_search_preview_2025_03_11: OutputItemByType<'web_search_call'>;
    web_search: OutputItemByType<'web_search_call'>;
    web_search_2025_08_26: OutputItemByType<'web_search_call'>;
    'openrouter:web_search': OutputItemByType<'web_search_call'> | OutputItemByType<'openrouter:web_search'>;
    file_search: OutputItemByType<'file_search_call'>;
    image_generation: OutputItemByType<'image_generation_call'>;
    'openrouter:datetime': OutputItemByType<'openrouter:datetime'>;
};
/**
 * Infer the output item shape for a given ServerTool. Known request types
 * map via KnownServerToolOutputs; anything else falls back to the
 * provider-side server-tool output union (`OpenRouterServerToolOutput`)
 * so the SDK's forward-compat variants flow through automatically.
 */
type InferServerToolOutput<S> = S extends ServerTool<infer K> ? K extends keyof KnownServerToolOutputs ? KnownServerToolOutputs[K] : OpenRouterServerToolOutput : never;
/**
 * Union of output item shapes produced by the server tools present in
 * `TTools`. For the default unconstrained `readonly Tool[]`, this widens
 * to every mapped output plus the generic fallback. Unused otherwise.
 */
type InferServerToolOutputsUnion<TTools extends readonly Tool[]> = InferServerToolOutput<Extract<TTools[number], ServerTool>>;
/**
 * True iff the tools array contains at least one client tool. Written as
 * `true extends (distributed-check)` so distribution over a union yields
 * `true` when any member matches (not `boolean`).
 */
type HasClientTool<TTools extends readonly Tool[]> = Extract<TTools[number], ClientTool> extends never ? false : true;
/**
 * Widest possible streamable output — every item type the API can emit
 * plus `function_call_output` that we construct for client tool results.
 * Used as the default when `StreamableOutputItem` is referenced without
 * a specific TTools.
 */
type WidestStreamableOutputItem = models.OutputMessage | models.OutputReasoningItem | models.OutputFunctionCallItem | models.FunctionCallOutputItem | models.OutputWebSearchCallItem | models.OutputFileSearchCallItem | models.OutputImageGenerationCallItem | OpenRouterServerToolOutput;
/**
 * Narrowed streamable output union derived from the specific TTools passed.
 * `function_call` / `function_call_output` only appear if the array
 * contains client tools; server-tool output shapes are narrowed via
 * `KnownServerToolOutputs` with fallback to `OpenRouterServerToolOutput`.
 */
type NarrowStreamableOutputItem<TTools extends readonly Tool[]> = models.OutputMessage | models.OutputReasoningItem | (HasClientTool<TTools> extends true ? models.OutputFunctionCallItem | models.FunctionCallOutputItem : never) | InferServerToolOutputsUnion<TTools>;
/**
 * Output item types that can be streamed from a response. Parameterized
 * on `TTools` so the yielded union reflects exactly which item types can
 * appear given the tools passed. Call sites without a specific TTools
 * receive the widest possible union (backward-compatible with the
 * original pre-server-tools export).
 */
export type StreamableOutputItem<TTools extends readonly Tool[] = readonly Tool[]> = readonly Tool[] extends TTools ? WidestStreamableOutputItem : NarrowStreamableOutputItem<TTools>;
/**
 * Discriminated union for tracking items in progress.
 * Each variant has only the fields relevant to that item type.
 */
export type ItemInProgress = {
    type: 'message';
    id: string;
    textContent: string;
} | {
    type: 'function_call';
    id: string;
    name: string;
    callId: string;
    argumentsAccumulated: string;
} | {
    type: 'reasoning';
    id: string;
    reasoningContent: string;
};
type ItemsStreamHandler = (event: models.StreamEvents, itemsInProgress: Map<string, ItemInProgress>) => StreamableOutputItem | undefined;
export declare const itemsStreamHandlers: Record<string, ItemsStreamHandler>;
export declare const streamTerminationEvents: Set<string>;
/**
 * Build incremental output item updates from responses stream events.
 * Yields all item types cumulatively - same item may be emitted multiple times
 * with the same ID but progressively updated content as streaming progresses.
 */
export declare function buildItemsStream(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<StreamableOutputItem>;
/**
 * Build incremental message updates from responses stream events
 * Returns ChatAssistantMessage (chat format) instead of OutputMessage
 */
export declare function buildMessageStream(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<models.ChatAssistantMessage>;
/**
 * Synchronous counterpart to `consumeStreamForCompletion` for streams that
 * have already fully buffered (`isComplete`): scan the retained buffer
 * backwards for the terminal event instead of replaying every event through
 * a fresh consumer (one async microtask hop per event). Same contract —
 * returns the completed/incomplete response, throws on a failed response or
 * a buffer with no terminal event.
 */
export declare function extractCompletionFromBuffer(stream: ReusableReadableStream<models.StreamEvents>): models.OpenResponsesResult;
/**
 * Non-throwing variant of `extractCompletionFromBuffer` for streams that may
 * still be mid-flight: returns the buffered completed/incomplete response
 * when the terminal event has already been buffered, `undefined` otherwise
 * (no terminal event yet, or the response failed). Consumers stop at the
 * terminal event itself (`streamTerminationEvents`), typically before the
 * pump has read the source close that flips `isComplete` — this lets
 * teardown paths recover the completion in that window without waiting on
 * the close frame.
 */
export declare function tryExtractCompletionFromBuffer(stream: ReusableReadableStream<models.StreamEvents>): models.OpenResponsesResult | undefined;
/**
 * Consume stream until completion and return the complete response
 */
export declare function consumeStreamForCompletion(stream: ReusableReadableStream<models.StreamEvents>): Promise<models.OpenResponsesResult>;
/**
 * Extract the first message from a completed response (chat format)
 */
export declare function extractMessageFromResponse(response: models.OpenResponsesResult): models.ChatAssistantMessage;
/**
 * Extract the first message from a completed response (responses format)
 */
export declare function extractResponsesMessageFromResponse(response: models.OpenResponsesResult): models.OutputMessage;
/**
 * Extract text from a response, either from outputText or by concatenating message content
 */
export declare function extractTextFromResponse(response: models.OpenResponsesResult): string;
/**
 * Extract all tool calls from a completed response
 * Returns parsed tool calls with arguments as objects (not JSON strings)
 */
export declare function extractToolCallsFromResponse(response: models.OpenResponsesResult): ParsedToolCall<Tool>[];
/**
 * Build incremental tool call updates from responses stream events
 * Yields structured tool call objects as they're built from deltas
 */
export declare function buildToolCallStream(stream: ReusableReadableStream<models.StreamEvents>): AsyncIterableIterator<ParsedToolCall<Tool>>;
/**
 * Check if a response contains any tool calls
 */
export declare function responseHasToolCalls(response: models.OpenResponsesResult): boolean;
/**
 * Convert OpenResponsesResult to ClaudeMessage format
 * Compatible with the Anthropic SDK BetaMessage type
 */
export declare function convertToClaudeMessage(response: models.OpenResponsesResult): ClaudeMessage;
/**
 * Extract unsupported content by original type
 */
export declare function extractUnsupportedContent(message: ClaudeMessage, originalType: string): UnsupportedContent[];
/**
 * Check if message has any unsupported content
 */
export declare function hasUnsupportedContent(message: ClaudeMessage): boolean;
/**
 * Get summary of unsupported content types
 */
export declare function getUnsupportedContentSummary(message: ClaudeMessage): Record<string, number>;
export {};
//# sourceMappingURL=stream-transformers.d.ts.map