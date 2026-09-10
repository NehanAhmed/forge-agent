import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PresetStatus } from "./presetstatus.js";
/**
 * A preset without version details.
 */
export type Preset = {
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
};
/** @internal */
export declare const Preset$inboundSchema: z.ZodType<Preset, unknown>;
export declare function presetFromJSON(jsonString: string): SafeParseResult<Preset, SDKValidationError>;
//# sourceMappingURL=preset.d.ts.map