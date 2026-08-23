import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { AnthropicIterationCacheCreation } from "./anthropiciterationcachecreation.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const AnthropicCompactionUsageIterationType: {
    readonly Compaction: "compaction";
};
export type AnthropicCompactionUsageIterationType = ClosedEnum<typeof AnthropicCompactionUsageIterationType>;
export type AnthropicCompactionUsageIteration = {
    cacheCreation?: AnthropicIterationCacheCreation | null | undefined;
    cacheCreationInputTokens?: number | undefined;
    cacheReadInputTokens?: number | undefined;
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
    type: AnthropicCompactionUsageIterationType;
};
/** @internal */
export declare const AnthropicCompactionUsageIterationType$inboundSchema: z.ZodEnum<typeof AnthropicCompactionUsageIterationType>;
/** @internal */
export declare const AnthropicCompactionUsageIteration$inboundSchema: z.ZodType<AnthropicCompactionUsageIteration, unknown>;
export declare function anthropicCompactionUsageIterationFromJSON(jsonString: string): SafeParseResult<AnthropicCompactionUsageIteration, SDKValidationError>;
//# sourceMappingURL=anthropiccompactionusageiteration.d.ts.map