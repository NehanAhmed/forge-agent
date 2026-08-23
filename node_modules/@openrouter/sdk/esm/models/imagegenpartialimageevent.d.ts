import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when a partial image becomes available during streaming generation
 */
export type ImageGenPartialImageEvent = {
    /**
     * Base64-encoded partial image data
     */
    b64Json: string;
    /**
     * 0-based index indicating which partial image this is in the sequence
     */
    partialImageIndex: number;
    /**
     * The event type
     */
    type: "image_generation.partial_image";
};
/** @internal */
export declare const ImageGenPartialImageEvent$inboundSchema: z.ZodType<ImageGenPartialImageEvent, unknown>;
export declare function imageGenPartialImageEventFromJSON(jsonString: string): SafeParseResult<ImageGenPartialImageEvent, SDKValidationError>;
//# sourceMappingURL=imagegenpartialimageevent.d.ts.map