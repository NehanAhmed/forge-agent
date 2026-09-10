import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityFilterRulesConfig } from "./observabilityfilterrulesconfig.js";
export type ObservabilityOtelCollectorDestinationConfig = {
    endpoint: string;
    /**
     * Custom HTTP headers as a JSON object. For Axiom, use {"Authorization": "Bearer xaat-xxx", "X-Axiom-Dataset": "your-dataset"}
     */
    headers?: {
        [k: string]: string;
    } | undefined;
};
export type ObservabilityOtelCollectorDestination = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) whose traffic is forwarded to this destination. `null` means all keys.
     */
    apiKeyHashes: Array<string> | null;
    config: ObservabilityOtelCollectorDestinationConfig;
    /**
     * ISO timestamp of when the destination was created.
     */
    createdAt: string;
    /**
     * Whether this destination is currently enabled.
     */
    enabled: boolean;
    /**
     * Optional structured filter rules controlling which events are forwarded.
     */
    filterRules: ObservabilityFilterRulesConfig | null;
    /**
     * Stable public identifier for this destination.
     */
    id: string;
    /**
     * Human-readable name for the destination.
     */
    name: string | null;
    /**
     * When true, request/response bodies are not forwarded to this destination — only metadata.
     */
    privacyMode: boolean;
    /**
     * Sampling rate for events sent to this destination, between 0.0001 and 1 (1 = 100%).
     */
    samplingRate: number;
    type: "otel-collector";
    /**
     * ISO timestamp of when the destination was last updated.
     */
    updatedAt: string;
    /**
     * ID of the workspace this destination belongs to.
     */
    workspaceId: string;
};
/** @internal */
export declare const ObservabilityOtelCollectorDestinationConfig$inboundSchema: z.ZodType<ObservabilityOtelCollectorDestinationConfig, unknown>;
export declare function observabilityOtelCollectorDestinationConfigFromJSON(jsonString: string): SafeParseResult<ObservabilityOtelCollectorDestinationConfig, SDKValidationError>;
/** @internal */
export declare const ObservabilityOtelCollectorDestination$inboundSchema: z.ZodType<ObservabilityOtelCollectorDestination, unknown>;
export declare function observabilityOtelCollectorDestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityOtelCollectorDestination, SDKValidationError>;
//# sourceMappingURL=observabilityotelcollectordestination.d.ts.map