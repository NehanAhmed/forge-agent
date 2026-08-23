import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
export declare const AnthropicAllowedCallers: {
    readonly Direct: "direct";
    readonly CodeExecution20250825: "code_execution_20250825";
    readonly CodeExecution20260120: "code_execution_20260120";
};
export type AnthropicAllowedCallers = OpenEnum<typeof AnthropicAllowedCallers>;
/** @internal */
export declare const AnthropicAllowedCallers$outboundSchema: z.ZodType<string, AnthropicAllowedCallers>;
//# sourceMappingURL=anthropicallowedcallers.d.ts.map