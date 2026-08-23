import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PresetDesignatedVersion } from "./presetdesignatedversion.js";
import { PresetStatus } from "./presetstatus.js";
/**
 * A preset with its currently designated version.
 */
export type PresetWithDesignatedVersion = {
    createdAt: string;
    creatorUserId: string | null;
    description: string | null;
    designatedVersionId: string | null;
    id: string;
    name: string;
    slug: string;
    /**
     * The status of a preset.
     */
    status: PresetStatus;
    statusUpdatedAt: string | null;
    updatedAt: string;
    workspaceId: string | null;
    /**
     * A specific version of a preset, containing config and optional system prompt.
     */
    designatedVersion: PresetDesignatedVersion | null;
};
/** @internal */
export declare const PresetWithDesignatedVersion$inboundSchema: z.ZodType<PresetWithDesignatedVersion, unknown>;
export declare function presetWithDesignatedVersionFromJSON(jsonString: string): SafeParseResult<PresetWithDesignatedVersion, SDKValidationError>;
//# sourceMappingURL=presetwithdesignatedversion.d.ts.map