import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { AppRankingsItem } from "./apprankingsitem.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { RankingsDailyMeta } from "./rankingsdailymeta.js";
export type AppRankingsResponse = {
    /**
     * Apps ranked per the requested `sort`, re-numbered 1..N after category filtering. `popular` sorts by `total_tokens` descending; `trending` sorts by absolute excess token growth descending and may return fewer than `limit` rows when few apps are growing.
     */
    data: Array<AppRankingsItem>;
    meta: RankingsDailyMeta;
};
/** @internal */
export declare const AppRankingsResponse$inboundSchema: z.ZodType<AppRankingsResponse, unknown>;
export declare function appRankingsResponseFromJSON(jsonString: string): SafeParseResult<AppRankingsResponse, SDKValidationError>;
//# sourceMappingURL=apprankingsresponse.d.ts.map