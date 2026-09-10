import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityFilterRulesConfig } from "./observabilityfilterrulesconfig.js";
export declare const Method: {
    readonly Post: "POST";
    readonly Put: "PUT";
};
export type Method = OpenEnum<typeof Method>;
export type ObservabilityWebhookDestinationConfig = {
    headers?: {
        [k: string]: string;
    } | undefined;
    method: Method;
    url: string;
};
export type ObservabilityWebhookDestination = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) whose traffic is forwarded to this destination. `null` means all keys.
     */
    apiKeyHashes: Array<string> | null;
    config: ObservabilityWebhookDestinationConfig;
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
    type: "webhook";
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
export declare const Method$inboundSchema: z.ZodType<Method, unknown>;
/** @internal */
export declare const ObservabilityWebhookDestinationConfig$inboundSchema: z.ZodType<ObservabilityWebhookDestinationConfig, unknown>;
export declare function observabilityWebhookDestinationConfigFromJSON(jsonString: string): SafeParseResult<ObservabilityWebhookDestinationConfig, SDKValidationError>;
/** @internal */
export declare const ObservabilityWebhookDestination$inboundSchema: z.ZodType<ObservabilityWebhookDestination, unknown>;
export declare function observabilityWebhookDestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityWebhookDestination, SDKValidationError>;
//# sourceMappingURL=observabilitywebhookdestination.d.ts.map