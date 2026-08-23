import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type DeleteBYOKKeyResponse = {
    /**
     * Confirmation that the BYOK credential was deleted.
     */
    deleted: true;
};
/** @internal */
export declare const DeleteBYOKKeyResponse$inboundSchema: z.ZodType<DeleteBYOKKeyResponse, unknown>;
export declare function deleteBYOKKeyResponseFromJSON(jsonString: string): SafeParseResult<DeleteBYOKKeyResponse, SDKValidationError>;
//# sourceMappingURL=deletebyokkeyresponse.d.ts.map