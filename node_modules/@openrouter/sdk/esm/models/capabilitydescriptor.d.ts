import * as z from "zod/v4";
import * as discriminatedUnionTypes from "../types/discriminatedUnion.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { BooleanCapability } from "./booleancapability.js";
import { EnumCapability } from "./enumcapability.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { RangeCapability } from "./rangecapability.js";
/**
 * A typed descriptor for one supported request parameter.
 */
export type CapabilityDescriptor = EnumCapability | RangeCapability | BooleanCapability | discriminatedUnionTypes.Unknown<"type">;
/** @internal */
export declare const CapabilityDescriptor$inboundSchema: z.ZodType<CapabilityDescriptor, unknown>;
export declare function capabilityDescriptorFromJSON(jsonString: string): SafeParseResult<CapabilityDescriptor, SDKValidationError>;
//# sourceMappingURL=capabilitydescriptor.d.ts.map