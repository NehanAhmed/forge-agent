import * as z from "zod/v4";
import { EventStream } from "../../lib/event-streams.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import * as models from "../index.js";
export type CreateImagesGlobals = {
    /**
     * The app identifier should be your app's URL and is used as the primary identifier for rankings.
     *
     * @remarks
     * This is used to track API usage per application.
     */
    httpReferer?: string | undefined;
    /**
     * The app display name allows you to customize how your app appears in OpenRouter's dashboard.
     *
     * @remarks
     */
    appTitle?: string | undefined;
    /**
     * Comma-separated list of app categories (e.g. "cli-agent,cloud-agent"). Used for marketplace rankings.
     *
     * @remarks
     */
    appCategories?: string | undefined;
};
export type CreateImagesRequest = {
    /**
     * The app identifier should be your app's URL and is used as the primary identifier for rankings.
     *
     * @remarks
     * This is used to track API usage per application.
     */
    httpReferer?: string | undefined;
    /**
     * The app display name allows you to customize how your app appears in OpenRouter's dashboard.
     *
     * @remarks
     */
    appTitle?: string | undefined;
    /**
     * Comma-separated list of app categories (e.g. "cli-agent,cloud-agent"). Used for marketplace rankings.
     *
     * @remarks
     */
    appCategories?: string | undefined;
    imageGenerationRequest: models.ImageGenerationRequest;
};
export type CreateImagesResponse = models.ImageGenerationResponse | EventStream<models.ImageStreamingResponseData>;
/** @internal */
export type CreateImagesRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    ImageGenerationRequest: models.ImageGenerationRequest$Outbound;
};
/** @internal */
export declare const CreateImagesRequest$outboundSchema: z.ZodType<CreateImagesRequest$Outbound, CreateImagesRequest>;
export declare function createImagesRequestToJSON(createImagesRequest: CreateImagesRequest): string;
/** @internal */
export declare const CreateImagesResponse$inboundSchema: z.ZodType<CreateImagesResponse, unknown>;
export declare function createImagesResponseFromJSON(jsonString: string): SafeParseResult<CreateImagesResponse, SDKValidationError>;
//# sourceMappingURL=createimages.d.ts.map