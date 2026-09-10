import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { CapabilityDescriptor } from "./capabilitydescriptor.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ImagePricingEntry } from "./imagepricingentry.js";
/**
 * An endpoint that serves a given image model.
 */
export type ImageEndpoint = {
    /**
     * Provider-specific options accepted under provider.options[provider_slug].
     */
    allowedPassthroughParameters: Array<string>;
    /**
     * Billable pricing lines for this endpoint.
     */
    pricing: Array<ImagePricingEntry>;
    /**
     * Provider display name
     */
    providerName: string;
    /**
     * Provider slug
     */
    providerSlug: string;
    /**
     * Provider tag for request-side selection
     */
    providerTag: string | null;
    supportedParameters: {
        [k: string]: CapabilityDescriptor;
    };
    /**
     * Whether this endpoint supports native SSE streaming (`stream: true` in the request).
     */
    supportsStreaming: boolean;
};
/** @internal */
export declare const ImageEndpoint$inboundSchema: z.ZodType<ImageEndpoint, unknown>;
export declare function imageEndpointFromJSON(jsonString: string): SafeParseResult<ImageEndpoint, SDKValidationError>;
//# sourceMappingURL=imageendpoint.d.ts.map