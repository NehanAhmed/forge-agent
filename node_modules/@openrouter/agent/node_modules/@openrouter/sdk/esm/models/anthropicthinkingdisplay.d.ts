import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
export declare const AnthropicThinkingDisplay: {
    readonly Summarized: "summarized";
    readonly Omitted: "omitted";
};
export type AnthropicThinkingDisplay = OpenEnum<typeof AnthropicThinkingDisplay>;
/** @internal */
export declare const AnthropicThinkingDisplay$outboundSchema: z.ZodType<string, AnthropicThinkingDisplay>;
//# sourceMappingURL=anthropicthinkingdisplay.d.ts.map