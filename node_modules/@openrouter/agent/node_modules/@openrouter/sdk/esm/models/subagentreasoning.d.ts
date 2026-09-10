import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Reasoning effort level for the subagent call.
 */
export declare const SubagentReasoningEffort: {
    readonly Max: "max";
    readonly Xhigh: "xhigh";
    readonly High: "high";
    readonly Medium: "medium";
    readonly Low: "low";
    readonly Minimal: "minimal";
    readonly None: "none";
};
/**
 * Reasoning effort level for the subagent call.
 */
export type SubagentReasoningEffort = OpenEnum<typeof SubagentReasoningEffort>;
/**
 * Reasoning configuration forwarded to the subagent call. Use this to control reasoning effort and token budget for models that support extended thinking.
 */
export type SubagentReasoning = {
    /**
     * Reasoning effort level for the subagent call.
     */
    effort?: SubagentReasoningEffort | undefined;
    /**
     * Maximum number of reasoning tokens the subagent may use. Accepted and validated but not yet forwarded to the subagent call.
     */
    maxTokens?: number | undefined;
};
/** @internal */
export declare const SubagentReasoningEffort$outboundSchema: z.ZodType<string, SubagentReasoningEffort>;
/** @internal */
export type SubagentReasoning$Outbound = {
    effort?: string | undefined;
    max_tokens?: number | undefined;
};
/** @internal */
export declare const SubagentReasoning$outboundSchema: z.ZodType<SubagentReasoning$Outbound, SubagentReasoning>;
export declare function subagentReasoningToJSON(subagentReasoning: SubagentReasoning): string;
//# sourceMappingURL=subagentreasoning.d.ts.map