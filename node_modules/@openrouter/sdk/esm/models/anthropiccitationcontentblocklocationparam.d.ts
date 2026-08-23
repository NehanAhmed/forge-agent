import * as z from "zod/v4";
export type AnthropicCitationContentBlockLocationParam = {
    citedText: string;
    documentIndex: number;
    documentTitle: string | null;
    endBlockIndex: number;
    startBlockIndex: number;
    type: "content_block_location";
};
/** @internal */
export type AnthropicCitationContentBlockLocationParam$Outbound = {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_block_index: number;
    start_block_index: number;
    type: "content_block_location";
};
/** @internal */
export declare const AnthropicCitationContentBlockLocationParam$outboundSchema: z.ZodType<AnthropicCitationContentBlockLocationParam$Outbound, AnthropicCitationContentBlockLocationParam>;
export declare function anthropicCitationContentBlockLocationParamToJSON(anthropicCitationContentBlockLocationParam: AnthropicCitationContentBlockLocationParam): string;
//# sourceMappingURL=anthropiccitationcontentblocklocationparam.d.ts.map