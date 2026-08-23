import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { CapabilityDescriptor } from "./capabilitydescriptor.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ImageModelArchitecture } from "./imagemodelarchitecture.js";
/**
 * A single image model in the discovery listing.
 */
export type ImageModelListItem = {
    architecture: ImageModelArchitecture;
    /**
     * Unix timestamp (seconds) of when the model was created
     */
    created: number;
    description: string;
    /**
     * Relative URL to the full per-endpoint records for this model
     */
    endpoints: string;
    /**
     * Model slug
     */
    id: string;
    /**
     * Display name
     */
    name: string;
    /**
     * Union of supported parameters across every endpoint of this model. Coarse discovery aid; the definitive per-endpoint set is behind the endpoints URL.
     */
    supportedParameters: {
        [k: string]: CapabilityDescriptor;
    };
    /**
     * Whether any endpoint of this model supports native SSE streaming on the dedicated Image API (i.e. `stream: true` in the request). OR across endpoints.
     */
    supportsStreaming: boolean;
};
/** @internal */
export declare const ImageModelListItem$inboundSchema: z.ZodType<ImageModelListItem, unknown>;
export declare function imageModelListItemFromJSON(jsonString: string): SafeParseResult<ImageModelListItem, SDKValidationError>;
//# sourceMappingURL=imagemodellistitem.d.ts.map