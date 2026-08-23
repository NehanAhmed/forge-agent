import * as z from "zod/v4";
import { MultimodalMedia, MultimodalMedia$Outbound } from "./multimodalmedia.js";
export type ContentPartInputAudio = {
    inputAudio: MultimodalMedia;
    type: "input_audio";
};
/** @internal */
export type ContentPartInputAudio$Outbound = {
    input_audio: MultimodalMedia$Outbound;
    type: "input_audio";
};
/** @internal */
export declare const ContentPartInputAudio$outboundSchema: z.ZodType<ContentPartInputAudio$Outbound, ContentPartInputAudio>;
export declare function contentPartInputAudioToJSON(contentPartInputAudio: ContentPartInputAudio): string;
//# sourceMappingURL=contentpartinputaudio.d.ts.map