import * as z from "zod/v4";
import { AnthropicImageMimeType } from "./anthropicimagemimetype.js";
export type AnthropicBase64ImageSource = {
    data: string;
    mediaType: AnthropicImageMimeType;
    type: "base64";
};
/** @internal */
export type AnthropicBase64ImageSource$Outbound = {
    data: string;
    media_type: string;
    type: "base64";
};
/** @internal */
export declare const AnthropicBase64ImageSource$outboundSchema: z.ZodType<AnthropicBase64ImageSource$Outbound, AnthropicBase64ImageSource>;
export declare function anthropicBase64ImageSourceToJSON(anthropicBase64ImageSource: AnthropicBase64ImageSource): string;
//# sourceMappingURL=anthropicbase64imagesource.d.ts.map