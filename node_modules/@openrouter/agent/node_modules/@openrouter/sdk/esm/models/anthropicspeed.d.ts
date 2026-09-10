import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
export declare const AnthropicSpeed: {
    readonly Fast: "fast";
    readonly Standard: "standard";
};
export type AnthropicSpeed = OpenEnum<typeof AnthropicSpeed>;
/** @internal */
export declare const AnthropicSpeed$inboundSchema: z.ZodType<AnthropicSpeed, unknown>;
//# sourceMappingURL=anthropicspeed.d.ts.map