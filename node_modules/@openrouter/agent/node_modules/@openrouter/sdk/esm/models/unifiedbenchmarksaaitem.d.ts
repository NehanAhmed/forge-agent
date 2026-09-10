import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { UnifiedBenchmarkPricing } from "./unifiedbenchmarkpricing.js";
export type UnifiedBenchmarksAAItem = {
    /**
     * Artificial Analysis Agentic Index composite score. Higher is better.
     */
    agenticIndex: number | null;
    /**
     * Artificial Analysis Coding Index composite score. Higher is better.
     */
    codingIndex: number | null;
    /**
     * Model name as listed on Artificial Analysis.
     */
    displayName: string;
    /**
     * Artificial Analysis Intelligence Index composite score. Higher is better.
     */
    intelligenceIndex: number | null;
    /**
     * Stable OpenRouter model identifier.
     */
    modelPermaslug: string;
    /**
     * OpenRouter pricing per token for this model. Null if pricing is unavailable.
     */
    pricing: UnifiedBenchmarkPricing | null;
    /**
     * Benchmark source discriminator.
     */
    source: "artificial-analysis";
};
/** @internal */
export declare const UnifiedBenchmarksAAItem$inboundSchema: z.ZodType<UnifiedBenchmarksAAItem, unknown>;
export declare function unifiedBenchmarksAAItemFromJSON(jsonString: string): SafeParseResult<UnifiedBenchmarksAAItem, SDKValidationError>;
//# sourceMappingURL=unifiedbenchmarksaaitem.d.ts.map