import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicInputTokensClearAtLeastType: {
    readonly InputTokens: "input_tokens";
};
export type AnthropicInputTokensClearAtLeastType = ClosedEnum<typeof AnthropicInputTokensClearAtLeastType>;
export type AnthropicInputTokensClearAtLeast = {
    type: AnthropicInputTokensClearAtLeastType;
    value: number;
};
/** @internal */
export declare const AnthropicInputTokensClearAtLeastType$outboundSchema: z.ZodEnum<typeof AnthropicInputTokensClearAtLeastType>;
/** @internal */
export type AnthropicInputTokensClearAtLeast$Outbound = {
    type: string;
    value: number;
};
/** @internal */
export declare const AnthropicInputTokensClearAtLeast$outboundSchema: z.ZodType<AnthropicInputTokensClearAtLeast$Outbound, AnthropicInputTokensClearAtLeast>;
export declare function anthropicInputTokensClearAtLeastToJSON(anthropicInputTokensClearAtLeast: AnthropicInputTokensClearAtLeast): string;
//# sourceMappingURL=anthropicinputtokensclearatleast.d.ts.map