import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when the fusion judge starts producing the structured analysis.
 */
export type FusionCallAnalysisInProgressEvent = {
    itemId: string;
    judgeModel: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.analysis.in_progress";
};
/** @internal */
export declare const FusionCallAnalysisInProgressEvent$inboundSchema: z.ZodType<FusionCallAnalysisInProgressEvent, unknown>;
export declare function fusionCallAnalysisInProgressEventFromJSON(jsonString: string): SafeParseResult<FusionCallAnalysisInProgressEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallanalysisinprogressevent.d.ts.map