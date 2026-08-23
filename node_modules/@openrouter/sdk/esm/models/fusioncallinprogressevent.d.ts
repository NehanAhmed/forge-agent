import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when an openrouter:fusion tool call begins executing.
 */
export type FusionCallInProgressEvent = {
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.in_progress";
};
/** @internal */
export declare const FusionCallInProgressEvent$inboundSchema: z.ZodType<FusionCallInProgressEvent, unknown>;
export declare function fusionCallInProgressEventFromJSON(jsonString: string): SafeParseResult<FusionCallInProgressEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallinprogressevent.d.ts.map