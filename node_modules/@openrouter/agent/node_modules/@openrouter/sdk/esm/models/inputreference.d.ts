import * as z from "zod/v4";
import { ContentPartAudio, ContentPartAudio$Outbound } from "./contentpartaudio.js";
import { ContentPartImage, ContentPartImage$Outbound } from "./contentpartimage.js";
import { ContentPartVideo, ContentPartVideo$Outbound } from "./contentpartvideo.js";
/**
 * A reference asset used to guide video generation. Image references are supported by all providers; audio and video references are only honored by providers that support them (currently BytePlus Seedance 2.0).
 */
export type InputReference = ContentPartAudio | (ContentPartImage & {
    type: "image_url";
}) | ContentPartVideo;
/** @internal */
export type InputReference$Outbound = ContentPartAudio$Outbound | (ContentPartImage$Outbound & {
    type: "image_url";
}) | ContentPartVideo$Outbound;
/** @internal */
export declare const InputReference$outboundSchema: z.ZodType<InputReference$Outbound, InputReference>;
export declare function inputReferenceToJSON(inputReference: InputReference): string;
//# sourceMappingURL=inputreference.d.ts.map