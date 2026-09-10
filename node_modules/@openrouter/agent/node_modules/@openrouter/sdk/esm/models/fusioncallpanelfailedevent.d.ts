import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when a fusion panel model fails.
 */
export type FusionCallPanelFailedEvent = {
    error: string;
    itemId: string;
    model: string;
    outputIndex: number;
    sequenceNumber: number;
    statusCode?: number | undefined;
    type: "response.fusion_call.panel.failed";
};
/** @internal */
export declare const FusionCallPanelFailedEvent$inboundSchema: z.ZodType<FusionCallPanelFailedEvent, unknown>;
export declare function fusionCallPanelFailedEventFromJSON(jsonString: string): SafeParseResult<FusionCallPanelFailedEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallpanelfailedevent.d.ts.map