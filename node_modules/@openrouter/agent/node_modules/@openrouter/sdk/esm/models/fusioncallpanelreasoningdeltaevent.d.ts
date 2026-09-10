import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Incremental reasoning token from a fusion panel model.
 */
export type FusionCallPanelReasoningDeltaEvent = {
    delta: string;
    itemId: string;
    model: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.panel.reasoning.delta";
};
/** @internal */
export declare const FusionCallPanelReasoningDeltaEvent$inboundSchema: z.ZodType<FusionCallPanelReasoningDeltaEvent, unknown>;
export declare function fusionCallPanelReasoningDeltaEventFromJSON(jsonString: string): SafeParseResult<FusionCallPanelReasoningDeltaEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallpanelreasoningdeltaevent.d.ts.map