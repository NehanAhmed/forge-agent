import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Incremental chunk of `operation.diff` for an `apply_patch_call`. Matches OpenAI's streaming shape.
 */
export type ApplyPatchCallOperationDiffDeltaEvent = {
    delta: string;
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.apply_patch_call_operation_diff.delta";
};
/** @internal */
export declare const ApplyPatchCallOperationDiffDeltaEvent$inboundSchema: z.ZodType<ApplyPatchCallOperationDiffDeltaEvent, unknown>;
export declare function applyPatchCallOperationDiffDeltaEventFromJSON(jsonString: string): SafeParseResult<ApplyPatchCallOperationDiffDeltaEvent, SDKValidationError>;
//# sourceMappingURL=applypatchcalloperationdiffdeltaevent.d.ts.map