import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { AnthropicIterationCacheCreation } from "./anthropiciterationcachecreation.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const AnthropicMessageUsageIterationType: {
    readonly Message: "message";
};
export type AnthropicMessageUsageIterationType = ClosedEnum<typeof AnthropicMessageUsageIterationType>;
export type AnthropicMessageUsageIteration = {
    cacheCreation?: AnthropicIterationCacheCreation | null | undefined;
    cacheCreationInputTokens?: number | undefined;
    cacheReadInputTokens?: number | undefined;
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    model?: string | undefined;
    type: AnthropicMessageUsageIterationType;
};
/** @internal */
export declare const AnthropicMessageUsageIterationType$inboundSchema: z.ZodEnum<typeof AnthropicMessageUsageIterationType>;
/** @internal */
export declare const AnthropicMessageUsageIteration$inboundSchema: z.ZodType<AnthropicMessageUsageIteration, unknown>;
export declare function anthropicMessageUsageIterationFromJSON(jsonString: string): SafeParseResult<AnthropicMessageUsageIteration, SDKValidationError>;
//# sourceMappingURL=anthropicmessageusageiteration.d.ts.map