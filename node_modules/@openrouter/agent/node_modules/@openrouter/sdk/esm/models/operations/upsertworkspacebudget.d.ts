import * as z from "zod/v4";
import * as models from "../index.js";
export type UpsertWorkspaceBudgetGlobals = {
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
export type UpsertWorkspaceBudgetRequest = {
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
     * The workspace ID (UUID) or slug
     */
    id: string;
    /**
     * Budget reset interval. Use "lifetime" for a one-time budget that never resets.
     */
    interval: models.WorkspaceBudgetInterval;
    upsertWorkspaceBudgetRequest: models.UpsertWorkspaceBudgetRequest;
};
/** @internal */
export type UpsertWorkspaceBudgetRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    id: string;
    interval: string;
    UpsertWorkspaceBudgetRequest: models.UpsertWorkspaceBudgetRequest$Outbound;
};
/** @internal */
export declare const UpsertWorkspaceBudgetRequest$outboundSchema: z.ZodType<UpsertWorkspaceBudgetRequest$Outbound, UpsertWorkspaceBudgetRequest>;
export declare function upsertWorkspaceBudgetRequestToJSON(upsertWorkspaceBudgetRequest: UpsertWorkspaceBudgetRequest): string;
//# sourceMappingURL=upsertworkspacebudget.d.ts.map