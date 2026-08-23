import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * The `create_file` variant of an `apply_patch_call.operation`. Carries a V4A diff describing the new file contents.
 */
export type ApplyPatchCreateFileOperation = {
    diff: string;
    path: string;
    type: "create_file";
};
/** @internal */
export declare const ApplyPatchCreateFileOperation$inboundSchema: z.ZodType<ApplyPatchCreateFileOperation, unknown>;
/** @internal */
export type ApplyPatchCreateFileOperation$Outbound = {
    diff: string;
    path: string;
    type: "create_file";
};
/** @internal */
export declare const ApplyPatchCreateFileOperation$outboundSchema: z.ZodType<ApplyPatchCreateFileOperation$Outbound, ApplyPatchCreateFileOperation>;
export declare function applyPatchCreateFileOperationToJSON(applyPatchCreateFileOperation: ApplyPatchCreateFileOperation): string;
export declare function applyPatchCreateFileOperationFromJSON(jsonString: string): SafeParseResult<ApplyPatchCreateFileOperation, SDKValidationError>;
//# sourceMappingURL=applypatchcreatefileoperation.d.ts.map