import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Which bash engine to use. "openrouter" runs commands server-side in the OpenRouter sandbox. "auto" (default) and "native" use native passthrough, returning the tool call to your application to run client-side; OpenRouter does not execute the commands.
 */
export declare const BashServerToolEngine: {
    readonly Auto: "auto";
    readonly Native: "native";
    readonly Openrouter: "openrouter";
};
/**
 * Which bash engine to use. "openrouter" runs commands server-side in the OpenRouter sandbox. "auto" (default) and "native" use native passthrough, returning the tool call to your application to run client-side; OpenRouter does not execute the commands.
 */
export type BashServerToolEngine = OpenEnum<typeof BashServerToolEngine>;
/** @internal */
export declare const BashServerToolEngine$outboundSchema: z.ZodType<string, BashServerToolEngine>;
//# sourceMappingURL=bashservertoolengine.d.ts.map