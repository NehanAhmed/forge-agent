import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { FileMetadata } from "./filemetadata.js";
/**
 * A page of files belonging to the requesting workspace.
 */
export type FileListResponse = {
    /**
     * Opaque cursor for the next page; null when there are no more results.
     */
    cursor: string | null;
    data: Array<FileMetadata>;
    firstId: string | null;
    hasMore: boolean;
    lastId: string | null;
};
/** @internal */
export declare const FileListResponse$inboundSchema: z.ZodType<FileListResponse, unknown>;
export declare function fileListResponseFromJSON(jsonString: string): SafeParseResult<FileListResponse, SDKValidationError>;
//# sourceMappingURL=filelistresponse.d.ts.map