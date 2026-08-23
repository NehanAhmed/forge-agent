import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Lifecycle state of an `apply_patch_call` output item.
 */
export declare const ApplyPatchCallStatus: {
    readonly InProgress: "in_progress";
    readonly Completed: "completed";
};
/**
 * Lifecycle state of an `apply_patch_call` output item.
 */
export type ApplyPatchCallStatus = OpenEnum<typeof ApplyPatchCallStatus>;
/** @internal */
export declare const ApplyPatchCallStatus$inboundSchema: z.ZodType<ApplyPatchCallStatus, unknown>;
/** @internal */
export declare const ApplyPatchCallStatus$outboundSchema: z.ZodType<string, ApplyPatchCallStatus>;
//# sourceMappingURL=applypatchcallstatus.d.ts.map