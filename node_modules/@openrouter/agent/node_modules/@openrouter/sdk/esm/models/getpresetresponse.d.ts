import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PresetWithDesignatedVersion } from "./presetwithdesignatedversion.js";
/**
 * A preset with its currently designated version.
 */
export type GetPresetResponse = {
    /**
     * A preset with its currently designated version.
     */
    data: PresetWithDesignatedVersion;
};
/** @internal */
export declare const GetPresetResponse$inboundSchema: z.ZodType<GetPresetResponse, unknown>;
export declare function getPresetResponseFromJSON(jsonString: string): SafeParseResult<GetPresetResponse, SDKValidationError>;
//# sourceMappingURL=getpresetresponse.d.ts.map