import * as z from "zod/v4";
import { OpenEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
export type GetAnalyticsMetaGlobals = {
    /**
     * The app identifier should be your app's URL and is used as the primary identifier for rankings.
     *
     * @remarks
     * This is used to track API usage per application.
     */
    httpReferer?: string | undefined;
    /**
     * The app display name allows you to customize how your app appears in OpenRouter's dashboard.
     *
     * @remarks
     */
    appTitle?: string | undefined;
    /**
     * Comma-separated list of app categories (e.g. "cli-agent,cloud-agent"). Used for marketplace rankings.
     *
     * @remarks
     */
    appCategories?: string | undefined;
};
export type GetAnalyticsMetaRequest = {
    /**
     * The app identifier should be your app's URL and is used as the primary identifier for rankings.
     *
     * @remarks
     * This is used to track API usage per application.
     */
    httpReferer?: string | undefined;
    /**
     * The app display name allows you to customize how your app appears in OpenRouter's dashboard.
     *
     * @remarks
     */
    appTitle?: string | undefined;
    /**
     * Comma-separated list of app categories (e.g. "cli-agent,cloud-agent"). Used for marketplace rankings.
     *
     * @remarks
     */
    appCategories?: string | undefined;
};
export type Dimension = {
    /**
     * Human-readable label
     */
    displayLabel: string;
    /**
     * Dimension identifier used in query requests
     */
    name: string;
};
/**
 * Granularity identifier
 */
export declare const GranularityName: {
    readonly Minute: "minute";
    readonly Hour: "hour";
    readonly Day: "day";
    readonly Week: "week";
    readonly Month: "month";
};
/**
 * Granularity identifier
 */
export type GranularityName = OpenEnum<typeof GranularityName>;
export type Granularity = {
    /**
     * Human-readable label
     */
    displayLabel: string;
    /**
     * Granularity identifier
     */
    name: GranularityName;
};
/**
 * How this metric value should be formatted for display (e.g. percent → multiply by 100 and append %, currency → prefix with $)
 */
export declare const DisplayFormat: {
    readonly Number: "number";
    readonly Currency: "currency";
    readonly Percent: "percent";
    readonly Latency: "latency";
    readonly Throughput: "throughput";
};
/**
 * How this metric value should be formatted for display (e.g. percent → multiply by 100 and append %, currency → prefix with $)
 */
export type DisplayFormat = OpenEnum<typeof DisplayFormat>;
export type Metric = {
    /**
     * How this metric value should be formatted for display (e.g. percent → multiply by 100 and append %, currency → prefix with $)
     */
    displayFormat: DisplayFormat;
    /**
     * Human-readable label
     */
    displayLabel: string;
    /**
     * Whether this metric is a rate/ratio (averaged, not summed)
     */
    isRate: boolean;
    /**
     * Metric identifier used in query requests
     */
    name: string;
};
/**
 * Operator identifier used in filter definitions
 */
export declare const OperatorName: {
    readonly Eq: "eq";
    readonly Neq: "neq";
    readonly In: "in";
    readonly NotIn: "not_in";
    readonly Gt: "gt";
    readonly Gte: "gte";
    readonly Lt: "lt";
    readonly Lte: "lte";
};
/**
 * Operator identifier used in filter definitions
 */
export type OperatorName = OpenEnum<typeof OperatorName>;
/**
 * Whether the operator expects a single value or an array
 */
export declare const ValueType: {
    readonly Scalar: "scalar";
    readonly Array: "array";
};
/**
 * Whether the operator expects a single value or an array
 */
export type ValueType = OpenEnum<typeof ValueType>;
export type Operator = {
    /**
     * Operator identifier used in filter definitions
     */
    name: OperatorName;
    /**
     * Whether the operator expects a single value or an array
     */
    valueType: ValueType;
};
export type GetAnalyticsMetaData = {
    dimensions: Array<Dimension>;
    granularities: Array<Granularity>;
    metrics: Array<Metric>;
    operators: Array<Operator>;
};
/**
 * Returns analytics query metadata
 */
export type GetAnalyticsMetaResponse = {
    data: GetAnalyticsMetaData;
};
/** @internal */
export type GetAnalyticsMetaRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
};
/** @internal */
export declare const GetAnalyticsMetaRequest$outboundSchema: z.ZodType<GetAnalyticsMetaRequest$Outbound, GetAnalyticsMetaRequest>;
export declare function getAnalyticsMetaRequestToJSON(getAnalyticsMetaRequest: GetAnalyticsMetaRequest): string;
/** @internal */
export declare const Dimension$inboundSchema: z.ZodType<Dimension, unknown>;
export declare function dimensionFromJSON(jsonString: string): SafeParseResult<Dimension, SDKValidationError>;
/** @internal */
export declare const GranularityName$inboundSchema: z.ZodType<GranularityName, unknown>;
/** @internal */
export declare const Granularity$inboundSchema: z.ZodType<Granularity, unknown>;
export declare function granularityFromJSON(jsonString: string): SafeParseResult<Granularity, SDKValidationError>;
/** @internal */
export declare const DisplayFormat$inboundSchema: z.ZodType<DisplayFormat, unknown>;
/** @internal */
export declare const Metric$inboundSchema: z.ZodType<Metric, unknown>;
export declare function metricFromJSON(jsonString: string): SafeParseResult<Metric, SDKValidationError>;
/** @internal */
export declare const OperatorName$inboundSchema: z.ZodType<OperatorName, unknown>;
/** @internal */
export declare const ValueType$inboundSchema: z.ZodType<ValueType, unknown>;
/** @internal */
export declare const Operator$inboundSchema: z.ZodType<Operator, unknown>;
export declare function operatorFromJSON(jsonString: string): SafeParseResult<Operator, SDKValidationError>;
/** @internal */
export declare const GetAnalyticsMetaData$inboundSchema: z.ZodType<GetAnalyticsMetaData, unknown>;
export declare function getAnalyticsMetaDataFromJSON(jsonString: string): SafeParseResult<GetAnalyticsMetaData, SDKValidationError>;
/** @internal */
export declare const GetAnalyticsMetaResponse$inboundSchema: z.ZodType<GetAnalyticsMetaResponse, unknown>;
export declare function getAnalyticsMetaResponseFromJSON(jsonString: string): SafeParseResult<GetAnalyticsMetaResponse, SDKValidationError>;
//# sourceMappingURL=getanalyticsmeta.d.ts.map