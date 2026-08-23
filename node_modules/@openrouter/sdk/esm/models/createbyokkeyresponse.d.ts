import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { BYOKKey } from "./byokkey.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type CreateBYOKKeyResponse = {
    data: BYOKKey;
};
/** @internal */
export declare const CreateBYOKKeyResponse$inboundSchema: z.ZodType<CreateBYOKKeyResponse, unknown>;
export declare function createBYOKKeyResponseFromJSON(jsonString: string): SafeParseResult<CreateBYOKKeyResponse, SDKValidationError>;
//# sourceMappingURL=createbyokkeyresponse.d.ts.map