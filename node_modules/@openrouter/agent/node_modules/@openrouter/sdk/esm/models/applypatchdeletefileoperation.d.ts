import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * The `delete_file` variant of an `apply_patch_call.operation`. Identifies the file to remove; no diff is required.
 */
export type ApplyPatchDeleteFileOperation = {
    path: string;
    type: "delete_file";
};
/** @internal */
export declare const ApplyPatchDeleteFileOperation$inboundSchema: z.ZodType<ApplyPatchDeleteFileOperation, unknown>;
/** @internal */
export type ApplyPatchDeleteFileOperation$Outbound = {
    path: string;
    type: "delete_file";
};
/** @internal */
export declare const ApplyPatchDeleteFileOperation$outboundSchema: z.ZodType<ApplyPatchDeleteFileOperation$Outbound, ApplyPatchDeleteFileOperation>;
export declare function applyPatchDeleteFileOperationToJSON(applyPatchDeleteFileOperation: ApplyPatchDeleteFileOperation): string;
export declare function applyPatchDeleteFileOperationFromJSON(jsonString: string): SafeParseResult<ApplyPatchDeleteFileOperation, SDKValidationError>;
//# sourceMappingURL=applypatchdeletefileoperation.d.ts.map