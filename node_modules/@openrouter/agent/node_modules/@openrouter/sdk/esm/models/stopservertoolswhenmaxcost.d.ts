import * as z from "zod/v4";
/**
 * Stop once cumulative cost across the loop exceeds this dollar threshold.
 */
export type StopServerToolsWhenMaxCost = {
    maxCostInDollars: number;
    type: "max_cost";
};
/** @internal */
export type StopServerToolsWhenMaxCost$Outbound = {
    max_cost_in_dollars: number;
    type: "max_cost";
};
/** @internal */
export declare const StopServerToolsWhenMaxCost$outboundSchema: z.ZodType<StopServerToolsWhenMaxCost$Outbound, StopServerToolsWhenMaxCost>;
export declare function stopServerToolsWhenMaxCostToJSON(stopServerToolsWhenMaxCost: StopServerToolsWhenMaxCost): string;
//# sourceMappingURL=stopservertoolswhenmaxcost.d.ts.map