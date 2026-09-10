import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const OutputCustomToolCallItemType: {
    readonly CustomToolCall: "custom_tool_call";
};
export type OutputCustomToolCallItemType = ClosedEnum<typeof OutputCustomToolCallItemType>;
/**
 * A call to a custom (freeform-grammar) tool created by the model — distinct from `function_call`. Used for tools like Codex CLI's `apply_patch` whose payload is opaque text rather than JSON arguments.
 */
export type OutputCustomToolCallItem = {
    callId: string;
    id?: string | undefined;
    input: string;
    name: string;
    /**
     * Namespace qualifier for tools registered as part of a namespace tool group (e.g. an MCP server)
     */
    namespace?: string | undefined;
    type: OutputCustomToolCallItemType;
};
/** @internal */
export declare const OutputCustomToolCallItemType$inboundSchema: z.ZodEnum<typeof OutputCustomToolCallItemType>;
/** @internal */
export declare const OutputCustomToolCallItemType$outboundSchema: z.ZodEnum<typeof OutputCustomToolCallItemType>;
/** @internal */
export declare const OutputCustomToolCallItem$inboundSchema: z.ZodType<OutputCustomToolCallItem, unknown>;
/** @internal */
export type OutputCustomToolCallItem$Outbound = {
    call_id: string;
    id?: string | undefined;
    input: string;
    name: string;
    namespace?: string | undefined;
    type: string;
};
/** @internal */
export declare const OutputCustomToolCallItem$outboundSchema: z.ZodType<OutputCustomToolCallItem$Outbound, OutputCustomToolCallItem>;
export declare function outputCustomToolCallItemToJSON(outputCustomToolCallItem: OutputCustomToolCallItem): string;
export declare function outputCustomToolCallItemFromJSON(jsonString: string): SafeParseResult<OutputCustomToolCallItem, SDKValidationError>;
//# sourceMappingURL=outputcustomtoolcallitem.d.ts.map