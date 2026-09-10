import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const FileDeleteResponseType: {
    readonly FileDeleted: "file_deleted";
};
export type FileDeleteResponseType = ClosedEnum<typeof FileDeleteResponseType>;
/**
 * Confirmation that a file was deleted.
 */
export type FileDeleteResponse = {
    id: string;
    type: FileDeleteResponseType;
};
/** @internal */
export declare const FileDeleteResponseType$inboundSchema: z.ZodEnum<typeof FileDeleteResponseType>;
/** @internal */
export declare const FileDeleteResponse$inboundSchema: z.ZodType<FileDeleteResponse, unknown>;
export declare function fileDeleteResponseFromJSON(jsonString: string): SafeParseResult<FileDeleteResponse, SDKValidationError>;
//# sourceMappingURL=filedeleteresponse.d.ts.map