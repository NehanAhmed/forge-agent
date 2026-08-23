import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Status of a shell call or its output.
 */
export declare const ShellCallStatus: {
    readonly InProgress: "in_progress";
    readonly Completed: "completed";
    readonly Incomplete: "incomplete";
};
/**
 * Status of a shell call or its output.
 */
export type ShellCallStatus = OpenEnum<typeof ShellCallStatus>;
/** @internal */
export declare const ShellCallStatus$inboundSchema: z.ZodType<ShellCallStatus, unknown>;
//# sourceMappingURL=shellcallstatus.d.ts.map