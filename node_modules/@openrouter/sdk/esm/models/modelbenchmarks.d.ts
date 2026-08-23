import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { AABenchmarkEntry } from "./aabenchmarkentry.js";
import { DABenchmarkEntry } from "./dabenchmarkentry.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Third-party benchmark rankings for this model. Omitted when no benchmark data is available.
 */
export type ModelBenchmarks = {
    /**
     * Artificial Analysis benchmark index scores.
     */
    artificialAnalysis?: AABenchmarkEntry | undefined;
    /**
     * Design Arena ELO rankings across arena+category pairs.
     */
    designArena: Array<DABenchmarkEntry>;
};
/** @internal */
export declare const ModelBenchmarks$inboundSchema: z.ZodType<ModelBenchmarks, unknown>;
export declare function modelBenchmarksFromJSON(jsonString: string): SafeParseResult<ModelBenchmarks, SDKValidationError>;
//# sourceMappingURL=modelbenchmarks.d.ts.map