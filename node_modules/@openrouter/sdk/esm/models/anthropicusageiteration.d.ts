import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { AnthropicAdvisorMessageUsageIteration } from "./anthropicadvisormessageusageiteration.js";
import { AnthropicCompactionUsageIteration } from "./anthropiccompactionusageiteration.js";
import { AnthropicMessageUsageIteration } from "./anthropicmessageusageiteration.js";
import { AnthropicUnknownUsageIteration } from "./anthropicunknownusageiteration.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type AnthropicUsageIteration = AnthropicAdvisorMessageUsageIteration | AnthropicCompactionUsageIteration | AnthropicMessageUsageIteration | AnthropicUnknownUsageIteration;
/** @internal */
export declare const AnthropicUsageIteration$inboundSchema: z.ZodType<AnthropicUsageIteration, unknown>;
export declare function anthropicUsageIterationFromJSON(jsonString: string): SafeParseResult<AnthropicUsageIteration, SDKValidationError>;
//# sourceMappingURL=anthropicusageiteration.d.ts.map