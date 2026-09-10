import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Reasoning effort level for the advisor call.
 */
export declare const AdvisorReasoningEffort: {
    readonly Max: "max";
    readonly Xhigh: "xhigh";
    readonly High: "high";
    readonly Medium: "medium";
    readonly Low: "low";
    readonly Minimal: "minimal";
    readonly None: "none";
};
/**
 * Reasoning effort level for the advisor call.
 */
export type AdvisorReasoningEffort = OpenEnum<typeof AdvisorReasoningEffort>;
/**
 * Reasoning configuration forwarded to the advisor call. Use this to control reasoning effort and token budget for models that support extended thinking.
 */
export type AdvisorReasoning = {
    /**
     * Reasoning effort level for the advisor call.
     */
    effort?: AdvisorReasoningEffort | undefined;
    /**
     * Maximum number of reasoning tokens the advisor may use.
     */
    maxTokens?: number | undefined;
};
/** @internal */
export declare const AdvisorReasoningEffort$outboundSchema: z.ZodType<string, AdvisorReasoningEffort>;
/** @internal */
export type AdvisorReasoning$Outbound = {
    effort?: string | undefined;
    max_tokens?: number | undefined;
};
/** @internal */
export declare const AdvisorReasoning$outboundSchema: z.ZodType<AdvisorReasoning$Outbound, AdvisorReasoning>;
export declare function advisorReasoningToJSON(advisorReasoning: AdvisorReasoning): string;
//# sourceMappingURL=advisorreasoning.d.ts.map