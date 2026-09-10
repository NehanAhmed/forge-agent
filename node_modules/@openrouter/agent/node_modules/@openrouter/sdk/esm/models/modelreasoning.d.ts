import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ReasoningEffort } from "./reasoningeffort.js";
/**
 * Default reasoning effort when the client enables reasoning without specifying effort. Maps to `reasoning.effort` in chat requests. When `"none"`, prefer omitting effort unless the user explicitly disables reasoning.
 */
export declare const DefaultEffort: {
    readonly Max: "max";
    readonly Xhigh: "xhigh";
    readonly High: "high";
    readonly Medium: "medium";
    readonly Low: "low";
    readonly Minimal: "minimal";
    readonly None: "none";
};
/**
 * Default reasoning effort when the client enables reasoning without specifying effort. Maps to `reasoning.effort` in chat requests. When `"none"`, prefer omitting effort unless the user explicitly disables reasoning.
 */
export type DefaultEffort = OpenEnum<typeof DefaultEffort>;
/**
 * Reasoning effort configuration. Omitted for non-reasoning models and dynamic router models.
 */
export type ModelReasoning = {
    defaultEffort?: DefaultEffort | null | undefined;
    /**
     * Default reasoning enabled state when the client does not set `reasoning.enabled`.
     */
    defaultEnabled?: boolean | undefined;
    /**
     * When true, reasoning cannot be disabled and effort "none" is rejected.
     */
    mandatory: boolean;
    /**
     * Allowed reasoning effort values for this model, in descending effort order (highest first). Null means no allowlist — all gateway effort values are accepted.
     */
    supportedEfforts?: Array<ReasoningEffort | null> | null | undefined;
    /**
     * Present and `true` when the model accepts `reasoning.max_tokens` in requests (Anthropic-style) instead of or in addition to `reasoning.effort`. Omitted otherwise.
     */
    supportsMaxTokens?: boolean | undefined;
};
/** @internal */
export declare const DefaultEffort$inboundSchema: z.ZodType<DefaultEffort, unknown>;
/** @internal */
export declare const ModelReasoning$inboundSchema: z.ZodType<ModelReasoning, unknown>;
export declare function modelReasoningFromJSON(jsonString: string): SafeParseResult<ModelReasoning, SDKValidationError>;
//# sourceMappingURL=modelreasoning.d.ts.map