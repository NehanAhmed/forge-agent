import * as z from "zod/v4";
export type AnthropicFileDocumentSource = {
    fileId: string;
    type: "file";
};
/** @internal */
export type AnthropicFileDocumentSource$Outbound = {
    file_id: string;
    type: "file";
};
/** @internal */
export declare const AnthropicFileDocumentSource$outboundSchema: z.ZodType<AnthropicFileDocumentSource$Outbound, AnthropicFileDocumentSource>;
export declare function anthropicFileDocumentSourceToJSON(anthropicFileDocumentSource: AnthropicFileDocumentSource): string;
//# sourceMappingURL=anthropicfiledocumentsource.d.ts.map