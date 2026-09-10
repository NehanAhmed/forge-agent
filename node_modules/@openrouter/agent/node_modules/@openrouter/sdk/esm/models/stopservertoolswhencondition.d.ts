import * as z from "zod/v4";
import { StopServerToolsWhenFinishReasonIs, StopServerToolsWhenFinishReasonIs$Outbound } from "./stopservertoolswhenfinishreasonis.js";
import { StopServerToolsWhenHasToolCall, StopServerToolsWhenHasToolCall$Outbound } from "./stopservertoolswhenhastoolcall.js";
import { StopServerToolsWhenMaxCost, StopServerToolsWhenMaxCost$Outbound } from "./stopservertoolswhenmaxcost.js";
import { StopServerToolsWhenMaxTokensUsed, StopServerToolsWhenMaxTokensUsed$Outbound } from "./stopservertoolswhenmaxtokensused.js";
import { StopServerToolsWhenStepCountIs, StopServerToolsWhenStepCountIs$Outbound } from "./stopservertoolswhenstepcountis.js";
/**
 * A single condition that, when met, halts the server-tool agent loop.
 */
export type StopServerToolsWhenCondition = StopServerToolsWhenFinishReasonIs | StopServerToolsWhenHasToolCall | StopServerToolsWhenMaxCost | StopServerToolsWhenMaxTokensUsed | StopServerToolsWhenStepCountIs;
/** @internal */
export type StopServerToolsWhenCondition$Outbound = StopServerToolsWhenFinishReasonIs$Outbound | StopServerToolsWhenHasToolCall$Outbound | StopServerToolsWhenMaxCost$Outbound | StopServerToolsWhenMaxTokensUsed$Outbound | StopServerToolsWhenStepCountIs$Outbound;
/** @internal */
export declare const StopServerToolsWhenCondition$outboundSchema: z.ZodType<StopServerToolsWhenCondition$Outbound, StopServerToolsWhenCondition>;
export declare function stopServerToolsWhenConditionToJSON(stopServerToolsWhenCondition: StopServerToolsWhenCondition): string;
//# sourceMappingURL=stopservertoolswhencondition.d.ts.map