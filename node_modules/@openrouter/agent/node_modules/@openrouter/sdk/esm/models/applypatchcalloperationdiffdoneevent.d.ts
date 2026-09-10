import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Emitted when `operation.diff` streaming completes for an `apply_patch_call`.
 */
export type ApplyPatchCallOperationDiffDoneEvent = {
    diff: string;
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.apply_patch_call_operation_diff.done";
};
/** @internal */
export declare const ApplyPatchCallOperationDiffDoneEvent$inboundSchema: z.ZodType<ApplyPatchCallOperationDiffDoneEvent, unknown>;
export declare function applyPatchCallOperationDiffDoneEventFromJSON(jsonString: string): SafeParseResult<ApplyPatchCallOperationDiffDoneEvent, SDKValidationError>;
//# sourceMappingURL=applypatchcalloperationdiffdoneevent.d.ts.map