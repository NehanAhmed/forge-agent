import * as z from "zod/v4";
import * as models from "../index.js";
export type CreatePresetsMessagesGlobals = {
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
export type CreatePresetsMessagesRequest = {
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
    messagesRequest: models.MessagesRequest;
};
/** @internal */
export type CreatePresetsMessagesRequest$Outbound = {
    "HTTP-Referer"?: string | undefined;
    appTitle?: string | undefined;
    appCategories?: string | undefined;
    slug: string;
    MessagesRequest: models.MessagesRequest$Outbound;
};
/** @internal */
export declare const CreatePresetsMessagesRequest$outboundSchema: z.ZodType<CreatePresetsMessagesRequest$Outbound, CreatePresetsMessagesRequest>;
export declare function createPresetsMessagesRequestToJSON(createPresetsMessagesRequest: CreatePresetsMessagesRequest): string;
//# sourceMappingURL=createpresetsmessages.d.ts.map