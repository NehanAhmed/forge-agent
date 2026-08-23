import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityDestination } from "./observabilitydestination.js";
export type CreateObservabilityDestinationResponse = {
    data: ObservabilityDestination;
};
/** @internal */
export declare const CreateObservabilityDestinationResponse$inboundSchema: z.ZodType<CreateObservabilityDestinationResponse, unknown>;
export declare function createObservabilityDestinationResponseFromJSON(jsonString: string): SafeParseResult<CreateObservabilityDestinationResponse, SDKValidationError>;
//# sourceMappingURL=createobservabilitydestinationresponse.d.ts.map