import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { DefaultParameters } from "./defaultparameters.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ModelArchitecture } from "./modelarchitecture.js";
import { ModelBenchmarks } from "./modelbenchmarks.js";
import { ModelLinks } from "./modellinks.js";
import { ModelReasoning } from "./modelreasoning.js";
import { Parameter } from "./parameter.js";
import { PerRequestLimits } from "./perrequestlimits.js";
import { PublicPricing } from "./publicpricing.js";
import { TopProviderInfo } from "./topproviderinfo.js";
/**
 * Information about an AI model available on OpenRouter
 */
export type Model = {
    /**
     * Model architecture information
     */
    architecture: ModelArchitecture;
    /**
     * Third-party benchmark rankings for this model. Omitted when no benchmark data is available.
     */
    benchmarks?: ModelBenchmarks | undefined;
    /**
     * Canonical slug for the model
     */
    canonicalSlug: string;
    /**
     * Maximum context length in tokens
     */
    contextLength: number | null;
    /**
     * Unix timestamp of when the model was created
     */
    created: number;
    /**
     * Default parameters for this model
     */
    defaultParameters: DefaultParameters | null;
    /**
     * Description of the model
     */
    description?: string | undefined;
    /**
     * The date after which the model may be removed. ISO 8601 date string (YYYY-MM-DD) or null if no expiration.
     */
    expirationDate?: string | null | undefined;
    /**
     * Hugging Face model identifier, if applicable
     */
    huggingFaceId?: string | null | undefined;
    /**
     * Unique identifier for the model
     */
    id: string;
    /**
     * The date up to which the model was trained on data. ISO 8601 date string (YYYY-MM-DD) or null if unknown.
     */
    knowledgeCutoff?: string | null | undefined;
    /**
     * Related API endpoints and resources for this model.
     */
    links: ModelLinks;
    /**
     * Display name of the model
     */
    name: string;
    /**
     * Per-request token limits
     */
    perRequestLimits: PerRequestLimits | null;
    /**
     * Pricing information for the model
     */
    pricing: PublicPricing;
    /**
     * Reasoning effort configuration. Omitted for non-reasoning models and dynamic router models.
     */
    reasoning?: ModelReasoning | undefined;
    /**
     * List of supported parameters for this model
     */
    supportedParameters: Array<Parameter>;
    /**
     * List of supported voice identifiers for TTS models. Null for non-TTS models.
     */
    supportedVoices: Array<string> | null;
    /**
     * Information about the top provider for this model
     */
    topProvider: TopProviderInfo;
};
/** @internal */
export declare const Model$inboundSchema: z.ZodType<Model, unknown>;
export declare function modelFromJSON(jsonString: string): SafeParseResult<Model, SDKValidationError>;
//# sourceMappingURL=model.d.ts.map