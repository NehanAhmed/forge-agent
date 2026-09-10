import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * A parameter that accepts any value within an inclusive numeric range.
 */
export type RangeCapability = {
    max: number;
    min: number;
    type: "range";
};
/** @internal */
export declare const RangeCapability$inboundSchema: z.ZodType<RangeCapability, unknown>;
export declare function rangeCapabilityFromJSON(jsonString: string): SafeParseResult<RangeCapability, SDKValidationError>;
//# sourceMappingURL=rangecapability.d.ts.map