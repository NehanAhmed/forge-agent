import * as z from "zod/v4";
import * as models from "../index.js";
export type CreateObservabilityDestinationGlobals = {
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
export type CreateObservabilityDestinationRequest = {
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
    createObservabilityDestinationRequest: models.CreateObservabilityDestinationRequest;
};
/** @internal */
export type CreateObservabilityDestinationRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    CreateObservabilityDestinationRequest: models.CreateObservabilityDestinationRequest$Outbound;
};
/** @internal */
export declare const CreateObservabilityDestinationRequest$outboundSchema: z.ZodType<CreateObservabilityDestinationRequest$Outbound, CreateObservabilityDestinationRequest>;
export declare function createObservabilityDestinationRequestToJSON(createObservabilityDestinationRequest: CreateObservabilityDestinationRequest): string;
//# sourceMappingURL=createobservabilitydestination.d.ts.map