import * as z from "zod/v4";
import { ClosedEnum, OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const ApplyPatchCallOutputItemStatus: {
    readonly Completed: "completed";
    readonly Failed: "failed";
};
export type ApplyPatchCallOutputItemStatus = OpenEnum<typeof ApplyPatchCallOutputItemStatus>;
export declare const ApplyPatchCallOutputItemType: {
    readonly ApplyPatchCallOutput: "apply_patch_call_output";
};
export type ApplyPatchCallOutputItemType = ClosedEnum<typeof ApplyPatchCallOutputItemType>;
/**
 * The client's echo of an `apply_patch_call` after applying the patch. `output` is an optional human-readable log; `status` is `completed` when the patch was applied successfully, `failed` otherwise.
 */
export type ApplyPatchCallOutputItem = {
    callId: string;
    id?: string | null | undefined;
    output?: string | null | undefined;
    status: ApplyPatchCallOutputItemStatus;
    type: ApplyPatchCallOutputItemType;
};
/** @internal */
export declare const ApplyPatchCallOutputItemStatus$inboundSchema: z.ZodType<ApplyPatchCallOutputItemStatus, unknown>;
/** @internal */
export declare const ApplyPatchCallOutputItemStatus$outboundSchema: z.ZodType<string, ApplyPatchCallOutputItemStatus>;
/** @internal */
export declare const ApplyPatchCallOutputItemType$inboundSchema: z.ZodEnum<typeof ApplyPatchCallOutputItemType>;
/** @internal */
export declare const ApplyPatchCallOutputItemType$outboundSchema: z.ZodEnum<typeof ApplyPatchCallOutputItemType>;
/** @internal */
export declare const ApplyPatchCallOutputItem$inboundSchema: z.ZodType<ApplyPatchCallOutputItem, unknown>;
/** @internal */
export type ApplyPatchCallOutputItem$Outbound = {
    call_id: string;
    id?: string | null | undefined;
    output?: string | null | undefined;
    status: string;
    type: string;
};
/** @internal */
export declare const ApplyPatchCallOutputItem$outboundSchema: z.ZodType<ApplyPatchCallOutputItem$Outbound, ApplyPatchCallOutputItem>;
export declare function applyPatchCallOutputItemToJSON(applyPatchCallOutputItem: ApplyPatchCallOutputItem): string;
export declare function applyPatchCallOutputItemFromJSON(jsonString: string): SafeParseResult<ApplyPatchCallOutputItem, SDKValidationError>;
//# sourceMappingURL=applypatchcalloutputitem.d.ts.map