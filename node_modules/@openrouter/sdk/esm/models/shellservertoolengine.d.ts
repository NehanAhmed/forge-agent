import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Which shell engine to use. "openrouter" runs commands server-side in the OpenRouter sandbox. "auto" (default) keeps the provider's native hosted shell when available (OpenAI); on other providers the call is routed to the OpenRouter sandbox.
 */
export declare const ShellServerToolEngine: {
    readonly Auto: "auto";
    readonly Openrouter: "openrouter";
};
/**
 * Which shell engine to use. "openrouter" runs commands server-side in the OpenRouter sandbox. "auto" (default) keeps the provider's native hosted shell when available (OpenAI); on other providers the call is routed to the OpenRouter sandbox.
 */
export type ShellServerToolEngine = OpenEnum<typeof ShellServerToolEngine>;
/** @internal */
export declare const ShellServerToolEngine$outboundSchema: z.ZodType<string, ShellServerToolEngine>;
//# sourceMappingURL=shellservertoolengine.d.ts.map