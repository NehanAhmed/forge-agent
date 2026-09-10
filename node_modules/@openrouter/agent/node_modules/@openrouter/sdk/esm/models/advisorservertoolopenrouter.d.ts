import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { AdvisorServerToolConfig, AdvisorServerToolConfig$Outbound } from "./advisorservertoolconfig.js";
export declare const AdvisorServerToolOpenRouterType: {
    readonly OpenrouterAdvisor: "openrouter:advisor";
};
export type AdvisorServerToolOpenRouterType = ClosedEnum<typeof AdvisorServerToolOpenRouterType>;
/**
 * OpenRouter built-in server tool: consults a higher-intelligence advisor model (any OpenRouter model) for guidance mid-generation and returns its response. The advisor may run as a sub-agent with its own tools. Include multiple entries to offer several named advisors; at most one entry may omit `name` to act as the default advisor.
 */
export type AdvisorServerToolOpenRouter = {
    /**
     * Configuration for one openrouter:advisor server tool entry.
     */
    parameters?: AdvisorServerToolConfig | undefined;
    type: AdvisorServerToolOpenRouterType;
};
/** @internal */
export declare const AdvisorServerToolOpenRouterType$outboundSchema: z.ZodEnum<typeof AdvisorServerToolOpenRouterType>;
/** @internal */
export type AdvisorServerToolOpenRouter$Outbound = {
    parameters?: AdvisorServerToolConfig$Outbound | undefined;
    type: string;
};
/** @internal */
export declare const AdvisorServerToolOpenRouter$outboundSchema: z.ZodType<AdvisorServerToolOpenRouter$Outbound, AdvisorServerToolOpenRouter>;
export declare function advisorServerToolOpenRouterToJSON(advisorServerToolOpenRouter: AdvisorServerToolOpenRouter): string;
//# sourceMappingURL=advisorservertoolopenrouter.d.ts.map