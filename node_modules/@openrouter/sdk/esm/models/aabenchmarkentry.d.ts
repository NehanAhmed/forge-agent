import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Artificial Analysis benchmark index scores.
 */
export type AABenchmarkEntry = {
    /**
     * Artificial Analysis Agentic Index score
     */
    agenticIndex: number | null;
    /**
     * Artificial Analysis Coding Index score
     */
    codingIndex: number | null;
    /**
     * Artificial Analysis Intelligence Index score
     */
    intelligenceIndex: number | null;
};
/** @internal */
export declare const AABenchmarkEntry$inboundSchema: z.ZodType<AABenchmarkEntry, unknown>;
export declare function aaBenchmarkEntryFromJSON(jsonString: string): SafeParseResult<AABenchmarkEntry, SDKValidationError>;
//# sourceMappingURL=aabenchmarkentry.d.ts.map