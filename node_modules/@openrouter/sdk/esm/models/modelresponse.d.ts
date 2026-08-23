import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { Model } from "./model.js";
/**
 * Single model response
 */
export type ModelResponse = {
    /**
     * Information about an AI model available on OpenRouter
     */
    data: Model;
};
/** @internal */
export declare const ModelResponse$inboundSchema: z.ZodType<ModelResponse, unknown>;
export declare function modelResponseFromJSON(jsonString: string): SafeParseResult<ModelResponse, SDKValidationError>;
//# sourceMappingURL=modelresponse.d.ts.map