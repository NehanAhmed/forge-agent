import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { ApplyPatchCallOperation, ApplyPatchCallOperation$Outbound } from "./applypatchcalloperation.js";
import { ApplyPatchCallStatus } from "./applypatchcallstatus.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const ApplyPatchCallItemType: {
    readonly ApplyPatchCall: "apply_patch_call";
};
export type ApplyPatchCallItemType = ClosedEnum<typeof ApplyPatchCallItemType>;
/**
 * A tool call emitted by the model requesting a V4A patch operation. The client applies the patch and echoes an `apply_patch_call_output` on the next turn.
 */
export type ApplyPatchCallItem = {
    callId: string;
    id?: string | null | undefined;
    /**
     * The patch operation requested by an `apply_patch_call`. `create_file` and `update_file` carry a V4A diff; `delete_file` omits it.
     */
    operation: ApplyPatchCallOperation;
    /**
     * Lifecycle state of an `apply_patch_call` output item.
     */
    status: ApplyPatchCallStatus;
    type: ApplyPatchCallItemType;
};
/** @internal */
export declare const ApplyPatchCallItemType$inboundSchema: z.ZodEnum<typeof ApplyPatchCallItemType>;
/** @internal */
export declare const ApplyPatchCallItemType$outboundSchema: z.ZodEnum<typeof ApplyPatchCallItemType>;
/** @internal */
export declare const ApplyPatchCallItem$inboundSchema: z.ZodType<ApplyPatchCallItem, unknown>;
/** @internal */
export type ApplyPatchCallItem$Outbound = {
    call_id: string;
    id?: string | null | undefined;
    operation: ApplyPatchCallOperation$Outbound;
    status: string;
    type: string;
};
/** @internal */
export declare const ApplyPatchCallItem$outboundSchema: z.ZodType<ApplyPatchCallItem$Outbound, ApplyPatchCallItem>;
export declare function applyPatchCallItemToJSON(applyPatchCallItem: ApplyPatchCallItem): string;
export declare function applyPatchCallItemFromJSON(jsonString: string): SafeParseResult<ApplyPatchCallItem, SDKValidationError>;
//# sourceMappingURL=applypatchcallitem.d.ts.map