import * as z from "zod/v4";
import { ClosedEnum } from "../../types/enums.js";
export type GetTaskClassificationsGlobals = {
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
/**
 * Trailing time window for the classification data. Currently only `7d` (trailing 7 days) is supported.
 */
export declare const Window: {
    readonly Sevend: "7d";
};
/**
 * Trailing time window for the classification data. Currently only `7d` (trailing 7 days) is supported.
 */
export type Window = ClosedEnum<typeof Window>;
export type GetTaskClassificationsRequest = {
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
     * Trailing time window for the classification data. Currently only `7d` (trailing 7 days) is supported.
     */
    window?: Window | undefined;
};
/** @internal */
export declare const Window$outboundSchema: z.ZodEnum<typeof Window>;
/** @internal */
export type GetTaskClassificationsRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    window: string;
};
/** @internal */
export declare const GetTaskClassificationsRequest$outboundSchema: z.ZodType<GetTaskClassificationsRequest$Outbound, GetTaskClassificationsRequest>;
export declare function getTaskClassificationsRequestToJSON(getTaskClassificationsRequest: GetTaskClassificationsRequest): string;
//# sourceMappingURL=gettaskclassifications.d.ts.map