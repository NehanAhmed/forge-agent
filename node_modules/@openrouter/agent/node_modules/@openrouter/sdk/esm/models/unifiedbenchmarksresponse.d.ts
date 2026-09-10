import * as z from "zod/v4";
import * as discriminatedUnionTypes from "../types/discriminatedUnion.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { UnifiedBenchmarksAAItem } from "./unifiedbenchmarksaaitem.js";
import { UnifiedBenchmarksDAItem } from "./unifiedbenchmarksdaitem.js";
import { UnifiedBenchmarksMeta } from "./unifiedbenchmarksmeta.js";
export type UnifiedBenchmarksResponseData = UnifiedBenchmarksAAItem | UnifiedBenchmarksDAItem | discriminatedUnionTypes.Unknown<"source">;
export type UnifiedBenchmarksResponse = {
    data: Array<UnifiedBenchmarksAAItem | UnifiedBenchmarksDAItem | discriminatedUnionTypes.Unknown<"source">>;
    meta: UnifiedBenchmarksMeta;
};
/** @internal */
export declare const UnifiedBenchmarksResponseData$inboundSchema: z.ZodType<UnifiedBenchmarksResponseData, unknown>;
export declare function unifiedBenchmarksResponseDataFromJSON(jsonString: string): SafeParseResult<UnifiedBenchmarksResponseData, SDKValidationError>;
/** @internal */
export declare const UnifiedBenchmarksResponse$inboundSchema: z.ZodType<UnifiedBenchmarksResponse, unknown>;
export declare function unifiedBenchmarksResponseFromJSON(jsonString: string): SafeParseResult<UnifiedBenchmarksResponse, SDKValidationError>;
//# sourceMappingURL=unifiedbenchmarksresponse.d.ts.map