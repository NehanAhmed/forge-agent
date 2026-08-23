import * as z from "zod/v4";
/**
 * Stop when the upstream model emits this finish reason (e.g. `length`).
 */
export type StopServerToolsWhenFinishReasonIs = {
    reason: string;
    type: "finish_reason_is";
};
/** @internal */
export type StopServerToolsWhenFinishReasonIs$Outbound = {
    reason: string;
    type: "finish_reason_is";
};
/** @internal */
export declare const StopServerToolsWhenFinishReasonIs$outboundSchema: z.ZodType<StopServerToolsWhenFinishReasonIs$Outbound, StopServerToolsWhenFinishReasonIs>;
export declare function stopServerToolsWhenFinishReasonIsToJSON(stopServerToolsWhenFinishReasonIs: StopServerToolsWhenFinishReasonIs): string;
//# sourceMappingURL=stopservertoolswhenfinishreasonis.d.ts.map