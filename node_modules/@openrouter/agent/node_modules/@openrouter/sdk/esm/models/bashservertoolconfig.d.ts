import * as z from "zod/v4";
import { BashServerToolEngine } from "./bashservertoolengine.js";
import { BashServerToolEnvironment, BashServerToolEnvironment$Outbound } from "./bashservertoolenvironment.js";
/**
 * Configuration for the openrouter:bash server tool
 */
export type BashServerToolConfig = {
    /**
     * Which bash engine to use. "openrouter" runs commands server-side in the OpenRouter sandbox. "auto" (default) and "native" use native passthrough, returning the tool call to your application to run client-side; OpenRouter does not execute the commands.
     */
    engine?: BashServerToolEngine | undefined;
    /**
     * Execution environment for the bash server tool.
     */
    environment?: BashServerToolEnvironment | undefined;
    /**
     * How long (in seconds) the container stays warm after its last command before sleeping, freeing its capacity slot. Idle-based: each command renews the timer. Defaults to 900 (15 minutes); capped at 2592000 (30 days).
     */
    sleepAfterSeconds?: number | undefined;
};
/** @internal */
export type BashServerToolConfig$Outbound = {
    engine?: string | undefined;
    environment?: BashServerToolEnvironment$Outbound | undefined;
    sleep_after_seconds?: number | undefined;
};
/** @internal */
export declare const BashServerToolConfig$outboundSchema: z.ZodType<BashServerToolConfig$Outbound, BashServerToolConfig>;
export declare function bashServerToolConfigToJSON(bashServerToolConfig: BashServerToolConfig): string;
//# sourceMappingURL=bashservertoolconfig.d.ts.map