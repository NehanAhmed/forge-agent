import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ObservabilityFilterRulesConfig } from "./observabilityfilterrulesconfig.js";
export type ObservabilityS3DestinationConfig = {
    accessKeyId: string;
    bucketName: string;
    /**
     * Only for S3-compatible services like Cloudflare R2 (https://account-id.r2.cloudflarestorage.com) or MinIO. Leave blank for standard AWS S3.
     */
    endpoint?: string | undefined;
    /**
     * Custom HTTP headers to include in requests to this destination.
     */
    headers?: {
        [k: string]: string;
    } | undefined;
    /**
     * Template for S3 object path. The filename ({traceId}-{timestamp}.json) is automatically appended. Available variables: {prefix}, {date}, {year}, {month}, {day}, {apiKeyName}
     */
    pathTemplate: string;
    prefix: string;
    region?: string | undefined;
    secretAccessKey: string;
    sessionToken?: string | undefined;
};
export type ObservabilityS3Destination = {
    /**
     * Optional allowlist of OpenRouter API key hashes (`api_keys.hash`) whose traffic is forwarded to this destination. `null` means all keys.
     */
    apiKeyHashes: Array<string> | null;
    config: ObservabilityS3DestinationConfig;
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
    type: "s3";
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
export declare const ObservabilityS3DestinationConfig$inboundSchema: z.ZodType<ObservabilityS3DestinationConfig, unknown>;
export declare function observabilityS3DestinationConfigFromJSON(jsonString: string): SafeParseResult<ObservabilityS3DestinationConfig, SDKValidationError>;
/** @internal */
export declare const ObservabilityS3Destination$inboundSchema: z.ZodType<ObservabilityS3Destination, unknown>;
export declare function observabilityS3DestinationFromJSON(jsonString: string): SafeParseResult<ObservabilityS3Destination, SDKValidationError>;
//# sourceMappingURL=observabilitys3destination.d.ts.map