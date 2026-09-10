import * as z from "zod/v4";
import * as discriminatedUnionTypes from "../types/discriminatedUnion.js";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { InputFile } from "./inputfile.js";
import { InputImage } from "./inputimage.js";
import { InputText } from "./inputtext.js";
export type OpenAIResponseCustomToolCallOutputOutput1 = InputFile | (InputImage & {
    type: "input_image";
}) | InputText | discriminatedUnionTypes.Unknown<"type">;
export type OpenAIResponseCustomToolCallOutputOutput2 = string | Array<InputFile | (InputImage & {
    type: "input_image";
}) | InputText | discriminatedUnionTypes.Unknown<"type">>;
export declare const OpenAIResponseCustomToolCallOutputType: {
    readonly CustomToolCallOutput: "custom_tool_call_output";
};
export type OpenAIResponseCustomToolCallOutputType = ClosedEnum<typeof OpenAIResponseCustomToolCallOutputType>;
export type OpenAIResponseCustomToolCallOutput = {
    callId: string;
    id?: string | undefined;
    output: string | Array<InputFile | (InputImage & {
        type: "input_image";
    }) | InputText | discriminatedUnionTypes.Unknown<"type">>;
    type: OpenAIResponseCustomToolCallOutputType;
};
/** @internal */
export declare const OpenAIResponseCustomToolCallOutputOutput1$inboundSchema: z.ZodType<OpenAIResponseCustomToolCallOutputOutput1, unknown>;
export declare function openAIResponseCustomToolCallOutputOutput1FromJSON(jsonString: string): SafeParseResult<OpenAIResponseCustomToolCallOutputOutput1, SDKValidationError>;
/** @internal */
export declare const OpenAIResponseCustomToolCallOutputOutput2$inboundSchema: z.ZodType<OpenAIResponseCustomToolCallOutputOutput2, unknown>;
export declare function openAIResponseCustomToolCallOutputOutput2FromJSON(jsonString: string): SafeParseResult<OpenAIResponseCustomToolCallOutputOutput2, SDKValidationError>;
/** @internal */
export declare const OpenAIResponseCustomToolCallOutputType$inboundSchema: z.ZodEnum<typeof OpenAIResponseCustomToolCallOutputType>;
/** @internal */
export declare const OpenAIResponseCustomToolCallOutput$inboundSchema: z.ZodType<OpenAIResponseCustomToolCallOutput, unknown>;
export declare function openAIResponseCustomToolCallOutputFromJSON(jsonString: string): SafeParseResult<OpenAIResponseCustomToolCallOutput, SDKValidationError>;
//# sourceMappingURL=openairesponsecustomtoolcalloutput.d.ts.map