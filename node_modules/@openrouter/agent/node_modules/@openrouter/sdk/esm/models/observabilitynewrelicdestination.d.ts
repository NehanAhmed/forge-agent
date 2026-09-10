import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityFilterRulesConfig } from "./observabilityfilterrulesconfig.js";
export declare const Region: {
    readonly Us: "us";
    readonly Eu: "eu";
};
export type Region = OpenEnum<typeof Region>;
export type ObservabilityNewrelicDestinationConfig = {
    /**
     * Custom HTTP headers to include in requests to this destination.
     */
    headers?: {
        [k: string]: string;
    } | undefined;
    licenseKey: string;
    region: Region;
};
export type ObservabilityNewrelicDestination = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) whose traffic is forwarded to this destination. `null` means all keys.
     */
    apiKeyHashes: Array<string> | null;
    config: ObservabilityNewrelicDestinationConfig;
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
    type: "newrelic";
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
export declare const Region$inboundSchema: z.ZodType<Region, unknown>;
/** @internal */
export declare const ObservabilityNewrelicDestinationConfig$inboundSchema: z.ZodType<ObservabilityNewrelicDestinationConfig, unknown>;
export declare function observabilityNewrelicDestinationConfigFromJSON(jsonString: string): SafeParseResult<ObservabilityNewrelicDestinationConfig, SDKValidationError>;
/** @internal */
export declare const ObservabilityNewrelicDestination$inboundSchema: z.ZodType<ObservabilityNewrelicDestination, unknown>;
export declare function observabilityNewrelicDestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityNewrelicDestination, SDKValidationError>;
//# sourceMappingURL=observabilitynewrelicdestination.d.ts.map