import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
export declare const ImageOutputModality: {
    readonly Text: "text";
    readonly Image: "image";
    readonly Embeddings: "embeddings";
    readonly Audio: "audio";
    readonly Video: "video";
    readonly Rerank: "rerank";
    readonly Speech: "speech";
    readonly Transcription: "transcription";
};
export type ImageOutputModality = OpenEnum<typeof ImageOutputModality>;
/** @internal */
export declare const ImageOutputModality$inboundSchema: z.ZodType<ImageOutputModality, unknown>;
//# sourceMappingURL=imageoutputmodality.d.ts.map