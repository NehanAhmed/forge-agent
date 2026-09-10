import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { FusionAnalysisResult, FusionAnalysisResult$Outbound } from "./fusionanalysisresult.js";
import { FusionSource, FusionSource$Outbound } from "./fusionsource.js";
import { ToolCallStatus } from "./toolcallstatus.js";
export type FailedModel = {
    /**
     * Error message describing why the model failed.
     */
    error: string;
    /**
     * Slug of the analysis model that failed.
     */
    model: string;
    /**
     * HTTP status code from the upstream response, when available (e.g. 402, 429).
     */
    statusCode?: number | undefined;
};
export type ResponseT = {
    content?: string | undefined;
    model: string;
};
export declare const OutputFusionServerToolItemType: {
    readonly OpenrouterFusion: "openrouter:fusion";
};
export type OutputFusionServerToolItemType = ClosedEnum<typeof OutputFusionServerToolItemType>;
/**
 * An openrouter:fusion server tool output item
 */
export type OutputFusionServerToolItem = {
    /**
     * Structured analysis produced by the fusion judge model.
     */
    analysis?: FusionAnalysisResult | undefined;
    /**
     * Error message when the fusion run did not produce an analysis result.
     */
    error?: string | undefined;
    /**
     * Models that were requested as part of the analysis panel but did not produce a response. Present when at least one requested analysis model failed. The fusion result is still usable but was produced from a degraded panel.
     */
    failedModels?: Array<FailedModel> | undefined;
    /**
     * Typed failure reason when the fusion run failed. Possible values include: all_panels_failed, insufficient_credits, rate_limited, judge_not_valid_json, judge_schema_mismatch, judge_upstream_error, judge_empty_completion.
     */
    failureReason?: string | undefined;
    id?: string | undefined;
    /**
     * Analysis models that produced a response in this fusion run, with each model's full panel content.
     */
    responses?: Array<ResponseT> | undefined;
    /**
     * Web pages the analysis panels and judge retrieved via web search during this fusion run, deduplicated by URL across the whole run. Present when at least one model cited a source.
     */
    sources?: Array<FusionSource> | undefined;
    status: ToolCallStatus;
    type: OutputFusionServerToolItemType;
};
/** @internal */
export declare const FailedModel$inboundSchema: z.ZodType<FailedModel, unknown>;
/** @internal */
export type FailedModel$Outbound = {
    error: string;
    model: string;
    status_code?: number | undefined;
};
/** @internal */
export declare const FailedModel$outboundSchema: z.ZodType<FailedModel$Outbound, FailedModel>;
export declare function failedModelToJSON(failedModel: FailedModel): string;
export declare function failedModelFromJSON(jsonString: string): SafeParseResult<FailedModel, SDKValidationError>;
/** @internal */
export declare const ResponseT$inboundSchema: z.ZodType<ResponseT, unknown>;
/** @internal */
export type ResponseT$Outbound = {
    content?: string | undefined;
    model: string;
};
/** @internal */
export declare const ResponseT$outboundSchema: z.ZodType<ResponseT$Outbound, ResponseT>;
export declare function responseToJSON(responseT: ResponseT): string;
export declare function responseFromJSON(jsonString: string): SafeParseResult<ResponseT, SDKValidationError>;
/** @internal */
export declare const OutputFusionServerToolItemType$inboundSchema: z.ZodEnum<typeof OutputFusionServerToolItemType>;
/** @internal */
export declare const OutputFusionServerToolItemType$outboundSchema: z.ZodEnum<typeof OutputFusionServerToolItemType>;
/** @internal */
export declare const OutputFusionServerToolItem$inboundSchema: z.ZodType<OutputFusionServerToolItem, unknown>;
/** @internal */
export type OutputFusionServerToolItem$Outbound = {
    analysis?: FusionAnalysisResult$Outbound | undefined;
    error?: string | undefined;
    failed_models?: Array<FailedModel$Outbound> | undefined;
    failure_reason?: string | undefined;
    id?: string | undefined;
    responses?: Array<ResponseT$Outbound> | undefined;
    sources?: Array<FusionSource$Outbound> | undefined;
    status: string;
    type: string;
};
/** @internal */
export declare const OutputFusionServerToolItem$outboundSchema: z.ZodType<OutputFusionServerToolItem$Outbound, OutputFusionServerToolItem>;
export declare function outputFusionServerToolItemToJSON(outputFusionServerToolItem: OutputFusionServerToolItem): string;
export declare function outputFusionServerToolItemFromJSON(jsonString: string): SafeParseResult<OutputFusionServerToolItem, SDKValidationError>;
//# sourceMappingURL=outputfusionservertoolitem.d.ts.map