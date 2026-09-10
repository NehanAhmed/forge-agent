import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { ApplyPatchCallOperation, ApplyPatchCallOperation$Outbound } from "./applypatchcalloperation.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ToolCallStatus } from "./toolcallstatus.js";
export declare const OutputApplyPatchServerToolItemType: {
    readonly OpenrouterApplyPatch: "openrouter:apply_patch";
};
export type OutputApplyPatchServerToolItemType = ClosedEnum<typeof OutputApplyPatchServerToolItemType>;
/**
 * An openrouter:apply_patch server tool output item. The turn halts when validation succeeds so the client can apply the patch and echo an `apply_patch_call_output` on the next turn.
 */
export type OutputApplyPatchServerToolItem = {
    callId?: string | undefined;
    id?: string | undefined;
    /**
     * The patch operation requested by an `apply_patch_call`. `create_file` and `update_file` carry a V4A diff; `delete_file` omits it.
     */
    operation?: ApplyPatchCallOperation | undefined;
    status: ToolCallStatus;
    type: OutputApplyPatchServerToolItemType;
};
/** @internal */
export declare const OutputApplyPatchServerToolItemType$inboundSchema: z.ZodEnum<typeof OutputApplyPatchServerToolItemType>;
/** @internal */
export declare const OutputApplyPatchServerToolItemType$outboundSchema: z.ZodEnum<typeof OutputApplyPatchServerToolItemType>;
/** @internal */
export declare const OutputApplyPatchServerToolItem$inboundSchema: z.ZodType<OutputApplyPatchServerToolItem, unknown>;
/** @internal */
export type OutputApplyPatchServerToolItem$Outbound = {
    call_id?: string | undefined;
    id?: string | undefined;
    operation?: ApplyPatchCallOperation$Outbound | undefined;
    status: string;
    type: string;
};
/** @internal */
export declare const OutputApplyPatchServerToolItem$outboundSchema: z.ZodType<OutputApplyPatchServerToolItem$Outbound, OutputApplyPatchServerToolItem>;
export declare function outputApplyPatchServerToolItemToJSON(outputApplyPatchServerToolItem: OutputApplyPatchServerToolItem): string;
export declare function outputApplyPatchServerToolItemFromJSON(jsonString: string): SafeParseResult<OutputApplyPatchServerToolItem, SDKValidationError>;
//# sourceMappingURL=outputapplypatchservertoolitem.d.ts.map