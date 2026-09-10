import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * A supported-or-not flag. Present means the parameter is accepted.
 */
export type BooleanCapability = {
    type: "boolean";
};
/** @internal */
export declare const BooleanCapability$inboundSchema: z.ZodType<BooleanCapability, unknown>;
export declare function booleanCapabilityFromJSON(jsonString: string): SafeParseResult<BooleanCapability, SDKValidationError>;
//# sourceMappingURL=booleancapability.d.ts.map