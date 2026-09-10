import * as z from "zod/v4";
import { ApplyPatchEngineEnum } from "./applypatchengineenum.js";
/**
 * Configuration for the openrouter:apply_patch server tool
 */
export type ApplyPatchServerToolConfig = {
    /**
     * Which apply_patch engine to use. "auto" (default) uses native passthrough when the endpoint advertises native apply_patch support, otherwise falls back to OpenRouter's HITL validator. "native" forces native passthrough — when the endpoint does not support native, the request falls back to HITL. "openrouter" always runs the HITL validator. Native passthrough streams the diff incrementally via `apply_patch_call_operation_diff.delta` events; HITL buffers the diff for atomic delivery as a single delta.
     */
    engine?: ApplyPatchEngineEnum | undefined;
};
/** @internal */
export type ApplyPatchServerToolConfig$Outbound = {
    engine?: string | undefined;
};
/** @internal */
export declare const ApplyPatchServerToolConfig$outboundSchema: z.ZodType<ApplyPatchServerToolConfig$Outbound, ApplyPatchServerToolConfig>;
export declare function applyPatchServerToolConfigToJSON(applyPatchServerToolConfig: ApplyPatchServerToolConfig): string;
//# sourceMappingURL=applypatchservertoolconfig.d.ts.map