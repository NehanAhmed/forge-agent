import * as z from "zod/v4";
export type DownloadFileContentGlobals = {
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
export type DownloadFileContentRequest = {
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
    fileId: string;
    /**
     * Workspace to scope the request to. Defaults to the caller’s default workspace.
     */
    workspaceId?: string | undefined;
};
/** @internal */
export type DownloadFileContentRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    file_id: string;
    workspace_id?: string | undefined;
};
/** @internal */
export declare const DownloadFileContentRequest$outboundSchema: z.ZodType<DownloadFileContentRequest$Outbound, DownloadFileContentRequest>;
export declare function downloadFileContentRequestToJSON(downloadFileContentRequest: DownloadFileContentRequest): string;
//# sourceMappingURL=downloadfilecontent.d.ts.map