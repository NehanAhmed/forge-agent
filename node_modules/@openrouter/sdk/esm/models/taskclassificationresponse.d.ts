import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { TaskClassificationItem } from "./taskclassificationitem.js";
import { TaskClassificationMacroCategory } from "./taskclassificationmacrocategory.js";
export type TaskClassificationResponseData = {
    /**
     * UTC date (YYYY-MM-DD) of the window upper bound (yesterday). Data is exclusive of the current incomplete UTC day. This is the expected latest date in the snapshot; it does not confirm data presence for that date.
     */
    asOf: string;
    /**
     * Per-task classification market-share data, sorted by usage_share descending.
     */
    classifications: Array<TaskClassificationItem>;
    /**
     * Aggregate market-share data per macro-category (code, data, agent, general).
     */
    macroCategories: Array<TaskClassificationMacroCategory>;
    /**
     * Number of trailing days covered by this snapshot.
     */
    windowDays: number;
};
export type TaskClassificationResponse = {
    data: TaskClassificationResponseData;
};
/** @internal */
export declare const TaskClassificationResponseData$inboundSchema: z.ZodType<TaskClassificationResponseData, unknown>;
export declare function taskClassificationResponseDataFromJSON(jsonString: string): SafeParseResult<TaskClassificationResponseData, SDKValidationError>;
/** @internal */
export declare const TaskClassificationResponse$inboundSchema: z.ZodType<TaskClassificationResponse, unknown>;
export declare function taskClassificationResponseFromJSON(jsonString: string): SafeParseResult<TaskClassificationResponse, SDKValidationError>;
//# sourceMappingURL=taskclassificationresponse.d.ts.map