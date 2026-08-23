import * as z from "zod/v4";
/**
 * Stop once cumulative token usage across the loop exceeds this threshold.
 */
export type StopServerToolsWhenMaxTokensUsed = {
    maxTokens: number;
    type: "max_tokens_used";
};
/** @internal */
export type StopServerToolsWhenMaxTokensUsed$Outbound = {
    max_tokens: number;
    type: "max_tokens_used";
};
/** @internal */
export declare const StopServerToolsWhenMaxTokensUsed$outboundSchema: z.ZodType<StopServerToolsWhenMaxTokensUsed$Outbound, StopServerToolsWhenMaxTokensUsed>;
export declare function stopServerToolsWhenMaxTokensUsedToJSON(stopServerToolsWhenMaxTokensUsed: StopServerToolsWhenMaxTokensUsed): string;
//# sourceMappingURL=stopservertoolswhenmaxtokensused.d.ts.map