import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PresetDesignatedVersion } from "./presetdesignatedversion.js";
/**
 * A paginated list of preset versions.
 */
export type ListPresetVersionsResponse = {
    data: Array<PresetDesignatedVersion | null>;
    totalCount: number;
};
/** @internal */
export declare const ListPresetVersionsResponse$inboundSchema: z.ZodType<ListPresetVersionsResponse, unknown>;
export declare function listPresetVersionsResponseFromJSON(jsonString: string): SafeParseResult<ListPresetVersionsResponse, SDKValidationError>;
//# sourceMappingURL=listpresetversionsresponse.d.ts.map