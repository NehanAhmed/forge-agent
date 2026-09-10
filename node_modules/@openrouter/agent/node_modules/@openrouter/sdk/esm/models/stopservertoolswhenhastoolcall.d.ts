import * as z from "zod/v4";
/**
 * Stop after a tool with this name has been called.
 */
export type StopServerToolsWhenHasToolCall = {
    toolName: string;
    type: "has_tool_call";
};
/** @internal */
export type StopServerToolsWhenHasToolCall$Outbound = {
    tool_name: string;
    type: "has_tool_call";
};
/** @internal */
export declare const StopServerToolsWhenHasToolCall$outboundSchema: z.ZodType<StopServerToolsWhenHasToolCall$Outbound, StopServerToolsWhenHasToolCall>;
export declare function stopServerToolsWhenHasToolCallToJSON(stopServerToolsWhenHasToolCall: StopServerToolsWhenHasToolCall): string;
//# sourceMappingURL=stopservertoolswhenhastoolcall.d.ts.map