import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Which message roles to scan for prompt injection. Only applies to the regex-prompt-injection builtin. Defaults to all_messages.
 */
export declare const PromptInjectionScanScope: {
    readonly UserOnly: "user_only";
    readonly AllMessages: "all_messages";
};
/**
 * Which message roles to scan for prompt injection. Only applies to the regex-prompt-injection builtin. Defaults to all_messages.
 */
export type PromptInjectionScanScope = OpenEnum<typeof PromptInjectionScanScope>;
/** @internal */
export declare const PromptInjectionScanScope$inboundSchema: z.ZodType<PromptInjectionScanScope, unknown>;
/** @internal */
export declare const PromptInjectionScanScope$outboundSchema: z.ZodType<string, PromptInjectionScanScope>;
//# sourceMappingURL=promptinjectionscanscope.d.ts.map