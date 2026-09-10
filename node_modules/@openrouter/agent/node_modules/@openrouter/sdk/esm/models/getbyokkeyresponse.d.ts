import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { BYOKKey } from "./byokkey.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type GetBYOKKeyResponse = {
    data: BYOKKey;
};
/** @internal */
export declare const GetBYOKKeyResponse$inboundSchema: z.ZodType<GetBYOKKeyResponse, unknown>;
export declare function getBYOKKeyResponseFromJSON(jsonString: string): SafeParseResult<GetBYOKKeyResponse, SDKValidationError>;
//# sourceMappingURL=getbyokkeyresponse.d.ts.map