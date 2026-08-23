import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicToolUsesKeepType: {
    readonly ToolUses: "tool_uses";
};
export type AnthropicToolUsesKeepType = ClosedEnum<typeof AnthropicToolUsesKeepType>;
export type AnthropicToolUsesKeep = {
    type: AnthropicToolUsesKeepType;
    value: number;
};
/** @internal */
export declare const AnthropicToolUsesKeepType$outboundSchema: z.ZodEnum<typeof AnthropicToolUsesKeepType>;
/** @internal */
export type AnthropicToolUsesKeep$Outbound = {
    type: string;
    value: number;
};
/** @internal */
export declare const AnthropicToolUsesKeep$outboundSchema: z.ZodType<AnthropicToolUsesKeep$Outbound, AnthropicToolUsesKeep>;
export declare function anthropicToolUsesKeepToJSON(anthropicToolUsesKeep: AnthropicToolUsesKeep): string;
//# sourceMappingURL=anthropictooluseskeep.d.ts.map