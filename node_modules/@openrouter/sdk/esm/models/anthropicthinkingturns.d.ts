import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicThinkingTurnsType: {
    readonly ThinkingTurns: "thinking_turns";
};
export type AnthropicThinkingTurnsType = ClosedEnum<typeof AnthropicThinkingTurnsType>;
export type AnthropicThinkingTurns = {
    type: AnthropicThinkingTurnsType;
    value: number;
};
/** @internal */
export declare const AnthropicThinkingTurnsType$outboundSchema: z.ZodEnum<typeof AnthropicThinkingTurnsType>;
/** @internal */
export type AnthropicThinkingTurns$Outbound = {
    type: string;
    value: number;
};
/** @internal */
export declare const AnthropicThinkingTurns$outboundSchema: z.ZodType<AnthropicThinkingTurns$Outbound, AnthropicThinkingTurns>;
export declare function anthropicThinkingTurnsToJSON(anthropicThinkingTurns: AnthropicThinkingTurns): string;
//# sourceMappingURL=anthropicthinkingturns.d.ts.map