import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ShellCallStatus } from "./shellcallstatus.js";
export type OutputShellCallItemAction = {
    commands: Array<string>;
    maxOutputLength: number | null;
    timeoutMs: number | null;
};
/**
 * A native `shell_call` output item matching OpenAI's Responses API shape. Emitted for the sandbox-backed `shell` tool.
 */
export type OutputShellCallItem = {
    action?: OutputShellCallItemAction | undefined;
    callId: string;
    id: string;
    /**
     * Status of a shell call or its output.
     */
    status: ShellCallStatus;
    type: "shell_call";
};
/** @internal */
export declare const OutputShellCallItemAction$inboundSchema: z.ZodType<OutputShellCallItemAction, unknown>;
export declare function outputShellCallItemActionFromJSON(jsonString: string): SafeParseResult<OutputShellCallItemAction, SDKValidationError>;
/** @internal */
export declare const OutputShellCallItem$inboundSchema: z.ZodType<OutputShellCallItem, unknown>;
export declare function outputShellCallItemFromJSON(jsonString: string): SafeParseResult<OutputShellCallItem, SDKValidationError>;
//# sourceMappingURL=outputshellcallitem.d.ts.map