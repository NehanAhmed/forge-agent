import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityDestination } from "./observabilitydestination.js";
export type GetObservabilityDestinationResponse = {
    data: ObservabilityDestination;
};
/** @internal */
export declare const GetObservabilityDestinationResponse$inboundSchema: z.ZodType<GetObservabilityDestinationResponse, unknown>;
export declare function getObservabilityDestinationResponseFromJSON(jsonString: string): SafeParseResult<GetObservabilityDestinationResponse, SDKValidationError>;
//# sourceMappingURL=getobservabilitydestinationresponse.d.ts.map