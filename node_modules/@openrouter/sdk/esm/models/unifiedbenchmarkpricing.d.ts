import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * OpenRouter pricing per token for this model. Null if pricing is unavailable.
 */
export type UnifiedBenchmarkPricing = {
    /**
     * Cost per output token (USD, decimal string).
     */
    completion: string;
    /**
     * Cost per input token (USD, decimal string).
     */
    prompt: string;
};
/** @internal */
export declare const UnifiedBenchmarkPricing$inboundSchema: z.ZodType<UnifiedBenchmarkPricing, unknown>;
export declare function unifiedBenchmarkPricingFromJSON(jsonString: string): SafeParseResult<UnifiedBenchmarkPricing, SDKValidationError>;
//# sourceMappingURL=unifiedbenchmarkpricing.d.ts.map