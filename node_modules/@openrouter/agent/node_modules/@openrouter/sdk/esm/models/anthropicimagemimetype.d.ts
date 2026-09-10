import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
export declare const AnthropicImageMimeType: {
    readonly ImageJpeg: "image/jpeg";
    readonly ImagePng: "image/png";
    readonly ImageGif: "image/gif";
    readonly ImageWebp: "image/webp";
};
export type AnthropicImageMimeType = OpenEnum<typeof AnthropicImageMimeType>;
/** @internal */
export declare const AnthropicImageMimeType$outboundSchema: z.ZodType<string, AnthropicImageMimeType>;
//# sourceMappingURL=anthropicimagemimetype.d.ts.map