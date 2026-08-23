import * as z from "zod/v4";
export type AnthropicCitationPageLocationParam = {
    citedText: string;
    documentIndex: number;
    documentTitle: string | null;
    endPageNumber: number;
    startPageNumber: number;
    type: "page_location";
};
/** @internal */
export type AnthropicCitationPageLocationParam$Outbound = {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_page_number: number;
    start_page_number: number;
    type: "page_location";
};
/** @internal */
export declare const AnthropicCitationPageLocationParam$outboundSchema: z.ZodType<AnthropicCitationPageLocationParam$Outbound, AnthropicCitationPageLocationParam>;
export declare function anthropicCitationPageLocationParamToJSON(anthropicCitationPageLocationParam: AnthropicCitationPageLocationParam): string;
//# sourceMappingURL=anthropiccitationpagelocationparam.d.ts.map