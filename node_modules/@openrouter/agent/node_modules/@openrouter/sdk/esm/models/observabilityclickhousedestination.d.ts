import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityFilterRulesConfig } from "./observabilityfilterrulesconfig.js";
export type ObservabilityClickhouseDestinationConfig = {
    database: string;
    /**
     * Custom HTTP headers to include in requests to this destination.
     */
    headers?: {
        [k: string]: string;
    } | undefined;
    host: string;
    password: string;
    table: string;
    /**
     * If you have not set a specific username in ClickHouse, simply type in 'default' below.
     */
    username: string;
};
export type ObservabilityClickhouseDestination = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) whose traffic is forwarded to this destination. `null` means all keys.
     */
    apiKeyHashes: Array<string> | null;
    config: ObservabilityClickhouseDestinationConfig;
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
    type: "clickhouse";
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
export declare const ObservabilityClickhouseDestinationConfig$inboundSchema: z.ZodType<ObservabilityClickhouseDestinationConfig, unknown>;
export declare function observabilityClickhouseDestinationConfigFromJSON(jsonString: string): SafeParseResult<ObservabilityClickhouseDestinationConfig, SDKValidationError>;
/** @internal */
export declare const ObservabilityClickhouseDestination$inboundSchema: z.ZodType<ObservabilityClickhouseDestination, unknown>;
export declare function observabilityClickhouseDestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityClickhouseDestination, SDKValidationError>;
//# sourceMappingURL=observabilityclickhousedestination.d.ts.map