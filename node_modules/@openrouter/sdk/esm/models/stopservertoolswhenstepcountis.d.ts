import * as z from "zod/v4";
/**
 * Stop after the agent loop has executed this many steps.
 */
export type StopServerToolsWhenStepCountIs = {
    stepCount: number;
    type: "step_count_is";
};
/** @internal */
export type StopServerToolsWhenStepCountIs$Outbound = {
    step_count: number;
    type: "step_count_is";
};
/** @internal */
export declare const StopServerToolsWhenStepCountIs$outboundSchema: z.ZodType<StopServerToolsWhenStepCountIs$Outbound, StopServerToolsWhenStepCountIs>;
export declare function stopServerToolsWhenStepCountIsToJSON(stopServerToolsWhenStepCountIs: StopServerToolsWhenStepCountIs): string;
//# sourceMappingURL=stopservertoolswhenstepcountis.d.ts.map