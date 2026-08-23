import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { AnthropicIterationCacheCreation } from "./anthropiciterationcachecreation.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type AnthropicUnknownUsageIteration = {
    cacheCreation?: AnthropicIterationCacheCreation | null | undefined;
    cacheCreationInputTokens?: number | undefined;
    cacheReadInputTokens?: number | undefined;
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    type: string;
};
/** @internal */
export declare const AnthropicUnknownUsageIteration$inboundSchema: z.ZodType<AnthropicUnknownUsageIteration, unknown>;
export declare function anthropicUnknownUsageIterationFromJSON(jsonString: string): SafeParseResult<AnthropicUnknownUsageIteration, SDKValidationError>;
//# sourceMappingURL=anthropicunknownusageiteration.d.ts.map