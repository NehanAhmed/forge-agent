import * as z from "zod/v4";
import * as models from "../index.js";
export type UpdateObservabilityDestinationGlobals = {
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
export type UpdateObservabilityDestinationRequest = {
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
    /**
     * The destination ID (UUID).
     */
    id: string;
    updateObservabilityDestinationRequest: models.UpdateObservabilityDestinationRequest;
};
/** @internal */
export type UpdateObservabilityDestinationRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    id: string;
    UpdateObservabilityDestinationRequest: models.UpdateObservabilityDestinationRequest$Outbound;
};
/** @internal */
export declare const UpdateObservabilityDestinationRequest$outboundSchema: z.ZodType<UpdateObservabilityDestinationRequest$Outbound, UpdateObservabilityDestinationRequest>;
export declare function updateObservabilityDestinationRequestToJSON(updateObservabilityDestinationRequest: UpdateObservabilityDestinationRequest): string;
//# sourceMappingURL=updateobservabilitydestination.d.ts.map