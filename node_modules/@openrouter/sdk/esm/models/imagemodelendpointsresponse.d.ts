import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ImageEndpoint } from "./imageendpoint.js";
/**
 * The full per-endpoint records for an image model.
 */
export type ImageModelEndpointsResponse = {
    endpoints: Array<ImageEndpoint>;
    /**
     * Model slug
     */
    id: string;
};
/** @internal */
export declare const ImageModelEndpointsResponse$inboundSchema: z.ZodType<ImageModelEndpointsResponse, unknown>;
export declare function imageModelEndpointsResponseFromJSON(jsonString: string): SafeParseResult<ImageModelEndpointsResponse, SDKValidationError>;
//# sourceMappingURL=imagemodelendpointsresponse.d.ts.map