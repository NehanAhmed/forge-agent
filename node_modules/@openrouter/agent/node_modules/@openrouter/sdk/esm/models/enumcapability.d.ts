import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * A parameter that accepts one of a discrete set of string values.
 */
export type EnumCapability = {
    type: "enum";
    values: Array<string>;
};
/** @internal */
export declare const EnumCapability$inboundSchema: z.ZodType<EnumCapability, unknown>;
export declare function enumCapabilityFromJSON(jsonString: string): SafeParseResult<EnumCapability, SDKValidationError>;
//# sourceMappingURL=enumcapability.d.ts.map