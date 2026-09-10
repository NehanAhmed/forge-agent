import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Incremental content token from a fusion panel model.
 */
export type FusionCallPanelDeltaEvent = {
    delta: string;
    itemId: string;
    model: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.panel.delta";
};
/** @internal */
export declare const FusionCallPanelDeltaEvent$inboundSchema: z.ZodType<FusionCallPanelDeltaEvent, unknown>;
export declare function fusionCallPanelDeltaEventFromJSON(jsonString: string): SafeParseResult<FusionCallPanelDeltaEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallpaneldeltaevent.d.ts.map