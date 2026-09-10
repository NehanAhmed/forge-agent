import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityDestination } from "./observabilitydestination.js";
export type UpdateObservabilityDestinationResponse = {
    data: ObservabilityDestination;
};
/** @internal */
export declare const UpdateObservabilityDestinationResponse$inboundSchema: z.ZodType<UpdateObservabilityDestinationResponse, unknown>;
export declare function updateObservabilityDestinationResponseFromJSON(jsonString: string): SafeParseResult<UpdateObservabilityDestinationResponse, SDKValidationError>;
//# sourceMappingURL=updateobservabilitydestinationresponse.d.ts.map