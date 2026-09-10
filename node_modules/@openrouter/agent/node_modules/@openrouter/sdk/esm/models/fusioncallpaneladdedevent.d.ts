import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when a fusion analysis-panel model starts.
 */
export type FusionCallPanelAddedEvent = {
    itemId: string;
    model: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.panel.added";
};
/** @internal */
export declare const FusionCallPanelAddedEvent$inboundSchema: z.ZodType<FusionCallPanelAddedEvent, unknown>;
export declare function fusionCallPanelAddedEventFromJSON(jsonString: string): SafeParseResult<FusionCallPanelAddedEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallpaneladdedevent.d.ts.map