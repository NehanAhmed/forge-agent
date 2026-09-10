import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityFilterRulesConfig } from "./observabilityfilterrulesconfig.js";
export type ObservabilityDatadogDestinationConfig = {
    /**
     * Datadog API key must have LLM Observability permissions. Create at:
     */
    apiKey: string;
    /**
     * Custom HTTP headers to include in requests to this destination.
     */
    headers?: {
        [k: string]: string;
    } | undefined;
    /**
     * Name to identify your application in Datadog LLM Observability
     */
    mlApp: string;
    /**
     * Datadog API URL for your region (e.g., https://api.datadoghq.com, https://api.us3.datadoghq.com, https://api.datadoghq.eu)
     */
    url: string;
};
export type ObservabilityDatadogDestination = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) whose traffic is forwarded to this destination. `null` means all keys.
     */
    apiKeyHashes: Array<string> | null;
    config: ObservabilityDatadogDestinationConfig;
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
    type: "datadog";
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
export declare const ObservabilityDatadogDestinationConfig$inboundSchema: z.ZodType<ObservabilityDatadogDestinationConfig, unknown>;
export declare function observabilityDatadogDestinationConfigFromJSON(jsonString: string): SafeParseResult<ObservabilityDatadogDestinationConfig, SDKValidationError>;
/** @internal */
export declare const ObservabilityDatadogDestination$inboundSchema: z.ZodType<ObservabilityDatadogDestination, unknown>;
export declare function observabilityDatadogDestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityDatadogDestination, SDKValidationError>;
//# sourceMappingURL=observabilitydatadogdestination.d.ts.map