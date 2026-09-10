import * as z from "zod/v4";
import { ClosedEnum } from "../types/enums.js";
import { Result as SafeParseResult } from "../types/fp.js";
import { SDKValidationError } from "./errors/sdkvalidationerror.js";
import { ToolCallStatus } from "./toolcallstatus.js";
export declare const OutputAdvisorServerToolItemType: {
    readonly OpenrouterAdvisor: "openrouter:advisor";
};
export type OutputAdvisorServerToolItemType = ClosedEnum<typeof OutputAdvisorServerToolItemType>;
/**
 * An openrouter:advisor server tool output item
 */
export type OutputAdvisorServerToolItem = {
    /**
     * The advisor model's response (the advice text returned to the executor).
     */
    advice?: string | undefined;
    /**
     * Error message when the advisor call did not produce advice.
     */
    error?: string | undefined;
    id?: string | undefined;
    /**
     * Provider-safe function name of the specific advisor instance that produced this item (e.g. `openrouter_advisor__1`). Present only when more than one advisor tool is configured; omitted for the default single advisor. Echo this field back unchanged so the advisor's cross-request memory stays namespaced to the correct instance. This identity is positional: it is derived from the index of the advisor entry in the request `tools` array, so clients must keep the order of advisor tool entries stable across requests in a conversation. Reordering or inserting advisor entries shifts these names and causes each advisor's cross-request memory to be attributed to the wrong instance.
     */
    instanceName?: string | undefined;
    /**
     * Slug of the advisor model that was consulted.
     */
    model?: string | undefined;
    /**
     * The prompt the executor sent to the advisor.
     */
    prompt?: string | undefined;
    status: ToolCallStatus;
    type: OutputAdvisorServerToolItemType;
};
/** @internal */
export declare const OutputAdvisorServerToolItemType$inboundSchema: z.ZodEnum<typeof OutputAdvisorServerToolItemType>;
/** @internal */
export declare const OutputAdvisorServerToolItemType$outboundSchema: z.ZodEnum<typeof OutputAdvisorServerToolItemType>;
/** @internal */
export declare const OutputAdvisorServerToolItem$inboundSchema: z.ZodType<OutputAdvisorServerToolItem, unknown>;
/** @internal */
export type OutputAdvisorServerToolItem$Outbound = {
    advice?: string | undefined;
    error?: string | undefined;
    id?: string | undefined;
    instance_name?: string | undefined;
    model?: string | undefined;
    prompt?: string | undefined;
    status: string;
    type: string;
};
/** @internal */
export declare const OutputAdvisorServerToolItem$outboundSchema: z.ZodType<OutputAdvisorServerToolItem$Outbound, OutputAdvisorServerToolItem>;
export declare function outputAdvisorServerToolItemToJSON(outputAdvisorServerToolItem: OutputAdvisorServerToolItem): string;
export declare function outputAdvisorServerToolItemFromJSON(jsonString: string): SafeParseResult<OutputAdvisorServerToolItem, SDKValidationError>;
//# sourceMappingURL=outputadvisorservertoolitem.d.ts.map