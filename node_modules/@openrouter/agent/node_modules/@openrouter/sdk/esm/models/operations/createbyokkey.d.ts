import * as z from "zod/v4";
import * as models from "../index.js";
export type CreateBYOKKeyGlobals = {
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
export type CreateBYOKKeyRequest = {
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
    createBYOKKeyRequest: models.CreateBYOKKeyRequest;
};
/** @internal */
export type CreateBYOKKeyRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    CreateBYOKKeyRequest: models.CreateBYOKKeyRequest$Outbound;
};
/** @internal */
export declare const CreateBYOKKeyRequest$outboundSchema: z.ZodType<CreateBYOKKeyRequest$Outbound, CreateBYOKKeyRequest>;
export declare function createBYOKKeyRequestToJSON(createBYOKKeyRequest: CreateBYOKKeyRequest): string;
//# sourceMappingURL=createbyokkey.d.ts.map