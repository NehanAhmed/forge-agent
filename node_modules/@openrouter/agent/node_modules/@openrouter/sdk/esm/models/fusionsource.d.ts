import * as z from "zod/v4";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
/**
 * A web page retrieved via web search during a fusion run.
 */
export type FusionSource = {
    /**
     * Title of the retrieved web page.
     */
    title: string;
    /**
     * URL of the web page a panel or the judge retrieved during the run.
     */
    url: string;
};
/** @internal */
export declare const FusionSource$inboundSchema: z.ZodType<FusionSource, unknown>;
/** @internal */
export type FusionSource$Outbound = {
    title: string;
    url: string;
};
/** @internal */
export declare const FusionSource$outboundSchema: z.ZodType<FusionSource$Outbound, FusionSource>;
export declare function fusionSourceToJSON(fusionSource: FusionSource): string;
export declare function fusionSourceFromJSON(jsonString: string): SafeParseResult<FusionSource, SDKValidationError>;
//# sourceMappingURL=fusionsource.d.ts.map