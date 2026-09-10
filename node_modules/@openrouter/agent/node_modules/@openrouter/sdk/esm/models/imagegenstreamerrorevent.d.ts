import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Provider error details
 */
export type ImageGenStreamErrorEventError = {
    /**
     * Provider error code, when supplied
     */
    code?: string | null | undefined;
    /**
     * Provider error message
     */
    message: string;
    /**
     * Request parameter associated with the error, when supplied
     */
    param?: string | null | undefined;
    /**
     * Provider error type, when supplied
     */
    type?: string | null | undefined;
};
/**
 * Emitted when streaming generation fails after the SSE response starts
 */
export type ImageGenStreamErrorEvent = {
    /**
     * Provider error details
     */
    error: ImageGenStreamErrorEventError;
    /**
     * The event type
     */
    type: "error";
};
/** @internal */
export declare const ImageGenStreamErrorEventError$inboundSchema: z.ZodType<ImageGenStreamErrorEventError, unknown>;
export declare function imageGenStreamErrorEventErrorFromJSON(jsonString: string): SafeParseResult<ImageGenStreamErrorEventError, SDKValidationError>;
/** @internal */
export declare const ImageGenStreamErrorEvent$inboundSchema: z.ZodType<ImageGenStreamErrorEvent, unknown>;
export declare function imageGenStreamErrorEventFromJSON(jsonString: string): SafeParseResult<ImageGenStreamErrorEvent, SDKValidationError>;
//# sourceMappingURL=imagegenstreamerrorevent.d.ts.map