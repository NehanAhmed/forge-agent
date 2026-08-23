import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicBase64PdfSourceMediaType: {
    readonly ApplicationPdf: "application/pdf";
};
export type AnthropicBase64PdfSourceMediaType = ClosedEnum<typeof AnthropicBase64PdfSourceMediaType>;
export type AnthropicBase64PdfSource = {
    data: string;
    mediaType: AnthropicBase64PdfSourceMediaType;
    type: "base64";
};
/** @internal */
export declare const AnthropicBase64PdfSourceMediaType$outboundSchema: z.ZodEnum<typeof AnthropicBase64PdfSourceMediaType>;
/** @internal */
export type AnthropicBase64PdfSource$Outbound = {
    data: string;
    media_type: string;
    type: "base64";
};
/** @internal */
export declare const AnthropicBase64PdfSource$outboundSchema: z.ZodType<AnthropicBase64PdfSource$Outbound, AnthropicBase64PdfSource>;
export declare function anthropicBase64PdfSourceToJSON(anthropicBase64PdfSource: AnthropicBase64PdfSource): string;
//# sourceMappingURL=anthropicbase64pdfsource.d.ts.map