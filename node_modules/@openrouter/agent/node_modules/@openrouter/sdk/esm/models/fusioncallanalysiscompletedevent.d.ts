import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { FusionAnalysisResult } from "./fusionanalysisresult.js";
/**
 * Emitted when the fusion judge completes with the structured analysis.
 */
export type FusionCallAnalysisCompletedEvent = {
    /**
     * Structured analysis produced by the fusion judge model.
     */
    analysis: FusionAnalysisResult;
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.fusion_call.analysis.completed";
};
/** @internal */
export declare const FusionCallAnalysisCompletedEvent$inboundSchema: z.ZodType<FusionCallAnalysisCompletedEvent, unknown>;
export declare function fusionCallAnalysisCompletedEventFromJSON(jsonString: string): SafeParseResult<FusionCallAnalysisCompletedEvent, SDKValidationError>;
//# sourceMappingURL=fusioncallanalysiscompletedevent.d.ts.map