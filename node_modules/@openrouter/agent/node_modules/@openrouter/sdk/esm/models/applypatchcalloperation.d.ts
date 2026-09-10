import * as z from "zod/v4";
import * as discriminatedUnionTypes from "../types/discriminatedUnion.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { ApplyPatchCreateFileOperation, ApplyPatchCreateFileOperation$Outbound } from "./applypatchcreatefileoperation.js";
import { ApplyPatchDeleteFileOperation, ApplyPatchDeleteFileOperation$Outbound } from "./applypatchdeletefileoperation.js";
import { ApplyPatchUpdateFileOperation, ApplyPatchUpdateFileOperation$Outbound } from "./applypatchupdatefileoperation.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * The patch operation requested by an `apply_patch_call`. `create_file` and `update_file` carry a V4A diff; `delete_file` omits it.
 */
export type ApplyPatchCallOperation = ApplyPatchCreateFileOperation | ApplyPatchDeleteFileOperation | ApplyPatchUpdateFileOperation | discriminatedUnionTypes.Unknown<"type">;
/** @internal */
export declare const ApplyPatchCallOperation$inboundSchema: z.ZodType<ApplyPatchCallOperation, unknown>;
/** @internal */
export type ApplyPatchCallOperation$Outbound = ApplyPatchCreateFileOperation$Outbound | ApplyPatchDeleteFileOperation$Outbound | ApplyPatchUpdateFileOperation$Outbound;
/** @internal */
export declare const ApplyPatchCallOperation$outboundSchema: z.ZodType<ApplyPatchCallOperation$Outbound, ApplyPatchCallOperation>;
export declare function applyPatchCallOperationToJSON(applyPatchCallOperation: ApplyPatchCallOperation): string;
export declare function applyPatchCallOperationFromJSON(jsonString: string): SafeParseResult<ApplyPatchCallOperation, SDKValidationError>;
//# sourceMappingURL=applypatchcalloperation.d.ts.map