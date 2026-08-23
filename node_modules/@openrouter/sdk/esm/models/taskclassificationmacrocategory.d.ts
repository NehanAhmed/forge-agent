import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type TaskClassificationMacroCategory = {
    /**
     * Macro-category identifier.
     */
    key: string;
    /**
     * Human-readable label for the macro-category.
     */
    label: string;
    /**
     * Combined token share of all classifications in this macro-category (0–1).
     */
    tokenShare: number;
    /**
     * Combined usage share of all classifications in this macro-category (0–1).
     */
    usageShare: number;
};
/** @internal */
export declare const TaskClassificationMacroCategory$inboundSchema: z.ZodType<TaskClassificationMacroCategory, unknown>;
export declare function taskClassificationMacroCategoryFromJSON(jsonString: string): SafeParseResult<TaskClassificationMacroCategory, SDKValidationError>;
//# sourceMappingURL=taskclassificationmacrocategory.d.ts.map