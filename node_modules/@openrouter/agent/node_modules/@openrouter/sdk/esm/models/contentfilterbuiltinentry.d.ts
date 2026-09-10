import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { ContentFilterBuiltinAction } from "./contentfilterbuiltinaction.js";
import { ContentFilterBuiltinSlug } from "./contentfilterbuiltinslug.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { PromptInjectionScanScope } from "./promptinjectionscanscope.js";
/**
 * A builtin content filter entry. Builtin filters include PII detectors and the regex-based prompt injection detector.
 */
export type ContentFilterBuiltinEntry = {
    /**
     * Action taken when the builtin filter triggers
     */
    action: ContentFilterBuiltinAction;
    /**
     * Read-only, system-assigned redaction placeholder derived from the slug (e.g. "[EMAIL]", "[PHONE]"). Not settable by the caller.
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
export declare const ContentFilterBuiltinEntry$inboundSchema: z.ZodType<ContentFilterBuiltinEntry, unknown>;
export declare function contentFilterBuiltinEntryFromJSON(jsonString: string): SafeParseResult<ContentFilterBuiltinEntry, SDKValidationError>;
//# sourceMappingURL=contentfilterbuiltinentry.d.ts.map