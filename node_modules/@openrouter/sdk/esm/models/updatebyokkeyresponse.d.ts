import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { BYOKKey } from "./byokkey.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type UpdateBYOKKeyResponse = {
    data: BYOKKey;
};
/** @internal */
export declare const UpdateBYOKKeyResponse$inboundSchema: z.ZodType<UpdateBYOKKeyResponse, unknown>;
export declare function updateBYOKKeyResponseFromJSON(jsonString: string): SafeParseResult<UpdateBYOKKeyResponse, SDKValidationError>;
//# sourceMappingURL=updatebyokkeyresponse.d.ts.map