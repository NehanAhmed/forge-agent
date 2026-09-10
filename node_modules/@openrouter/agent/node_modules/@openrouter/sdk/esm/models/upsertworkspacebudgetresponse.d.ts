import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { WorkspaceBudget } from "./workspacebudget.js";
export type UpsertWorkspaceBudgetResponse = {
    data: WorkspaceBudget;
};
/** @internal */
export declare const UpsertWorkspaceBudgetResponse$inboundSchema: z.ZodType<UpsertWorkspaceBudgetResponse, unknown>;
export declare function upsertWorkspaceBudgetResponseFromJSON(jsonString: string): SafeParseResult<UpsertWorkspaceBudgetResponse, SDKValidationError>;
//# sourceMappingURL=upsertworkspacebudgetresponse.d.ts.map