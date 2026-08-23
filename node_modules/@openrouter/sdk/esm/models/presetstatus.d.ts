import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * The status of a preset.
 */
export declare const PresetStatus: {
    readonly Active: "active";
    readonly Disabled: "disabled";
    readonly Archived: "archived";
};
/**
 * The status of a preset.
 */
export type PresetStatus = OpenEnum<typeof PresetStatus>;
/** @internal */
export declare const PresetStatus$inboundSchema: z.ZodType<PresetStatus, unknown>;
//# sourceMappingURL=presetstatus.d.ts.map