import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ImageModelListItem } from "./imagemodellistitem.js";
/**
 * List of image generation models.
 */
export type ImageModelsListResponse = {
    data: Array<ImageModelListItem>;
};
/** @internal */
export declare const ImageModelsListResponse$inboundSchema: z.ZodType<ImageModelsListResponse, unknown>;
export declare function imageModelsListResponseFromJSON(jsonString: string): SafeParseResult<ImageModelsListResponse, SDKValidationError>;
//# sourceMappingURL=imagemodelslistresponse.d.ts.map