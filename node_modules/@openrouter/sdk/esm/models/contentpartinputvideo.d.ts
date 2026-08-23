import * as z from "zod/v4";
import { MultimodalMedia, MultimodalMedia$Outbound } from "./multimodalmedia.js";
export type ContentPartInputVideo = {
    inputVideo: MultimodalMedia;
    type: "input_video";
};
/** @internal */
export type ContentPartInputVideo$Outbound = {
    input_video: MultimodalMedia$Outbound;
    type: "input_video";
};
/** @internal */
export declare const ContentPartInputVideo$outboundSchema: z.ZodType<ContentPartInputVideo$Outbound, ContentPartInputVideo>;
export declare function contentPartInputVideoToJSON(contentPartInputVideo: ContentPartInputVideo): string;
//# sourceMappingURL=contentpartinputvideo.d.ts.map