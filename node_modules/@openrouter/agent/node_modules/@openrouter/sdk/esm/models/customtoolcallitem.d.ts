import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const CustomToolCallItemType: {
    readonly CustomToolCall: "custom_tool_call";
};
export type CustomToolCallItemType = ClosedEnum<typeof CustomToolCallItemType>;
/**
 * A call to a custom (freeform-grammar) tool created by the model — distinct from `function_call`. Used for tools like Codex CLI's `apply_patch` whose payload is opaque text rather than JSON arguments.
 */
export type CustomToolCallItem = {
    callId: string;
    id?: string | undefined;
    input: string;
    name: string;
    /**
     * Namespace qualifier for tools registered as part of a namespace tool group (e.g. an MCP server)
     */
    namespace?: string | undefined;
    type: CustomToolCallItemType;
};
/** @internal */
export declare const CustomToolCallItemType$outboundSchema: z.ZodEnum<typeof CustomToolCallItemType>;
/** @internal */
export type CustomToolCallItem$Outbound = {
    call_id: string;
    id?: string | undefined;
    input: string;
    name: string;
    namespace?: string | undefined;
    type: string;
};
/** @internal */
export declare const CustomToolCallItem$outboundSchema: z.ZodType<CustomToolCallItem$Outbound, CustomToolCallItem>;
export declare function customToolCallItemToJSON(customToolCallItem: CustomToolCallItem): string;
//# sourceMappingURL=customtoolcallitem.d.ts.map