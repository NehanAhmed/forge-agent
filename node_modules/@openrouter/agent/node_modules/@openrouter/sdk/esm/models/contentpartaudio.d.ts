import * as z from "zod/v4";
export type AudioUrl = {
    url: string;
};
export type ContentPartAudio = {
    audioUrl: AudioUrl;
    type: "audio_url";
};
/** @internal */
export type AudioUrl$Outbound = {
    url: string;
};
/** @internal */
export declare const AudioUrl$outboundSchema: z.ZodType<AudioUrl$Outbound, AudioUrl>;
export declare function audioUrlToJSON(audioUrl: AudioUrl): string;
/** @internal */
export type ContentPartAudio$Outbound = {
    audio_url: AudioUrl$Outbound;
    type: "audio_url";
};
/** @internal */
export declare const ContentPartAudio$outboundSchema: z.ZodType<ContentPartAudio$Outbound, ContentPartAudio>;
export declare function contentPartAudioToJSON(contentPartAudio: ContentPartAudio): string;
//# sourceMappingURL=contentpartaudio.d.ts.map