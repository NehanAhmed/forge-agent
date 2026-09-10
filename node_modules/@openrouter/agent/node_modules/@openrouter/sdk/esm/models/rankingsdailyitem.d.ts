import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type RankingsDailyItem = {
    /**
     * UTC calendar date the row is aggregated over (YYYY-MM-DD).
     */
    date: string;
    /**
     * Model variant permaslug (e.g. `openai/gpt-4o-2024-05-13`, `openai/gpt-4o-2024-05-13:free`). Non-default variants include a `:variant` suffix and are ranked as their own entry. The reserved value `other` denotes the aggregated row covering every model outside the daily top 50 for that date — always sorted last within its date.
     */
    modelPermaslug: string;
    /**
     * Sum of `prompt_tokens + completion_tokens` for the day, returned as a decimal string so 64-bit values are not truncated.
     */
    totalTokens: string;
};
/** @internal */
export declare const RankingsDailyItem$inboundSchema: z.ZodType<RankingsDailyItem, unknown>;
export declare function rankingsDailyItemFromJSON(jsonString: string): SafeParseResult<RankingsDailyItem, SDKValidationError>;
//# sourceMappingURL=rankingsdailyitem.d.ts.map