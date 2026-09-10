import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ToolCallStatus } from "./toolcallstatus.js";
export declare const OutputSubagentServerToolItemType: {
    readonly OpenrouterSubagent: "openrouter:subagent";
};
export type OutputSubagentServerToolItemType = ClosedEnum<typeof OutputSubagentServerToolItemType>;
/**
 * An openrouter:subagent server tool output item
 */
export type OutputSubagentServerToolItem = {
    /**
     * Error message when the subagent task did not produce an outcome.
     */
    error?: string | undefined;
    id?: string | undefined;
    /**
     * Slug of the worker model that executed the task.
     */
    model?: string | undefined;
    /**
     * The worker model's result (the outcome text returned to the delegating model).
     */
    outcome?: string | undefined;
    status: ToolCallStatus;
    /**
     * The task description the delegating model sent to the worker.
     */
    taskDescription?: string | undefined;
    /**
     * The short task identifier the delegating model supplied.
     */
    taskName?: string | undefined;
    type: OutputSubagentServerToolItemType;
};
/** @internal */
export declare const OutputSubagentServerToolItemType$inboundSchema: z.ZodEnum<typeof OutputSubagentServerToolItemType>;
/** @internal */
export declare const OutputSubagentServerToolItemType$outboundSchema: z.ZodEnum<typeof OutputSubagentServerToolItemType>;
/** @internal */
export declare const OutputSubagentServerToolItem$inboundSchema: z.ZodType<OutputSubagentServerToolItem, unknown>;
/** @internal */
export type OutputSubagentServerToolItem$Outbound = {
    error?: string | undefined;
    id?: string | undefined;
    model?: string | undefined;
    outcome?: string | undefined;
    status: string;
    task_description?: string | undefined;
    task_name?: string | undefined;
    type: string;
};
/** @internal */
export declare const OutputSubagentServerToolItem$outboundSchema: z.ZodType<OutputSubagentServerToolItem$Outbound, OutputSubagentServerToolItem>;
export declare function outputSubagentServerToolItemToJSON(outputSubagentServerToolItem: OutputSubagentServerToolItem): string;
export declare function outputSubagentServerToolItemFromJSON(jsonString: string): SafeParseResult<OutputSubagentServerToolItem, SDKValidationError>;
//# sourceMappingURL=outputsubagentservertoolitem.d.ts.map