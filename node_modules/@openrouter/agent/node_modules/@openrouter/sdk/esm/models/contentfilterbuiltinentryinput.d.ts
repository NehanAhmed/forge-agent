import * as z from "zod/v4";
import { ContentFilterBuiltinAction } from "./contentfilterbuiltinaction.js";
import { ContentFilterBuiltinSlug } from "./contentfilterbuiltinslug.js";
import { PromptInjectionScanScope } from "./promptinjectionscanscope.js";
/**
 * A builtin content filter entry for create/update requests. Labels are system-assigned and cannot be set by the caller.
 */
export type ContentFilterBuiltinEntryInput = {
    /**
     * Action taken when the builtin filter triggers
     */
    action: ContentFilterBuiltinAction;
    /**
     * Deprecated: labels are system-assigned and cannot be set by the caller. Accepted for backward compatibility but silently ignored.
     *
     * @deprecated field: This will be removed in a future release, please migrate away from it as soon as possible.
     */
    label?: string | undefined;
    /**
     * Which message roles to scan for prompt injection. Only applies to the regex-prompt-injection builtin. Defaults to all_messages.
     */
    scanScope?: PromptInjectionScanScope | undefined;
    /**
     * The builtin filter identifier
     */
    slug: ContentFilterBuiltinSlug;
};
/** @internal */
export type ContentFilterBuiltinEntryInput$Outbound = {
    action: string;
    label?: string | undefined;
    scan_scope?: string | undefined;
    slug: string;
};
/** @internal */
export declare const ContentFilterBuiltinEntryInput$outboundSchema: z.ZodType<ContentFilterBuiltinEntryInput$Outbound, ContentFilterBuiltinEntryInput>;
export declare function contentFilterBuiltinEntryInputToJSON(contentFilterBuiltinEntryInput: ContentFilterBuiltinEntryInput): string;
//# sourceMappingURL=contentfilterbuiltinentryinput.d.ts.map