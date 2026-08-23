import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * The `update_file` variant of an `apply_patch_call.operation`. Carries a V4A diff describing edits to an existing file.
 */
export type ApplyPatchUpdateFileOperation = {
    diff: string;
    path: string;
    type: "update_file";
};
/** @internal */
export declare const ApplyPatchUpdateFileOperation$inboundSchema: z.ZodType<ApplyPatchUpdateFileOperation, unknown>;
/** @internal */
export type ApplyPatchUpdateFileOperation$Outbound = {
    diff: string;
    path: string;
    type: "update_file";
};
/** @internal */
export declare const ApplyPatchUpdateFileOperation$outboundSchema: z.ZodType<ApplyPatchUpdateFileOperation$Outbound, ApplyPatchUpdateFileOperation>;
export declare function applyPatchUpdateFileOperationToJSON(applyPatchUpdateFileOperation: ApplyPatchUpdateFileOperation): string;
export declare function applyPatchUpdateFileOperationFromJSON(jsonString: string): SafeParseResult<ApplyPatchUpdateFileOperation, SDKValidationError>;
//# sourceMappingURL=applypatchupdatefileoperation.d.ts.map