import * as z from "zod/v4";
export type VideoUrl = {
    url: string;
};
export type ContentPartVideo = {
    type: "video_url";
    videoUrl: VideoUrl;
};
/** @internal */
export type VideoUrl$Outbound = {
    url: string;
};
/** @internal */
export declare const VideoUrl$outboundSchema: z.ZodType<VideoUrl$Outbound, VideoUrl>;
export declare function videoUrlToJSON(videoUrl: VideoUrl): string;
/** @internal */
export type ContentPartVideo$Outbound = {
    type: "video_url";
    video_url: VideoUrl$Outbound;
};
/** @internal */
export declare const ContentPartVideo$outboundSchema: z.ZodType<ContentPartVideo$Outbound, ContentPartVideo>;
export declare function contentPartVideoToJSON(contentPartVideo: ContentPartVideo): string;
//# sourceMappingURL=contentpartvideo.d.ts.map