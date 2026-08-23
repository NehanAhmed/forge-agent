import * as z from "zod/v4";
export type AnthropicToolUsesTrigger = {
    type: "tool_uses";
    value: number;
};
/** @internal */
export type AnthropicToolUsesTrigger$Outbound = {
    type: "tool_uses";
    value: number;
};
/** @internal */
export declare const AnthropicToolUsesTrigger$outboundSchema: z.ZodType<AnthropicToolUsesTrigger$Outbound, AnthropicToolUsesTrigger>;
export declare function anthropicToolUsesTriggerToJSON(anthropicToolUsesTrigger: AnthropicToolUsesTrigger): string;
//# sourceMappingURL=anthropictoolusestrigger.d.ts.map