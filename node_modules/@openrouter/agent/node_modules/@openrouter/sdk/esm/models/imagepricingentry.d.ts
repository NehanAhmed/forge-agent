import * as z from "zod/v4";
import { OpenEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
export declare const Billable: {
    readonly OutputImage: "output_image";
    readonly InputImage: "input_image";
    readonly InputFont: "input_font";
    readonly InputReference: "input_reference";
    readonly InputText: "input_text";
};
export type Billable = OpenEnum<typeof Billable>;
export declare const Unit: {
    readonly Image: "image";
    readonly Megapixel: "megapixel";
    readonly Token: "token";
};
export type Unit = OpenEnum<typeof Unit>;
/**
 * One billable pricing line for an image provider.
 */
export type ImagePricingEntry = {
    billable: Billable;
    costUsd: number;
    unit: Unit;
    variant?: string | undefined;
};
/** @internal */
export declare const Billable$inboundSchema: z.ZodType<Billable, unknown>;
/** @internal */
export declare const Unit$inboundSchema: z.ZodType<Unit, unknown>;
/** @internal */
export declare const ImagePricingEntry$inboundSchema: z.ZodType<ImagePricingEntry, unknown>;
export declare function imagePricingEntryFromJSON(jsonString: string): SafeParseResult<ImagePricingEntry, SDKValidationError>;
//# sourceMappingURL=imagepricingentry.d.ts.map