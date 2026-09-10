import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * Interval at which spend resets. Null means a lifetime (one-time) budget.
 */
export declare const ResetInterval: {
    readonly Daily: "daily";
    readonly Weekly: "weekly";
    readonly Monthly: "monthly";
};
/**
 * Interval at which spend resets. Null means a lifetime (one-time) budget.
 */
export type ResetInterval = OpenEnum<typeof ResetInterval>;
export type WorkspaceBudget = {
    /**
     * ISO 8601 timestamp of when the budget was created
     */
    createdAt: string;
    /**
     * Unique identifier for the budget
     */
    id: string;
    /**
     * Spending limit in USD for this interval
     */
    limitUsd: number;
    /**
     * Interval at which spend resets. Null means a lifetime (one-time) budget.
     */
    resetInterval: ResetInterval | null;
    /**
     * ISO 8601 timestamp of when the budget was last updated
     */
    updatedAt: string;
    /**
     * ID of the workspace the budget belongs to
     */
    workspaceId: string;
};
/** @internal */
export declare const ResetInterval$inboundSchema: z.ZodType<ResetInterval, unknown>;
/** @internal */
export declare const WorkspaceBudget$inboundSchema: z.ZodType<WorkspaceBudget, unknown>;
export declare function workspaceBudgetFromJSON(jsonString: string): SafeParseResult<WorkspaceBudget, SDKValidationError>;
//# sourceMappingURL=workspacebudget.d.ts.map