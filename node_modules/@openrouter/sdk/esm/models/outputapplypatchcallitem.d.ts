import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { ApplyPatchCallOperation } from "./applypatchcalloperation.js";
import { ApplyPatchCallStatus } from "./applypatchcallstatus.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * A native `apply_patch_call` output item matching OpenAI's Responses API shape. Emitted when the client requested the `apply_patch` shorthand.
 */
export type OutputApplyPatchCallItem = {
    callId: string;
    id: string;
    /**
     * The patch operation requested by an `apply_patch_call`. `create_file` and `update_file` carry a V4A diff; `delete_file` omits it.
     */
    operation: ApplyPatchCallOperation;
    /**
     * Lifecycle state of an `apply_patch_call` output item.
     */
    status: ApplyPatchCallStatus;
    type: "apply_patch_call";
};
/** @internal */
export declare const OutputApplyPatchCallItem$inboundSchema: z.ZodType<OutputApplyPatchCallItem, unknown>;
export declare function outputApplyPatchCallItemFromJSON(jsonString: string): SafeParseResult<OutputApplyPatchCallItem, SDKValidationError>;
//# sourceMappingURL=outputapplypatchcallitem.d.ts.map