import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type Stance = {
    model: string;
    stance: string;
};
export type Contradiction = {
    stances: Array<Stance>;
    topic: string;
};
export type PartialCoverage = {
    models: Array<string>;
    point: string;
};
export type UniqueInsight = {
    insight: string;
    model: string;
};
/**
 * Structured analysis produced by the fusion judge model.
 */
export type FusionAnalysisResult = {
    blindSpots: Array<string>;
    consensus: Array<string>;
    contradictions: Array<Contradiction>;
    partialCoverage: Array<PartialCoverage>;
    uniqueInsights: Array<UniqueInsight>;
};
/** @internal */
export declare const Stance$inboundSchema: z.ZodType<Stance, unknown>;
/** @internal */
export type Stance$Outbound = {
    model: string;
    stance: string;
};
/** @internal */
export declare const Stance$outboundSchema: z.ZodType<Stance$Outbound, Stance>;
export declare function stanceToJSON(stance: Stance): string;
export declare function stanceFromJSON(jsonString: string): SafeParseResult<Stance, SDKValidationError>;
/** @internal */
export declare const Contradiction$inboundSchema: z.ZodType<Contradiction, unknown>;
/** @internal */
export type Contradiction$Outbound = {
    stances: Array<Stance$Outbound>;
    topic: string;
};
/** @internal */
export declare const Contradiction$outboundSchema: z.ZodType<Contradiction$Outbound, Contradiction>;
export declare function contradictionToJSON(contradiction: Contradiction): string;
export declare function contradictionFromJSON(jsonString: string): SafeParseResult<Contradiction, SDKValidationError>;
/** @internal */
export declare const PartialCoverage$inboundSchema: z.ZodType<PartialCoverage, unknown>;
/** @internal */
export type PartialCoverage$Outbound = {
    models: Array<string>;
    point: string;
};
/** @internal */
export declare const PartialCoverage$outboundSchema: z.ZodType<PartialCoverage$Outbound, PartialCoverage>;
export declare function partialCoverageToJSON(partialCoverage: PartialCoverage): string;
export declare function partialCoverageFromJSON(jsonString: string): SafeParseResult<PartialCoverage, SDKValidationError>;
/** @internal */
export declare const UniqueInsight$inboundSchema: z.ZodType<UniqueInsight, unknown>;
/** @internal */
export type UniqueInsight$Outbound = {
    insight: string;
    model: string;
};
/** @internal */
export declare const UniqueInsight$outboundSchema: z.ZodType<UniqueInsight$Outbound, UniqueInsight>;
export declare function uniqueInsightToJSON(uniqueInsight: UniqueInsight): string;
export declare function uniqueInsightFromJSON(jsonString: string): SafeParseResult<UniqueInsight, SDKValidationError>;
/** @internal */
export declare const FusionAnalysisResult$inboundSchema: z.ZodType<FusionAnalysisResult, unknown>;
/** @internal */
export type FusionAnalysisResult$Outbound = {
    blind_spots: Array<string>;
    consensus: Array<string>;
    contradictions: Array<Contradiction$Outbound>;
    partial_coverage: Array<PartialCoverage$Outbound>;
    unique_insights: Array<UniqueInsight$Outbound>;
};
/** @internal */
export declare const FusionAnalysisResult$outboundSchema: z.ZodType<FusionAnalysisResult$Outbound, FusionAnalysisResult>;
export declare function fusionAnalysisResultToJSON(fusionAnalysisResult: FusionAnalysisResult): string;
export declare function fusionAnalysisResultFromJSON(jsonString: string): SafeParseResult<FusionAnalysisResult, SDKValidationError>;
//# sourceMappingURL=fusionanalysisresult.d.ts.map