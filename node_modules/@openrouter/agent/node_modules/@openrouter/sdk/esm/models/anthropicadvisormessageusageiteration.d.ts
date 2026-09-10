import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { AnthropicIterationCacheCreation } from "./anthropiciterationcachecreation.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const AnthropicAdvisorMessageUsageIterationType: {
    readonly AdvisorMessage: "advisor_message";
};
export type AnthropicAdvisorMessageUsageIterationType = ClosedEnum<typeof AnthropicAdvisorMessageUsageIterationType>;
export type AnthropicAdvisorMessageUsageIteration = {
    cacheCreation?: AnthropicIterationCacheCreation | null | undefined;
    cacheCreationInputTokens?: number | undefined;
    cacheReadInputTokens?: number | undefined;
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    model: string;
    type: AnthropicAdvisorMessageUsageIterationType;
};
/** @internal */
export declare const AnthropicAdvisorMessageUsageIterationType$inboundSchema: z.ZodEnum<typeof AnthropicAdvisorMessageUsageIterationType>;
/** @internal */
export declare const AnthropicAdvisorMessageUsageIteration$inboundSchema: z.ZodType<AnthropicAdvisorMessageUsageIteration, unknown>;
export declare function anthropicAdvisorMessageUsageIterationFromJSON(jsonString: string): SafeParseResult<AnthropicAdvisorMessageUsageIteration, SDKValidationError>;
//# sourceMappingURL=anthropicadvisormessageusageiteration.d.ts.map