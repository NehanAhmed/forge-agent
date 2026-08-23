import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { TaskClassificationModel } from "./taskclassificationmodel.js";
export type TaskClassificationItem = {
    /**
     * Fraction of this classification's token volume within its macro-category (0–1). Sums to 1 across all classifications sharing the same `macro_category`.
     */
    categoryTokenShare: number;
    /**
     * Fraction of this classification's usage within its macro-category (0–1). Sums to 1 across all classifications sharing the same `macro_category`.
     */
    categoryUsageShare: number;
    /**
     * Human-readable label for the classification.
     */
    displayName: string;
    /**
     * Coarse grouping derived from the tag prefix: `code`, `data`, `agent`, or `general`.
     */
    macroCategory: string;
    /**
     * Top models for this classification by request volume, sorted descending. Each entry reports the model's share of this classification's requests and tokens.
     */
    models: Array<TaskClassificationModel>;
    /**
     * Classification tag identifier (e.g. `code:general_impl`, `agent:web_search`).
     */
    tag: string;
    /**
     * Fraction of classified sampled token volume (prompt + completion) attributed to this classification (0–1). The unclassified `other` bucket is excluded from the denominator.
     */
    tokenShare: number;
    /**
     * Fraction of classified sampled requests attributed to this classification (0–1). The unclassified `other` bucket is excluded from the denominator.
     */
    usageShare: number;
};
/** @internal */
export declare const TaskClassificationItem$inboundSchema: z.ZodType<TaskClassificationItem, unknown>;
export declare function taskClassificationItemFromJSON(jsonString: string): SafeParseResult<TaskClassificationItem, SDKValidationError>;
//# sourceMappingURL=taskclassificationitem.d.ts.map