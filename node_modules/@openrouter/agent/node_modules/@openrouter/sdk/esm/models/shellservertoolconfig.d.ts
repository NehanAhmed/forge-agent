import * as z from "zod/v4";
import { ShellServerToolEngine } from "./shellservertoolengine.js";
import { ShellServerToolEnvironment, ShellServerToolEnvironment$Outbound } from "./shellservertoolenvironment.js";
/**
 * Configuration for the openrouter:shell server tool
 */
export type ShellServerToolConfig = {
    /**
     * Which shell engine to use. "openrouter" runs commands server-side in the OpenRouter sandbox. "auto" (default) keeps the provider's native hosted shell when available (OpenAI); on other providers the call is routed to the OpenRouter sandbox.
     */
    engine?: ShellServerToolEngine | undefined;
    /**
     * Server-side execution environment for the shell tool. Only container-backed environments are supported; "local" shells are not.
     */
    environment?: ShellServerToolEnvironment | undefined;
    /**
     * How long (in seconds) the container stays warm after its last command before sleeping, freeing its capacity slot. Idle-based: each command renews the timer. Defaults to 900 (15 minutes); capped at 2592000 (30 days).
     */
    sleepAfterSeconds?: number | undefined;
};
/** @internal */
export type ShellServerToolConfig$Outbound = {
    engine?: string | undefined;
    environment?: ShellServerToolEnvironment$Outbound | undefined;
    sleep_after_seconds?: number | undefined;
};
/** @internal */
export declare const ShellServerToolConfig$outboundSchema: z.ZodType<ShellServerToolConfig$Outbound, ShellServerToolConfig>;
export declare function shellServerToolConfigToJSON(shellServerToolConfig: ShellServerToolConfig): string;
//# sourceMappingURL=shellservertoolconfig.d.ts.map