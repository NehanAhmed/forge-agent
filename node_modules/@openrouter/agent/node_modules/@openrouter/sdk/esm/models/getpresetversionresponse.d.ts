import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PresetDesignatedVersion } from "./presetdesignatedversion.js";
/**
 * A single version of a preset.
 */
export type GetPresetVersionResponse = {
    /**
     * A specific version of a preset, containing config and optional system prompt.
     */
    data: PresetDesignatedVersion | null;
};
/** @internal */
export declare const GetPresetVersionResponse$inboundSchema: z.ZodType<GetPresetVersionResponse, unknown>;
export declare function getPresetVersionResponseFromJSON(jsonString: string): SafeParseResult<GetPresetVersionResponse, SDKValidationError>;
//# sourceMappingURL=getpresetversionresponse.d.ts.map