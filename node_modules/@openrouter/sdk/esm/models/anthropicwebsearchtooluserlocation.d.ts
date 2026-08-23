import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const AnthropicWebSearchToolUserLocationType: {
    readonly Approximate: "approximate";
};
export type AnthropicWebSearchToolUserLocationType = ClosedEnum<typeof AnthropicWebSearchToolUserLocationType>;
export type AnthropicWebSearchToolUserLocation = {
    city?: string | null | undefined;
    country?: string | null | undefined;
    region?: string | null | undefined;
    timezone?: string | null | undefined;
    type: AnthropicWebSearchToolUserLocationType;
};
/** @internal */
export declare const AnthropicWebSearchToolUserLocationType$outboundSchema: z.ZodEnum<typeof AnthropicWebSearchToolUserLocationType>;
/** @internal */
export type AnthropicWebSearchToolUserLocation$Outbound = {
    city?: string | null | undefined;
    country?: string | null | undefined;
    region?: string | null | undefined;
    timezone?: string | null | undefined;
    type: string;
};
/** @internal */
export declare const AnthropicWebSearchToolUserLocation$outboundSchema: z.ZodType<AnthropicWebSearchToolUserLocation$Outbound, AnthropicWebSearchToolUserLocation>;
export declare function anthropicWebSearchToolUserLocationToJSON(anthropicWebSearchToolUserLocation: AnthropicWebSearchToolUserLocation): string;
//# sourceMappingURL=anthropicwebsearchtooluserlocation.d.ts.map