import * as z from "zod/v4";
import { OpenEnum } from "../../types/enums.js";
import { Result as SafeParseResult } from "../../types/fp.js";
import { SDKValidationError } from "../errors/sdkvalidationerror.js";
import * as models from "../index.js";
export type GetAppRankingsGlobals = {
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
 * Marketplace category group to filter by (e.g. `coding`). Only apps tagged with a subcategory inside this group are returned. Mutually combinable with `subcategory` — when both are supplied the `subcategory` must belong to the `category` group.
 */
export declare const GetAppRankingsCategory: {
    readonly Coding: "coding";
    readonly Creative: "creative";
    readonly Productivity: "productivity";
    readonly Entertainment: "entertainment";
};
/**
 * Marketplace category group to filter by (e.g. `coding`). Only apps tagged with a subcategory inside this group are returned. Mutually combinable with `subcategory` — when both are supplied the `subcategory` must belong to the `category` group.
 */
export type GetAppRankingsCategory = OpenEnum<typeof GetAppRankingsCategory>;
/**
 * Marketplace subcategory to filter by (e.g. `cli-agent`). Takes precedence over `category` for the actual filter; when `category` is also supplied the pair must be consistent.
 */
export declare const Subcategory: {
    readonly CliAgent: "cli-agent";
    readonly IdeExtension: "ide-extension";
    readonly CloudAgent: "cloud-agent";
    readonly ProgrammingApp: "programming-app";
    readonly NativeAppBuilder: "native-app-builder";
    readonly CreativeWriting: "creative-writing";
    readonly VideoGen: "video-gen";
    readonly ImageGen: "image-gen";
    readonly AudioGen: "audio-gen";
    readonly Roleplay: "roleplay";
    readonly Game: "game";
    readonly WritingAssistant: "writing-assistant";
    readonly GeneralChat: "general-chat";
    readonly PersonalAgent: "personal-agent";
    readonly Legal: "legal";
};
/**
 * Marketplace subcategory to filter by (e.g. `cli-agent`). Takes precedence over `category` for the actual filter; when `category` is also supplied the pair must be consistent.
 */
export type Subcategory = OpenEnum<typeof Subcategory>;
/**
 * `popular` ranks apps by total token volume inside the date window. `trending` ranks apps by absolute excess token growth: window volume minus the average volume of the three equal-length periods immediately preceding the window. Apps with no excess growth are omitted from `trending` results.
 */
export declare const GetAppRankingsSort: {
    readonly Popular: "popular";
    readonly Trending: "trending";
};
/**
 * `popular` ranks apps by total token volume inside the date window. `trending` ranks apps by absolute excess token growth: window volume minus the average volume of the three equal-length periods immediately preceding the window. Apps with no excess growth are omitted from `trending` results.
 */
export type GetAppRankingsSort = OpenEnum<typeof GetAppRankingsSort>;
export type GetAppRankingsRequest = {
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
     * Marketplace category group to filter by (e.g. `coding`). Only apps tagged with a subcategory inside this group are returned. Mutually combinable with `subcategory` — when both are supplied the `subcategory` must belong to the `category` group.
     */
    category?: GetAppRankingsCategory | undefined;
    /**
     * Marketplace subcategory to filter by (e.g. `cli-agent`). Takes precedence over `category` for the actual filter; when `category` is also supplied the pair must be consistent.
     */
    subcategory?: Subcategory | undefined;
    /**
     * `popular` ranks apps by total token volume inside the date window. `trending` ranks apps by absolute excess token growth: window volume minus the average volume of the three equal-length periods immediately preceding the window. Apps with no excess growth are omitted from `trending` results.
     */
    sort?: GetAppRankingsSort | undefined;
    /**
     * Start of the date window in YYYY-MM-DD (UTC), inclusive. Defaults to 30 days before `end_date`. The dataset begins at 2025-01-01; earlier values are clamped forward to that floor and the resolved value is echoed in `meta.start_date`.
     */
    startDate?: string | undefined;
    /**
     * End of the date window in YYYY-MM-DD (UTC), inclusive. Defaults to the most recent completed UTC day. Must be on or after 2025-01-01; earlier values are rejected with a 400.
     */
    endDate?: string | undefined;
    /**
     * Maximum number of apps to return (1-100). Defaults to 50.
     */
    limit?: number | undefined;
    /**
     * Number of ranked apps to skip before the first returned row (0-100). Defaults to 0. `rank` stays absolute, so the first row of `offset=50` is `rank: 51`.
     */
    offset?: number | null | undefined;
};
export type GetAppRankingsResponse = {
    result: models.AppRankingsResponse;
};
/** @internal */
export declare const GetAppRankingsCategory$outboundSchema: z.ZodType<string, GetAppRankingsCategory>;
/** @internal */
export declare const Subcategory$outboundSchema: z.ZodType<string, Subcategory>;
/** @internal */
export declare const GetAppRankingsSort$outboundSchema: z.ZodType<string, GetAppRankingsSort>;
/** @internal */
export type GetAppRankingsRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    category?: string | undefined;
    subcategory?: string | undefined;
    sort: string;
    start_date?: string | undefined;
    end_date?: string | undefined;
    limit: number;
    offset: number | null;
};
/** @internal */
export declare const GetAppRankingsRequest$outboundSchema: z.ZodType<GetAppRankingsRequest$Outbound, GetAppRankingsRequest>;
export declare function getAppRankingsRequestToJSON(getAppRankingsRequest: GetAppRankingsRequest): string;
/** @internal */
export declare const GetAppRankingsResponse$inboundSchema: z.ZodType<GetAppRankingsResponse, unknown>;
export declare function getAppRankingsResponseFromJSON(jsonString: string): SafeParseResult<GetAppRankingsResponse, SDKValidationError>;
//# sourceMappingURL=getapprankings.d.ts.map