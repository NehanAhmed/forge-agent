import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { RankingsDailyItem } from "./rankingsdailyitem.js";
import { RankingsDailyMeta } from "./rankingsdailymeta.js";
export type RankingsDailyResponse = {
    /**
     * Up to 51 rows per day — the top 50 public models by `total_tokens` for each UTC calendar date in the window, plus one aggregated `other` row summing every model outside that top 50 (omitted when the long tail is empty). Rows are sorted by `date` ascending, then by `total_tokens` descending, with `other` pinned last within its date. Ties between real models break alphabetically on `model_permaslug` so the order is stable across requests.
     */
    data: Array<RankingsDailyItem>;
    meta: RankingsDailyMeta;
};
/** @internal */
export declare const RankingsDailyResponse$inboundSchema: z.ZodType<RankingsDailyResponse, unknown>;
export declare function rankingsDailyResponseFromJSON(jsonString: string): SafeParseResult<RankingsDailyResponse, SDKValidationError>;
//# sourceMappingURL=rankingsdailyresponse.d.ts.map