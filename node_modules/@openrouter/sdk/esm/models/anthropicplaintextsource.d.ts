import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicPlainTextSourceMediaType: {
    readonly TextPlain: "text/plain";
};
export type AnthropicPlainTextSourceMediaType = ClosedEnum<typeof AnthropicPlainTextSourceMediaType>;
export type AnthropicPlainTextSource = {
    data: string;
    mediaType: AnthropicPlainTextSourceMediaType;
    type: "text";
};
/** @internal */
export declare const AnthropicPlainTextSourceMediaType$outboundSchema: z.ZodEnum<typeof AnthropicPlainTextSourceMediaType>;
/** @internal */
export type AnthropicPlainTextSource$Outbound = {
    data: string;
    media_type: string;
    type: "text";
};
/** @internal */
export declare const AnthropicPlainTextSource$outboundSchema: z.ZodType<AnthropicPlainTextSource$Outbound, AnthropicPlainTextSource>;
export declare function anthropicPlainTextSourceToJSON(anthropicPlainTextSource: AnthropicPlainTextSource): string;
//# sourceMappingURL=anthropicplaintextsource.d.ts.map