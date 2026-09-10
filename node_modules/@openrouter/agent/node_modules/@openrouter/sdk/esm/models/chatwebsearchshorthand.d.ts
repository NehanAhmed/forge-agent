import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
import { SearchQualityLevel } from "./searchqualitylevel.js";
import { WebSearchConfig, WebSearchConfig$Outbound } from "./websearchconfig.js";
import { WebSearchEngineEnum } from "./websearchengineenum.js";
import { WebSearchUserLocationServerTool, WebSearchUserLocationServerTool$Outbound } from "./websearchuserlocationservertool.js";
export declare const ChatWebSearchShorthandType: {
    readonly WebSearch: "web_search";
    readonly WebSearchPreview: "web_search_preview";
    readonly WebSearchPreview20250311: "web_search_preview_2025_03_11";
    readonly WebSearch20250826: "web_search_2025_08_26";
};
export type ChatWebSearchShorthandType = OpenEnum<typeof ChatWebSearchShorthandType>;
/**
 * Web search tool using OpenAI Responses API syntax. Automatically converted to openrouter:web_search.
 */
export type ChatWebSearchShorthand = {
    /**
     * Limit search results to these domains. Supported by Exa, Firecrawl, Parallel, Perplexity, and most native providers (Anthropic, OpenAI, xAI). Cannot be used with excluded_domains.
     */
    allowedDomains?: Array<string> | undefined;
    /**
     * Which search engine to use. "auto" (default) uses native if the provider supports it, otherwise Exa. "native" forces the provider's built-in search. "exa" forces the Exa search API. "firecrawl" uses Firecrawl (requires BYOK). "parallel" uses the Parallel search API. "perplexity" uses the Perplexity Search API (raw ranked results).
     */
    engine?: WebSearchEngineEnum | undefined;
    /**
     * Exclude search results from these domains. Supported by Exa, Firecrawl, Parallel, Perplexity, Anthropic, and xAI. Not supported with OpenAI (silently ignored). Cannot be used with allowed_domains.
     */
    excludedDomains?: Array<string> | undefined;
    /**
     * Exact maximum number of characters of content per search result. Applies to the Exa, Parallel, and Perplexity engines; ignored with native provider search and Firecrawl. For Exa, caps highlight content per result. For Parallel, caps excerpt content per result (default 1,500 when omitted). For Perplexity, maps to the native `max_tokens_per_page` parameter (converted from characters to tokens) and trims the response to the exact character cap. When both `max_characters` and `search_context_size` are set, `max_characters` takes precedence. When omitted, falls back to `search_context_size` mapping (Exa) or engine defaults (Parallel, Perplexity).
     */
    maxCharacters?: number | undefined;
    /**
     * Maximum number of search results to return per search call. Defaults to 5. Applies to Exa, Firecrawl, Parallel, and Perplexity engines; ignored with native provider search. Perplexity supports a maximum of 20; values above 20 are clamped.
     */
    maxResults?: number | undefined;
    /**
     * Maximum total number of search results across all search calls in a single request. Once this limit is reached, the tool will stop returning new results. Useful for controlling cost and context size in agentic loops. Defaults to 50 when not specified.
     */
    maxTotalResults?: number | undefined;
    parameters?: WebSearchConfig | undefined;
    /**
     * How much context to retrieve per result. Applies to Exa, Parallel, and Perplexity engines; ignored with native provider search and Firecrawl. For Exa, pins a fixed per-result character cap (low=5,000, medium=15,000, high=30,000); when omitted, Exa picks an adaptive size per query and document (typically ~2,000–4,000 characters per result). For Parallel, controls the total characters across all results; when omitted, Parallel uses its own default size. For Perplexity, maps directly to the Search API's native search_context_size parameter. Overridden by `max_characters` when both are set.
     */
    searchContextSize?: SearchQualityLevel | undefined;
    type: ChatWebSearchShorthandType;
    /**
     * Approximate user location for location-biased results.
     */
    userLocation?: WebSearchUserLocationServerTool | undefined;
};
/** @internal */
export declare const ChatWebSearchShorthandType$outboundSchema: z.ZodType<string, ChatWebSearchShorthandType>;
/** @internal */
export type ChatWebSearchShorthand$Outbound = {
    allowed_domains?: Array<string> | undefined;
    engine?: string | undefined;
    excluded_domains?: Array<string> | undefined;
    max_characters?: number | undefined;
    max_results?: number | undefined;
    max_total_results?: number | undefined;
    parameters?: WebSearchConfig$Outbound | undefined;
    search_context_size?: string | undefined;
    type: string;
    user_location?: WebSearchUserLocationServerTool$Outbound | undefined;
};
/** @internal */
export declare const ChatWebSearchShorthand$outboundSchema: z.ZodType<ChatWebSearchShorthand$Outbound, ChatWebSearchShorthand>;
export declare function chatWebSearchShorthandToJSON(chatWebSearchShorthand: ChatWebSearchShorthand): string;
//# sourceMappingURL=chatwebsearchshorthand.d.ts.map