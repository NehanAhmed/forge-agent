import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
/**
 * Which fetch engine to use. "auto" (default) uses native if the provider supports it, otherwise Exa. "native" forces the provider's built-in fetch. "exa" uses Exa Contents API. "openrouter" uses direct HTTP fetch. "firecrawl" uses Firecrawl scrape (requires BYOK). "parallel" uses the Parallel extract API.
 */
export declare const WebFetchEngineEnum: {
    readonly Auto: "auto";
    readonly Native: "native";
    readonly Openrouter: "openrouter";
    readonly Exa: "exa";
    readonly Parallel: "parallel";
    readonly Firecrawl: "firecrawl";
};
/**
 * Which fetch engine to use. "auto" (default) uses native if the provider supports it, otherwise Exa. "native" forces the provider's built-in fetch. "exa" uses Exa Contents API. "openrouter" uses direct HTTP fetch. "firecrawl" uses Firecrawl scrape (requires BYOK). "parallel" uses the Parallel extract API.
 */
export type WebFetchEngineEnum = OpenEnum<typeof WebFetchEngineEnum>;
/** @internal */
export declare const WebFetchEngineEnum$outboundSchema: z.ZodType<string, WebFetchEngineEnum>;
//# sourceMappingURL=webfetchengineenum.d.ts.map