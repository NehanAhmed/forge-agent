import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const OpenAIResponseCustomToolCallType: {
    readonly CustomToolCall: "custom_tool_call";
};
export type OpenAIResponseCustomToolCallType = ClosedEnum<typeof OpenAIResponseCustomToolCallType>;
export type OpenAIResponseCustomToolCall = {
    callId: string;
    id?: string | undefined;
    input: string;
    name: string;
    /**
     * Namespace qualifier for tools registered as part of a namespace tool group (e.g. an MCP server)
     */
    namespace?: string | undefined;
    type: OpenAIResponseCustomToolCallType;
};
/** @internal */
export declare const OpenAIResponseCustomToolCallType$inboundSchema: z.ZodEnum<typeof OpenAIResponseCustomToolCallType>;
/** @internal */
export declare const OpenAIResponseCustomToolCall$inboundSchema: z.ZodType<OpenAIResponseCustomToolCall, unknown>;
export declare function openAIResponseCustomToolCallFromJSON(jsonString: string): SafeParseResult<OpenAIResponseCustomToolCall, SDKValidationError>;
//# sourceMappingURL=openairesponsecustomtoolcall.d.ts.map