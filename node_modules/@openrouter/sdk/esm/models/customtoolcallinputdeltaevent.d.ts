import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Event emitted when a custom tool call's freeform input is being streamed. Mirrors `response.function_call_arguments.delta` but for `custom` tools whose input is opaque text rather than JSON arguments.
 */
export type CustomToolCallInputDeltaEvent = {
    delta: string;
    itemId: string;
    outputIndex: number;
    sequenceNumber: number;
    type: "response.custom_tool_call_input.delta";
};
/** @internal */
export declare const CustomToolCallInputDeltaEvent$inboundSchema: z.ZodType<CustomToolCallInputDeltaEvent, unknown>;
export declare function customToolCallInputDeltaEventFromJSON(jsonString: string): SafeParseResult<CustomToolCallInputDeltaEvent, SDKValidationError>;
//# sourceMappingURL=customtoolcallinputdeltaevent.d.ts.map