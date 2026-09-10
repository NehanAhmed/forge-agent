import * as z from "zod/v4";
export type AnthropicUrlImageSource = {
    type: "url";
    url: string;
};
/** @internal */
export type AnthropicUrlImageSource$Outbound = {
    type: "url";
    url: string;
};
/** @internal */
export declare const AnthropicUrlImageSource$outboundSchema: z.ZodType<AnthropicUrlImageSource$Outbound, AnthropicUrlImageSource>;
export declare function anthropicUrlImageSourceToJSON(anthropicUrlImageSource: AnthropicUrlImageSource): string;
//# sourceMappingURL=anthropicurlimagesource.d.ts.map