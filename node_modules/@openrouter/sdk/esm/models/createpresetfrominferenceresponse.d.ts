import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PresetWithDesignatedVersion } from "./presetwithdesignatedversion.js";
/**
 * Response containing the created preset with its designated version.
 */
export type CreatePresetFromInferenceResponse = {
    /**
     * A preset with its currently designated version.
     */
    data: PresetWithDesignatedVersion;
};
/** @internal */
export declare const CreatePresetFromInferenceResponse$inboundSchema: z.ZodType<CreatePresetFromInferenceResponse, unknown>;
export declare function createPresetFromInferenceResponseFromJSON(jsonString: string): SafeParseResult<CreatePresetFromInferenceResponse, SDKValidationError>;
//# sourceMappingURL=createpresetfrominferenceresponse.d.ts.map