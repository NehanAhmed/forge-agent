import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when a fusion panel model finishes with its full content.
 */
export type FusionCallPanelCompletedEvent = {
    content: string;
    itemId: string;
    model: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.panel.completed";
};
/** @internal */
export declare const FusionCallPanelCompletedEvent$inboundSchema: z.ZodType<FusionCallPanelCompletedEvent, unknown>;
export declare function fusionCallPanelCompletedEventFromJSON(jsonString: string): SafeParseResult<FusionCallPanelCompletedEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallpanelcompletedevent.d.ts.map