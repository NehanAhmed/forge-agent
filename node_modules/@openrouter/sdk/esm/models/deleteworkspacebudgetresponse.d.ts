import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export type DeleteWorkspaceBudgetResponse = {
    /**
     * Confirmation that the budget was deleted (or did not exist)
     */
    deleted: true;
};
/** @internal */
export declare const DeleteWorkspaceBudgetResponse$inboundSchema: z.ZodType<DeleteWorkspaceBudgetResponse, unknown>;
export declare function deleteWorkspaceBudgetResponseFromJSON(jsonString: string): SafeParseResult<DeleteWorkspaceBudgetResponse, SDKValidationError>;
//# sourceMappingURL=deleteworkspacebudgetresponse.d.ts.map