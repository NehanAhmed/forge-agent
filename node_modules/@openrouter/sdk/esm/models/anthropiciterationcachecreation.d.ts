import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type AnthropicIterationCacheCreation = {
    ephemeral1hInputTokens?: number | undefined;
    ephemeral5mInputTokens?: number | undefined;
};
/** @internal */
export declare const AnthropicIterationCacheCreation$inboundSchema: z.ZodType<AnthropicIterationCacheCreation, unknown>;
export declare function anthropicIterationCacheCreationFromJSON(jsonString: string): SafeParseResult<AnthropicIterationCacheCreation, SDKValidationError>;
//# sourceMappingURL=anthropiciterationcachecreation.d.ts.map