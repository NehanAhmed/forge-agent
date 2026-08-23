import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { BYOKKey } from "./byokkey.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type ListBYOKKeysResponse = {
    /**
     * List of BYOK credentials.
     */
    data: Array<BYOKKey>;
    /**
     * Total number of BYOK credentials matching the filters.
     */
    totalCount: number;
};
/** @internal */
export declare const ListBYOKKeysResponse$inboundSchema: z.ZodType<ListBYOKKeysResponse, unknown>;
export declare function listBYOKKeysResponseFromJSON(jsonString: string): SafeParseResult<ListBYOKKeysResponse, SDKValidationError>;
//# sourceMappingURL=listbyokkeysresponse.d.ts.map