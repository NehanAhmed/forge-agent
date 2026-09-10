import * as z from "zod/v4";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import * as models from "../index.js";
export type ListFilesGlobals = {
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
export type ListFilesRequest = {
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
     * Maximum number of files to return (1–1000).
     */
    limit?: number | undefined;
    /**
     * Opaque pagination cursor from a previous response.
     */
    cursor?: string | undefined;
    /**
     * Workspace to scope the request to. Defaults to the caller’s default workspace.
     */
    workspaceId?: string | undefined;
};
export type ListFilesResponse = {
    result: models.FileListResponse;
};
/** @internal */
export type ListFilesRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    limit?: number | undefined;
    cursor?: string | undefined;
    workspace_id?: string | undefined;
};
/** @internal */
export declare const ListFilesRequest$outboundSchema: z.ZodType<ListFilesRequest$Outbound, ListFilesRequest>;
export declare function listFilesRequestToJSON(listFilesRequest: ListFilesRequest): string;
/** @internal */
export declare const ListFilesResponse$inboundSchema: z.ZodType<ListFilesResponse, unknown>;
export declare function listFilesResponseFromJSON(jsonString: string): SafeParseResult<ListFilesResponse, SDKValidationError>;
//# sourceMappingURL=listfiles.d.ts.map