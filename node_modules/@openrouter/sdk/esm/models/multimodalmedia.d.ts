import * as z from "zod/v4";
export type MultimodalMedia = {
    data: string;
    format?: string | undefined;
};
/** @internal */
export type MultimodalMedia$Outbound = {
    data: string;
    format?: string | undefined;
};
/** @internal */
export declare const MultimodalMedia$outboundSchema: z.ZodType<MultimodalMedia$Outbound, MultimodalMedia>;
export declare function multimodalMediaToJSON(multimodalMedia: MultimodalMedia): string;
//# sourceMappingURL=multimodalmedia.d.ts.map