import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityDestination } from "./observabilitydestination.js";
export type ListObservabilityDestinationsResponse = {
    /**
     * List of observability destinations.
     */
    data: Array<ObservabilityDestination>;
    /**
     * Total number of destinations matching the filters.
     */
    totalCount: number;
};
/** @internal */
export declare const ListObservabilityDestinationsResponse$inboundSchema: z.ZodType<ListObservabilityDestinationsResponse, unknown>;
export declare function listObservabilityDestinationsResponseFromJSON(jsonString: string): SafeParseResult<ListObservabilityDestinationsResponse, SDKValidationError>;
//# sourceMappingURL=listobservabilitydestinationsresponse.d.ts.map