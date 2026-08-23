import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Budget reset interval. Use "lifetime" for a one-time budget that never resets.
 */
export declare const WorkspaceBudgetInterval: {
    readonly Daily: "daily";
    readonly Weekly: "weekly";
    readonly Monthly: "monthly";
    readonly Lifetime: "lifetime";
};
/**
 * Budget reset interval. Use "lifetime" for a one-time budget that never resets.
 */
export type WorkspaceBudgetInterval = OpenEnum<typeof WorkspaceBudgetInterval>;
/** @internal */
export declare const WorkspaceBudgetInterval$outboundSchema: z.ZodType<string, WorkspaceBudgetInterval>;
//# sourceMappingURL=workspacebudgetinterval.d.ts.map