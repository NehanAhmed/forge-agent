import * as z from "zod/v4";
import { MultimodalMedia, MultimodalMedia$Outbound } from "./multimodalmedia.js";
export type ContentPartInputFile = {
    inputFile: MultimodalMedia;
    type: "input_file";
};
/** @internal */
export type ContentPartInputFile$Outbound = {
    input_file: MultimodalMedia$Outbound;
    type: "input_file";
};
/** @internal */
export declare const ContentPartInputFile$outboundSchema: z.ZodType<ContentPartInputFile$Outbound, ContentPartInputFile>;
export declare function contentPartInputFileToJSON(contentPartInputFile: ContentPartInputFile): string;
//# sourceMappingURL=contentpartinputfile.d.ts.map