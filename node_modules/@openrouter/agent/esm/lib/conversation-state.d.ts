import type * as models from '@openrouter/sdk/models';
import type { ConversationState, ParsedToolCall, Tool, TurnContext, UnsentToolResult } from './tool-types.js';
/**
 * Generate a unique ID for a conversation
 * Uses crypto.randomUUID if available, falls back to timestamp + random
 */
export declare function generateConversationId(): string;
/** Currently supported ConversationState serialization version. */
export declare const CONVERSATION_STATE_VERSION: 1;
/**
 * Create an initial conversation state
 * @param id - Optional custom ID, generates one if not provided
 */
export declare function createInitialState<TTools extends readonly Tool[] = readonly Tool[]>(id?: string): ConversationState<TTools>;
/**
 * Thrown when {@link deserializeConversationState} encounters a state blob whose
 * `version` is not supported by this SDK build.
 */
export declare class UnsupportedStateVersionError extends Error {
    readonly found: number;
    readonly supported: readonly number[];
    constructor(found: number, supported?: readonly number[]);
}
/**
 * Thrown when {@link deserializeConversationState} receives JSON that is not a
 * well-formed ConversationState (missing/wrong required fields, or invalid JSON).
 */
export declare class InvalidStateError extends Error {
    constructor(message: string);
}
/**
 * Serialize a {@link ConversationState} to a stable JSON string for durable storage.
 *
 * Guarantees the `version` field is present (injects `1` when the input state
 * lacks it). Treat the returned JSON as **opaque**: consumers should round-trip
 * via these helpers rather than introspecting item shapes.
 *
 * **Compat policy:** additive field changes within a major version. On version
 * bumps, migrations run inside {@link deserializeConversationState}. The
 * StateAccessor load/save contract is unchanged — these helpers are opt-in.
 */
export declare function serializeConversationState<TTools extends readonly Tool[] = readonly Tool[]>(state: ConversationState<TTools>): string;
/**
 * Parse and validate a previously serialized {@link ConversationState}.
 *
 * Accepts version-less legacy blobs and states with `version: 1`, normalizing
 * both to `version: 1`. Throws {@link UnsupportedStateVersionError} for any
 * other version (fail loudly so stores don't silently misinterpret future
 * shapes). Throws {@link InvalidStateError} for malformed JSON or missing
 * required fields (`id`, `messages`, `status`).
 *
 * **Compat policy:** absence of `version` means v1. Migrations for future
 * versions happen here; callers should treat the JSON as opaque.
 */
export declare function deserializeConversationState<TTools extends readonly Tool[] = readonly Tool[]>(json: string): ConversationState<TTools>;
/**
 * Update a conversation state with new values
 * Automatically updates the updatedAt timestamp
 */
export declare function updateState<TTools extends readonly Tool[] = readonly Tool[]>(state: ConversationState<TTools>, updates: Partial<Omit<ConversationState<TTools>, 'id' | 'createdAt' | 'updatedAt' | 'version'>>): ConversationState<TTools>;
/**
 * Append new items to the message history
 */
export declare function appendToMessages(current: models.InputsUnion, newItems: models.BaseInputsUnion[]): models.InputsUnion;
/**
 * Check if a tool call requires approval
 * @param toolCall - The tool call to check
 * @param tools - Available tools
 * @param context - Turn context for the approval check
 * @param callLevelCheck - Optional call-level approval function (overrides tool-level), can be async. Receives normalized arguments when schema parsing succeeds and raw arguments otherwise.
 */
export declare function toolRequiresApproval<TTools extends readonly Tool[]>(toolCall: ParsedToolCall<TTools[number]>, tools: TTools, context: TurnContext, callLevelCheck?: (toolCall: ParsedToolCall<TTools[number]>, context: TurnContext) => boolean | Promise<boolean>): Promise<boolean>;
/**
 * Partition tool calls into those requiring approval and those that can auto-execute
 * @param toolCalls - Tool calls to partition
 * @param tools - Available tools
 * @param context - Turn context for the approval check
 * @param callLevelCheck - Optional call-level approval function (overrides tool-level), can be async
 */
export declare function partitionToolCalls<TTools extends readonly Tool[]>(toolCalls: ParsedToolCall<TTools[number]>[], tools: TTools, context: TurnContext, callLevelCheck?: (toolCall: ParsedToolCall<TTools[number]>, context: TurnContext) => boolean | Promise<boolean>): Promise<{
    requiresApproval: ParsedToolCall<TTools[number]>[];
    autoExecute: ParsedToolCall<TTools[number]>[];
}>;
/**
 * Create an unsent tool result from a successful execution
 */
export declare function createUnsentResult<TTools extends readonly Tool[] = readonly Tool[]>(callId: string, name: string, output: unknown): UnsentToolResult<TTools>;
/**
 * Create an unsent tool result from a rejection
 */
export declare function createRejectedResult<TTools extends readonly Tool[] = readonly Tool[]>(callId: string, name: string, reason?: string): UnsentToolResult<TTools>;
/**
 * Check if a value is a valid content array (array of input_text, input_image, or input_file blocks).
 * These can be passed directly as tool output without JSON.stringify.
 */
export declare function isContentArray(value: unknown): value is models.FunctionCallOutputItemOutputUnion1[];
/**
 * Convert unsent tool results to API format for sending to the model.
 *
 * Supports two output formats:
 * 1. Content arrays (input_text, input_image, input_file blocks) - passed through directly
 * 2. All other values - JSON stringified
 *
 * Content arrays are useful for tools that produce rich outputs like images,
 * avoiding the need to serialize large binary data as JSON strings.
 */
export declare function unsentResultsToAPIFormat(results: UnsentToolResult[]): models.FunctionCallOutputItem[];
/**
 * Extract text content from a response
 */
export declare function extractTextFromResponse(response: models.OpenResponsesResult): string;
/**
 * Extract tool calls from a response
 */
export declare function extractToolCallsFromResponse<TTools extends readonly Tool[]>(response: models.OpenResponsesResult): ParsedToolCall<TTools[number]>[];
export { normalizeInputToArray } from './turn-context.js';
//# sourceMappingURL=conversation-state.d.ts.map