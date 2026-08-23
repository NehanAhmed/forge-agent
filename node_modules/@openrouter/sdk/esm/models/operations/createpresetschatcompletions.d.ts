import * as z from "zod/v4";
import * as models from "../index.js";
export type CreatePresetsChatCompletionsGlobals = {
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
export type CreatePresetsChatCompletionsRequest = {
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
     * URL-safe slug identifying the preset. Created if it does not exist.
     */
    slug: string;
    chatRequest: models.ChatRequest;
};
/** @internal */
export type CreatePresetsChatCompletionsRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    slug: string;
    ChatRequest: models.ChatRequest$Outbound;
};
/** @internal */
export declare const CreatePresetsChatCompletionsRequest$outboundSchema: z.ZodType<CreatePresetsChatCompletionsRequest$Outbound, CreatePresetsChatCompletionsRequest>;
export declare function createPresetsChatCompletionsRequestToJSON(createPresetsChatCompletionsRequest: CreatePresetsChatCompletionsRequest): string;
//# sourceMappingURL=createpresetschatcompletions.d.ts.map