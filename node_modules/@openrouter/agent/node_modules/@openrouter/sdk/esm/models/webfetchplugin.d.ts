import * as z from "zod/v4";
export type WebFetchPlugin = {
    /**
     * Only fetch from these domains.
     */
    allowedDomains?: Array<string> | undefined;
    /**
     * Never fetch from these domains.
     */
    blockedDomains?: Array<string> | undefined;
    id: "web-fetch";
    /**
     * Maximum content length in approximate tokens. Content exceeding this limit is truncated.
     */
    maxContentTokens?: number | undefined;
    /**
     * Maximum number of web fetches per request. Once exceeded, the tool returns an error.
     */
    maxUses?: number | undefined;
};
/** @internal */
export type WebFetchPlugin$Outbound = {
    allowed_domains?: Array<string> | undefined;
    blocked_domains?: Array<string> | undefined;
    id: "web-fetch";
    max_content_tokens?: number | undefined;
    max_uses?: number | undefined;
};
/** @internal */
export declare const WebFetchPlugin$outboundSchema: z.ZodType<WebFetchPlugin$Outbound, WebFetchPlugin>;
export declare function webFetchPluginToJSON(webFetchPlugin: WebFetchPlugin): string;
//# sourceMappingURL=webfetchplugin.d.ts.map