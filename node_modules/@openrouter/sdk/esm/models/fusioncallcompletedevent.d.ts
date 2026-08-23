import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when the openrouter:fusion tool call finishes.
 */
export type FusionCallCompletedEvent = {
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.completed";
};
/** @internal */
export declare const FusionCallCompletedEvent$inboundSchema: z.ZodType<FusionCallCompletedEvent, unknown>;
export declare function fusionCallCompletedEventFromJSON(jsonString: string): SafeParseResult<FusionCallCompletedEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallcompletedevent.d.ts.map