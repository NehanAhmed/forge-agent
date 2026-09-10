import * as z from "zod/v4";
export type GetModelGlobals = {
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
export type GetModelRequest = {
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
     * The author/organization of the model
     */
    author: string;
    /**
     * The model slug, optionally including a variant suffix (e.g. gpt-4 or gpt-4:free)
     */
    slug: string;
};
/** @internal */
export type GetModelRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    author: string;
    slug: string;
};
/** @internal */
export declare const GetModelRequest$outboundSchema: z.ZodType<GetModelRequest$Outbound, GetModelRequest>;
export declare function getModelRequestToJSON(getModelRequest: GetModelRequest): string;
//# sourceMappingURL=getmodel.d.ts.map