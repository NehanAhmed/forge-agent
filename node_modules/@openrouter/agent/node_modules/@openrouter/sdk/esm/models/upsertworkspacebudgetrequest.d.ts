import * as z from "zod/v4";
export type UpsertWorkspaceBudgetRequest = {
    /**
     * Spending limit in USD. Must be greater than 0.
     */
    limitUsd: number;
};
/** @internal */
export type UpsertWorkspaceBudgetRequest$Outbound = {
    limit_usd: number;
};
/** @internal */
export declare const UpsertWorkspaceBudgetRequest$outboundSchema: z.ZodType<UpsertWorkspaceBudgetRequest$Outbound, UpsertWorkspaceBudgetRequest>;
export declare function upsertWorkspaceBudgetRequestToJSON(upsertWorkspaceBudgetRequest: UpsertWorkspaceBudgetRequest): string;
//# sourceMappingURL=upsertworkspacebudgetrequest.d.ts.map