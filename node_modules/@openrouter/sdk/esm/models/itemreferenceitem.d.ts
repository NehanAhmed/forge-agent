import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
export declare const ItemReferenceItemType: {
    readonly ItemReference: "item_reference";
};
export type ItemReferenceItemType = ClosedEnum<typeof ItemReferenceItemType>;
/**
 * A reference to a previous response item by ID
 */
export type ItemReferenceItem = {
    id: string;
    type: ItemReferenceItemType;
};
/** @internal */
export declare const ItemReferenceItemType$outboundSchema: z.ZodEnum<typeof ItemReferenceItemType>;
/** @internal */
export type ItemReferenceItem$Outbound = {
    id: string;
    type: string;
};
/** @internal */
export declare const ItemReferenceItem$outboundSchema: z.ZodType<ItemReferenceItem$Outbound, ItemReferenceItem>;
export declare function itemReferenceItemToJSON(itemReferenceItem: ItemReferenceItem): string;
//# sourceMappingURL=itemreferenceitem.d.ts.map