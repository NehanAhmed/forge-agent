import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type TaskClassificationModel = {
    /**
     * Model identifier (permaslug).
     */
    id: string;
    /**
     * Fraction of this classification's sampled token volume attributed to this model (0–1). Sums to ≤1 across the returned models (only top-N are included and unattributed requests are excluded).
     */
    tagTokenShare: number;
    /**
     * Fraction of this classification's sampled requests attributed to this model (0–1). Sums to ≤1 across the returned models (only top-N are included and unattributed requests are excluded).
     */
    tagUsageShare: number;
};
/** @internal */
export declare const TaskClassificationModel$inboundSchema: z.ZodType<TaskClassificationModel, unknown>;
export declare function taskClassificationModelFromJSON(jsonString: string): SafeParseResult<TaskClassificationModel, SDKValidationError>;
//# sourceMappingURL=taskclassificationmodel.d.ts.map