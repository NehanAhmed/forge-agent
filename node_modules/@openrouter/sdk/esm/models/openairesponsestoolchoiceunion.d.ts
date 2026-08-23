import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ToolChoiceAllowed, ToolChoiceAllowed$Outbound } from "./toolchoiceallowed.js";
export declare const OpenAIResponsesToolChoiceTypeShell: {
    readonly Shell: "shell";
};
export type OpenAIResponsesToolChoiceTypeShell = ClosedEnum<typeof OpenAIResponsesToolChoiceTypeShell>;
export type OpenAIResponsesToolChoiceShell = {
    type: OpenAIResponsesToolChoiceTypeShell;
};
export declare const OpenAIResponsesToolChoiceTypeApplyPatch: {
    readonly ApplyPatch: "apply_patch";
};
export type OpenAIResponsesToolChoiceTypeApplyPatch = ClosedEnum<typeof OpenAIResponsesToolChoiceTypeApplyPatch>;
export type OpenAIResponsesToolChoiceApplyPatch = {
    type: OpenAIResponsesToolChoiceTypeApplyPatch;
};
export declare const OpenAIResponsesToolChoiceTypeWebSearchPreview: {
    readonly WebSearchPreview: "web_search_preview";
};
export type OpenAIResponsesToolChoiceTypeWebSearchPreview = ClosedEnum<typeof OpenAIResponsesToolChoiceTypeWebSearchPreview>;
export declare const OpenAIResponsesToolChoiceTypeWebSearchPreview20250311: {
    readonly WebSearchPreview20250311: "web_search_preview_2025_03_11";
};
export type OpenAIResponsesToolChoiceTypeWebSearchPreview20250311 = ClosedEnum<typeof OpenAIResponsesToolChoiceTypeWebSearchPreview20250311>;
export type Type = OpenAIResponsesToolChoiceTypeWebSearchPreview20250311 | OpenAIResponsesToolChoiceTypeWebSearchPreview;
export type OpenAIResponsesToolChoice = {
    type: OpenAIResponsesToolChoiceTypeWebSearchPreview20250311 | OpenAIResponsesToolChoiceTypeWebSearchPreview;
};
export declare const OpenAIResponsesToolChoiceTypeFunction: {
    readonly Function: "function";
};
export type OpenAIResponsesToolChoiceTypeFunction = ClosedEnum<typeof OpenAIResponsesToolChoiceTypeFunction>;
export type OpenAIResponsesToolChoiceFunction = {
    name: string;
    type: OpenAIResponsesToolChoiceTypeFunction;
};
export declare const OpenAIResponsesToolChoiceRequired: {
    readonly Required: "required";
};
export type OpenAIResponsesToolChoiceRequired = ClosedEnum<typeof OpenAIResponsesToolChoiceRequired>;
export declare const OpenAIResponsesToolChoiceNone: {
    readonly None: "none";
};
export type OpenAIResponsesToolChoiceNone = ClosedEnum<typeof OpenAIResponsesToolChoiceNone>;
export declare const OpenAIResponsesToolChoiceAuto: {
    readonly Auto: "auto";
};
export type OpenAIResponsesToolChoiceAuto = ClosedEnum<typeof OpenAIResponsesToolChoiceAuto>;
export type OpenAIResponsesToolChoiceUnion = ToolChoiceAllowed | OpenAIResponsesToolChoiceFunction | OpenAIResponsesToolChoice | OpenAIResponsesToolChoiceApplyPatch | OpenAIResponsesToolChoiceShell | OpenAIResponsesToolChoiceAuto | OpenAIResponsesToolChoiceNone | OpenAIResponsesToolChoiceRequired;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeShell$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeShell>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeShell$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeShell>;
/** @internal */
export declare const OpenAIResponsesToolChoiceShell$inboundSchema: z.ZodType<OpenAIResponsesToolChoiceShell, unknown>;
/** @internal */
export type OpenAIResponsesToolChoiceShell$Outbound = {
    type: string;
};
/** @internal */
export declare const OpenAIResponsesToolChoiceShell$outboundSchema: z.ZodType<OpenAIResponsesToolChoiceShell$Outbound, OpenAIResponsesToolChoiceShell>;
export declare function openAIResponsesToolChoiceShellToJSON(openAIResponsesToolChoiceShell: OpenAIResponsesToolChoiceShell): string;
export declare function openAIResponsesToolChoiceShellFromJSON(jsonString: string): SafeParseResult<OpenAIResponsesToolChoiceShell, SDKValidationError>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeApplyPatch$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeApplyPatch>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeApplyPatch$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeApplyPatch>;
/** @internal */
export declare const OpenAIResponsesToolChoiceApplyPatch$inboundSchema: z.ZodType<OpenAIResponsesToolChoiceApplyPatch, unknown>;
/** @internal */
export type OpenAIResponsesToolChoiceApplyPatch$Outbound = {
    type: string;
};
/** @internal */
export declare const OpenAIResponsesToolChoiceApplyPatch$outboundSchema: z.ZodType<OpenAIResponsesToolChoiceApplyPatch$Outbound, OpenAIResponsesToolChoiceApplyPatch>;
export declare function openAIResponsesToolChoiceApplyPatchToJSON(openAIResponsesToolChoiceApplyPatch: OpenAIResponsesToolChoiceApplyPatch): string;
export declare function openAIResponsesToolChoiceApplyPatchFromJSON(jsonString: string): SafeParseResult<OpenAIResponsesToolChoiceApplyPatch, SDKValidationError>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeWebSearchPreview$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeWebSearchPreview>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeWebSearchPreview$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeWebSearchPreview>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeWebSearchPreview20250311$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeWebSearchPreview20250311>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeWebSearchPreview20250311$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeWebSearchPreview20250311>;
/** @internal */
export declare const Type$inboundSchema: z.ZodType<Type, unknown>;
/** @internal */
export type Type$Outbound = string | string;
/** @internal */
export declare const Type$outboundSchema: z.ZodType<Type$Outbound, Type>;
export declare function typeToJSON(type: Type): string;
export declare function typeFromJSON(jsonString: string): SafeParseResult<Type, SDKValidationError>;
/** @internal */
export declare const OpenAIResponsesToolChoice$inboundSchema: z.ZodType<OpenAIResponsesToolChoice, unknown>;
/** @internal */
export type OpenAIResponsesToolChoice$Outbound = {
    type: string | string;
};
/** @internal */
export declare const OpenAIResponsesToolChoice$outboundSchema: z.ZodType<OpenAIResponsesToolChoice$Outbound, OpenAIResponsesToolChoice>;
export declare function openAIResponsesToolChoiceToJSON(openAIResponsesToolChoice: OpenAIResponsesToolChoice): string;
export declare function openAIResponsesToolChoiceFromJSON(jsonString: string): SafeParseResult<OpenAIResponsesToolChoice, SDKValidationError>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeFunction$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeFunction>;
/** @internal */
export declare const OpenAIResponsesToolChoiceTypeFunction$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceTypeFunction>;
/** @internal */
export declare const OpenAIResponsesToolChoiceFunction$inboundSchema: z.ZodType<OpenAIResponsesToolChoiceFunction, unknown>;
/** @internal */
export type OpenAIResponsesToolChoiceFunction$Outbound = {
    name: string;
    type: string;
};
/** @internal */
export declare const OpenAIResponsesToolChoiceFunction$outboundSchema: z.ZodType<OpenAIResponsesToolChoiceFunction$Outbound, OpenAIResponsesToolChoiceFunction>;
export declare function openAIResponsesToolChoiceFunctionToJSON(openAIResponsesToolChoiceFunction: OpenAIResponsesToolChoiceFunction): string;
export declare function openAIResponsesToolChoiceFunctionFromJSON(jsonString: string): SafeParseResult<OpenAIResponsesToolChoiceFunction, SDKValidationError>;
/** @internal */
export declare const OpenAIResponsesToolChoiceRequired$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceRequired>;
/** @internal */
export declare const OpenAIResponsesToolChoiceRequired$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceRequired>;
/** @internal */
export declare const OpenAIResponsesToolChoiceNone$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceNone>;
/** @internal */
export declare const OpenAIResponsesToolChoiceNone$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceNone>;
/** @internal */
export declare const OpenAIResponsesToolChoiceAuto$inboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceAuto>;
/** @internal */
export declare const OpenAIResponsesToolChoiceAuto$outboundSchema: z.ZodEnum<typeof OpenAIResponsesToolChoiceAuto>;
/** @internal */
export declare const OpenAIResponsesToolChoiceUnion$inboundSchema: z.ZodType<OpenAIResponsesToolChoiceUnion, unknown>;
/** @internal */
export type OpenAIResponsesToolChoiceUnion$Outbound = ToolChoiceAllowed$Outbound | OpenAIResponsesToolChoiceFunction$Outbound | OpenAIResponsesToolChoice$Outbound | OpenAIResponsesToolChoiceApplyPatch$Outbound | OpenAIResponsesToolChoiceShell$Outbound | string | string | string;
/** @internal */
export declare const OpenAIResponsesToolChoiceUnion$outboundSchema: z.ZodType<OpenAIResponsesToolChoiceUnion$Outbound, OpenAIResponsesToolChoiceUnion>;
export declare function openAIResponsesToolChoiceUnionToJSON(openAIResponsesToolChoiceUnion: OpenAIResponsesToolChoiceUnion): string;
export declare function openAIResponsesToolChoiceUnionFromJSON(jsonString: string): SafeParseResult<OpenAIResponsesToolChoiceUnion, SDKValidationError>;
//# sourceMappingURL=openairesponsestoolchoiceunion.d.ts.map