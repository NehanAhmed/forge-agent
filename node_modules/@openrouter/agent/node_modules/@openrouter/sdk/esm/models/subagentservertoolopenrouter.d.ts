import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { SubagentServerToolConfig, SubagentServerToolConfig$Outbound } from "./subagentservertoolconfig.js";
export declare const SubagentServerToolOpenRouterType: {
    readonly OpenrouterSubagent: "openrouter:subagent";
};
export type SubagentServerToolOpenRouterType = ClosedEnum<typeof SubagentServerToolOpenRouterType>;
/**
 * OpenRouter built-in server tool: delegates self-contained tasks to a smaller, cheaper, faster worker model (any OpenRouter model) mid-generation and returns its outcome. The worker may run as a sub-agent with its own tools.
 */
export type SubagentServerToolOpenRouter = {
    /**
     * Configuration for the openrouter:subagent server tool.
     */
    parameters?: SubagentServerToolConfig | undefined;
    type: SubagentServerToolOpenRouterType;
};
/** @internal */
export declare const SubagentServerToolOpenRouterType$outboundSchema: z.ZodEnum<typeof SubagentServerToolOpenRouterType>;
/** @internal */
export type SubagentServerToolOpenRouter$Outbound = {
    parameters?: SubagentServerToolConfig$Outbound | undefined;
    type: string;
};
/** @internal */
export declare const SubagentServerToolOpenRouter$outboundSchema: z.ZodType<SubagentServerToolOpenRouter$Outbound, SubagentServerToolOpenRouter>;
export declare function subagentServerToolOpenRouterToJSON(subagentServerToolOpenRouter: SubagentServerToolOpenRouter): string;
//# sourceMappingURL=subagentservertoolopenrouter.d.ts.map