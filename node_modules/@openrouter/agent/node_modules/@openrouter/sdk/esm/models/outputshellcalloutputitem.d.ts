import * as z from "zod/v4";
import * as discriminatedUnionTypes from "../types/discriminatedUnion.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ShellCallStatus } from "./shellcallstatus.js";
export type OutcomeTimeout = {
    type: "timeout";
};
export type OutcomeExit = {
    exitCode: number;
    type: "exit";
};
export type Outcome = OutcomeExit | OutcomeTimeout | discriminatedUnionTypes.Unknown<"type">;
export type OutputShellCallOutputItemOutput = {
    outcome: OutcomeExit | OutcomeTimeout | discriminatedUnionTypes.Unknown<"type">;
    stderr: string;
    stdout: string;
};
/**
 * A native `shell_call_output` item matching OpenAI's Responses API shape. Carries per-command stdout, stderr, and the exit/timeout outcome.
 */
export type OutputShellCallOutputItem = {
    callId: string;
    id: string;
    maxOutputLength?: number | null | undefined;
    output: Array<OutputShellCallOutputItemOutput>;
    /**
     * Status of a shell call or its output.
     */
    status: ShellCallStatus;
    type: "shell_call_output";
};
/** @internal */
export declare const OutcomeTimeout$inboundSchema: z.ZodType<OutcomeTimeout, unknown>;
export declare function outcomeTimeoutFromJSON(jsonString: string): SafeParseResult<OutcomeTimeout, SDKValidationError>;
/** @internal */
export declare const OutcomeExit$inboundSchema: z.ZodType<OutcomeExit, unknown>;
export declare function outcomeExitFromJSON(jsonString: string): SafeParseResult<OutcomeExit, SDKValidationError>;
/** @internal */
export declare const Outcome$inboundSchema: z.ZodType<Outcome, unknown>;
export declare function outcomeFromJSON(jsonString: string): SafeParseResult<Outcome, SDKValidationError>;
/** @internal */
export declare const OutputShellCallOutputItemOutput$inboundSchema: z.ZodType<OutputShellCallOutputItemOutput, unknown>;
export declare function outputShellCallOutputItemOutputFromJSON(jsonString: string): SafeParseResult<OutputShellCallOutputItemOutput, SDKValidationError>;
/** @internal */
export declare const OutputShellCallOutputItem$inboundSchema: z.ZodType<OutputShellCallOutputItem, unknown>;
export declare function outputShellCallOutputItemFromJSON(jsonString: string): SafeParseResult<OutputShellCallOutputItem, SDKValidationError>;
//# sourceMappingURL=outputshellcalloutputitem.d.ts.map