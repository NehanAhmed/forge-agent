import * as z from "zod/v4";
export type AnthropicInputTokensTrigger = {
    type: "input_tokens";
    value: number;
};
/** @internal */
export type AnthropicInputTokensTrigger$Outbound = {
    type: "input_tokens";
    value: number;
};
/** @internal */
export declare const AnthropicInputTokensTrigger$outboundSchema: z.ZodType<AnthropicInputTokensTrigger$Outbound, AnthropicInputTokensTrigger>;
export declare function anthropicInputTokensTriggerToJSON(anthropicInputTokensTrigger: AnthropicInputTokensTrigger): string;
//# sourceMappingURL=anthropicinputtokenstrigger.d.ts.map