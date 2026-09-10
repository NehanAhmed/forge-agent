import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const FileMetadataType: {
    readonly File: "file";
};
export type FileMetadataType = ClosedEnum<typeof FileMetadataType>;
/**
 * Metadata describing a stored file.
 */
export type FileMetadata = {
    createdAt: string;
    downloadable: boolean;
    filename: string;
    id: string;
    mimeType: string;
    sizeBytes: number;
    type: FileMetadataType;
};
/** @internal */
export declare const FileMetadataType$inboundSchema: z.ZodEnum<typeof FileMetadataType>;
/** @internal */
export declare const FileMetadata$inboundSchema: z.ZodType<FileMetadata, unknown>;
export declare function fileMetadataFromJSON(jsonString: string): SafeParseResult<FileMetadata, SDKValidationError>;
//# sourceMappingURL=filemetadata.d.ts.map