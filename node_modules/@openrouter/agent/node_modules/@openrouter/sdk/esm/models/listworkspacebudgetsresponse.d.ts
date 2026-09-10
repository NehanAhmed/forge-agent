import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { WorkspaceBudget } from "./workspacebudget.js";
export type ListWorkspaceBudgetsResponse = {
    /**
     * List of budgets configured for the workspace
     */
    data: Array<WorkspaceBudget>;
};
/** @internal */
export declare const ListWorkspaceBudgetsResponse$inboundSchema: z.ZodType<ListWorkspaceBudgetsResponse, unknown>;
export declare function listWorkspaceBudgetsResponseFromJSON(jsonString: string): SafeParseResult<ListWorkspaceBudgetsResponse, SDKValidationError>;
//# sourceMappingURL=listworkspacebudgetsresponse.d.ts.map