import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Event emitted when a custom tool call's freeform input streaming is complete. Mirrors `response.function_call_arguments.done` but for `custom` tools.
 */
export type CustomToolCallInputDoneEvent = {
    input: string;
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.custom_tool_call_input.done";
};
/** @internal */
export declare const CustomToolCallInputDoneEvent$inboundSchema: z.ZodType<CustomToolCallInputDoneEvent, unknown>;
export declare function customToolCallInputDoneEventFromJSON(jsonString: string): SafeParseResult<CustomToolCallInputDoneEvent, SDKValidationError>;
//# sourceMappingURL=customtoolcallinputdoneevent.d.ts.map