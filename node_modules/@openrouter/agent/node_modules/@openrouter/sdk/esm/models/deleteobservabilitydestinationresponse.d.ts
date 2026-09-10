import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type DeleteObservabilityDestinationResponse = {
    /**
     * Always `true` on success.
     */
    deleted: true;
};
/** @internal */
export declare const DeleteObservabilityDestinationResponse$inboundSchema: z.ZodType<DeleteObservabilityDestinationResponse, unknown>;
export declare function deleteObservabilityDestinationResponseFromJSON(jsonString: string): SafeParseResult<DeleteObservabilityDestinationResponse, SDKValidationError>;
//# sourceMappingURL=deleteobservabilitydestinationresponse.d.ts.map