import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { UnifiedBenchmarkPricing } from "./unifiedbenchmarkpricing.js";
/**
 * Placement distribution from tournament matches.
 */
export type TournamentStats = {
    firstPlace: number | null;
    fourthPlace: number | null;
    secondPlace: number | null;
    thirdPlace: number | null;
    total: number | null;
};
export type UnifiedBenchmarksDAItem = {
    /**
     * Arena this ranking belongs to.
     */
    arena: string;
    /**
     * Average generation time in milliseconds.
     */
    avgGenerationTimeMs: number | null;
    /**
     * Category within the arena.
     */
    category: string;
    /**
     * Human-readable model name from Design Arena.
     */
    displayName: string;
    /**
     * ELO rating from head-to-head arena battles.
     */
    elo: number;
    /**
     * Stable OpenRouter model identifier when mapped; otherwise the upstream Design Arena model id.
     */
    modelPermaslug: string;
    /**
     * OpenRouter pricing per token for this model. Null if pricing is unavailable.
     */
    pricing: UnifiedBenchmarkPricing | null;
    /**
     * Benchmark source discriminator.
     */
    source: "design-arena";
    /**
     * Placement distribution from tournament matches.
     */
    tournamentStats: TournamentStats;
    /**
     * Win rate as a percentage (0–100).
     */
    winRate: number;
};
/** @internal */
export declare const TournamentStats$inboundSchema: z.ZodType<TournamentStats, unknown>;
export declare function tournamentStatsFromJSON(jsonString: string): SafeParseResult<TournamentStats, SDKValidationError>;
/** @internal */
export declare const UnifiedBenchmarksDAItem$inboundSchema: z.ZodType<UnifiedBenchmarksDAItem, unknown>;
export declare function unifiedBenchmarksDAItemFromJSON(jsonString: string): SafeParseResult<UnifiedBenchmarksDAItem, SDKValidationError>;
//# sourceMappingURL=unifiedbenchmarksdaitem.d.ts.map