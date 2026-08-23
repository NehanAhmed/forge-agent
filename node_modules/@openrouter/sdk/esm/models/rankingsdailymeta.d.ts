import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Dataset version. Field names and grain are stable for the life of `v1`.
 */
export declare const RankingsDailyMetaVersion: {
    readonly V1: "v1";
};
/**
 * Dataset version. Field names and grain are stable for the life of `v1`.
 */
export type RankingsDailyMetaVersion = ClosedEnum<typeof RankingsDailyMetaVersion>;
export type RankingsDailyMeta = {
    /**
     * ISO-8601 timestamp of when the response was generated. Reflects data-freshness because the underlying materialized view continuously ingests upstream events.
     */
    asOf: string;
    /**
     * Resolved end of the date window (UTC, inclusive).
     */
    endDate: string;
    /**
     * Resolved start of the date window (UTC, inclusive).
     */
    startDate: string;
    /**
     * Dataset version. Field names and grain are stable for the life of `v1`.
     */
    version: RankingsDailyMetaVersion;
};
/** @internal */
export declare const RankingsDailyMetaVersion$inboundSchema: z.ZodEnum<typeof RankingsDailyMetaVersion>;
/** @internal */
export declare const RankingsDailyMeta$inboundSchema: z.ZodType<RankingsDailyMeta, unknown>;
export declare function rankingsDailyMetaFromJSON(jsonString: string): SafeParseResult<RankingsDailyMeta, SDKValidationError>;
//# sourceMappingURL=rankingsdailymeta.d.ts.map