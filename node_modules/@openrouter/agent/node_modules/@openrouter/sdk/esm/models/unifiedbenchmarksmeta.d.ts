import * as z from "zod/v4";
import { ClosedEnum, OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * The source filter applied, or null when all sources are returned.
 */
export declare const SourceEnum: {
    readonly ArtificialAnalysis: "artificial-analysis";
    readonly DesignArena: "design-arena";
};
/**
 * The source filter applied, or null when all sources are returned.
 */
export type SourceEnum = OpenEnum<typeof SourceEnum>;
/**
 * Dataset version.
 */
export declare const UnifiedBenchmarksMetaVersion: {
    readonly V1: "v1";
};
/**
 * Dataset version.
 */
export type UnifiedBenchmarksMetaVersion = ClosedEnum<typeof UnifiedBenchmarksMetaVersion>;
export type UnifiedBenchmarksMeta = {
    /**
     * ISO-8601 timestamp of when this data was last updated.
     */
    asOf: string;
    /**
     * Required attribution when republishing this data, or null when results span multiple sources (attribute each item individually by its `source` discriminator).
     */
    citation: string | null;
    /**
     * Number of unique models in the response.
     */
    modelCount: number;
    /**
     * The source filter applied, or null when all sources are returned.
     */
    source: SourceEnum | null;
    /**
     * URL of the upstream data source, or null when results span multiple sources.
     */
    sourceUrl: string | null;
    /**
     * The task_type filter applied, or null if showing all.
     */
    taskType: string | null;
    /**
     * Dataset version.
     */
    version: UnifiedBenchmarksMetaVersion;
};
/** @internal */
export declare const SourceEnum$inboundSchema: z.ZodType<SourceEnum, unknown>;
/** @internal */
export declare const UnifiedBenchmarksMetaVersion$inboundSchema: z.ZodEnum<typeof UnifiedBenchmarksMetaVersion>;
/** @internal */
export declare const UnifiedBenchmarksMeta$inboundSchema: z.ZodType<UnifiedBenchmarksMeta, unknown>;
export declare function unifiedBenchmarksMetaFromJSON(jsonString: string): SafeParseResult<UnifiedBenchmarksMeta, SDKValidationError>;
//# sourceMappingURL=unifiedbenchmarksmeta.d.ts.map