import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type AppRankingsItem = {
    /**
     * Stable numeric identifier of the app on OpenRouter.
     */
    appId: number;
    /**
     * Public display name of the app.
     */
    appName: string;
    /**
     * 1-based position of the app within this response, per the requested `sort`.
     */
    rank: number;
    /**
     * Number of requests attributed to the app inside the date window.
     */
    totalRequests: number;
    /**
     * Sum of `prompt_tokens + completion_tokens` attributed to the app inside the date window, returned as a decimal string so 64-bit values are not truncated.
     */
    totalTokens: string;
};
/** @internal */
export declare const AppRankingsItem$inboundSchema: z.ZodType<AppRankingsItem, unknown>;
export declare function appRankingsItemFromJSON(jsonString: string): SafeParseResult<AppRankingsItem, SDKValidationError>;
//# sourceMappingURL=apprankingsitem.d.ts.map