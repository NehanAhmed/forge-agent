import * as z from "zod/v4";
export type AnthropicCitationCharLocationParam = {
    citedText: string;
    documentIndex: number;
    documentTitle: string | null;
    endCharIndex: number;
    startCharIndex: number;
    type: "char_location";
};
/** @internal */
export type AnthropicCitationCharLocationParam$Outbound = {
    cited_text: string;
    document_index: number;
    document_title: string | null;
    end_char_index: number;
    start_char_index: number;
    type: "char_location";
};
/** @internal */
export declare const AnthropicCitationCharLocationParam$outboundSchema: z.ZodType<AnthropicCitationCharLocationParam$Outbound, AnthropicCitationCharLocationParam>;
export declare function anthropicCitationCharLocationParamToJSON(anthropicCitationCharLocationParam: AnthropicCitationCharLocationParam): string;
//# sourceMappingURL=anthropiccitationcharlocationparam.d.ts.map