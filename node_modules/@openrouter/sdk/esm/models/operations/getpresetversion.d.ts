import * as z from "zod/v4";
export type GetPresetVersionGlobals = {
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
export type GetPresetVersionRequest = {
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
     * URL-safe slug identifying the preset.
     */
    slug: string;
    /**
     * Version number of the preset.
     */
    version: string;
};
/** @internal */
export type GetPresetVersionRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    slug: string;
    version: string;
};
/** @internal */
export declare const GetPresetVersionRequest$outboundSchema: z.ZodType<GetPresetVersionRequest$Outbound, GetPresetVersionRequest>;
export declare function getPresetVersionRequestToJSON(getPresetVersionRequest: GetPresetVersionRequest): string;
//# sourceMappingURL=getpresetversion.d.ts.map