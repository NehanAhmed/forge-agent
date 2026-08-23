import * as z from "zod/v4";
export type AnthropicUrlPdfSource = {
    type: "url";
    url: string;
};
/** @internal */
export type AnthropicUrlPdfSource$Outbound = {
    type: "url";
    url: string;
};
/** @internal */
export declare const AnthropicUrlPdfSource$outboundSchema: z.ZodType<AnthropicUrlPdfSource$Outbound, AnthropicUrlPdfSource>;
export declare function anthropicUrlPdfSourceToJSON(anthropicUrlPdfSource: AnthropicUrlPdfSource): string;
//# sourceMappingURL=anthropicurlpdfsource.d.ts.map