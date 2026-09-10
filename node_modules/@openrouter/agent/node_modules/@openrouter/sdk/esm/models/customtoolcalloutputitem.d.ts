import * as z from "zod/v4";
import { ClosedEnum, OpenEnum } from "../types/enums.js";
import { InputFile, InputFile$Outbound } from "./inputfile.js";
import { InputText, InputText$Outbound } from "./inputtext.js";
export declare const CustomToolCallOutputItemDetail: {
    readonly Auto: "auto";
    readonly High: "high";
    readonly Low: "low";
    readonly Original: "original";
};
export type CustomToolCallOutputItemDetail = OpenEnum<typeof CustomToolCallOutputItemDetail>;
/**
 * Image input content item
 */
export type CustomToolCallOutputItemOutputInputImage = {
    detail: CustomToolCallOutputItemDetail;
    imageUrl?: string | null | undefined;
    type: "input_image";
};
export type CustomToolCallOutputItemOutputUnion1 = InputText | CustomToolCallOutputItemOutputInputImage | InputFile;
export type CustomToolCallOutputItemOutputUnion2 = string | Array<InputText | CustomToolCallOutputItemOutputInputImage | InputFile>;
export declare const CustomToolCallOutputItemTypeCustomToolCallOutput: {
    readonly CustomToolCallOutput: "custom_tool_call_output";
};
export type CustomToolCallOutputItemTypeCustomToolCallOutput = ClosedEnum<typeof CustomToolCallOutputItemTypeCustomToolCallOutput>;
/**
 * The output from a custom (freeform-grammar) tool call execution. Mirrors `function_call_output` but is matched to a `custom_tool_call` rather than a `function_call`.
 */
export type CustomToolCallOutputItem = {
    callId: string;
    id?: string | undefined;
    output: string | Array<InputText | CustomToolCallOutputItemOutputInputImage | InputFile>;
    type: CustomToolCallOutputItemTypeCustomToolCallOutput;
};
/** @internal */
export declare const CustomToolCallOutputItemDetail$outboundSchema: z.ZodType<string, CustomToolCallOutputItemDetail>;
/** @internal */
export type CustomToolCallOutputItemOutputInputImage$Outbound = {
    detail: string;
    image_url?: string | null | undefined;
    type: "input_image";
};
/** @internal */
export declare const CustomToolCallOutputItemOutputInputImage$outboundSchema: z.ZodType<CustomToolCallOutputItemOutputInputImage$Outbound, CustomToolCallOutputItemOutputInputImage>;
export declare function customToolCallOutputItemOutputInputImageToJSON(customToolCallOutputItemOutputInputImage: CustomToolCallOutputItemOutputInputImage): string;
/** @internal */
export type CustomToolCallOutputItemOutputUnion1$Outbound = InputText$Outbound | CustomToolCallOutputItemOutputInputImage$Outbound | InputFile$Outbound;
/** @internal */
export declare const CustomToolCallOutputItemOutputUnion1$outboundSchema: z.ZodType<CustomToolCallOutputItemOutputUnion1$Outbound, CustomToolCallOutputItemOutputUnion1>;
export declare function customToolCallOutputItemOutputUnion1ToJSON(customToolCallOutputItemOutputUnion1: CustomToolCallOutputItemOutputUnion1): string;
/** @internal */
export type CustomToolCallOutputItemOutputUnion2$Outbound = string | Array<InputText$Outbound | CustomToolCallOutputItemOutputInputImage$Outbound | InputFile$Outbound>;
/** @internal */
export declare const CustomToolCallOutputItemOutputUnion2$outboundSchema: z.ZodType<CustomToolCallOutputItemOutputUnion2$Outbound, CustomToolCallOutputItemOutputUnion2>;
export declare function customToolCallOutputItemOutputUnion2ToJSON(customToolCallOutputItemOutputUnion2: CustomToolCallOutputItemOutputUnion2): string;
/** @internal */
export declare const CustomToolCallOutputItemTypeCustomToolCallOutput$outboundSchema: z.ZodEnum<typeof CustomToolCallOutputItemTypeCustomToolCallOutput>;
/** @internal */
export type CustomToolCallOutputItem$Outbound = {
    call_id: string;
    id?: string | undefined;
    output: string | Array<InputText$Outbound | CustomToolCallOutputItemOutputInputImage$Outbound | InputFile$Outbound>;
    type: string;
};
/** @internal */
export declare const CustomToolCallOutputItem$outboundSchema: z.ZodType<CustomToolCallOutputItem$Outbound, CustomToolCallOutputItem>;
export declare function customToolCallOutputItemToJSON(customToolCallOutputItem: CustomToolCallOutputItem): string;
//# sourceMappingURL=customtoolcalloutputitem.d.ts.map