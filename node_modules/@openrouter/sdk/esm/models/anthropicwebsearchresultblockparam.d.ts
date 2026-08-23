import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicWebSearchResultBlockParamType: {
    readonly WebSearchResult: "web_search_result";
};
export type AnthropicWebSearchResultBlockParamType = ClosedEnum<typeof AnthropicWebSearchResultBlockParamType>;
export type AnthropicWebSearchResultBlockParam = {
    encryptedContent: string;
    pageAge?: string | null | undefined;
    title: string;
    type: AnthropicWebSearchResultBlockParamType;
    url: string;
};
/** @internal */
export declare const AnthropicWebSearchResultBlockParamType$outboundSchema: z.ZodEnum<typeof AnthropicWebSearchResultBlockParamType>;
/** @internal */
export type AnthropicWebSearchResultBlockParam$Outbound = {
    encrypted_content: string;
    page_age?: string | null | undefined;
    title: string;
    type: string;
    url: string;
};
/** @internal */
export declare const AnthropicWebSearchResultBlockParam$outboundSchema: z.ZodType<AnthropicWebSearchResultBlockParam$Outbound, AnthropicWebSearchResultBlockParam>;
export declare function anthropicWebSearchResultBlockParamToJSON(anthropicWebSearchResultBlockParam: AnthropicWebSearchResultBlockParam): string;
//# sourceMappingURL=anthropicwebsearchresultblockparam.d.ts.map