import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { Preset } from "./preset.js";
/**
 * A paginated list of presets.
 */
export type ListPresetsResponse = {
    data: Array<Preset>;
    totalCount: number;
};
/** @internal */
export declare const ListPresetsResponse$inboundSchema: z.ZodType<ListPresetsResponse, unknown>;
export declare function listPresetsResponseFromJSON(jsonString: string): SafeParseResult<ListPresetsResponse, SDKValidationError>;
//# sourceMappingURL=listpresetsresponse.d.ts.map