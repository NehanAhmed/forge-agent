import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { ToolCallStatus } from "./toolcallstatus.js";
export declare const TypeExec: {
    readonly Exec: "exec";
};
export type TypeExec = ClosedEnum<typeof TypeExec>;
export type LocalShellCallItemAction = {
    command: Array<string>;
    env: {
        [k: string]: string;
    };
    timeoutMs?: number | null | undefined;
    type: TypeExec;
    user?: string | null | undefined;
    workingDirectory?: string | null | undefined;
};
export declare const TypeLocalShellCall: {
    readonly LocalShellCall: "local_shell_call";
};
export type TypeLocalShellCall = ClosedEnum<typeof TypeLocalShellCall>;
/**
 * A local shell command execution call
 */
export type LocalShellCallItem = {
    action: LocalShellCallItemAction;
    callId: string;
    id: string;
    status: ToolCallStatus;
    type: TypeLocalShellCall;
};
/** @internal */
export declare const TypeExec$outboundSchema: z.ZodEnum<typeof TypeExec>;
/** @internal */
export type LocalShellCallItemAction$Outbound = {
    command: Array<string>;
    env: {
        [k: string]: string;
    };
    timeout_ms?: number | null | undefined;
    type: string;
    user?: string | null | undefined;
    working_directory?: string | null | undefined;
};
/** @internal */
export declare const LocalShellCallItemAction$outboundSchema: z.ZodType<LocalShellCallItemAction$Outbound, LocalShellCallItemAction>;
export declare function localShellCallItemActionToJSON(localShellCallItemAction: LocalShellCallItemAction): string;
/** @internal */
export declare const TypeLocalShellCall$outboundSchema: z.ZodEnum<typeof TypeLocalShellCall>;
/** @internal */
export type LocalShellCallItem$Outbound = {
    action: LocalShellCallItemAction$Outbound;
    call_id: string;
    id: string;
    status: string;
    type: string;
};
/** @internal */
export declare const LocalShellCallItem$outboundSchema: z.ZodType<LocalShellCallItem$Outbound, LocalShellCallItem>;
export declare function localShellCallItemToJSON(localShellCallItem: LocalShellCallItem): string;
//# sourceMappingURL=localshellcallitem.d.ts.map