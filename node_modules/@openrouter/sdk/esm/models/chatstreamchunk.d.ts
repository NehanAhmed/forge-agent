import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { ApiErrorType } from "./apierrortype.js";
import { ChatStreamChoice } from "./chatstreamchoice.js";
import { ChatUsage } from "./chatusage.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { OpenRouterMetadata } from "./openroutermetadata.js";
/**
 * Structured error metadata
 */
export type ChatStreamChunkMetadata = {
    /**
     * Canonical OpenRouter error type, stable across all API formats
     */
    errorType: ApiErrorType;
    /**
     * Upstream provider-specific error code, when available
     */
    providerCode?: string | undefined;
};
/**
 * Error information
 */
export type ChatStreamChunkError = {
    /**
     * Error code
     */
    code: number;
    /**
     * Error message
     */
    message: string;
    /**
     * Structured error metadata
     */
    metadata?: ChatStreamChunkMetadata | undefined;
};
export declare const ChatStreamChunkObject: {
    readonly ChatCompletionChunk: "chat.completion.chunk";
};
export type ChatStreamChunkObject = ClosedEnum<typeof ChatStreamChunkObject>;
/**
 * Streaming chat completion chunk
 */
export type ChatStreamChunk = {
    /**
     * List of streaming chunk choices
     */
    choices: Array<ChatStreamChoice>;
    /**
     * Unix timestamp of creation
     */
    created: number;
    /**
     * Error information
     */
    error?: ChatStreamChunkError | undefined;
    /**
     * Unique chunk identifier
     */
    id: string;
    /**
     * Model used for completion
     */
    model: string;
    object: ChatStreamChunkObject;
    openrouterMetadata?: OpenRouterMetadata | undefined;
    /**
     * The service tier used by the upstream provider for this request
     */
    serviceTier?: string | null | undefined;
    /**
     * System fingerprint
     */
    systemFingerprint?: string | undefined;
    /**
     * Token usage statistics
     */
    usage?: ChatUsage | undefined;
};
/** @internal */
export declare const ChatStreamChunkMetadata$inboundSchema: z.ZodType<ChatStreamChunkMetadata, unknown>;
export declare function chatStreamChunkMetadataFromJSON(jsonString: string): SafeParseResult<ChatStreamChunkMetadata, SDKValidationError>;
/** @internal */
export declare const ChatStreamChunkError$inboundSchema: z.ZodType<ChatStreamChunkError, unknown>;
export declare function chatStreamChunkErrorFromJSON(jsonString: string): SafeParseResult<ChatStreamChunkError, SDKValidationError>;
/** @internal */
export declare const ChatStreamChunkObject$inboundSchema: z.ZodEnum<typeof ChatStreamChunkObject>;
/** @internal */
export declare const ChatStreamChunk$inboundSchema: z.ZodType<ChatStreamChunk, unknown>;
export declare function chatStreamChunkFromJSON(jsonString: string): SafeParseResult<ChatStreamChunk, SDKValidationError>;
//# sourceMappingURL=chatstreamchunk.d.ts.map